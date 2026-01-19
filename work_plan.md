# CodeLobby Work Plan

> **Last Updated**: January 18, 2026  
> **Last Reviewed**: January 18, 2026  
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
| | My PRs filter (shared across views) | ✅ Complete |
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
| | Open Preview (AI-powered) | ✅ Complete |
| | Find Jira Ticket (AI-powered) | ✅ Complete |
| | Why Open? Analysis (AI-powered) | ✅ Complete |
| | PR-Specific Chat | ✅ Complete |
| | System context awareness | ✅ Complete |
| **UI/UX** | Apple design system | ✅ Complete |
| | Dark/light themes | ✅ Complete |
| | Fullscreen adaptation | ✅ Complete |
| | Rate limit gauge | ✅ Complete |
| | Minimize repo cards (Canvas) | ✅ Complete |
| | Per-repo reload button | ✅ Complete |
| **Infrastructure** | Centralized logging | ✅ Complete |
| | Retry & timeout logic | ✅ Complete |
| | Error handling | ✅ Complete |
| | Test coverage (~80%) | ✅ Complete |
| | Persistent data cache (30 min) | ✅ Complete |

---

## 📋 Phase 1: Core Enhancements (Current)

### 1.1 PR Description Panel ✅ Complete
> Display PR description in the detail view with collapsible sections

**Implementation Summary:**
- PR description displayed in collapsible section at top of PR detail view
- Expanded by default, collapsible with click
- **Truncated preview** (~300 chars) with "Read more" / "Show less" toggle
- Full markdown rendering using existing MarkdownContent component
- "No description provided" placeholder for empty/null bodies
- Copy button to copy description to clipboard
- Edit button opens PR in GitHub browser

**Completed Features:**
- [x] Display PR description (markdown body) in PR detail view
- [x] Collapsible section (expanded by default)
- [x] Truncated preview with "Read more" for long descriptions
- [x] Markdown rendering (same as AI chat)
- [x] "Empty description" placeholder if no body
- [x] Copy description button
- [x] Edit description button (opens GitHub in browser)

**Completed:** January 18, 2026

---

### 1.1.0 Open Preview (Agentic Button) ✅ Complete
> AI-powered feature to find and open preview/staging URLs from PR context

**Concept:**
Click a button in the PR detail header, and AI analyzes comments and description to find and open a preview/staging URL in the browser.

**Implementation Summary:**
- Globe icon button added to PR detail header
- Gathers context: PR title, body, all comments (general, reviews, threads)
- Sends context to Claude with an abstract prompt - Claude figures out where the preview URL is
- Opens URL in default browser via `shell.openExternal()`
- Shows loading spinner during extraction
- Displays error message if no URL found (auto-clears after 3 seconds)

**Technical Details:**
- `extractPreviewUrl()` function in `claude-api.ts` - specialized non-streaming Claude call
- IPC handler `extract-preview-url` in main process
- Uses simple prompt engineering (no tools needed - AI just extracts, app executes)
- Abstract prompt: Claude analyzes PR context without being told specific tools to look for
- Regex URL extraction from Claude response for robustness

**UI:**
- Globe icon button in PR detail header (next to external link and close buttons)
- Loading spinner during AI analysis
- Error message display (auto-clears after 3 seconds)
- Rich tooltip on hover: "AI finds the preview environment URL from this PR and opens it"
- Also added tooltip to "Open in GitHub" button for consistency

**Files Changed:**
- `src/main/claude-api.ts` - Added `extractPreviewUrl` function
- `src/main/index.ts` - Added IPC handler
- `src/preload/index.ts` - Exposed `extractPreviewUrl` to renderer
- `src/renderer/components/PRDetail.tsx` - Added button, tooltip, and UI state
- `tests/mocks/electron.ts` - Added mock for `extractPreviewUrl`
- `tests/renderer/components/PRDetail.test.tsx` - Added 6 tests

**Completed:** January 18, 2026

---

### 1.1.1 Find Jira Ticket (Agentic Button) ✅ Complete
> AI-powered feature to find and open Jira tickets from PR context

**Concept:**
Click a button in the PR detail header, and AI analyzes the PR title, branch name, description, and comments to find a Jira ticket reference and open it in the browser.

**Implementation Summary:**
- Ticket icon button added to PR detail header
- Gathers context: PR title, body, branch name, all comments (general, reviews, threads)
- Sends context to Claude with a specialized prompt that knows Jira key patterns
- Opens Jira URL in default browser via `shell.openExternal()`
- Shows loading spinner during extraction
- Displays success/error message (auto-clears after 2-3 seconds)

**How It Finds Tickets:**
1. Branch name (e.g., `feature/PROJ-123-add-login`)
2. PR title (e.g., `[PROJ-123] Fix authentication`)
3. PR description
4. Comments (in case someone mentioned the ticket)

**Supported Formats:**
- Standard Jira keys: `PROJ-123`, `ABC-456`, `FEAT-99`
- Full Jira URLs: `https://company.atlassian.net/browse/PROJ-123`

**Technical Details:**
- `extractJiraTicket()` function in `claude-api.ts` - specialized non-streaming Claude call
- Prompt defined in `src/main/prompts/jira-ticket.ts`
- IPC handler `extract-jira-ticket` in main process
- Returns either `ticketKey` (e.g., `ABC-123`) or `ticketUrl` (full URL)
- Regex validation for Jira key format: `[A-Z][A-Z0-9]*-\d+`

