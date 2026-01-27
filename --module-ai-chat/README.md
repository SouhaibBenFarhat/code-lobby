# AI Chat Module

AI-powered chat panel for CodeLobby, powered by Claude (Anthropic). Provides intelligent PR analysis, code review generation, and contextual assistance.

## Overview

The AI Chat module enables users to have conversations with Claude about their Pull Requests. It automatically follows the currently selected PR, maintaining separate conversation histories for each PR. The standout feature is the ability to generate structured code reviews that can be directly submitted to GitHub.

## Architecture

```
--module-ai-chat/
├── index.tsx              # Module entry point, slot registration
├── components/
│   ├── AIChat/            # Main chat panel component
│   ├── ChatHeader/        # Header with settings toggle
│   ├── ChatInput/         # Input area with quick actions
│   ├── ChatSettings/      # Model & thinking settings
│   ├── ChatEmptyStates/   # No PR selected, empty chat states
│   ├── MessageBubble/     # Individual message display
│   ├── StreamingBubble/   # Live streaming response display
│   ├── ContextIndicator/  # Token usage indicator
│   ├── QuickActions/      # Pre-defined prompt buttons
│   ├── ReviewPreviewModal/# Review preview & submission
│   └── MessageErrorBoundary/
├── hooks/
│   ├── useThrottledValue.ts  # Performance optimization for streaming
│   └── useScrollManagement.ts
├── utils/
│   ├── claude-request.ts     # API request building
│   ├── claude-streaming.ts   # SSE parsing & streaming
│   ├── review-parser.ts      # Review JSON extraction
│   └── tokens.ts             # Token estimation
├── constants/
│   └── index.ts              # Prompts, context windows
└── types/
    ├── index.ts              # Main types
    └── review.ts             # Review-specific types
```

## Features

### 1. PR-Aware Context

The chat automatically includes the selected PR's full context:
- **PR metadata** - title, description, repo name, author
- **Branch info** - head branch → base branch (e.g., `feature/xyz` → `main`)
- **Labels** - all PR labels (e.g., `bug`, `priority-high`, `needs-tests`)
- **Stats** - additions, deletions, number of changed files
- **Review decision** - APPROVED, CHANGES_REQUESTED, or REVIEW_REQUIRED
- **Draft status** - whether PR is still a draft
- **CI status** - all check runs with pass/fail status
- **Code reviews** - reviewer feedback, approvals, change requests
- **Review threads** - unresolved inline discussions
- **PR comments** - discussion thread (last 10 human comments)
- **File diffs** - full code changes with line numbers

Bot comments and reviews are automatically filtered out to keep context focused.

```typescript
const prContext = {
  prNumber: selectedPR.number,
  prTitle: selectedPR.title,
  prBody: selectedPR.body,
  repoFullName: selectedPR.base.repo.full_name,
  files: prFiles  // Full diffs included
}
```

### 2. Streaming Responses

Uses `XMLHttpRequest` for streaming (more reliable than `fetch` in Electron). Features:
- Real-time token-by-token display
- Smooth word-by-word animation with fade-in
- Thinking section display (for supported models)
- Auto-scroll with manual override detection

```typescript
// SSE parsing flow
xhr.onprogress = () => {
  const events = parseSSEChunk(newText)
  for (const event of events) {
    accumulator = applyStreamEvent(accumulator, event)
  }
  setStreaming({ content: accumulator.content, thinking: accumulator.thinking })
}
```

### 3. Extended Thinking Support

Claude's extended thinking (chain-of-thought) is supported for compatible models:
- Claude Opus 4
- Claude Sonnet 4
- Claude 3.7 Sonnet
- Claude 3.5 Sonnet

When enabled, the thinking process is shown in a collapsible section above the response.

### 4. Code Review Generation

The killer feature: Claude can generate structured code reviews that map directly to GitHub's review API.

**How it works:**

1. User asks Claude to "Generate a review" (or uses the Quick Action)
2. Claude analyzes the PR diffs and outputs a JSON block:

```json
{
  "summary": "Overall review summary",
  "comments": [
    { "file": "src/utils.ts", "line": 42, "body": "Consider using const here" }
  ],
  "verdict": "approve" | "request_changes" | "comment"
}
```

3. The `MessageBubble` detects the review JSON and shows an "Open Review" button
4. The `ReviewPreviewModal` lets users:
   - Edit the summary
   - Change the verdict
   - Delete individual comments
   - See comments positioned inline with the diff
