# CodeLobby Work Plan

> **Last Updated**: January 18, 2026  
> **Status**: Active Development (v1.0.0)

---

## 🎯 Current State Summary

CodeLobby is a **PR-centric development dashboard** built with Electron, React, and TypeScript. It provides real-time monitoring of Pull Requests across multiple repositories with an integrated AI assistant.

### ✅ Completed Features

| Category | Feature | Status |
|----------|---------|--------|
| **Authentication** | GitHub PAT login | ✅ Complete |
| | Token encryption & storage | ✅ Complete |
| | User caching | ✅ Complete |
| **Views** | Canvas view (draggable windows) | ✅ Complete |
| | IDE view (tree navigation) | ✅ Complete |
| | View mode persistence | ✅ Complete |
| **PR Data** | GraphQL single-query fetch | ✅ Complete |
| | CI/CD status display | ✅ Complete |
| | Comments & reviews | ✅ Complete |
| | Review threads | ✅ Complete |
| **PR Detail Panel** | Resizable side panel | ✅ Complete |
| | Job grouping by status | ✅ Complete |
| | Comment filtering (human/bot) | ✅ Complete |
| **AI Assistant** | Claude API integration | ✅ Complete |
| | Streaming responses | ✅ Complete |
| | Message queue | ✅ Complete |
| | Model selection | ✅ Complete |
| | Extended thinking | ✅ Complete |
| | Conversation persistence | ✅ Complete |
| **UI/UX** | Apple design system | ✅ Complete |
| | Dark/light themes | ✅ Complete |
| | Fullscreen adaptation | ✅ Complete |
| | Rate limit gauge | ✅ Complete |
| **Infrastructure** | Centralized logging | ✅ Complete |
| | Retry & timeout logic | ✅ Complete |
| | Error handling | ✅ Complete |
| | Test coverage (~80%) | ✅ Complete |

---

## 📋 Phase 1: Core Enhancements (Current)

### 1.1 PR Description Panel ✅ Complete
> Display PR description in the detail view with collapsible sections

**Implementation Summary:**
- PR description displayed in collapsible section at top of PR detail view
- Expanded by default, collapsible with click
- Full markdown rendering using existing MarkdownContent component
- "No description provided" placeholder for empty/null bodies
- Copy button to copy description to clipboard
- Edit button opens PR in GitHub browser

**Completed Features:**
- [x] Display PR description (markdown body) in PR detail view
- [x] Collapsible section (expanded by default)
- [x] Markdown rendering (same as AI chat)
- [x] "Empty description" placeholder if no body
- [x] Copy description button
- [x] Edit description button (opens GitHub in browser)

**Completed:** January 18, 2026

---

### 1.2 PR Actions 🔴 Not Started
> Allow users to take action on PRs directly from CodeLobby

- [ ] **Approve PR** - Submit approval review
- [ ] **Request Changes** - Submit review requesting changes
- [ ] **Merge PR** - Merge with configurable strategies (merge, squash, rebase)
- [ ] **Close PR** - Close without merging
- [ ] **Add Label** - Apply labels to PR
- [ ] **Assign Reviewers** - Request reviews from team members

**Technical Notes:**
- Requires GitHub GraphQL mutations
- Need confirmation dialogs for destructive actions
- Consider optimistic updates with rollback

### 1.3 Comment System 🔴 Not Started
> Enable commenting directly from the app

- [ ] **Reply to comments** - Inline reply to PR comments
- [ ] **Reply to review threads** - Respond to review discussions
- [ ] **Create new comment** - Post new general comment
- [ ] **Markdown editor** - Rich text editing with preview
- [ ] **@mentions** - Autocomplete for team members
- [ ] **Emoji reactions** - React to comments

**Technical Notes:**
- Use GitHub's comment GraphQL mutations
- Implement mention autocomplete with collaborators query
- Consider draft saving to localStorage

### 1.4 Notifications 🟡 Partially Started
> Surface important events to users

- [ ] **Desktop notifications** - System notifications for mentions, approvals, CI failures
- [ ] **In-app notification center** - Badge with unread count
- [ ] **Notification preferences** - Per-event type toggles
- [ ] **Sound alerts** - Optional audio feedback

**Technical Notes:**
- Use Electron's `Notification` API
- Implement background polling for new events
- Consider webhook integration for real-time

### 1.5 Integrated Terminal 🔴 Not Started
> Add a real terminal emulator to CodeLobby

**Packages Required:**
```bash
npm install xterm xterm-addon-fit node-pty
npm install -D @types/node-pty
```

**Components:**
- [ ] `src/main/terminal.ts` - PTY process management
- [ ] `src/renderer/components/Terminal.tsx` - xterm.js UI component
- [ ] IPC handlers for create, input, resize, kill
- [ ] Terminal panel in App layout (bottom panel or side panel)