**UI:**
- Ticket icon button in PR detail header (after globe icon)
- Loading spinner during AI analysis
- Success message shows ticket key being opened
- Error message if no ticket found (auto-clears after 3 seconds)
- Rich tooltip: "AI finds the Jira ticket from PR context and opens it"

**Files Changed:**
- `src/main/prompts/jira-ticket.ts` - New prompt file for Jira extraction
- `src/main/prompts/index.ts` - Export new prompt
- `src/main/claude-api.ts` - Added `extractJiraTicket` function
- `src/main/index.ts` - Added IPC handler
- `src/preload/index.ts` - Exposed `extractJiraTicket` to renderer
- `src/renderer/components/PRDetail.tsx` - Added button, tooltip, and UI state
- `tests/mocks/electron.ts` - Added mock for `extractJiraTicket`
- `tests/renderer/components/PRDetail.test.tsx` - Added 6 tests

**Completed:** January 18, 2026

---

### 1.1.2 Persistent Data Cache (30-Minute TTL) ✅ Complete
> Cache API data to disk to survive app restarts and reduce GitHub API calls

**Problem Solved:**
- Previously, every app restart made fresh API calls to GitHub
- During development, this quickly hit rate limits
- Users had to wait for data to load on every app launch

**Implementation Summary:**
- Persistent cache stored in `electron-store` (survives app restart)
- 30-minute TTL for both PR data and repository list
- Cache validated by: timestamp + selected repos match
- Two-layer caching: session cache (10s) + persistent cache (30min)
- Clear logging shows cache hits/misses

**How It Works:**
```
1. App starts
2. Check session cache (in-memory, 10s TTL) → fast path
3. Check persistent cache (disk, 30min TTL) → medium path
4. If both miss → API call → update both caches
```

**Cache Invalidation:**
- Automatic after 30 minutes
- When selected repos change (different repo set = cache miss)
- When user logs out (clears all caches and user data)
- Manual refresh button clears cache and triggers fresh fetch ✅

**Technical Details:**
- `DataCache` interface in `store.ts` with `prData` and `allRepos`
- `CACHE_TTL_PR_DATA` and `CACHE_TTL_ALL_REPOS` constants (30 min)
- `isCacheValid(lastFetch, ttl)` helper function

---

### 1.1.3 "Why Open?" PR Analysis (Agentic Button) ✅ Complete
> AI-powered analysis of why a PR is still open, with persistence

**Concept:**
Click a button in the PR detail header, and AI analyzes CI status, reviews, comments, and description to explain why the PR is still open and what action is needed to move it forward.

**Implementation Summary:**
- HelpCircle icon button in PR detail header
- Gathers comprehensive PR context: CI checks, reviews, comments, review threads, PR metadata
- AI analyzes blockers and provides actionable summary (2-4 sentences)
- Analysis is persisted per PR and survives app restart
- User can refresh analysis to get updated insights
- Analysis panel is collapsible
- **Panel open/closed state is persisted per PR** - if user leaves panel open on one PR and switches to another, the panel state is remembered when returning

**Context Sent to AI:**
- PR number, title, description, author
- Branch information (head → base)
- Draft status and creation date
- File change stats (additions, deletions, changed files)
- CI/CD checks with status and conclusions
- Reviews with state (approved, changes_requested, commented) and bodies
- All comments with full content
- Review thread status (resolved/unresolved count)

**Technical Details:**
- `analyzePRStatusStreaming()` function in `claude-api.ts` - streaming with extended thinking
- Extended thinking enabled with 8K token budget for deeper reasoning
- IPC handlers: `analyze-pr-status`, `analyze-pr-status-streaming`, `get-pr-analysis`, `delete-pr-analysis`
- IPC handlers for panel state: `get-pr-analysis-panel-open`, `set-pr-analysis-panel-open`
- Stream chunks: `thinking` → `text` → `done`/`error`
- `PRAnalysis` interface in `store.ts` with `prId`, `analysis`, `generatedAt`
- `prAnalysisPanelStates: Record<string, boolean>` for panel open/closed state per PR
- Persistence via `electron-store` with 100-entry limit for analyses, 200-entry limit for panel states
- Abstract prompt: Claude determines blockers from provided context

**UI:**
- HelpCircle icon button in PR detail header
- Button highlights when analysis is displayed
- Collapsible analysis panel with:
  - "Why is this PR still open?" header
  - Refresh button to regenerate analysis
  - Close button to hide panel
  - Markdown-rendered analysis content
  - "Generated X ago" timestamp
- **Streaming loading state:**
  - "Starting analysis..." initially
  - "Thinking..." panel showing Claude's reasoning process in real-time
  - **Auto-scroll** — Thinking section scrolls to bottom as new content streams
  - Streaming analysis text as it arrives
- Error message display for failed analyses

**Files Changed:**
- `src/main/claude-api.ts` - Added `analyzePRStatus` and `analyzePRStatusStreaming` functions with extended thinking
- `src/main/store.ts` - Added `PRAnalysis` interface, persistence functions, and panel state persistence
- `src/main/index.ts` - Added 6 IPC handlers (4 for analysis including streaming, 2 for panel state)
- `src/preload/index.ts` - Exposed analysis, streaming, and panel state functions to renderer
- `src/renderer/components/PRDetail.tsx` - Added button, panel, UI state, streaming display, and panel state persistence
- `tests/mocks/electron.ts` - Added mocks for analysis, streaming, and panel state functions
- `tests/renderer/components/PRDetail.test.tsx` - Added 14 tests (10 for analysis, 4 for panel state)
- `tests/main/store.test.ts` - Added 18 tests (10 for analysis, 8 for panel state)

