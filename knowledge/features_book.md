# CodeLobby Features Book

> **Your PR Dashboard, Reimagined**  
> Stop context-switching. Start shipping.

---

## 🎯 What is CodeLobby?

CodeLobby is a **desktop application** that brings all your Pull Requests together in one beautiful, intelligent dashboard. No more juggling browser tabs, missing review requests, or wondering why a PR is stuck.

Built for developers who care about their workflow.

---

## ✨ Core Features

### 🖼️ Two Ways to Work

**Canvas View** — Your PRs as draggable cards
- Arrange your PRs however you like
- Resize cards to show more or less detail
- **Minimize cards** — Collapse repos to just their header to save space
- Group by project, priority, or whatever makes sense to you
- Perfect for visual thinkers

**IDE View** — A familiar tree structure
- Repository → PR hierarchy
- Quick keyboard navigation
- Compact and scannable
- Feels like your favorite code editor

Switch between views anytime. Your layout is remembered.

---

### 🔍 See Everything at a Glance

Every PR shows you what matters:

| What You See | Why It Matters |
|--------------|----------------|
| **CI Status** | Know if tests pass before clicking |
| **Review State** | See who approved, who requested changes |
| **Comment Count** | Spot active discussions instantly |
| **Time Open** | Identify PRs that need attention |
| **Draft Status** | Distinguish WIP from ready-to-review |

No more clicking into each PR just to check its status.

---

### 💬 Conversations Without the Noise

PR discussions can get messy. CodeLobby helps you focus:

- **Filter by People or Bots** — Hide automated comments when you need to
- **Thread Tracking** — See which discussions are resolved
- **Review Comments** — All feedback in one place
- **Rich Formatting** — Markdown renders beautifully

Read what matters, skip what doesn't.

---

### 🔧 CI/CD at Your Fingertips

Stop hunting through GitHub Actions logs:

- **All Jobs Visible** — See every check run
- **Grouped by Status** — Failed jobs rise to the top
- **One-Click Details** — Jump to the full log when needed
- **Real-Time Updates** — Watch jobs complete without refreshing

When CI fails, you'll know exactly where to look.

### ✨ AI CI Failure Analysis

When a CI check fails, get instant AI analysis:

**One Click:**
1. Click the sparkles (✨) icon on any failed check
2. AI fetches the actual CI logs and analyzes them
3. Get a summary of what failed and why

**What You See:**
- **Claude's Reasoning** — Watch the AI think through the logs in real-time
- **Failure Summary** — Clear explanation of what went wrong
- **Suggested Fix** — Actionable recommendations to resolve the issue

**Example:**
> "The test `auth.spec.ts` failed because `process.env.API_KEY` is undefined. The test expects this environment variable but it's not set in the CI environment. Add `API_KEY` to your GitHub Actions secrets."

Works with GitHub Actions logs. Third-party CI shows available metadata.

---

## 🤖 AI-Powered Features

### 🐕 Your AI Assistant

A built-in AI assistant powered by Claude that **understands CodeLobby**:

**What It Can Do:**
- Answer questions about your PRs
- Explain complex code changes
- Help draft commit messages
- Discuss debugging strategies
- Guide you through CodeLobby's features

**Context-Aware:**
The AI knows it's running inside CodeLobby. Ask it:
- "What can you do?"
- "How do I analyze a stuck PR?"
- "What features does this app have?"

It understands the full context of where it's running.

**How It Works:**
- Type naturally, like talking to a colleague
- See the AI's reasoning process as it thinks
- Conversation history is saved automatically
- Works offline with your stored context

Your conversations are private and stored locally.

---

### 🔗 Open Preview (AI-Powered)

Many PRs have preview/staging links buried in comments. Finding them is tedious.

**One Click:**
1. Click the globe icon on any PR
2. AI scans the description and comments
3. Preview URL opens in your browser

No more searching through bot comments for that Vercel link.

### 🌐 Webview Tabs