**Features:**
- [ ] Spawn real shell (zsh/bash/powershell)
- [ ] Auto-detect user's default shell
- [ ] Set working directory (e.g., selected repo path)
- [ ] Resize to fit container
- [ ] Custom theme matching app
- [ ] Copy/paste support
- [ ] Multiple terminal tabs (optional)
- [ ] Split panes (optional)

**Technical Stack:**
| Package | Purpose |
|---------|---------|
| `xterm` | Terminal UI rendering |
| `xterm-addon-fit` | Auto-resize to container |
| `node-pty` | Spawn real shell processes |

**Estimated Time:** ~3 hours

### 1.6 Multi-Worktree Workspaces 🔴 Not Started
> Isolate each repo-branch combination in its own folder with dedicated terminal and AI context

**Concept:**
Each PR/branch gets its own working directory, terminal session, and AI conversation—no stashing, no checkout conflicts.

**Directory Structure:**
```
~/.codelobby/workspaces/
├── parcellab-api/                    # Repo
│   ├── main/                         # Branch worktree
│   │   └── [full repo checkout]
│   ├── feature-auth/                 # Another branch
│   │   └── [full repo checkout]
│   └── fix-bug-123/
│       └── [full repo checkout]
├── parcellab-frontend/
│   ├── main/
│   └── redesign-v2/
```

**Data Model:**
```typescript
interface Workspace {
  id: string
  repoOwner: string
  repoName: string
  branch: string
  localPath: string              // ~/.codelobby/workspaces/repo/branch
  terminalPid?: number           // Active terminal process
  aiConversationId?: string      // Isolated AI context
  createdAt: Date
}
```

**Components:**
- [ ] `src/main/workspace-manager.ts` - Create, delete, switch workspaces
- [ ] `src/main/git-worktree.ts` - Git worktree operations (add, remove, list)
- [ ] `src/renderer/components/WorkspaceSelector.tsx` - UI for workspace switching
- [ ] `src/renderer/components/WorkspaceList.tsx` - All active workspaces
- [ ] IPC handlers for workspace CRUD

**Features:**
- [ ] **Clone repo once** - Initial clone to `~/.codelobby/workspaces/repo/main`
- [ ] **Add worktree per branch** - `git worktree add ../branch-name branch-name`
- [ ] **Terminal per workspace** - Each workspace has dedicated terminal session
- [ ] **AI context per workspace** - Isolated conversation history
- [ ] **Auto-detect existing clones** - Allow linking to existing local repos
- [ ] **Quick switch** - Keyboard shortcut to switch workspaces (`Cmd+Shift+W`)
- [ ] **Workspace indicators** - Show active workspace in header
- [ ] **Cleanup stale worktrees** - Remove when branch is deleted/merged

**Benefits:**
| Feature | Benefit |
|---------|---------|
| **Parallel work** | Work on 3 PRs simultaneously |
| **No stash/checkout** | Never lose uncommitted changes |
| **Isolated AI** | AI suggestions are branch-aware |
| **Persistent terminals** | Each workspace keeps terminal history |
| **Independent deps** | Each can have different `node_modules` |

**Technical Notes:**
- Git worktrees share `.git` directory (space efficient)
- Use `simple-git` for worktree management
- Store workspace metadata in electron-store
- Handle worktree conflicts (can't have same branch twice)

**Estimated Time:** ~10 hours

### 1.7 Keyboard Shortcuts 🔴 Not Started
> Power user efficiency

- [ ] `Cmd+K` - Command palette
- [ ] `Cmd+R` - Refresh data
- [ ] `Cmd+1/2` - Switch view modes
- [ ] `Cmd+N` - Focus next PR
- [ ] `Cmd+P` - Focus previous PR
- [ ] `Cmd+Shift+W` - Switch workspace
- [ ] `Escape` - Close panels/dialogs
- [ ] `Enter` - Open selected PR
- [ ] `?` - Show shortcuts help

**Technical Notes:**
- Use `useHotkeys` hook or custom implementation
- Store custom bindings in electron-store
- Implement command palette with fuzzy search

---

## 📋 Phase 2: AI-Powered Features

### 2.0 Context Load Indicator ✅ Complete
> Show users how much of the AI context window is being used

**Concept:**
Display a percentage/progress indicator showing how much of Claude's context window is consumed by the current conversation. Helps users understand when to start a new chat.

**UI Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Type a message...]                                        │
│                                                             │
│                    Context: 12% ████░░░░░░░░░░░░  [Send]   │
│                             ↑                               │
│                    Shows token usage                        │
└─────────────────────────────────────────────────────────────┘
```

**States:**
```
Low usage (0-50%):     Context: 12% ████░░░░░░░░░░░░  (green)
Medium usage (50-80%): Context: 65% ██████████░░░░░░  (yellow)
High usage (80-95%):   Context: 87% █████████████░░░  (orange)
Critical (95%+):       Context: 98% ███████████████░  (red)
                       ⚠️ Near limit - consider new chat