**Completed:** January 18, 2026
- `setPRDataCache(data, selectedRepos)` stores with repo key
- Session cache supplements persistent cache for rapid re-fetches

**Files Changed:**
- `src/main/store.ts` - Added DataCache interface and cache functions
- `src/main/index.ts` - Updated fetch handlers to use persistent cache
- `tests/main/store.test.ts` - Added 15 tests for cache functionality

**Completed:** January 18, 2026

---

### 1.1.1 My PRs Filter Persistence ✅ Complete
> Persist the "My PRs" filter toggle state per repository, shared across all views

**Implementation Summary:**
- Added `myPRsRepos` as app-level setting in electron-store (not view-specific)
- Created `MyPRsFilterContext` in App.tsx shared by both Canvas and IDE views
- Filter state synced across views - toggling in Canvas affects IDE and vice versa
- State restored on app restart, remembering which repos have filter enabled
- Each repository maintains independent filter state

**Completed Features:**
- [x] Store `myPRsRepos` at app level (shared across views)
- [x] Create `useMyPRsFilter` hook with context
- [x] Load saved state on app mount
- [x] Save state when toggle changes in any view
- [x] Filter state shared between Canvas (RepoCard) and IDE views
- [x] Independent persistence per repo

**Technical Details:**
- `myPRsRepos: string[]` in main store (not IDEViewSettings)
- `MyPRsFilterContext` provides `{ myPRsRepos, toggleMyPRsFilter, isMyPRsFilterEnabled }`
- Both `RepoCard` and `IDEView.TreeItem` consume the shared context

**Completed:** January 18, 2026

---

### 1.1.4 Minimize Repo Cards (Canvas View) ✅ Complete
> Allow users to minimize repo windows in Canvas view to save space

**Concept:**
Click a button on any repo card to minimize it to just the header, allowing more space for other cards while keeping the repo visible and accessible.

**Implementation Summary:**
- Chevron up/down button in repo card header
- Minimized cards show only header (~85px height)
- State persists across app restarts via electron-store
- Minimized cards cannot be resized (only dragged)
- Expand by clicking the chevron again

**Technical Details:**
- `minimizedRepos: string[]` in store schema
- `getMinimizedRepos()` and `setRepoMinimized(repoFullName, isMinimized)` functions
- IPC handlers: `get-minimized-repos`, `set-repo-minimized`
- Card height adjusts automatically in PRGrid

**Files Changed:**
- `src/main/store.ts` - Added minimizedRepos persistence
- `src/main/index.ts` - Added IPC handlers
- `src/preload/index.ts` - Exposed minimize functions to renderer
- `src/renderer/components/RepoCard.tsx` - Added minimize button and conditional rendering
- `src/renderer/components/PRGrid.tsx` - Added state management and height adjustment
- `tests/mocks/electron.ts` - Added mocks
- `tests/renderer/components/RepoCard.test.tsx` - Added 8 tests
- `tests/main/store.test.ts` - Added 6 tests

**Completed:** January 18, 2026

---

### 1.1.5 Per-Repo Reload Button ✅ Complete
> Reload PRs for a single repository without refreshing all data

**Concept:**
Click a refresh button on any repository card to reload just that repo's PRs without affecting other repos. Useful when you know a specific repo has new PRs but don't want to wait for a full refresh.

**Implementation Summary:**
- Refresh icon button added to repo card header (Canvas view)
- Refresh icon button on repo folder row (IDE view - appears on hover)
- Calls dedicated `refresh-repo-prs` IPC handler that bypasses cache
- Updates react-query cache locally with fresh data for that repo
- Shows loading spinner while fetching
- Does NOT affect other repos' data

**Technical Details:**
- New IPC handler `refresh-repo-prs` in main process
- Uses `fetchAllPRsForRepos` with single repo (always fresh, no cache)
- `handleReload(repoFullName)` in PRGrid and IDEView
- Updates query cache with new PRs while preserving other repos' data
- `isReloading` state in RepoCard and TreeItem components

**UI:**
- Canvas view: RefreshCw icon button in repo card header bar
- IDE view: RefreshCw icon button on repo row (visible on hover)
- Loading spinner replaces icon during reload
- Button disabled while loading

**Files Changed:**
- `src/main/index.ts` - Added `refresh-repo-prs` IPC handler
- `src/preload/index.ts` - Exposed `refreshRepoPRs` to renderer
- `src/renderer/components/RepoCard.tsx` - Added `onReload` prop and reload button
- `src/renderer/components/PRGrid.tsx` - Added `handleReload` function
- `src/renderer/components/IDEView.tsx` - Added `handleReload` and reload button to TreeItem
- `tests/mocks/electron.ts` - Added `refreshRepoPRs` mock
- `tests/renderer/components/RepoCard.test.tsx` - Added 4 tests
- `tests/renderer/components/IDEView.test.tsx` - Added 3 tests

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

### 2.3 Multi-Chat Sessions ✅ Complete
> Support multiple named AI conversations with full history persistence

**Concept:**
Users can create multiple AI chat sessions, name them, and switch between them. Each chat maintains its own conversation history and context.

**Implementation Summary:**
- **Conversation Navigator**: A popover dropdown in the AI chat header showing all conversations
- **General Chat**: Main AI conversation accessible from the navigator
- **PR-Specific Chats**: Chats linked to specific PRs, created via "Start Chat" button on PRs
- **Switch Between Chats**: Click on any conversation to switch to it instantly
- **Delete Conversations**: Hover over a PR chat to reveal delete button
- **Message Count & Time**: Each PR chat shows message count and last updated time
- **Sorted by Recency**: Conversations sorted by most recently updated