Open preview URLs directly within CodeLobby as browser-like tabs:

**How It Works:**
1. Click the **+** button in the PR detail header
2. Enter a URL (e.g., your staging/preview link)
3. The webview opens as a new tab alongside the PR content

**Webview Features:**

| Feature | Description |
|---------|-------------|
| **Refresh** | Reload the current page |
| **URL Display** | See the current URL |
| **Open External** | Open in your default browser |
| **Responsive Testing** | Test at mobile (375px) or desktop (1024px) widths |
| **Console Monitor** | See console.log, warnings, and errors from the page |
| **Screenshot Capture** | Drag to select a region and capture it |

**Responsive Testing:**
- Click the **Maximize** icon for full-width
- Click the **Phone** icon for mobile view (375px)
- Click the **Monitor** icon for desktop view (1024px)

**Console Monitor:**
- Terminal icon shows in the toolbar
- Badge appears when there are warnings/errors
- Red badge = errors, default = warnings
- **Ripple animation** when new messages arrive
- Click to see full console output with timestamps
- Messages auto-clear on page navigation

**Screenshot Capture:**
1. Click the scissors icon
2. Drag to select a region
3. Release to capture
4. Annotate with pencil/colors
5. Copy to clipboard or post to PR

**Tab Persistence:**
- Webview state is preserved when switching tabs
- Navigate away and back — your page stays loaded

---

### 🎫 Find Jira Ticket (AI-Powered)

Every PR should link to a Jira ticket. But sometimes they don't — or the link is buried in a branch name.

**One Click:**
1. Click the ticket icon on any PR
2. AI searches the PR title, branch name, description, and comments
3. Jira ticket opens in your browser

**Where It Looks:**
- Branch name (e.g., `feature/PROJ-123-add-login`)
- PR title (e.g., `[PROJ-123] Fix authentication`)
- PR description
- Comments (in case someone mentioned the ticket)

**Supported Formats:**
- Standard Jira keys: `PROJ-123`, `ABC-456`, `FEAT-99`
- Full Jira URLs: `https://company.atlassian.net/browse/PROJ-123`

No more manually searching for the related ticket.

---

### ❓ "Why Is This PR Still Open?" (AI-Powered)

Stale PRs happen. Understanding why requires clicking through CI, reviews, and comments.

**Instant Analysis:**
1. Click the help icon on any PR
2. Watch the AI think through the blockers
3. Get a clear, actionable summary

**What It Analyzes:**
- CI/CD failures and what's broken
- Pending reviews and who's blocking
- Unresolved discussions
- Draft status and merge readiness

**Example Output:**
> "This PR is blocked by 2 failing CI checks (lint, tests) and has 1 unresolved review thread about error handling. Once the lint issues are fixed and the review thread is addressed, it should be ready to merge."

The analysis is saved per PR, so you don't re-analyze unnecessarily.

---

### 🔬 Deep AI Code Review (Coming Soon)

Current AI features only see the PR diff and comments. But real code reviews need **full context**.

**The Problem:**
- AI can't see related files, utilities, or types
- Misses bugs in code that wasn't changed but is affected
- Can't suggest cross-file refactoring
- Security analysis is limited to visible code

**The Solution — Deep Review:**
1. Click "Deep Review" on any PR
2. Branch is cloned locally (one-time)
3. AI can now read **any file** in the codebase
4. Get comprehensive reviews that find hidden issues

**What Deep Review Can Find:**
| Issue Type | Example |
|------------|---------|
| **Cross-file bugs** | "This change breaks `utils/auth.ts` which imports this" |
| **Missing tests** | "The new `validateToken()` function has no tests" |
| **Security issues** | "Password hashing in `hash.ts` uses deprecated algorithm" |
| **Dead code** | "This removed function is still imported in 3 places" |
| **Architectural issues** | "Consider extracting this into a shared middleware" |
| **Pattern deviations** | "Your code doesn't follow the middleware pattern used in `main`" |
| **Regressions** | "This changes bcrypt rounds from 12 to 10 — weaker security" |