```

**Implementation:**
```typescript
// Token estimation (rough calculation)
function estimateTokens(messages: ChatMessage[]): number {
  // ~4 characters per token (rough estimate)
  const totalChars = messages.reduce((sum, m) => 
    sum + m.content.length + (m.thinking?.length || 0), 0
  )
  return Math.ceil(totalChars / 4)
}

// Context window sizes by model
const CONTEXT_WINDOWS = {
  'claude-sonnet-4': 200000,
  'claude-opus-4': 200000,
  'claude-3-5-sonnet': 200000,
  'claude-3-haiku': 200000,
}

function ContextIndicator({ messages, model }: Props) {
  const tokens = estimateTokens(messages)
  const maxTokens = CONTEXT_WINDOWS[model] || 200000
  const percentage = Math.min((tokens / maxTokens) * 100, 100)
  
  const color = 
    percentage < 50 ? 'text-green-500' :
    percentage < 80 ? 'text-yellow-500' :
    percentage < 95 ? 'text-orange-500' : 'text-red-500'
  
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Context: {percentage.toFixed(0)}%</span>
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {percentage >= 95 && (
        <span className="text-red-500">⚠️ Near limit</span>
      )}
    </div>
  )
}
```

**Features:**
- [x] Token estimation from message content (~4 chars/token)
- [x] Linear progress bar with color coding
- [x] Color states: green (<50%), yellow (50-80%), orange (80-95%), red (>95%)
- [x] Tooltip on hover: `67.7% • 135.5K / 200K context used`
- [x] Model-aware context limits (200K default)
- [x] Updates in real-time as conversation grows
- [x] Compact, non-intrusive UI next to Send button

**Technical Notes:**
- Token counting is approximate (4 chars ≈ 1 token)
- Includes message content + thinking tokens
- Anthropic API doesn't expose context limits dynamically (hardcoded 200K)

**Completed:** January 18, 2026

---

### 2.1 AI Tool Execution 🔴 Not Started
> Enable Claude to execute actions on behalf of the user

**Reference Implementation:** `src/main/ai-tools.reference.ts`

**16 Tools Defined:**
| Tool | Purpose |
|------|---------|
| `git` | All git commands (pull, push, checkout, etc.) |
| `file` | Read, write, delete, copy, move files |
| `shell` | Run any shell command |
| `github` | PRs, reviews, merge, labels, comments |
| `package` | npm, yarn, pnpm operations |
| `search` | Grep, find files, find & replace |
| `analyze` | Lint, format, typecheck |
| `test` | Run tests, coverage, watch mode |
| `docker` | Build, run, compose, logs |
| `http` | HTTP requests (GET, POST, etc.) |
| `env` | Environment variables, .env files |
| `process` | Background servers, process control |
| `database` | Migrations, seeds, queries |
| `jira` | Tickets, status, comments |
| `clipboard` | Copy/paste text |
| `browser` | Open URLs, PR pages |

**Hybrid Execution Model:**

CodeLobby supports two execution models:

| Model | Flow | Best For |
|-------|------|----------|
| **Direct** | User clicks button → Execute immediately | Simple, predictable actions |
| **AI-Mediated** | User asks AI → Claude responds with `tool_use` → User confirms → Execute | Complex, context-dependent actions |

**Direct Execution (UI Buttons):**
```
[Pull] → git pull → Done ✓
[Push] → git push → Done ✓
[Test] → npm test → Done ✓
```
- Instant (no API call to Claude)
- Predictable (always does exactly one thing)
- No token cost

**AI-Mediated Execution (Chat):**
```
User: "commit my changes with a good message"
   ↓
Claude: tool_use { name: "git", input: { action: "commit", message: "..." } }
   ↓
UI: "Claude wants to run: git commit -m '...' [Allow] [Deny]"
   ↓
User: [Allow]
   ↓
Execute → Result → Claude summarizes
```
- Smart (AI can chain actions, handle errors)
- Flexible (natural language input)
- Uses tokens (2+ API calls)

**UI Design:**
```
┌─────────────────────────────────────────────────┐
│ [Pull] [Push] [Commit] [Test]  ← Direct actions │
├─────────────────────────────────────────────────┤
│  AI: "What would you like to do?"               │
│                                                 │
│  You: "commit with a message that describes     │
│        what I changed based on the diff"        │
│                                                 │
│  AI: I'll commit with message:                  │
│      "Add rate limit gauge with reset timer"    │
│      [Allow] [Edit] [Deny]                      │
└─────────────────────────────────────────────────┘
```

**Implementation Steps:**
- [ ] Implement executor functions in `ai-tools.ts`
- [ ] Add IPC handlers for tool execution
- [ ] Update `claude-api.ts` to send tools with messages
- [ ] Build confirmation UI for dangerous actions
- [ ] Add tool result feedback loop to Claude
- [ ] Build quick action toolbar (direct execution)
- [ ] Implement workspace-aware execution (run in workspace CWD)

### 2.2 Stop, Edit & Resend Messages 🔴 Not Started
> Allow users to stop streaming, edit messages, and regenerate responses

**Features:**

**1. Stop Streaming**
- [ ] Stop button appears while response is streaming
- [ ] Clicking stop aborts the API call
- [ ] Partial response is kept (marked as incomplete)
- [ ] Can continue or regenerate after stopping

**2. Edit Sent Messages**
- [ ] Edit button on user messages (hover to reveal)
- [ ] Click to convert message back to editable textarea
- [ ] Save edits and regenerate AI response
- [ ] Option to keep or discard messages after edited one

**3. Regenerate Response**
- [ ] Regenerate button on AI messages
- [ ] Re-sends the previous user message
- [ ] Option to try different model
- [ ] Shows "Regenerated" indicator

**UI Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  User message                                    [✏️ Edit]  │
├─────────────────────────────────────────────────────────────┤
│  🐕 AI response...                                          │
│  The answer to your question is...                          │
│                                              [🔄 Regenerate] │
├─────────────────────────────────────────────────────────────┤
│  [Type a message...]                     [■ Stop] [Send]    │
│                                          ↑ Shows while      │
│                                            streaming        │
└─────────────────────────────────────────────────────────────┘
```