**UI:**
```
┌──────────────────────────────────────────────────────────────┐
│  🐕 AI Assistant   [📋] [←] [⚙️] [🗑️] [×]                    │
├──────────────────────────────────────────────────────────────┤
│  Conversation Popover (on [📋] click):                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Conversations                                          │  │
│  │ ─────────────────────────────────────────────────────  │  │
│  │ 💬 General Chat ────────────────────────── Active      │  │
│  │    Main AI conversation                                │  │
│  │ ─────────────────────────────────────────────────────  │  │
│  │ PR Conversations (2)                                   │  │
│  │ 🔀 #123 Fix auth bug ─────────── 2 msgs • 5m ago  [×]  │  │
│  │    owner/repo                                          │  │
│  │ 🔀 #456 Add feature ──────────── 0 msgs • 1h ago  [×]  │  │
│  │    owner/repo                                          │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Files Changed:**
- `src/renderer/components/AIChat.tsx` - Added PRChatInfo interface, allPRChats state, conversation navigator UI
- `src/renderer/App.tsx` - Added switchToPRChat function, passed to AIChatPanel
- `tests/renderer/components/AIChat.test.tsx` - Added 6 tests for conversation navigation

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

### 2.4 Open PR in AI Chat ✅ Complete
> One-click to open a PR in a new AI conversation with full context

**Concept:**
Click a button on any PR to open a new AI chat session with the PR's full context pre-loaded. Claude immediately understands which PR you're discussing and can review it.

**Implementation Summary:**
- Dog icon button added to PR detail header (next to other action buttons)
- Creates or opens existing PR-specific chat session
- PR context banner displayed in AI chat header when in PR mode
- Separate message history per PR (persisted to disk)
- Back button to return to general chat
- Chat history persists across app restarts
- **Selected conversation persists** — App remembers which chat (general or PR-specific) was active and restores it on restart
- **Auto-switch on PR selection** — Switching PRs automatically shows that PR's chat (or empty state with CTA if no chat exists)

**Technical Details:**
- `PRChat` interface in `store.ts` - stores per-PR chat sessions
- Max 50 PR chats stored (oldest removed when limit reached)
- `PRChatContext` in App.tsx for state management
- `usePRChat()` hook exported for components
- IPC handlers: `get-pr-chats`, `get-pr-chat`, `create-pr-chat`, `add-message-to-pr-chat`, `get-pr-chat-messages`, `clear-pr-chat-messages`, `delete-pr-chat`, `get-active-pr-chat-id`, `set-active-pr-chat-id`

**UI:**
- PR Chat header: "PR Chat" with PR number badge
- PR Context banner below header showing:
  - PR icon
  - PR number and title
  - Repository name
- Back arrow button to return to general chat
- Clear chat clears PR-specific history

**Files Changed:**
- `src/main/store.ts` - Added PRChat interface and persistence functions
- `src/main/index.ts` - Added 9 IPC handlers for PR chat operations
- `src/preload/index.ts` - Exposed PR chat functions to renderer
- `src/renderer/App.tsx` - Added PRChatContext, openPRInChat, closePRChat
- `src/renderer/components/AIChat.tsx` - Updated to support linked PR chats
- `src/renderer/components/PRDetail.tsx` - Added "Start AI Chat" button
- `tests/mocks/electron.ts` - Added mocks for PR chat functions
- `tests/utils/render.tsx` - Added PRChatProvider for tests

**Completed:** January 18, 2026

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

**Note:** Implemented a simplified version without full multi-chat UI. PR chats are stored separately and can be switched via the PR detail "Start Chat" button.

**Estimated Time:** ~4 hours (actual: ~2 hours)

---

### 2.5 System Context Awareness ✅ Complete
> Give the AI Assistant knowledge about CodeLobby so it understands its environment

**Problem Solved:**
- Previously, the AI had no knowledge about what system it was running in
- Users had to explain the context ("I'm using a PR tool...")
- AI couldn't give app-specific guidance or mention features

**Implementation Summary:**
- Created `system-prompt.ts` with `CODELOBBY_SYSTEM_PROMPT` constant
- System prompt includes:
  - What CodeLobby is (PR management desktop app)
  - Core features (Canvas/IDE views, CI visibility, etc.)
  - All AI capabilities (PR analysis, preview finder, PR chat)
  - Technical details (local storage, GitHub API, caching)
  - AI's role and expected behavior
- Applied automatically to all general chat messages
- PR-specific chats use PR context instead (more specific)

**How It Works:**
```
General Chat:
  User message → [CodeLobby System Prompt] + [Message History] → Claude

PR-Specific Chat:
  User message → [PR Context System Prompt] + [Message History] → Claude