**Branch Comparison — See What Changed vs Main:**
- Compare any file between `main` and your branch
- Detect pattern deviations from existing codebase
- Spot regressions (things that got worse)
- Ensure new code follows existing conventions

**How It Works:**
- AI uses tools: `read_file`, `search_codebase`, `find_usages`, `compare_branches`
- Can read files as they exist in `main` for comparison
- Reviews scope can be: changed files, related imports, or entire codebase
- Findings can be posted directly to the PR

This is code review as it should be — with **full context**.

---

### 💬 Start AI Chat on Any PR

Want to discuss a specific PR with the AI? Don't copy-paste context manually.

**One Click:**
1. Click the dog icon on any PR
2. A dedicated chat session opens for that PR
3. Start asking questions immediately

**How It Works:**
- Each PR gets its own conversation history
- The AI knows which PR you're discussing
- **Auto-switch** — Clicking a different PR automatically shows its chat
- If no chat exists, you'll see an empty state with "Start chatting about this PR"
- Conversations persist across sessions

**Full Code Context:**
When you start a PR chat, the AI receives comprehensive context including:
- PR metadata (title, author, branch, status)
- Full description and labels
- CI/CD status with failed check details
- Review status and unresolved threads
- All comments and discussions
- **Complete file diffs** — The actual code changes with additions and deletions

This means the AI can:
- Review specific lines of code you changed
- Identify potential bugs in your diff
- Suggest improvements to your implementation
- Explain complex changes in plain English

**Use Cases:**
- "Review this code for bugs"
- "What are the potential risks in these changes?"
- "Help me write a review comment for line 45"
- "Explain what this function change does"
- "Are there any security issues in my changes?"

---

### 📝 AI-Generated PR Reviews

Generate complete GitHub PR reviews with the AI assistant. Claude analyzes the code changes and produces a structured review with inline comments that you can preview, edit, and submit.

**How It Works:**
1. Click "Generate Review" quick action or ask "Generate a code review"
2. Claude analyzes all file changes and produces a structured review
3. A **"Open Review"** button appears in the AI response
4. Click to open the Review Preview modal
5. Edit the summary, adjust inline comments, and select your verdict
6. Submit directly to GitHub

**Review Preview Modal:**
| Feature | Description |
|---------|-------------|
| **Summary Editor** | Edit the overall review summary |
| **Verdict Selection** | Choose: Approve, Request Changes, or Comment |
| **Sticky Sidebar** | File navigation panel with comment counts per file |
| **Expand/Collapse All** | Quickly expand or collapse all file sections |
| **Inline Comments** | View comments in context with the diff |
| **Edit Comments** | Modify any AI-generated comment before submission |
| **Delete Comments** | Remove unwanted comments before submission |
| **Scroll Indicator** | Visual indicator when there's more content to scroll |
| **Comment Badges** | Total comments across all files shown at top |

**Sidebar Navigation:**
- Sticky sidebar shows all files with comments
- Comment count badge per file
- Click to jump to any file
- Current file highlighted
- Directory path shown for context

**Comment Editing:**
- Click the pencil icon on any comment
- Edit in a text area
- Save or Cancel changes
- Original comment preserved until you save

**Verdict Options:**
- **Approve** — Code is good to merge
- **Request Changes** — Significant issues that must be fixed
- **Comment** — Feedback without explicit approval/rejection

**What Gets Submitted:**
- Overall review summary
- Inline comments attached to specific file lines
- Your selected verdict (Approve/Request Changes/Comment)

**Example Flow:**
1. Select a PR with changes
2. Click "Generate Review" in quick actions
3. AI responds with JSON review data + "Open Review" button
4. Review modal shows: summary, verdict, and all inline comments
5. Use sidebar to navigate between files
6. Edit or delete comments as needed
7. Click "Submit Review" → Review appears on GitHub