**Edit Flow:**
```
┌─────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Editable textarea with original message]               ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                      [Cancel] [Save & Send] │
│                                                             │
│  ⚠️ Messages after this will be removed                     │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Stop streaming
const abortControllerRef = useRef<AbortController | null>(null)

function handleStop() {
  abortControllerRef.current?.abort()
  setStreaming(prev => ({ ...prev, isStreaming: false }))
  // Keep partial response, mark as incomplete
}

// Edit message
function handleEdit(messageId: string, newContent: string) {
  // Find message index
  const index = messages.findIndex(m => m.id === messageId)
  
  // Remove all messages after this one
  const truncatedHistory = messages.slice(0, index)
  
  // Add edited message
  const editedMessage = { ...messages[index], content: newContent }
  
  // Update state and resend
  setMessages([...truncatedHistory, editedMessage])
  sendMessage(newContent)
}

// Regenerate
function handleRegenerate(messageId: string) {
  // Find the user message before this AI response
  const index = messages.findIndex(m => m.id === messageId)
  const userMessage = messages[index - 1]
  
  // Remove AI response
  setMessages(messages.slice(0, index))
  
  // Resend user message
  sendMessage(userMessage.content)
}
```

**Store Changes:**
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
  isIncomplete?: boolean    // NEW: Was stopped mid-stream
  isRegenerated?: boolean   // NEW: Was regenerated
  editedAt?: string         // NEW: When was it edited
}
```

**Technical Notes:**
- Use `AbortController` to cancel streaming API calls
- Store `isIncomplete` flag for stopped messages
- Handle conversation branching (edit creates new branch)
- Consider keeping edit history (optional)

**Estimated Time:** ~3 hours

### 2.3 Multi-Chat Sessions 🔴 Not Started
> Support multiple named AI conversations with full history persistence

**Concept:**
Users can create multiple AI chat sessions, name them, and switch between them. Each chat maintains its own conversation history and context.

**Data Model:**
```typescript
interface AIChat {
  id: string                    // Unique identifier
  name: string                  // User-defined name (e.g., "PR Review Help", "Debugging Session")
  createdAt: string             // ISO timestamp
  updatedAt: string             // Last message timestamp
  messages: ChatMessage[]       // Full conversation history
  model?: string                // Model used for this chat (optional override)
  systemPrompt?: string         // Custom system prompt (optional)
  workspaceId?: string          // Link to workspace (optional)
}