5. Submits directly to GitHub via the PR Reviews API

### 5. Quick Actions

Pre-defined prompts that appear as buttons above the input:
- **Generate Review** - Full structured review
- **Find bugs** - Bug hunting focus
- **Summarize** - Quick PR summary
- **Why is CI failing?** - Only shown when CI is failing
- **Security review** - Security vulnerability scan
- **Suggest improvements** - Code quality suggestions

Users can also create custom prompts that persist across sessions.

## Claude API Integration

### System Prompt Architecture

The system prompt is built dynamically with three layers:

**1. PR Context (when a PR is selected)**
```
You are helping with PR #123: "Fix auth bug" in owner/repo.

**Branch:** `feature/fix-auth` → `main`
**Author:** @johndoe
**Labels:** `bug`, `priority-high`
**Changes:** +150, -30, 8 files
**Review Status:** 🔴 CHANGES REQUESTED

## PR Description
[PR body/description here]

## CI Status: ❌ FAILURE
| Check | Status | Conclusion |
|-------|--------|------------|
| build | completed | ❌ failure |
| lint | completed | ✅ success |

## Code Reviews
**@reviewer1** ✅ APPROVED (1/25/2026)
> Looks good overall!

**@reviewer2** 🔴 CHANGES_REQUESTED (1/24/2026)
> Please fix the edge case handling

## Active Review Threads (Unresolved)
### src/auth.ts:42
**@reviewer2**: This could cause a null pointer exception

## PR Discussion
**@teammate** (1/25/2026):
> Have you considered using the new auth library?

## Changed Files
### ~ src/auth.ts (+10, -5)
```diff
[actual diff content with full file changes]
```
```

**2. BASE_SYSTEM_PROMPT (always included)**
```typescript
const BASE_SYSTEM_PROMPT = `You are the AI Assistant embedded in CodeLobby...
You are a helpful coding assistant that:
1. Understands the user is working with GitHub Pull Requests
2. Can help with code review, debugging, and development tasks
3. Provides concise, actionable advice
4. Uses markdown formatting for clarity`
```

**3. REVIEW_FORMAT_INSTRUCTIONS (when PR is selected)**

Teaches Claude the JSON format for generating structured reviews:
```typescript
const REVIEW_FORMAT_INSTRUCTIONS = `
## Code Review Generation
When asked to generate a code review, output a JSON block:
\`\`\`json:review
{
  "summary": "Overall review summary",
  "comments": [{ "file": "path/to/file.ts", "line": 42, "body": "..." }],
  "verdict": "approve" | "request_changes" | "comment"
}
\`\`\`
`
```

**Building the prompt:**
```typescript
export function buildSystemPrompt(options?: BuildSystemPromptOptions): string {
  if (!prContext) return BASE_SYSTEM_PROMPT

  // 1. PR header
  let contextSection = `You are helping with PR #${prContext.prNumber}...`
  
  // 2. PR metadata (branches, labels, stats, review decision)
  contextSection += formatPRMetadata(prContext)
  
  // 3. PR description
  if (prContext.prBody) contextSection += `\n\n## PR Description\n\n${prContext.prBody}`
  
  // 4. CI status (helps Claude understand build failures)
  if (prContext.checks) contextSection += formatCIStatus(prContext.checks)
  
  // 5. Code reviews (previous reviewer feedback)
  if (prContext.reviews?.length) contextSection += formatReviews(prContext.reviews)
  
  // 6. Unresolved review threads (active discussions)
  if (prContext.reviewThreads?.length) contextSection += formatReviewThreads(prContext.reviewThreads)
  
  // 7. PR discussion comments
  if (prContext.comments?.length) contextSection += formatComments(prContext.comments)
  
  // 8. File diffs (the actual code changes)
  if (prContext.files?.length) contextSection += formatFileChanges(prContext.files)

  // Base prompt + review instructions
  const basePrompt = BASE_SYSTEM_PROMPT + REVIEW_FORMAT_INSTRUCTIONS

  return `${contextSection}\n\n${basePrompt}`
}
```

This means Claude has comprehensive context including:
- **Branch info** - understands if it's a feature branch, hotfix, etc.
- **Labels** - can prioritize what to focus on (bug, security, breaking-change)
- **PR size** - can adapt advice for small vs large PRs
- **Review status** - knows if this is a re-review after changes
- **CI failures** - can explain why builds are failing
- **Previous reviews** - aware of existing feedback and approvals
- **Active discussions** - knows about unresolved issues
- **PR comments** - understands the ongoing conversation
- **Full diffs** - can reference specific lines and files

### Request Building

```typescript
// System prompt includes PR context + review format instructions
const systemPrompt = buildSystemPrompt({ prContext })