**Best For:**
- Comprehensive code reviews
- Bulk commenting on multiple files
- Consistent review workflows
- Quick approval with feedback

The AI generates reviews based on the full diff context, ensuring comments reference correct file paths and line numbers.

---

### ⚡ Quick Actions & Custom Prompts

Start AI conversations faster with pre-defined quick actions. Plus, create your own custom prompts for frequently used requests.

**Built-in Quick Actions:**
| Context | Actions Available |
|---------|-------------------|
| **PR Chat** | **Generate Review**, Find bugs, Summarize, Why is CI failing? (if CI is failing), Security review, Suggest improvements |
| **General Chat** | Explain this code, Best practices, Help me debug |

**Context-Aware:**
- "Why is CI failing?" only appears when CI is actually failing
- PR-specific prompts include full code diff context
- One-click sends the prompt immediately (no extra steps)

**Custom Prompts — Save Your Own:**
1. Click the **+** button at the start of the quick actions row
2. A **modal dialog** opens with a full-featured prompt editor
3. Enter a **label** (max 30 characters — this is the button text)
4. Write your **prompt** in a large text area with room to craft detailed instructions
5. Click **Save Prompt** or press **⌘+Enter** to save

**The Prompt Editor:**
- **Large text area** — Room to write multi-line, detailed prompts
- **Monospace font** — Perfect for formatting code examples
- **Character counter** — See label length in real-time
- **Placeholder examples** — Shows you what a good prompt looks like
- **Validation** — Catches missing fields before saving

**Managing Custom Prompts:**
- Custom prompts appear with a distinct **highlighted style**
- Hover over any custom prompt to reveal the **delete** button
- Your prompts are **persisted** — they survive app restarts
- Use them for frequent requests like "Check for TypeScript errors" or "Suggest better variable names"

**Pro Tips:**
- Keep labels short (max 30 chars — they appear on small buttons)
- Make prompts specific and detailed — the editor gives you room!
- Include formatting like bullet points for structured reviews
- Your custom prompts work in both general and PR-specific chats

---

### 💬 AI Chat Navigation

Switch between general AI chat and PR-specific conversations seamlessly.

**How It Works:**
- **General Chat** — Open the AI panel to access your main conversation
- **PR Chat** — Click the dog icon on any PR to start or continue that PR's chat
- **Auto-Switch** — When you select a PR with an existing chat, the AI panel automatically shows that conversation

**Features:**
- **Separate Histories** — Each PR has its own conversation history
- **Persistent** — Conversations survive app restarts
- **Context-Aware** — PR chats include full PR context (diff, comments, CI status)
- **Back Button** — Return to general chat from any PR conversation

Perfect for code reviews, understanding complex changes, or getting a second opinion.

---

### 🌐 Web Fetch Tool

Enable Claude to fetch web pages during your conversation:

**How to Enable:**
1. Open AI Chat settings (gear icon)
2. Toggle "Web Fetch" on
3. Now Claude can retrieve URL content on demand

**Use Cases:**
- "Fetch the README from this GitHub repo and summarize it"
- "Get the documentation from this URL and explain the API"
- "Look up the latest release notes for React"

**How It Works:**
- Claude decides when it needs to fetch a URL
- CodeLobby fetches the content server-side (no CORS issues)
- Content is extracted and returned to Claude
- Claude continues its response with the fetched data

**Privacy:** All fetching happens through your local machine. URLs are not logged or stored.

---

## 🔧 PR Actions

Take action on PRs directly from CodeLobby — no need to switch to GitHub.

### ✅ Approve PR

One-click approval for PRs you've reviewed:

**How It Works:**
1. Review the PR details, changes, and CI status
2. Click the **Approve** button (checkmark icon)
3. Your approval is submitted to GitHub

**Smart States:**
- **Can Approve** — Green button, ready to click
- **Already Approved** — Shows "Approved" with checkmark
- **Author's Own PR** — Button disabled (can't self-approve)