interface AIChatSettings {
  claudeApiKey: string | null
  selectedModel: string | null
  enableThinking: boolean
  activeChat: string | null     // Currently active chat ID
  chats: AIChat[]               // All chat sessions
}
```

**UI Components:**
- [ ] `src/renderer/components/ChatList.tsx` - Sidebar list of all chats
- [ ] `src/renderer/components/ChatListItem.tsx` - Individual chat item with name, date, preview
- [ ] `src/renderer/components/NewChatButton.tsx` - Create new chat
- [ ] `src/renderer/components/ChatHeader.tsx` - Show chat name, rename, delete

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  🐕 AI Assistant                    [+] [⚙️] [×]           │
├──────────────┬──────────────────────────────────────────────┤
│ Chats        │                                              │
│ ─────────    │  Chat: "PR Review Help"                      │
│ ● PR Review  │                                              │
│   Debugging  │  [conversation messages...]                  │
│   Code Gen   │                                              │
│              │                                              │
│ [+ New Chat] │                                              │
├──────────────┴──────────────────────────────────────────────┤
│  [Type a message...]                              [Send]    │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] **Create new chat** - Start fresh conversation with default or custom name
- [ ] **Rename chat** - Double-click or context menu to rename
- [ ] **Delete chat** - Remove chat with confirmation
- [ ] **Switch chats** - Click to switch, keyboard shortcut (`Cmd+Shift+C`)
- [ ] **Auto-name** - Generate name from first message (optional)
- [ ] **Search chats** - Find chats by name or content
- [ ] **Pin chats** - Keep important chats at top
- [ ] **Chat preview** - Show last message preview in list
- [ ] **Unread indicator** - Mark chats with new AI responses (if background processing)
- [ ] **Export chat** - Export conversation as Markdown/JSON
- [ ] **Link to workspace** - Associate chat with a workspace for context

**Store Changes:**
```typescript
// New store functions
function getChats(): AIChat[]
function getChat(id: string): AIChat | null
function createChat(name: string): AIChat
function updateChat(id: string, updates: Partial<AIChat>): void
function deleteChat(id: string): void
function getActiveChat(): AIChat | null
function setActiveChat(id: string): void
function addMessageToChat(chatId: string, message: ChatMessage): void
```

**Technical Notes:**
- Store all chats in electron-store under `aiChat.chats`
- Lazy-load chat messages (only load active chat's full history)
- Consider IndexedDB for large chat histories (future optimization)
- Auto-save on each message
- Default "New Chat" on first open if no chats exist

**Estimated Time:** ~6 hours

### 2.4 Open PR in AI Chat 🔴 Not Started
> One-click to open a PR in a new AI conversation with full context

**Concept:**
Click a button on any PR to open a new AI chat session with the PR's full context pre-loaded. Claude immediately understands which PR you're discussing and can review it.

**UI - Entry Points:**
```
┌─────────────────────────────────────────────────────────────┐
│  PR Card (in grid/list)                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  #123 Add authentication flow                  [🐕 Ask] ││
│  │  main ← feature/auth                                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  PR Detail Header                                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  #123 Add authentication flow                           ││
│  │  [Approve] [Request Changes] [🐕 Review with AI]        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**What Happens When Clicked:**
```
┌─────────────────────────────────────────────────────────────┐
│  1. Create new AI chat session                              │
│  2. Name it: "PR #123: Add authentication flow"             │
│  3. Inject PR context as system prompt                      │
│  4. Open AI panel (if closed)                               │
│  5. Optional: Auto-send initial review prompt               │
└─────────────────────────────────────────────────────────────┘
```

**PR Context Injected:**
```typescript
const prContext = `
You are reviewing Pull Request #${pr.number} in ${pr.repo}.

## PR Details
- **Title**: ${pr.title}
- **Author**: ${pr.author.login}
- **Branch**: ${pr.headRef} → ${pr.baseRef}
- **Status**: ${pr.state} | ${pr.mergeable ? 'Mergeable' : 'Has conflicts'}
- **Created**: ${pr.createdAt}
- **URL**: ${pr.url}

## Description
${pr.body || 'No description provided'}

## Changed Files (${pr.changedFiles} files, +${pr.additions} -${pr.deletions})
${pr.files.map(f => `- ${f.filename} (+${f.additions} -${f.deletions})`).join('\n')}

## CI Status
${pr.checks.map(c => `- ${c.name}: ${c.status}`).join('\n')}

## Reviews
${pr.reviews.map(r => `- ${r.author}: ${r.state}`).join('\n')}

## Recent Comments
${pr.comments.slice(-5).map(c => `**${c.author}**: ${c.body}`).join('\n\n')}

---
Help the user review this PR. You can:
- Summarize the changes
- Identify potential issues
- Suggest improvements
- Answer questions about the code
`
```

**UI - New Chat with PR Context:**
```
┌─────────────────────────────────────────────────────────────┐
│  🐕 AI Assistant                         [PR #123] [×]      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📋 PR Context Loaded                                    ││
│  │ #123: Add authentication flow                           ││
│  │ feature/auth → main • 5 files • +234 -45               ││
│  │ [View PR ↗]                              [Clear Context]││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🐕 I'm ready to help you review PR #123 "Add              │
│     authentication flow". This PR adds OAuth 2.0           │
│     authentication with 5 changed files.                    │
│                                                             │
│     What would you like to know?                            │
│     • Summarize the changes                                 │
│     • Check for potential issues                            │
│     • Explain specific files                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Ask about this PR...]                            [Send]   │
└─────────────────────────────────────────────────────────────┘
```

**Quick Actions (Optional):**
```
┌─────────────────────────────────────────────────────────────┐
│  Quick prompts:                                             │
│  [📝 Summarize] [🔍 Find issues] [📋 Review checklist]      │
│  [💡 Suggest improvements] [❓ Explain changes]             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**

```typescript
// Create PR-aware chat
function openPRInChat(pr: PullRequest) {
  // 1. Create new chat with PR name
  const chat = createChat(`PR #${pr.number}: ${pr.title}`)
  
  // 2. Link chat to PR
  chat.linkedPR = {
    number: pr.number,
    repo: pr.repository.nameWithOwner,
    title: pr.title,
    url: pr.url
  }
  
  // 3. Set PR context as system prompt
  chat.systemPrompt = buildPRContext(pr)
  
  // 4. Set as active chat
  setActiveChat(chat.id)
  
  // 5. Open AI panel
  setAIPanelOpen(true)
  
  // 6. Optional: Send initial message
  sendMessage("Please review this PR and summarize the key changes.")
}