```

**System Prompt Structure:**
```typescript
const CODELOBBY_SYSTEM_PROMPT = `
You are the AI Assistant embedded in CodeLobby, a desktop application 
for managing GitHub Pull Requests.

## About CodeLobby
[Core features, view modes, CI visibility...]

## AI-Powered Features
[This conversation, Open Preview, Why Open, PR Chat...]

## Technical Details
[Local storage, GitHub API, rate limits...]

## Your Role
[Helpful, technical, concise, PR-focused...]
`
```

**Files Changed:**
- `src/main/system-prompt.ts` - New file with CodeLobby system prompt
- `src/main/index.ts` - Import and use system prompt for general chat

**Result:**
- AI now responds correctly to "What is this app?" or "What can you do?"
- AI gives contextual help knowing it's in a PR management tool
- AI understands its capabilities and can guide users appropriately

**Completed:** January 18, 2026

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

### 2.7 PR Scoring (AI-Powered) 🔴 Not Started
> AI-powered PR quality scoring with customizable criteria

**Concept:**
A button on each PR that uses AI to analyze and score the PR based on configurable criteria. Users can define their own scoring system through a settings UI.

**Why This Matters:**
- **Objective Assessment** — Get consistent quality scores across all PRs
- **Customizable** — Define what matters to your team (security, tests, docs, etc.)
- **Prioritization** — Quickly identify which PRs need more attention
- **Learning** — Help developers understand quality expectations

**UI Design - PR Score Button:**
```
┌─────────────────────────────────────────────────────────────┐
│  PR #123: Add authentication flow         [⭐ 8.5/10]      │
│                                                             │
│  Score Breakdown:                                           │
│  ├── Code Quality:      9/10  ████████░░                   │
│  ├── Test Coverage:     7/10  ██████░░░░                   │
│  ├── Documentation:     8/10  ███████░░░                   │
│  ├── Security:          9/10  ████████░░                   │
│  └── Best Practices:    8/10  ███████░░░                   │
│                                                             │
│  AI Feedback:                                               │
│  "Strong PR with good test coverage. Consider adding       │
│   error handling docs for the OAuth edge cases."           │
└─────────────────────────────────────────────────────────────┘
```

**UI Design - Scoring Criteria Settings:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ PR Scoring Settings                                [×] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Scoring Criteria                           [+ Add]         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Code Quality (Weight: 25%)              [✏️] [🗑️]      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Check for clean code principles:                        ││
│  │ - Single responsibility                                 ││
│  │ - No magic numbers                                      ││
│  │ - Meaningful variable names                             ││
│  │ - No deeply nested conditionals (>3 levels)             ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🧪 Test Coverage (Weight: 25%)             [✏️] [🗑️]      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Verify tests are present and meaningful:                ││
│  │ - New functions have unit tests                         ││
│  │ - Edge cases are covered                                ││
│  │ - Tests are not just happy path                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  📚 Documentation (Weight: 15%)             [✏️] [🗑️]      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Check documentation quality:                            ││
│  │ - Public functions have JSDoc                           ││
│  │ - Complex logic has comments                            ││
│  │ - README updated if needed                              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🔒 Security (Weight: 20%)                  [✏️] [🗑️]      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Check for security best practices:                      ││
│  │ - No hardcoded secrets                                  ││
│  │ - Input validation present                              ││
│  │ - No SQL injection vulnerabilities                      ││
│  │ - Proper error handling (no stack traces exposed)       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ✅ Best Practices (Weight: 15%)            [✏️] [🗑️]      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ General best practices:                                 ││
│  │ - Follows project conventions                           ││
│  │ - No console.log in production code                     ││
│  │ - Proper error messages                                 ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Presets: [Default] [Security-Focused] [Startup-Fast]      │
│                                                             │
│                           [Cancel] [Save Settings]          │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] **Score Button** — Star icon button on each PR
- [ ] **AI Scoring** — Claude analyzes PR against criteria
- [ ] **Score Breakdown** — Show individual category scores
- [ ] **AI Feedback** — Natural language improvement suggestions
- [ ] **Criteria Editor** — Add, edit, delete scoring criteria
- [ ] **Weight System** — Assign importance to each criterion
- [ ] **Presets** — Pre-built scoring profiles (Security, Speed, Quality)
- [ ] **Score History** — Track scores over time
- [ ] **Team Benchmarks** — Compare against team averages (optional)
- [ ] **Score Badge** — Show score in PR card list

**Data Model:**
```typescript
interface ScoringCriterion {
  id: string
  name: string
  weight: number          // 0-100, all weights must sum to 100
  prompt: string          // Custom instructions for AI
  icon?: string           // Emoji or icon identifier
  enabled: boolean
}

interface PRScore {
  prId: string
  overallScore: number    // 0-10 weighted average
  categoryScores: {
    criterionId: string
    score: number         // 0-10
    feedback: string      // AI explanation for this score
  }[]
  summary: string         // Overall AI feedback
  scoredAt: string        // ISO timestamp
}