### 🔀 Merge PR

Merge PRs when they're ready:

**Merge Methods:**
| Method | Description |
|--------|-------------|
| **Squash** | Combine all commits into one (default) |
| **Merge** | Create a merge commit |
| **Rebase** | Rebase and merge |

**How It Works:**
1. Click the **Merge** button (when PR is mergeable)
2. Select your preferred merge method
3. Click **Confirm Merge**
4. PR is merged and data refreshes

**Safety Features:**
- Shows merge status (blocked, conflicts, ready)
- Confirmation dialog before merge
- Error handling with clear messages

### 💬 Post Comment

Add comments to PRs directly from CodeLobby:

**How It Works:**
1. Open a PR in the detail panel
2. Scroll to the Discussion section
3. Click "Add a comment..." to expand the form
4. Write your comment (Markdown supported)
5. Click **Comment** or press **⌘/Ctrl+Enter** to submit

**Features:**
- **Expandable Form** — Compact by default, expands when clicked
- **Markdown Support** — Write rich comments with formatting
- **Keyboard Shortcuts** — ⌘/Ctrl+Enter to submit, Escape to cancel
- **Success Feedback** — Visual confirmation when comment is posted
- **Auto-Refresh** — PR data refreshes automatically after posting

**Perfect For:**
- Quick feedback on PRs
- Asking questions about changes
- Providing context for reviewers
- Following up on discussions

### 🗑️ Delete Comment

Remove your own comments from PRs:

**How It Works:**
1. Hover over any comment you authored
2. A trash icon appears next to the copy button
3. Click to delete — the comment is removed from GitHub

**Note:** You can only delete your own comments, not others'.

---

## 📡 Network Panel

Debug and monitor all HTTP requests in real-time with full request/response inspection:

**Access:**
1. Click the network icon in the header
2. Network panel opens in the right sidebar
3. Watch requests stream in as they happen

**What You See:**
| Column | Information |
|--------|-------------|
| **Method** | Human-readable name (e.g., "GitHub GraphQL", "fetchPRs") |
| **HTTP Method** | GET, POST, etc. |
| **URL** | Request endpoint |
| **Status** | HTTP status code (200, 404, etc.) |
| **Time** | Request duration in ms |
| **Size** | Response size in bytes |

**Features:**
- **Search** — Filter requests by URL or method
- **Expand** — Click any request to see full details
- **Request Body** — View complete GraphQL queries and POST data
- **Response Body** — Inspect full JSON responses
- **Rate Limit** — See API usage in real-time

**How It Works:**

The network panel intercepts ALL `fetch()` calls globally to capture complete request/response data:

```
Component → fetch() → Interceptor captures → TanStack cache → Panel displays
```

This means you see:
- Full GraphQL queries sent to GitHub
- Complete JSON responses
- Exact timing for each request
- HTTP status codes and error messages

**Useful For:**
- Debugging API issues (see exact request/response)
- Understanding rate limit usage
- Monitoring GitHub GraphQL/REST traffic
- Troubleshooting GitHub API errors
- Verifying GraphQL query structure

> **Note:** AI runs as a Claude Code CLI subprocess over IPC, so AI calls do **not** appear here — the panel only captures GitHub `fetch()` traffic.

The panel can be resized vertically when both AI and Network panels are open. Drag the resize handle between panels to adjust the split.

---

## 🎨 Designed for Developers

### Dark Mode (Obviously)

A beautiful dark theme that's easy on the eyes during late-night coding sessions. Light mode available for the brave.

### Native Desktop Experience

- **Fast** — No browser overhead
- **Keyboard Friendly** — Navigate without touching your mouse
- **System Integration** — Desktop notifications when you need them
- **Always Available** — Keep it in your dock

### Remembers Your Preferences