// Request body with optional thinking
const body = buildClaudeRequestBody({
  model: 'claude-sonnet-4-20250514',
  systemPrompt,
  messages: claudeMessages,
  enableThinking: true
})

// Headers include direct browser access flag
const headers = {
  'Content-Type': 'application/json',
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true'
}
```

### Streaming Protocol

Claude uses Server-Sent Events (SSE) for streaming:

```
data: {"type":"message_start","message":{"id":"msg_123"}}
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}
data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"Let me think..."}}
data: [DONE]
```

The `claude-streaming.ts` utilities parse these events:

```typescript
interface ClaudeStreamEvent {
  type: 'message_start' | 'content_block_delta' | 'message_stop' | 'unknown'
  messageId?: string
  textDelta?: string
  thinkingDelta?: string
}

// Accumulator pattern for building response
const accumulator = createStreamAccumulator()
accumulator = applyStreamEvent(accumulator, event)
```

## State Management

All state is managed via TanStack Query mutations/queries from `@data`:

| Hook | Purpose |
|------|---------|
| `useClaudeApiKey` | Stored API key |
| `useSelectedModel` | Current model selection |
| `useEnableThinking` | Thinking toggle state |
| `usePRChatMessages` | Messages for current PR |
| `useSaveMessage` | Persist messages |
| `useClearChat` | Clear chat history |
| `useCustomPrompts` | User-defined prompts |

Messages are persisted per-PR using the PR ID as the key:
```typescript
const prId = `${repoFullName}#${prNumber}`  // e.g., "owner/repo#123"
```

## Performance Optimizations

### 1. Throttled Streaming Updates

```typescript
// Limit UI updates to ~10fps during streaming
const throttledStreaming = useThrottledValue(streaming, 100)
```

### 2. Smart Scroll Management

- Auto-scrolls during streaming
- Detects when user scrolls up (manual override)
- Shows "scroll to bottom" button when scrolled up
- Smooth vs instant scrolling based on context

### 3. Memoized Components

```typescript
export const MessageBubble = React.memo(MessageBubbleInner)
export const StreamingBubble = React.memo(StreamingBubbleInner)
```

### 4. Token Estimation

```typescript
// Rough estimate: ~4 characters per token
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
```

## Review Parser

The review parser handles multiple JSON formats Claude might use:

```typescript
// Primary format
```json:review
{ "summary": "...", "comments": [...], "verdict": "approve" }
```

// Alternative formats also supported
```json
{ "summary": "...", ... }
```

// Even raw JSON objects are detected
```

Functions:
- `containsReviewJson(content)` - Detection
- `extractReviewJson(content)` - Extraction
- `parseReviewFromMessage(content)` - Full parsing
- `getDisplayContentWithoutReview(content)` - Strip JSON for display

## Component Details

### AIChatPanel

Main container component. Responsibilities:
- Manages streaming state and XHR lifecycle
- Handles scroll behavior
- Coordinates between sub-components
- Review submission flow

### ChatInput

Multi-function input area:
- API key entry (when not set)
- Message composition with auto-resize
- Quick action buttons
- Web fetch toggle
- Context indicator

### MessageBubble

Renders individual messages:
- User messages: Simple bubble with avatar
- Assistant messages:
  - Collapsible thinking section
  - Markdown rendering
  - Review detection → "Open Review" button

### StreamingBubble

Live streaming display:
- Word-by-word animation
- Blinking cursor
- Thinking section with auto-scroll
- Loading state

### ReviewPreviewModal

Full-featured review editor:
- Editable summary textarea
- Verdict selection (approve/request_changes/comment)
- File tree with collapsible sections
- Inline diff view with positioned comments
- Delete comments before submission
- Direct GitHub API submission

## Slot Registration

The module self-registers to the `ai-panel` slot:

```typescript
registerToSlot({
  id: 'ai-chat',
  slot: 'ai-panel',
  component: AIChatWrapper,
  order: 0
})
```

## API Key Security

- API key is stored locally via TanStack Query persistence
- Validated on entry by making a test API call
- Never sent to any server except Anthropic's API
- Uses `anthropic-dangerous-direct-browser-access` header for browser usage

## Constants

```typescript
// Context windows (all Claude models use 200K)
export const CONTEXT_WINDOWS = {
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  // ...
}

