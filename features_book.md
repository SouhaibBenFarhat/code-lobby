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

**How It Works:**
- AI uses tools: `read_file`, `search_codebase`, `find_usages`
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

**Use Cases:**
- "Summarize the changes in this PR"
- "What are the potential risks?"
- "Help me write a review comment"
- "Explain what this file does"

---

### 📋 Conversation Navigator

Managing multiple AI conversations? The conversation navigator makes switching instant.

**Access:**
1. Click the list icon (📋) in the AI chat header
2. See all your conversations at a glance
3. Click to switch instantly

**Features:**
- **General Chat** — Your main AI conversation, always at the top
- **PR Conversations** — All your PR-specific chats, sorted by recency
- **Badge Counter** — See how many PR chats you have open
- **Delete Option** — Hover to reveal delete button on PR chats
- **Context Preview** — See PR number, title, repo, message count, and last updated time

**Organized by:**
- Most recently updated conversations appear first
- PR conversations grouped separately from general chat
- Active conversation clearly marked

Perfect for code reviews, understanding complex changes, or getting a second opinion.

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
- AI conversation history
- Panel open/closed states
- **Selected AI conversation** — Resume exactly where you left off

Close the app Friday, open it Monday — everything is exactly where you left it.

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
- Preserves your Claude API key and settings
- Log back in to start fresh

---

## 🔒 Privacy & Security

### Your Data Stays Yours

- **Local Storage** — All data stored on your machine
- **Encrypted Tokens** — API keys are encrypted at rest
- **No Telemetry** — We don't track you
- **Open Architecture** — See exactly what data is stored

### Minimal Permissions

CodeLobby only asks for what it needs:
- Read access to your repositories
- Read access to pull requests and comments
- That's it

---

## 📊 Rate Limit Awareness

GitHub has API limits. CodeLobby respects them:

- **Visual Gauge** — See your remaining API calls
- **Reset Timer** — Know when limits refresh
- **Smart Caching** — Data is cached for 30 minutes
- **Graceful Handling** — Clear messages when limits are reached

Never wonder why data isn't loading.

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
| **Smart Filtering** | Focus on what matters |
| **AI Assistant** | Intelligent help on demand |
| **Context-Aware AI** | AI knows about CodeLobby |
| **PR-Specific AI Chat** | Context-aware conversations |
| **Conversation Navigator** | Switch between chats instantly |
| **Open Preview** | One-click staging access |
| **Why Open Analysis** | Instant PR diagnostics |
| **Deep AI Review** | Full codebase AI analysis (coming soon) |
| **Persistent State** | Pick up where you left off |
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