Everything persists across sessions:
- Window positions and sizes
- Expanded/collapsed sections
- Filter settings per repository
- AI conversation history (stored in SQLite database)
- Custom quick prompts (stored in SQLite database)
- Panel open/closed states
- **Selected AI conversation** — Resume exactly where you left off

Close the app Friday, open it Monday — everything is exactly where you left it.

**Powered by SQLite:**
- Conversations and messages are stored in a local SQLite database
- Efficient even with thousands of messages
- No external services — all data stays on your machine

### Fresh Start When You Need It

**Refresh Button** — Clear cache and reload all data:
- Click the refresh icon in the header
- Clears all cached PR and repository data
- Triggers a fresh fetch from GitHub
- Perfect when you know data has changed

**Per-Repo Reload** — Refresh just one repository:
- Each repo has its own reload button
- Canvas view: In the repo card header
- IDE view: Hover over a repo folder to reveal
- Only refreshes that repo's PRs — others stay cached
- Perfect when you know a specific PR was updated

**Sign Out** — Clean slate:
- Clears all user data and cache
- Preserves your settings
- Log back in to start fresh

**Factory Reset** — Complete wipe:
- Erases **ALL** data (including tokens and settings)
- Returns app to fresh install state
- Found in About dialog → "Factory Reset" button
- Two-step confirmation prevents accidents
- Use when troubleshooting or before uninstalling

| What Gets Cleared | Sign Out | Factory Reset |
|-------------------|----------|---------------|
| GitHub Token | ✅ | ✅ |
| Cache & History | ✅ | ✅ |
| Settings | ❌ | ✅ |

---

## 🔒 Privacy & Security

### Your Data Stays Yours

- **Local Storage** — All data stored on your machine
- **Encrypted Tokens** — Your GitHub Personal Access Token is encrypted at rest
- **No Telemetry** — We don't track you
- **Open Architecture** — See exactly what data is stored

### Minimal Permissions

CodeLobby only asks for what it needs:
- Read access to your repositories
- Read access to pull requests and comments
- That's it

---

## 📋 Activity Logs & Debugging

### Comprehensive Logging System

CodeLobby includes a full logging system for debugging and understanding app behavior:

**What Gets Logged:**
- API calls (IPC) with timing and response summaries
- HTTP requests to external services (GitHub)
- Store operations (read/write) with performance metrics
- User interactions and navigation events

**View Logs:**
1. Click the "Logs" button in the header
2. Browse logs in a timeline view (newest first)
3. Filter by level (debug, info, warn, error) or category
4. Search through log messages
5. Copy all logs or last N logs to clipboard
6. Export logs as JSON file

**Log Categories:**
| Category | What It Tracks |
|----------|----------------|
| App | General application events |
| API | IPC calls between renderer and main process |
| HTTP | External HTTP requests (GitHub API) |
| GraphQL | GitHub GraphQL queries |
| Store | Local storage read/write operations |
| Cache | TanStack Query cache persistence |

**For Developers:**
- Logs persist to disk and survive app restarts
- 1000 log limit with automatic rotation
- All timestamps include millisecond precision
- Cache persistence uses throttling and change detection to minimize disk writes

---

## 📊 Rate Limit Awareness

GitHub has API limits. CodeLobby respects them:

- **Visual Gauge** — See your remaining API calls
- **Reset Timer** — Know when limits refresh
- **Tiered Caching** — PRs cached for 15 minutes, repos for 1 hour
- **Graceful Handling** — Clear messages when limits are reached

Never wonder why data isn't loading.

---

## 📊 AI Usage (Subscription)

CodeLobby's AI runs on the **Claude Code CLI**, so usage is covered by your **Claude Pro/Max subscription** — there's no metered per-token API cost and no bill to track.

**What You See:**
The AI indicator in the header shows:
- **CLI Status** — Whether the Claude Code CLI is installed and logged in
- **Subscription Usage** — Usage stats read from `~/.claude/stats-cache.json`