// Token limits
export const MAX_TOKENS = 4096
export const MAX_TOKENS_WITH_THINKING = 16000
export const THINKING_BUDGET = 8000
```

## Exports

The module exports:
- Components: `AIChatPanel`, `MessageBubble`, `StreamingBubble`, etc.
- Utilities: `buildClaudeHeaders`, `buildSystemPrompt`, `parseReviewFromMessage`, etc.
- Types: `ChatMessage`, `ReviewData`, `StreamingState`, etc.
- Constants: `CONTEXT_WINDOWS`, `getPRQuickPrompts`, etc.

## Testing

The module has comprehensive test coverage across utilities and components.

### Running Tests

```bash
# Run all AI chat module tests
pnpm test --run -- --module-ai-chat

# Run specific test file
pnpm test --run -- claude-request.test.ts
```

### Test Files

| File | Coverage |
|------|----------|
| `claude-request.test.ts` | System prompt building, CI status, comments, reviews, request body |
| `claude-streaming.test.ts` | SSE parsing, stream accumulation |
| `tokens.test.ts` | Token estimation |
| `review-parser.test.ts` | Review JSON extraction and validation |
| `ChatHeader.test.tsx` | Header UI, settings toggle |
| `ChatInput.test.tsx` | Input area, API key entry |
| `ChatSettings.test.tsx` | Model selection, thinking toggle |
| `ContextIndicator.test.tsx` | Token usage display |
| `MessageErrorBoundary.test.tsx` | Error handling |
| `useThrottledValue.test.ts` | Throttle hook behavior |

### Key Test Cases for System Prompt

```typescript
// CI status formatting
it('includes CI status when provided', () => {
  const result = buildSystemPrompt({
    prContext: {
      prNumber: 42,
      prTitle: 'Add feature X',
      repoFullName: 'owner/repo',
      checks: {
        state: 'failure',
        total_count: 2,
        check_runs: [
          { id: '1', name: 'build', status: 'completed', conclusion: 'failure', html_url: '' },
          { id: '2', name: 'lint', status: 'completed', conclusion: 'success', html_url: '' }
        ]
      }
    }
  })

  expect(result).toContain('## CI Status')
  expect(result).toContain('FAILURE')
  expect(result).toContain('build')
})

// Reviews formatting
it('includes code reviews when provided', () => {
  const result = buildSystemPrompt({
    prContext: {
      prNumber: 42,
      prTitle: 'Add feature X',
      repoFullName: 'owner/repo',
      reviews: [
        {
          id: '1',
          state: 'approved',
          created_at: '2026-01-25T10:00:00Z',
          author: { login: 'reviewer1', avatar_url: '', isBot: false },
          body: 'LGTM!'
        }
      ]
    }
  })

  expect(result).toContain('## Code Reviews')
  expect(result).toContain('@reviewer1')
  expect(result).toContain('APPROVED')
})

// Bot filtering
it('filters out bot reviews', () => {
  // Bot reviews and comments are excluded from context
})

// Comment limits
it('limits comments to last 10', () => {
  // Only last 10 human comments included to save tokens
})

// PR metadata
it('includes branch names when provided', () => {
  const result = buildSystemPrompt({
    prContext: {
      prNumber: 42,
      prTitle: 'Add feature X',
      repoFullName: 'owner/repo',
      headBranch: 'feature/add-auth',
      baseBranch: 'main'
    }
  })

  expect(result).toContain('`feature/add-auth`')
  expect(result).toContain('`main`')
})

// Labels
it('includes labels when provided', () => {
  const result = buildSystemPrompt({
    prContext: {
      prNumber: 42,
      prTitle: 'Add feature X',
      repoFullName: 'owner/repo',
      labels: ['bug', 'priority-high']
    }
  })

  expect(result).toContain('`bug`')
  expect(result).toContain('`priority-high`')
})

// Review decision
it('includes review decision when provided', () => {
  // Tests APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED with emojis
})
```