// Build rich PR context
function buildPRContext(pr: PullRequest): string {
  return `
    You are reviewing PR #${pr.number}...
    ${/* full context as shown above */}
  `
}
```

**Data Model Extension:**
```typescript
interface AIChat {
  id: string
  name: string
  messages: ChatMessage[]
  // NEW: PR linkage
  linkedPR?: {
    number: number
    repo: string
    title: string
    url: string
  }
  systemPrompt?: string  // PR context goes here
}
```

**Features:**
- [ ] "Ask AI" button on PR cards
- [ ] "Review with AI" button in PR detail header
- [ ] Auto-create named chat session
- [ ] Inject full PR context (description, files, CI, reviews)
- [ ] PR badge in chat header showing linked PR
- [ ] Quick action prompts (Summarize, Find issues, etc.)
- [ ] "View PR" link in chat to jump back to PR detail
- [ ] Clear context option to use chat for other topics
- [ ] Fetch file diffs on demand (for deeper review)

**Depends On:**
- 2.3 Multi-Chat Sessions (for separate PR chats)

**Estimated Time:** ~4 hours

### 2.5 PR Context for AI 🟡 In Progress
> Provide PR context to the AI assistant

- [ ] **Auto-inject PR context** - When user asks about "this PR", inject PR data
- [ ] **CI log analysis** - Fetch and analyze CI failure logs
- [ ] **Code diff context** - Include relevant code changes
- [ ] **Comment history** - Include review feedback for context

**Technical Notes:**
- Create structured PR context formatter
- Implement CI log fetching (may need REST API)
- Token limit management for large PRs

### 2.6 AI-Suggested Actions 🔴 Not Started
> AI recommends actions based on PR state

- [ ] **"Why is CI failing?"** - Analyze logs and suggest fixes
- [ ] **"What does this reviewer want?"** - Summarize review feedback
- [ ] **"Is this ready to merge?"** - Check all requirements
- [ ] **"Explain this PR"** - High-level summary of changes

**Technical Notes:**
- Create prompt templates for each action type
- Implement structured output parsing
- Consider caching AI responses per PR state

### 2.7 Code Generation 🔴 Not Started (Future Vision)
> AI generates code fixes

- [ ] **Generate fix for CI failure** - Analyze error, propose code change
- [ ] **Address review comment** - Generate code based on feedback
- [ ] **Create PR description** - Auto-generate from diff analysis
- [ ] **Commit message generation** - Suggest conventional commit messages

**Technical Notes:**
- Requires git operations (clone, checkout, commit, push)
- Need secure sandbox for code generation
- Human review required before any automated commits

---

## 📋 Phase 3: Advanced Features

### 3.1 Code Review Interface 🔴 Not Started
> Review code without leaving CodeLobby

- [ ] **Diff viewer** - Side-by-side or unified diff display
- [ ] **Syntax highlighting** - Language-aware code display
- [ ] **Inline comments** - Add review comments on specific lines
- [ ] **File tree navigation** - Browse changed files
- [ ] **Previous/Next change** - Navigate between hunks

**Technical Notes:**
- Use Monaco Editor or CodeMirror for diff display
- Fetch file contents via GitHub API
- Implement virtual scrolling for large diffs

### 3.2 Multi-Account Support 🔴 Not Started
> Work with multiple GitHub accounts

- [ ] **Account switcher** - Quick switch between accounts
- [ ] **Per-account token storage** - Separate encrypted tokens
- [ ] **Cross-account view** - Optionally see all accounts' PRs
- [ ] **Organization context** - Filter by org per account

**Technical Notes:**
- Refactor store to support multiple token slots
- Add account indicator in UI
- Consider separate windows per account

### 3.3 Team Features 🔴 Not Started
> Collaboration and team awareness

- [ ] **Team dashboard** - Overview of team's PRs
- [ ] **Review load balancing** - See who has capacity
- [ ] **PR age tracking** - Highlight stale PRs
- [ ] **Blocked PR indicators** - Show dependency chains

**Technical Notes:**
- Requires org-level API access
- Consider privacy implications
- May need additional GitHub App permissions

---

## 📋 Phase 4: Integrations

### 4.1 Jira Integration 🔴 Not Started
> Connect PRs to Jira tickets for full context

**Authentication**
- [ ] **Jira Cloud OAuth 2.0** - Secure authentication flow
- [ ] **Jira Server/Data Center** - API token authentication
- [ ] **Multi-instance support** - Connect to multiple Jira instances
- [ ] **Token storage** - Encrypted storage alongside GitHub token

**Ticket Fetching**
- [ ] **Auto-link PRs to tickets** - Parse branch names and PR titles for ticket IDs (e.g., `ABC-123`)
- [ ] **Fetch ticket details** - Summary, description, status, assignee, priority
- [ ] **Display in PR detail** - Show linked ticket info alongside PR
- [ ] **Ticket status badge** - Visual indicator of ticket state (To Do, In Progress, Done)

**Ticket Context**
- [ ] **Show acceptance criteria** - Display ticket requirements
- [ ] **Show linked issues** - Parent epics, subtasks, blockers
- [ ] **Sprint context** - Which sprint the ticket belongs to
- [ ] **Comments sync** - View Jira comments related to the work

**AI Integration**
- [ ] **Inject ticket context to AI** - Include Jira ticket details when asking AI about a PR
- [ ] **"Does this PR satisfy the ticket?"** - AI checks implementation vs requirements
- [ ] **"What's left to do?"** - Compare ticket AC with PR changes

**Create Ticket from PR Comment**
- [ ] **"Create Jira Ticket" button** - On each PR comment (hover to reveal)
- [ ] **Pre-fill ticket form** - Auto-populate from comment content
- [ ] **Project selector** - Choose which Jira project
- [ ] **Issue type selector** - Bug, Task, Story, etc.
- [ ] **Auto-link to PR** - Add PR link in ticket description
- [ ] **Quote comment** - Include original comment in ticket
- [ ] **Assign to commenter** - Option to assign ticket to comment author
- [ ] **AI-assisted summary** - Use Claude to generate ticket title from comment

**UI - Create Ticket from Comment:**
```
┌─────────────────────────────────────────────────────────────┐
│  💬 Comment by @reviewer                      [🎫 Create]   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ This function needs better error handling.              ││
│  │ We should add try-catch blocks and proper               ││
│  │ logging for debugging purposes.                         ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼ Click "Create"
┌─────────────────────────────────────────────────────────────┐
│  Create Jira Ticket                                    [×]  │
├─────────────────────────────────────────────────────────────┤
│  Project:    [PORTAL ▼]                                     │
│  Type:       [Task ▼]                                       │
│                                                             │
│  Summary:    [Add error handling to function      ] [🤖]   │
│              ↑ AI-suggested from comment           ↑ Regen  │
│                                                             │
│  Description:                                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ From PR #123 review comment by @reviewer:               ││
│  │                                                         ││
│  │ > This function needs better error handling.            ││
│  │ > We should add try-catch blocks and proper             ││
│  │ > logging for debugging purposes.                       ││
│  │                                                         ││
│  │ PR: https://github.com/org/repo/pull/123                ││
│  │ File: src/utils/api.ts (line 45)                        ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Priority:   [Medium ▼]                                     │
│  Assignee:   [@reviewer ▼]                                  │
│  Labels:     [code-review] [tech-debt]                      │
│                                                             │
│                              [Cancel] [Create Ticket]       │
└─────────────────────────────────────────────────────────────┘
```

**After Creation:**
```
┌─────────────────────────────────────────────────────────────┐
│  💬 Comment by @reviewer              [PORTAL-456] [🎫]     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ This function needs better error handling...            ││
│  └─────────────────────────────────────────────────────────┘│
│  └── 🎫 Ticket created: PORTAL-456 "Add error handling..." │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
```typescript
interface CreateTicketFromCommentParams {
  comment: PRComment
  pr: PullRequest
}

async function createTicketFromComment({ comment, pr }: CreateTicketFromCommentParams) {
  // 1. Generate AI summary (optional)
  const summary = await generateTicketSummary(comment.body)
  
  // 2. Build description with context
  const description = `
    From PR #${pr.number} review comment by @${comment.author}:
    
    > ${comment.body}
    
    PR: ${pr.url}
    ${comment.path ? `File: ${comment.path} (line ${comment.line})` : ''}
  `
  
  // 3. Create ticket via Jira API
  const ticket = await jira.createIssue({
    project: selectedProject,
    issueType: selectedType,
    summary,
    description,
    priority: selectedPriority,
    assignee: comment.author,  // Optional
    labels: ['code-review']
  })
  
  // 4. Optionally reply to PR comment with ticket link
  await github.addReplyToComment(comment.id, 
    `Created Jira ticket: [${ticket.key}](${ticket.url})`
  )
  
  return ticket
}
```

