# Claude CLI `stream-json` Format Guide

> **Purpose:** Documents the exact output format of `claude --output-format stream-json` and how CodeLobby's parser normalizes it to match the SDK relay's IPC events.

---

## Why This Matters

CodeLobby has two AI backends that must produce **identical IPC events** for the renderer:

| Backend | How it works |
|---------|-------------|
| **SDK Relay** (`claude-code-relay.ts`) | Uses `@anthropic-ai/claude-agent-sdk`. Gets granular streaming events (`content_block_start`, `content_block_delta`, `content_block_stop`). Each content block type is naturally a separate event. |
| **CLI Backend** (`claude-cli.ts`) | Spawns `claude -p --output-format stream-json`. Gets **complete messages** with all content blocks bundled in one array. Must split them into separate events. |

The renderer (`--module-data/claude-code/hooks.ts`) doesn't know which backend is active — it processes `claude:chunk` IPC events identically regardless of source.

---

## CLI `stream-json` Output Format

Each line of stdout is a JSON object. Event types:

### 1. `system` — Session initialization

```json
{"type":"system","subtype":"init","session_id":"abc","tools":["Read","Write","Bash"],"model":"claude-sonnet-4-20250514"}
```

### 2. `assistant` — Model response (CRITICAL)

**This is the event that contains ALL content block types in a single array:**

```json
{
  "type": "assistant",
  "message": {
    "id": "msg_01abc",
    "type": "message",
    "role": "assistant",
    "content": [
      { "type": "thinking", "thinking": "Let me analyze this..." },
      { "type": "text", "text": "I'll read that file for you." },
      { "type": "tool_use", "id": "toolu_01xyz", "name": "Read", "input": { "file_path": "src/main.ts" } }
    ],
    "model": "claude-sonnet-4-20250514",
    "stop_reason": "tool_use"
  }
}
```

**Content block types found in `message.content[]`:**

| Block Type | Fields | Maps To IPC Event |
|------------|--------|-------------------|
| `text` | `{ type: "text", text: "..." }` | `{ type: 'assistant', message: { content: text } }` |
| `tool_use` | `{ type: "tool_use", id, name, input }` | `{ type: 'tool_use', tool_name: name, input }` |
| `thinking` | `{ type: "thinking", thinking: "..." }` | `{ type: 'thinking', thinking }` |

### 3. `tool_result` — After tool execution

```json
{
  "type": "tool_result",
  "content": [
    { "type": "text", "text": "file contents here..." }
  ],
  "is_error": false
}
```

Note: `content` can be a string, an array of content blocks, or an object.

### 4. `result` — Session complete

```json
{
  "type": "result",
  "subtype": "success",
  "result": "Here is my final answer...",
  "cost_usd": 0.0234,
  "duration_ms": 12500,
  "session_id": "abc"
}
```

Note: `result` can also be an array of content blocks.

### 5. `error` — Error occurred

```json
{
  "type": "error",
  "error": "Rate limit exceeded"
}
```

---

## Parser Architecture (`parseStreamJsonLine`)

Located in `src/main/claude-cli.ts`. Returns an **array** of `ParsedEvent` objects.

### Why an Array?

A single `assistant` JSON line can contain multiple content block types. The SDK relay sends each as a separate IPC event. The parser must do the same:

```
CLI Output (1 line):
  {"type":"assistant","message":{"content":[
    {"type":"thinking","thinking":"..."},
    {"type":"text","text":"..."},
    {"type":"tool_use","name":"Read","input":{...}}
  ]}}

Parser Output (3 events):
  [
    { type: 'thinking', thinking: '...' },
    { type: 'assistant', message: { content: '...' } },
    { type: 'tool_use', tool_name: 'Read', input: {...} }
  ]
```

### Field Name Convention

| Wire (CLI/SDK) | In-Memory (React) | Where Converted |
|----------------|-------------------|-----------------|
| `tool_name` (snake_case) | `toolName` (camelCase) | `extractToolInfo()` in `parser.ts` |
| `message.content` (can be array) | `message.content` (always string) | `parseStreamJsonLine()` in `claude-cli.ts` |

---

## Common Pitfalls

### 1. `[object Object]` Display Bug

**Cause:** Passing the raw `message.content` array to the renderer instead of extracting text.

```typescript
// ❌ BAD — content is an array, renders as [object Object]
return { type: 'assistant', message: { content: event.message.content } }

// ✅ GOOD — extract text from each block
for (const block of event.message.content) {
  if (block.type === 'text') events.push({ type: 'assistant', message: { content: block.text } })
}
```

### 2. Missing Tool Use / Thinking Display

**Cause:** Only extracting `text` blocks from the content array and ignoring `tool_use` and `thinking` blocks.

```typescript
// ❌ BAD — filters out tool_use and thinking blocks
const text = content.filter(b => b.type === 'text').map(b => b.text).join('')

// ✅ GOOD — handle ALL block types
for (const block of content) {
  if (block.type === 'text') { /* emit assistant event */ }
  else if (block.type === 'tool_use') { /* emit tool_use event */ }
  else if (block.type === 'thinking') { /* emit thinking event */ }
}
```

### 3. Shell Quoting Errors (`zsh: parse error`)

**Cause:** Passing system prompts or user prompts as CLI arguments. The `claude` binary is an npm/Volta shim with `#!/bin/sh` shebang (zsh on macOS), which interprets `|`, `"`, `$`, etc.

**Solution:** Never pass text as CLI arguments:
- **System prompt** → write to temp file → read via `$(cat 'file')` into shell variable → pass as `"$VAR"`
- **User prompt** → pipe through `child.stdin`

---

## Test Coverage

Tests are in `src/main/claude-cli.test.ts` (41 tests). Key categories:

- Empty/invalid input handling
- Text content (string and array formats)
- Tool use extraction from content arrays
- Thinking extraction from content arrays
- Mixed content blocks (text + tool_use + thinking)
- Top-level event types (tool_result, result, error, system)
- Real-world CLI output examples
- Regression tests for [object Object] bug

---

## Related Files

| File | Purpose |
|------|---------|
| `src/main/claude-cli.ts` | CLI backend — spawning, stream parsing, IPC events |
| `src/main/claude-cli.test.ts` | Parser tests |
| `src/main/claude-cli-path.ts` | CLI binary path resolution + caching |
| `src/main/claude-code-relay.ts` | SDK backend (comparison reference) |
| `--module-data/claude-code/hooks.ts` | Renderer-side event processing |
| `--module-data/claude-code/parser.ts` | Type guards + field extraction |
| `--module-data/claude-code/types.ts` | StreamEvent type definitions |
