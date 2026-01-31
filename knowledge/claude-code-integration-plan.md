# Claude Code CLI Integration Plan

> Replace Claude SDK with Claude Code CLI for more powerful AI capabilities with zero context management overhead.

---

## User Decisions (January 30, 2026)

| Question | Decision |
|----------|----------|
| **Claude Code detection** | ✅ Working - indicator turns green when installed |
| **Repo access** | Let Claude decide if/when to clone repos |
| **SDK removal** | Remove SDK entirely, maintain all functionalities |
| **Tool activity visibility** | Show thinking AND full details of what Claude is doing |
| **GitHub auth** | Pass GitHub token so Claude can clone private repos |
| **Clone location** | `~/.codelobby/repos/` (persists, faster on repeat) |
| **Conversation memory** | Yes, full conversation context for accuracy |
| **Cost tracking** | Investigate if `stream-json` output includes usage stats |
| **Multiple PRs** | One PR at a time (for now) |
| **Thinking visibility** | Collapsible section (cleaner, click to expand) |
| **Install prompt** | Inline banner in chat area |
| **Existing features** | Migrate ALL to Claude Code (CI analysis, PR analysis, etc.) |

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
4. [Phase 2: Core Implementation](#phase-2-core-implementation)
5. [Phase 3: UI Integration](#phase-3-ui-integration)
6. [Phase 4: Migration & Cleanup](#phase-4-migration--cleanup)
7. [Phase 5: Enhancements](#phase-5-enhancements)
8. [File Changes Summary](#file-changes-summary)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Criteria](#success-criteria)

---

## Overview

### Current State

CodeLobby uses the **Claude SDK** (`@anthropic-ai/sdk`) to communicate with Claude API. This requires:
- Manual context management
- Token counting and compression
- Building prompts manually
- Implementing streaming
- Error handling and retries

### Target State

Replace with **Claude Code CLI** which handles everything internally:
- Context optimization (automatic)
- Prompt caching (built-in)
- Tool use (Read, Grep, Glob, Bash)
- Streaming (built-in)
- Error recovery (automatic)
- Agentic loop (autonomous multi-step reasoning)

### Benefits

| Feature | With SDK | With Claude Code CLI |
|---------|----------|---------------------|
| Context management | Manual | Automatic |
| Token counting | Manual | Automatic |
| Tool use | Build yourself | Built-in |
| Codebase access | N/A | Full access |
| Error recovery | Manual | Automatic |
| Code complexity | High | Low |

---

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER (React + TanStack)               │
│                                                              │
│  useSendMessage() ─────► IPC invoke ─────────┐              │
│                                               │              │
│  useClaudeSession() ◄────── IPC events ◄─────┤              │
│  (TanStack cache)                             │              │
│       │                                       │              │
│       └──► localStorage (persistence)         │              │
└───────────────────────────────────────────────┼──────────────┘
                                                │
                                                ▼
┌───────────────────────────────────────────────┴──────────────┐
│                    MAIN PROCESS (Electron)                    │
│                                                               │
│  ipcMain.handle() ────► spawn('claude') ────► stdout         │
│       │                      │                                │
│       │                      │  (Claude Code handles:         │
│       │                      │   - API calls                  │
│       │                      │   - Context management         │
│       │                      │   - Tool use                   │
│       │                      │   - Error recovery)            │
│       │                      │                                │
│  webContents.send() ◄────────┘                               │
│  (relay chunks)                                               │
└───────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Main process is a dumb pipe** - No state, no logic, just relay
2. **All state in renderer** - TanStack Query cache is the source of truth
3. **Persistence is UI-side** - localStorage for chat history
4. **Top-down data flow** - Claude Code → Main → Renderer → UI

---

## Phase 1: Infrastructure Setup

### 1.1 Create Module Structure

```
--module-data/
├── claude-code/
│   ├── types.ts           # TypeScript interfaces
│   ├── hooks.ts           # TanStack hooks
│   ├── persistence.ts     # localStorage helpers
│   ├── parser.ts          # Parse Claude Code JSON output
│   └── index.ts           # Public exports
```

### 1.2 Main Process Relay

```
src/main/
├── claude-code-relay.ts   # Spawn + stdout relay
```

### 1.3 IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `claude:start` | Renderer → Main | Start subprocess with prompt |
| `claude:stop` | Renderer → Main | Kill subprocess |
| `claude:chunk` | Main → Renderer | Stream stdout chunk |
| `claude:done` | Main → Renderer | Process completed |
| `claude:error` | Main → Renderer | Error occurred |

### 1.4 Preload Updates

Add IPC channel types to `electron-api.d.ts`.

---

## Phase 2: Core Implementation

### 2.1 Types (`types.ts`)

```typescript
// Message in conversation
interface ClaudeMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// Session state
interface ClaudeSession {
  id: string
  status: 'idle' | 'streaming' | 'done' | 'error'
  messages: ClaudeMessage[]
  currentStream: string      // Live streaming content
  thinking: string | null    // Current thinking/reasoning
  activity: {                // Current tool activity (full details)
    toolName: string
    input: string
  } | null
  lastToolResult: string | null  // Result from last tool call
  repoContext?: {
    owner: string
    repo: string
    branch: string
    localPath?: string
  }
}

// Parsed event from Claude Code stdout
interface ClaudeChunkEvent {
  type: 'text' | 'tool_use' | 'tool_done' | 'thinking' | 'result'
  content?: string
  toolName?: string
}

// Request to start Claude
interface ClaudeStartRequest {
  sessionId: string
  prompt: string
  repoContext?: {
    owner: string
    repo: string
    branch: string
    githubToken: string
  }
}
```

### 2.2 Main Process Relay (`claude-code-relay.ts`)

```typescript
// Responsibilities:
// 1. Spawn 'claude' subprocess
// 2. Pass appropriate flags (--output-format stream-json)
// 3. Inject GitHub token for private repo access
// 4. Relay stdout chunks via IPC
// 5. Handle process lifecycle (close, error)

// NO state management
// NO parsing (just relay raw chunks)
// NO persistence
```

### 2.3 TanStack Hooks (`hooks.ts`)

| Hook | Purpose |
|------|---------|
| `useClaudeSession(sessionId)` | Get session state, loads from localStorage |
| `useSendMessage()` | Mutation: add user message, start subprocess |
| `useStopClaude()` | Mutation: kill subprocess |
| `useClearSession()` | Mutation: clear session history |
| `useClaudeStreamListener()` | Effect: listen for IPC, update TanStack cache |

### 2.4 Parser (`parser.ts`)

```typescript
// Parse Claude Code's stream-json output format
// Returns array of ClaudeChunkEvent

function parseClaudeChunk(rawChunk: string): ClaudeChunkEvent[]
```

### 2.5 Persistence (`persistence.ts`)

```typescript
// localStorage key: 'codelobby-claude-sessions'
// Structure: { [sessionId]: ClaudeSession }

function loadSession(sessionId: string): ClaudeSession | null
function saveSession(session: ClaudeSession): void
function deleteSession(sessionId: string): void
function listSessions(): string[]
```

---

## Phase 3: UI Integration

### 3.1 Initialize Stream Listener

```tsx
// --module-app/App.tsx

import { useClaudeStreamListener } from '@data'

function App() {
  // Initialize once at app root
  useClaudeStreamListener()
  
  return (
    // ... rest of app
  )
}
```

### 3.2 Update AIChat Component

Replace current SDK-based streaming with new hooks:

```tsx
// --module-ai-chat/components/AIChat/AIChat.tsx

import { useClaudeSession, useSendMessage, useStopClaude } from '@data'

function AIChat({ prContext }) {
  const sessionId = prContext 
    ? `pr-${prContext.owner}-${prContext.repo}-${prContext.number}`
    : 'general'
  
  const { data: session } = useClaudeSession(sessionId)
  const sendMessage = useSendMessage()
  const stop = useStopClaude()
  
  // ... render messages, streaming content, tool activity
}
```

### 3.3 Tool Activity Display (Full Details)

**DECISION: Show thinking AND full tool details.**

Display comprehensive activity panel:

```tsx
// Show thinking process
{session?.thinking && (
  <div className="border-l-2 border-blue-500 pl-3 text-xs text-muted-foreground italic">
    <span className="font-semibold">Thinking:</span> {session.thinking}
  </div>
)}

// Show current tool being used with full details
{session?.activity && (
  <div className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded">
    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
    <span className="font-mono">
      {session.activity.toolName}: {session.activity.input}
    </span>
  </div>
)}

// Show tool results
{session?.lastToolResult && (
  <div className="text-xs bg-muted/30 p-2 rounded font-mono max-h-32 overflow-auto">
    {session.lastToolResult}
  </div>
)}
```

Activities to display:
- **Read** - "Reading `src/auth.ts`..."
- **Grep** - "Searching for `validateToken`..."
- **Glob** - "Finding files matching `*.tsx`..."
- **Bash** - "Running `git log --oneline -5`..."
- **WebSearch** - "Searching web for `React 19 migration guide`..."
- **WebFetch** - "Fetching `https://docs.example.com/api`..."

### 3.4 PR Context Integration

When in PR chat mode:
1. Pass repo context to Claude Code
2. Claude Code can clone/access the repo
3. GitHub token injected for private repos

---

## Phase 4: Migration & Cleanup

### 4.1 Feature Flag (Testing Period)

```typescript
// --module-data/claude-code/config.ts

export const USE_CLAUDE_CODE_CLI = true  // Toggle for A/B testing
```

### 4.2 Files to Remove

| File | Reason |
|------|--------|
| `src/main/claude-api.ts` | SDK integration - replaced |
| `--module-ai-chat/utils/claude-request.ts` | Prompt building - not needed |
| `--module-ai-chat/utils/context-*.ts` | Context management - not needed |

### 4.3 Dependencies to Remove

```json
// package.json
{
  "dependencies": {
    // REMOVE:
    "@anthropic-ai/sdk": "^x.x.x"
  }
}
```

### 4.4 Update Existing AI Features

Features that use Claude SDK need updating:
- CI Failure Analysis
- PR Analysis ("Why is this open?")
- Preview URL finder
- Jira ticket finder
- PR Review generation

All should use the new `useSendMessage()` hook.

---

## Phase 5: Enhancements

### 5.1 CLI Availability Check

```typescript
// Check on app startup
async function checkClaudeCodeInstalled(): Promise<boolean> {
  try {
    await execPromise('claude --version')
    return true
  } catch {
    return false
  }
}

// Show install prompt if not available
if (!hasClaudeCode) {
  showDialog({
    title: 'Claude Code Required',
    message: 'Install with: npm install -g @anthropic-ai/claude-code',
    action: 'Open Terminal'
  })
}
```

### 5.2 SDK Fallback

**DECISION: No fallback.** SDK will be removed entirely. Users must install Claude Code CLI.

Show clear install instructions when CLI is not detected.

### 5.3 Session Continuation

Use `--continue` flag for multi-turn conversations within same session.

### 5.4 Repo Caching

**DECISION: Persistent location** at `~/.codelobby/repos/` for faster repeat access:

```
~/.codelobby/repos/
├── parcellab-api/           # Cached clone
├── parcellab-frontend/      # Cached clone
└── ...
```

Claude decides when to clone - provide the path and GitHub token, let Claude handle the rest.

### 5.5 Shallow Clone for Speed

Use `git clone --depth 1` for faster cloning.

---

## File Changes Summary

### Create

| File | Purpose |
|------|---------|
| `--module-data/claude-code/types.ts` | TypeScript interfaces |
| `--module-data/claude-code/hooks.ts` | TanStack Query hooks |
| `--module-data/claude-code/persistence.ts` | localStorage helpers |
| `--module-data/claude-code/parser.ts` | Parse Claude output |
| `--module-data/claude-code/index.ts` | Public exports |
| `src/main/claude-code-relay.ts` | Subprocess management |

### Update

| File | Changes |
|------|---------|
| `--module-data/index.ts` | Export new hooks |
| `src/main/index.ts` | Register relay handlers |
| `src/preload/electron-api.d.ts` | Add IPC types |
| `--module-app/App.tsx` | Initialize stream listener |
| `--module-ai-chat/components/AIChat/*` | Use new hooks |

### Delete (After Migration)

| File | Reason |
|------|--------|
| `src/main/claude-api.ts` | Replaced by CLI |
| `--module-ai-chat/utils/claude-request.ts` | Not needed |
| SDK-related utilities | Not needed |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| User doesn't have CLI installed | Can't use AI features | Show clear install instructions, optional SDK fallback |
| CLI startup latency (~500ms) | Perceived slowness | Show loading indicator immediately |
| Private repo access fails | Can't analyze code | Inject GitHub token in clone URL |
| Large repos slow to clone | Long wait time | Use shallow clone, cache repos |
| Claude Code API changes | Breaking changes | Pin CLI version, test updates |
| Session data too large | localStorage limits | Compress old sessions, limit history |

---

## Success Criteria

- [x] Claude Code subprocess spawns correctly
- [x] Streaming displays smoothly in UI (no choppy updates)
- [x] Tool activity visible to user (Reading, Searching, etc.)
- [x] Chat sessions persist across app restarts
- [x] Private repos accessible with GitHub token
- [x] Multi-turn conversations work correctly
- [ ] Existing AI features work (CI analysis, PR review, etc.) - Phase 3 pending
- [ ] No Claude SDK code remaining in codebase - Phase 4 pending
- [x] App handles missing CLI gracefully

---

## Appendix: Claude Code CLI Reference

### Basic Usage

```bash
# Interactive mode
claude

# Single prompt (non-interactive)
claude -p "Review this code"

# With JSON output
claude -p "Review this code" --output-format stream-json

# Continue previous session
claude --continue

# Specify working directory
claude -p "Review this code" --cwd /path/to/repo

# Restrict tools
claude -p "Review this code" --allowedTools "Read,Grep,Glob"
```

### Output Format (stream-json)

```json
{"type": "assistant", "message": {"content": "Looking at the code..."}}
{"type": "tool_use", "tool_name": "Read", "input": {"path": "src/auth.ts"}}
{"type": "tool_result", "content": "file contents..."}
{"type": "assistant", "message": {"content": "I found an issue..."}}
{"type": "result", "result": "Final summary..."}
```

### Available Tools

| Tool | Purpose |
|------|---------|
| `Read` | Read file contents |
| `Write` | Write/create files |
| `Edit` | Edit specific lines |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `LS` | List directory |
| `Bash` | Run shell commands |

---

*Last updated: January 31, 2026*