**Bidirectional Actions**
- [ ] **Update ticket status** - Move ticket when PR is merged
- [ ] **Add PR link to ticket** - Automatically link PR in Jira
- [ ] **Transition workflow** - Trigger Jira transitions from CodeLobby

**Technical Notes:**
- Jira Cloud REST API v3: `https://your-domain.atlassian.net/rest/api/3/`
- OAuth 2.0 (3LO) for Jira Cloud: https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
- JQL for searching: `project = ABC AND status != Done`
- Rate limits: 100 requests per minute for OAuth apps
- Consider caching ticket data to reduce API calls
- Branch name parsing regex: `/([A-Z]+-\d+)/` for standard Jira keys

**Data Model:**
```typescript
interface JiraTicket {
  key: string           // ABC-123
  summary: string       // Ticket title
  description: string   // Full description (may be rich text)
  status: {
    name: string        // "In Progress"
    category: string    // "indeterminate" | "done" | "new"
  }
  priority: {
    name: string        // "High"
    iconUrl: string
  }
  assignee: {
    displayName: string
    avatarUrl: string
  } | null
  reporter: {
    displayName: string
    avatarUrl: string
  }
  project: {
    key: string
    name: string
  }
  sprint?: {
    name: string
    state: string       // "active" | "closed" | "future"
  }
  labels: string[]
  created: string
  updated: string
}
```