**How It Works:**
- The Electron main process spawns the `claude` CLI as a subprocess for every AI request (chat, PR analysis, CI analysis)
- The CLI authenticates with your existing Claude login (OAuth) — there is **no Anthropic API key**
- Usage is billed through your flat subscription, not per token — so there's no EUR/USD cost display

**Prerequisite:**
- Install the CLI: `npm install -g @anthropic-ai/claude-code`
- Log in once with your Claude Pro/Max account

Everything runs locally through the CLI — no API keys to manage.

---

## 🚀 Perfect For

### Individual Developers
- Track your own PRs across multiple repos
- Never miss a review request
- Stay on top of CI failures

### Team Leads
- Monitor team's PR velocity
- Identify stuck PRs quickly
- Keep deployments moving

### Open Source Maintainers
- Manage contributions across projects
- Triage incoming PRs efficiently
- Focus on what needs attention

---

## 💡 Tips & Tricks

### Quick Wins

1. **My PRs Filter** — Toggle to see only your PRs in any repo
2. **Drag to Rearrange** — Canvas view lets you organize by priority
3. **Keyboard Navigation** — Arrow keys work in IDE view
4. **AI Memory** — Your assistant remembers previous conversations

### Power User Features

1. **Extended Thinking** — Watch AI reasoning in real-time (auto-scrolls to show latest)
2. **Comment Filtering** — Hide bot noise with one click
3. **Panel Resizing** — Drag edges to customize layouts
4. **Theme Switching** — Cmd/Ctrl + Shift + T

---

## 🗺️ Roadmap Preview

We're actively building:

- **PR Actions** — Approve, merge, and comment without leaving the app
- **Jira Integration** — Link PRs to tickets automatically
- **Code Review Interface** — Review diffs inline
- **Multi-Account Support** — Work across organizations
- **Team Dashboard** — See your whole team's PRs

---

## 📝 Summary

| Feature | Benefit |
|---------|---------|
| **Unified Dashboard** | All PRs in one place |
| **Two View Modes** | Work the way you think |
| **Minimize Cards** | Collapse repos to save space |
| **Per-Repo Reload** | Refresh individual repos instantly |
| **Factory Reset** | Complete wipe for fresh start |
| **Smart Filtering** | Focus on what matters |
| **AI Assistant** | Intelligent help on demand |
| **Context-Aware AI** | AI knows about CodeLobby |
| **PR-Specific AI Chat** | Context-aware conversations |
| **AI Chat Navigation** | Switch between general and PR chats |
| **Quick Actions** | Start AI chats with one click |
| **Custom Prompts** | Save your own quick prompts |
| **AI PR Reviews** | Generate and submit full PR reviews |
| **Open Preview** | One-click staging access |
| **Why Open Analysis** | Instant PR diagnostics |
| **CI Failure Analysis** | AI explains why CI failed |
| **Web Fetch Tool** | Claude can fetch URLs for context |
| **Approve PR** | One-click PR approval |
| **Merge PR** | Merge with squash/merge/rebase |
| **Post Comment** | Add comments to PRs directly |
| **Delete Comment** | Remove your own comments |
| **Webview Tabs** | Preview URLs embedded in app |
| **Responsive Testing** | Test at mobile/desktop widths |
| **Console Monitor** | See page logs/warnings/errors |
| **Network Panel** | Debug HTTP requests in real-time |
| **AI Usage (Subscription)** | CLI status & subscription usage stats |
| **Deep AI Review** | Full codebase AI analysis (coming soon) |
| **Persistent State** | Pick up where you left off |
| **Activity Logs** | Full debugging capability |
| **Dark Mode** | Easy on the eyes |
| **Local & Private** | Your data stays yours |

---

## 🎉 Get Started

1. **Add your GitHub Token** — Secure, encrypted, never leaves your machine
2. **Select Your Repos** — Choose which projects to track
3. **Start Working** — Your PRs are ready

Welcome to a better way to manage Pull Requests.

---

*CodeLobby — Because your time is too valuable for tab juggling.*