interface ScoringSettings {
  criteria: ScoringCriterion[]
  presets: {
    name: string
    criteria: ScoringCriterion[]
  }[]
}
```

**Implementation Steps:**
- [ ] Add `scoringSettings` to electron-store
- [ ] Create `ScoringSettingsDialog` component
- [ ] Create `PRScoreButton` component
- [ ] Create `PRScorePanel` component (shows breakdown)
- [ ] Add `scorePR(prId, criteria)` function in claude-api.ts
- [ ] Add IPC handlers for scoring operations
- [ ] Add score persistence (prScores array in store)
- [ ] Create default scoring criteria presets

**Technical Notes:**
- Build prompt dynamically from user's criteria
- Use extended thinking for deeper analysis
- Stream scoring results for better UX
- Cache scores per PR (invalidate on PR update)
- Limit criteria count to prevent token overflow

**Estimated Time:** ~8 hours

---

### 2.8 Daily Standup Generator (AI-Powered) 🔴 Not Started
> Generate daily standup notes from your activity history

**Concept:**
One-click button to generate your daily standup speech based on PRs you've reviewed, comments you've made, branches you've worked on, and commits you've pushed. Perfect for morning standups when you can't remember what you did yesterday.

**Why This Matters:**
- **Memory Aid** — Never struggle to remember what you worked on
- **Time Saver** — Generate standup notes in seconds, not minutes
- **Comprehensive** — Captures all activity across repos automatically
- **Professional** — Well-structured, clear communication

**Activity Tracking:**
The app tracks your interactions throughout the day:
```
📊 Activity Types Tracked:
├── PRs you created or updated
├── PRs you reviewed (approved, requested changes, commented)
├── Comments you made on any PR
├── Branches you switched to (via workspace feature)
├── CI failures you investigated
├── AI conversations about specific PRs
└── Time spent on each PR (optional)
```

**UI Design - Generate Button:**
```
┌─────────────────────────────────────────────────────────────┐
│  Header                              [📋 Daily] [🐕] [⚙️]   │
│                                          ↑                  │
│                                   Generate standup          │
└─────────────────────────────────────────────────────────────┘
```

**UI Design - Standup Notes Panel:**
```
┌─────────────────────────────────────────────────────────────┐
│  📋 Daily Standup Notes                 [Copy] [Edit] [×]   │
├─────────────────────────────────────────────────────────────┤
│  Generated for: Friday, January 17, 2026                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ## Yesterday I worked on:                                  │
│                                                             │
│  **Authentication Flow (PR #123)**                          │
│  - Implemented OAuth 2.0 with Google provider               │
│  - Added token refresh logic                                │
│  - Addressed 3 review comments from @alice                  │
│  - CI is now passing ✓                                      │
│                                                             │
│  **Bug Fix: Rate Limiter (PR #456)**                        │
│  - Reviewed and approved @bob's fix                         │
│  - Suggested adding retry logic in comments                 │
│                                                             │
│  **Investigated CI Failure**                                │
│  - Flaky e2e test in product-api repo                       │
│  - Root cause: timing issue in async test                   │
│                                                             │
│  ## Today I plan to:                                        │
│  - [ ] Merge PR #123 after final review                     │
│  - [ ] Start work on user profile feature                   │
│  - [ ] Follow up on rate limiter deployment                 │
│                                                             │
│  ## Blockers:                                               │
│  - Waiting for @alice's final approval on PR #123           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  💡 AI-generated from your CodeLobby activity               │
│                                                             │
│               [🔄 Regenerate] [📤 Copy to Clipboard]        │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] **Activity Tracking** — Log user interactions with PRs, reviews, comments
- [ ] **Daily Summary Button** — One-click generation in header
- [ ] **AI Generation** — Claude creates natural, professional standup notes
- [ ] **Time Range Selection** — Yesterday, last 24h, this week
- [ ] **Copy to Clipboard** — Quick copy for Slack/Teams
- [ ] **Edit Before Copy** — Adjust generated notes manually
- [ ] **"Today I plan to"** — AI suggests next steps based on PR states
- [ ] **Blocker Detection** — Highlights waiting-on-review, CI failures
- [ ] **History** — View past standup notes
- [ ] **Templates** — Customize output format (bullet points, paragraphs, etc.)
- [ ] **Slack/Teams Integration** — Post directly to channel (optional)

**Data Model:**
```typescript
interface ActivityEntry {
  id: string
  type: 'pr_created' | 'pr_updated' | 'pr_reviewed' | 'comment_added' | 
        'branch_switched' | 'ci_investigated' | 'ai_chat_pr'
  timestamp: string
  prId?: string
  prNumber?: number
  prTitle?: string
  repoFullName?: string
  details?: string           // e.g., "approved", "requested changes", etc.
  metadata?: Record<string, unknown>
}

interface DailyStandup {
  id: string
  generatedAt: string
  dateRange: {
    from: string
    to: string
  }
  activities: ActivityEntry[]
  generatedNotes: string     // AI-generated markdown
  editedNotes?: string       // User's edited version
}

interface StandupSettings {
  enabled: boolean
  trackingEnabled: boolean   // Whether to log activity
  defaultTimeRange: '24h' | 'yesterday' | 'thisWeek'
  template: 'default' | 'bullets' | 'detailed' | 'custom'
  customTemplate?: string    // User's custom format prompt
  includeBlockers: boolean
  includePlanForToday: boolean
}
```

**Activity Logging Points:**
```typescript
// In App.tsx or relevant components:

// When user selects a PR
onSelectPR(pr) {
  logActivity({ type: 'pr_viewed', prId: pr.id, prNumber: pr.number, ... })
}

// When user starts AI chat about a PR
openPRInChat(pr) {
  logActivity({ type: 'ai_chat_pr', prId: pr.id, ... })
}

// When user clicks "Why Open?" 
analyzePR(pr) {
  logActivity({ type: 'ci_investigated', prId: pr.id, ... })
}

// Fetch from GitHub API:
// - Recent commits by user
// - Recent reviews by user
// - Recent comments by user
```

**AI Prompt Structure:**
```typescript
const standupPrompt = `
Generate a professional daily standup update based on this developer's activity.

## Activity Log (${timeRange}):
${activities.map(a => formatActivity(a)).join('\n')}

## Current PR States:
${openPRs.map(pr => `- #${pr.number}: ${pr.title} (${pr.status})`).join('\n')}

## Output Format:
1. "Yesterday I worked on:" - Summarize key accomplishments
2. "Today I plan to:" - Suggest logical next steps
3. "Blockers:" - List any waiting items or issues

Keep it concise (2-4 bullet points per section). Use active voice.
Group related activities together. Mention specific PR numbers.
`
```

**Implementation Steps:**
- [ ] Add `activityLog: ActivityEntry[]` to electron-store
- [ ] Add `standupHistory: DailyStandup[]` to electron-store
- [ ] Create `logActivity(entry)` function
- [ ] Add activity logging to key user interactions
- [ ] Create `StandupPanel` component
- [ ] Add "Daily" button to header
- [ ] Add `generateStandup(activities)` function in claude-api.ts
- [ ] Create `StandupSettingsDialog` for customization
- [ ] Add copy-to-clipboard functionality
- [ ] Implement time range picker

**Technical Notes:**
- Store activity log with 7-day rolling window (auto-prune older entries)
- Limit standup history to last 30 entries
- Activity logging should be lightweight and non-blocking
- Consider privacy: activity stays local, only sent to AI on generate
- Fetch recent GitHub activity (commits, reviews) on demand

**Stretch Goals:**
- [ ] **Voice Input** — "What else did you do?" to add manual notes
- [ ] **Auto-generate on Schedule** — Generate at 9 AM automatically
- [ ] **Team View** — See teammates' standups (if shared)
- [ ] **Trend Analysis** — "This week you spent most time on..."

**Estimated Time:** ~6 hours

---

### 2.9 Code Generation 🔴 Not Started (Future Vision)
> AI generates code fixes

- [ ] **Generate fix for CI failure** - Analyze error, propose code change
- [ ] **Address review comment** - Generate code based on feedback
- [ ] **Create PR description** - Auto-generate from diff analysis
- [ ] **Commit message generation** - Suggest conventional commit messages

**Technical Notes:**
- Requires git operations (clone, checkout, commit, push)
- Need secure sandbox for code generation
- Human review required before any automated commits

### 2.10 AI Features Settings & Custom Context 🔴 Not Started
> Allow users to see and customize AI-powered feature behavior

**Concept:**
A dedicated settings page that shows all AI-powered features, what context is provided to each, and allows users to add custom context to extend AI capabilities.

**Why This Matters:**
- **Transparency** — Users see exactly what data is sent to AI
- **Customization** — Add project-specific context (e.g., "Preview URLs always come from Vercel bot")
- **Power Users** — Fine-tune AI behavior without code changes

**UI Design:**
```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️ AI Features Settings                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔗 Open Preview                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Context Provided:                                       ││
│  │ • PR title and description                              ││
│  │ • All comments (general, review, threads)               ││
│  │                                                         ││
│  │ Custom Context (optional):                              ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Preview URLs are always posted by the "vercel[bot]" │ ││
│  │ │ user. Look for URLs containing "vercel.app".        │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │                                          [Save] [Reset] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ❓ Why Open? Analysis                                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Context Provided:                                       ││
│  │ • PR metadata (title, author, branch, dates)            ││
│  │ • CI/CD check statuses and conclusions                  ││
│  │ • Reviews with state and body                           ││
│  │ • Recent comments (last 10)                             ││
│  │ • Review thread resolution status                       ││
│  │                                                         ││
│  │ Custom Context (optional):                              ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ Our team requires at least 2 approvals before merge.│ ││
│  │ │ The "e2e-tests" check is flaky and can be ignored   │ ││
│  │ │ if it fails but other tests pass.                   │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │                                          [Save] [Reset] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  🐕 AI Assistant                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Context Provided:                                       ││
│  │ • Full conversation history                             ││
│  │ • Selected PR context (when applicable)                 ││
│  │                                                         ││
│  │ System Prompt (optional):                               ││
│  │ ┌─────────────────────────────────────────────────────┐ ││
│  │ │ You are helping a developer working on a TypeScript │ ││
│  │ │ monorepo using pnpm. Always suggest pnpm commands.  │ ││
│  │ └─────────────────────────────────────────────────────┘ ││
│  │                                          [Save] [Reset] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] **AI Features Overview** — List all AI-powered buttons/features
- [ ] **Context Transparency** — Show what data is provided to each feature
- [ ] **Custom Context Editor** — Text area to add additional instructions
- [ ] **Per-Feature Settings** — Each AI feature can be configured independently
- [ ] **System Prompt for Chat** — Customize the AI assistant's behavior
- [ ] **Presets** — Save and load custom context configurations
- [ ] **Per-Repository Overrides** — Different settings per repo (optional)
- [ ] **Reset to Default** — Easily revert customizations

**Data Model:**
```typescript
interface AIFeatureSettings {
  openPreview: {
    customContext: string | null
    enabled: boolean
  }
  whyOpen: {
    customContext: string | null
    enabled: boolean
  }
  aiChat: {
    systemPrompt: string | null
  }
}
```

**Implementation:**
- [ ] Add `aiFeatureSettings` to electron-store
- [ ] Create `AISettingsDialog` component
- [ ] Add settings button to Header (⚙️ next to AI toggle)
- [ ] Update `extractPreviewUrl` to include custom context in prompt
- [ ] Update `analyzePRStatusStreaming` to include custom context in prompt
- [ ] Update AI chat to use custom system prompt
- [ ] Add IPC handlers for get/set AI feature settings

**Technical Notes:**
- Custom context is appended to prompts, not replacing them
- Settings persist across app restarts via electron-store
- Validate custom context length (prevent token overflow)
- Show estimated token usage for custom context

**Benefits:**
| Use Case | Example Custom Context |
|----------|------------------------|
| Preview bots | "Preview URLs come from Netlify bot, look for deploy-preview links" |
| Flaky tests | "The 'visual-regression' test is flaky, don't flag it as a blocker" |
| Team rules | "We require 2 approvals, one must be from a CODEOWNERS member" |
| Monorepo | "This is a monorepo, PRs may only affect one package" |

**Estimated Time:** ~4 hours

---

### 2.11 Post Comment to PR from AI Chat 🔴 Not Started
> Allow users to post AI-drafted comments directly to PRs from the conversation

**Concept:**
When Claude drafts a response, suggestion, or review comment in the AI chat, users can post it directly to the PR as a comment without leaving the app. This bridges AI assistance with real GitHub actions.

**Why This Matters:**
- **Seamless Workflow** — No copy-paste between AI chat and GitHub
- **AI-Assisted Reviews** — Claude drafts, user approves and posts
- **Follow-up Automation** — Generate polite follow-ups and post them instantly
- **Time Savings** — One-click to post review feedback

**Use Cases:**
```
1. AI Review → Post as Review Comment
   User: "Review this PR for security issues"
   Claude: "Found 3 potential issues: [detailed feedback]"
   User: [📤 Post to PR] → Comment added to PR

2. Follow-up Draft → Post as Comment
   User: "Write a polite follow-up asking for review"
   Claude: "Hey @reviewer, friendly reminder..."
   User: [📤 Post to PR] → Comment added to PR

3. Answer Question → Post as Reply
   User: "How should I respond to this review comment?"
   Claude: "You could say: [suggested response]"
   User: [📤 Post as Reply] → Reply added to thread
```

**UI Design - Message Bubble Action Menu:**

Every Claude message bubble has a hover menu (appears on mouse enter) with contextual actions:

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Claude:                                          [⋮]    │
│                                                      ↑      │
│  Based on my analysis, here are the issues I found:  Menu   │
│                                                             │
│  1. **SQL Injection Risk** (line 45)                        │
│     The query uses string concatenation instead of          │
│     parameterized queries.                                  │
│                                                             │
│  2. **Missing Input Validation** (line 67)                  │
│     User input is not sanitized before processing.          │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Hover/Click [⋮] reveals dropdown menu:
┌────────────────────────────┐
│ 📋 Copy to Clipboard       │
│ 📤 Post to PR              │  ← Posts as general comment
│ 🔄 Regenerate              │
└────────────────────────────┘
```

**Menu Actions:**
| Action | Description | When Available |
|--------|-------------|----------------|
| 📋 Copy | Copy message content to clipboard | Always |
| 📤 Post to PR | Post as general comment to linked PR | Only in PR Chat |
| 🔄 Regenerate | Re-send previous message to get new response | Always |

**UI Design - Confirmation Dialog:**
```
┌─────────────────────────────────────────────────────────────┐
│  Post Comment to PR #123                               [×]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Preview:                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Based on my analysis, here are the issues I found:      ││
│  │                                                         ││
│  │ 1. **SQL Injection Risk** (line 45)                     ││
│  │    The query uses string concatenation instead of...    ││
│  │                                                         ││
│  │ [Edit before posting]                                   ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ⚠️ This will be posted publicly to the PR                  │
│                                                             │
│                              [Cancel] [📤 Post Comment]     │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- [ ] **"Post to PR" menu item** — In message bubble menu when in PR chat
- [ ] **Edit before posting** — Modify AI response before posting
- [ ] **Confirmation dialog** — Prevent accidental posts
- [ ] **Success feedback** — Show link to posted comment
- [ ] **Markdown preservation** — Keep formatting in posted comment
- [ ] **App attribution footer** — Appends "Posted from CodeLobby" at the end
- [ ] **Instant UI update** — Comment appears in PR detail immediately (optimistic update)

**Posted Comment Format:**
```markdown
Based on my analysis, here are the issues I found:

1. **SQL Injection Risk** (line 45)
   The query uses string concatenation instead of parameterized queries.

2. **Missing Input Validation** (line 67)
   User input is not sanitized before processing.

---
<sub>Posted from [CodeLobby](https://github.com/codelobby/app)</sub>
```

**Data Model:**
```typescript
interface PostCommentParams {
  prNumber: number
  repoFullName: string
  content: string
}
```

**Implementation Steps:**
- [ ] Add `postPRComment()` function in `github.ts` using REST API
- [ ] Add IPC handler `post-pr-comment` in main process
- [ ] Expose `postPRComment` to renderer via preload
- [ ] Add "Post to PR" item to message bubble menu
- [ ] Create `PostCommentDialog` component with edit textarea
- [ ] Add confirmation step with preview
- [ ] Add success toast with link to comment
- [ ] Cache update on success: Add comment to react-query cache after API confirms

**Instant Update Flow (Safe):**
```
1. User clicks "Post Comment"
2. Show loading spinner on button
3. API call to GitHub (~200-500ms)
4. GitHub returns success with comment data (id, created_at, html_url, etc.)
5. Update react-query cache:
   queryClient.setQueryData(['all-prs-for-repos'], (old) => {
     // Add new comment to the PR's comments array
   })
6. Comment appears in PR detail view - no manual reload needed!
7. Show success toast with link to comment
```

**Why not true optimistic update?**
- If API fails, user would see comment then it disappears (confusing)
- GitHub API is fast enough (~200-500ms) that waiting is fine
- We get real data (comment ID, timestamp) from the response

**Technical Notes:**
- Uses GitHub REST API: `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`
- Requires `repo` scope in GitHub PAT (already have)
- Handle rate limits (comments count toward limit)

**Security Considerations:**
- Always show confirmation before posting
- Allow editing to remove any hallucinated content

**Estimated Time:** ~4 hours

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