**UI Considerations:**
- Add Jira icon/badge on PRs with linked tickets
- Show ticket card in PR detail panel (collapsible section)
- Quick-view popover on hover
- Link to open ticket in Jira

---

## 📋 Phase 5: Platform Expansion

### 5.1 GitLab Support 🔴 Not Started
> Extend to GitLab users

- [ ] **GitLab OAuth** - Authentication flow
- [ ] **Merge Request mapping** - Map MR concepts to PR model
- [ ] **GitLab CI integration** - Pipeline status display
- [ ] **GitLab-specific features** - Approvals, merge trains

**Technical Notes:**
- Create abstraction layer for Git provider
- GitLab GraphQL API is different from GitHub
- Consider unified data model

### 5.2 Bitbucket Support 🔴 Not Started
> Extend to Bitbucket users

- [ ] **Bitbucket authentication** - App password or OAuth
- [ ] **PR data fetching** - REST API integration
- [ ] **Pipeline status** - CI/CD integration

**Technical Notes:**
- Bitbucket has REST API (no GraphQL)
- Different permission model
- Lower priority based on market share

### 5.3 Azure DevOps Support 🔴 Not Started
> Enterprise customers

- [ ] **Azure AD authentication**
- [ ] **PR/Build integration**
- [ ] **Work item linking**

---

## 📋 Phase 6: Polish & Distribution

### 6.1 Performance Optimization 🟡 Ongoing
> Ensure smooth experience at scale

- [ ] **Lazy loading** - Only fetch visible data
- [ ] **Background sync** - Update data without blocking UI
- [ ] **Memory optimization** - Clean up unused data
- [ ] **Startup time** - Reduce time to interactive

### 6.2 Distribution 🔴 Not Started
> Get CodeLobby to users

- [ ] **macOS code signing** - Apple Developer certificate
- [ ] **macOS notarization** - Apple approval process
- [ ] **Auto-update** - Electron updater integration
- [ ] **Windows code signing** - EV certificate
- [ ] **Linux packages** - .deb, .rpm, AppImage

### 6.3 Analytics & Telemetry 🔴 Not Started
> Understand usage patterns

- [ ] **Anonymous usage stats** - Features used, session length
- [ ] **Error reporting** - Crash reports with context
- [ ] **Opt-in only** - Respect privacy, clear consent

---

## 🗓️ Timeline Estimate

| Phase | Duration | Target |
|-------|----------|--------|
| Phase 1 (Core) | 4-6 weeks | Q1 2026 |
| Phase 2 (AI) | 4-6 weeks | Q2 2026 |
| Phase 3 (Advanced) | 6-8 weeks | Q2-Q3 2026 |
| Phase 4 (Integrations - Jira) | 3-4 weeks | Q3 2026 |
| Phase 5 (Platforms) | 8-12 weeks | Q3-Q4 2026 |
| Phase 6 (Distribution) | 2-4 weeks | Q4 2026 |

---

## 🔧 Technical Debt & Maintenance

### Known Issues
- [ ] CoreText font warnings in console (cosmetic)
- [ ] Occasional rate limit edge cases
- [ ] Some tests are flaky with async timing

### Refactoring Opportunities
- [ ] Extract common API patterns into hooks
- [ ] Create shared component library
- [ ] Improve TypeScript strictness
- [ ] Add E2E tests with Playwright

### Documentation
- [ ] API documentation
- [ ] Component Storybook
- [ ] Contributing guide
- [ ] Architecture decision records (ADRs)

---

## 📊 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Test Coverage | ~80% | 90% |
| Build Time | ~30s | <20s |
| App Startup | ~3s | <2s |
| Memory Usage | ~200MB | <150MB |
| API Calls/Refresh | ~10 | <5 |

---

## 🤝 How to Contribute

1. **Pick a task** from Phase 1 (marked 🔴)
2. **Create a branch** from `main`
3. **Follow the patterns** in `claude.md`
4. **Add tests** for new features
5. **Submit PR** with clear description

---

## 📝 Notes & Decisions

### Why GraphQL over REST?
- Single query fetches all PR data
- Reduced API calls = better rate limit usage
- Strongly typed responses
- More efficient data transfer

### Why Electron?
- Native desktop experience
- Access to system APIs (notifications, file system)
- Secure token storage
- Cross-platform from single codebase

### Why Claude for AI?
- Excellent code understanding
- Streaming support
- Extended thinking for complex tasks
- Reliable API and SDK

---

*Last reviewed: January 18, 2026*
