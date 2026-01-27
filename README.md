# CodeLobby

<div align="center">

![CodeLobby Logo](build/icon.svg)

A PR-centric desktop application for code review workflows with integrated AI assistance.

Built with Electron • React • TypeScript • GraphQL

</div>

---

## The Problem

AI coding assistants (Copilot, Cursor, Claude) have dramatically accelerated feature development. Engineers can now produce code faster than ever. But this created a new bottleneck: **code review**.

Review queues are growing. PRs sit waiting for days. Reviewers are overwhelmed with context-switching between dozens of open PRs across multiple repositories. The traditional workflow—open GitHub, find PR, read diff, check CI, read comments, switch tabs—doesn't scale.

## The Premise

CodeLobby is built on a radical premise: **the Pull Request is the atomic unit of software development**, not the file.

When reviewing code, what matters is:
- What problem is this PR solving?
- Does CI pass?
- What feedback has been given?
- What's blocking the merge?

CodeLobby puts these questions at the center, with AI assistance to help answer them.

```
┌─────────────────────────────────────────────────────────────┐
│  CodeLobby                                       🌙 ⚙️ 👤   │
├─────────────────────────────────────────────────────────────┤
│ ┌─── portal ────────┐ ┌─── api ─────────┐ ┌─── sdk ──────┐ │
│ │ PR #234 ❌ Failed │ │ PR #567 ✅     │ │ PR #89 💬 3  │ │
│ │ PR #235 💬 Review │ │ PR #568 🔄     │ │              │ │
│ └───────────────────┘ └─────────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 🤖 AI Assistant                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ > Why is PR #234 failing?                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ 🔍 Analyzing CI logs...                                     │
│ 💡 Found: TypeError at src/utils/parser.ts:45               │
│                                                             │
│ ┌─ Analysis ────────────────────────────────────────────┐   │
│ │ The test fails because `obj.data` can be undefined.   │   │
│ │ The PR author needs to add null checking.             │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                             │
│        [📝 Generate Review]  [💬 Comment]  [✅ Approve]     │
└─────────────────────────────────────────────────────────────┘
```

## What CodeLobby Does

- **Aggregates PRs** across all your repositories in one view
- **Shows full context** — CI status, comments, reviews, file changes — without tab switching
- **Integrates Claude AI** for PR analysis, review generation, and CI failure diagnosis
- **Enables actions** — approve, merge, comment — directly from the app

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [User Interface](#user-interface)
- [Technical Architecture](#technical-architecture)
- [Configuration](#configuration)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Features

### Authentication

- **Personal Access Token**: Secure authentication using GitHub PAT
- **Local Storage**: Token stored locally via TanStack Query persistence
- **One-Click Token Creation**: Direct link to GitHub with pre-filled settings

### Dashboard

#### Free-Form Canvas
- **Drag & Drop**: Move repo cards anywhere on the canvas
- **Resize**: Adjust card sizes by dragging edges or corners
- **Grid Background**: Visual reference grid (50px) for alignment
- **Infinite Canvas**: Canvas expands as you place cards beyond the viewport

#### Layout Tools
- **Lock/Unlock**: Prevent accidental layout changes
- **Grid**: Auto-arrange cards in a neat grid pattern
- **Fill**: Make all cards fill the container equally
- **Persistent**: Your layout is saved and restored on restart

### Repository Cards

Each card displays:
- **Repository Info**: Name, owner avatar, language, star count
- **Description**: Repository description (if available)
- **Last Updated**: Relative time since last update
- **PR Count**: Badge showing number of open PRs
- **PR List**: Scrollable list of open Pull Requests
- **Quick Links**: Direct link to repository on GitHub

### PR Detail Panel

Click any PR to open a detailed side panel with:

#### Header Section
- PR number and title
- Draft status indicator
- Branch information (head → base)
- Quick stats: author, created time, additions/deletions, comment count
- External link to GitHub

#### CI Checks Section
- **Search**: Filter jobs by name, status, or conclusion
- **Group by State**: Toggle to organize jobs into collapsible groups:
  - 🟡 **Running**: In-progress or queued jobs
  - 🔴 **Failed**: Jobs that failed
  - 🟢 **Passed**: Successful jobs
  - ⚪ **Other**: Skipped, cancelled, or other states
- **Flat View**: Toggle off grouping to see all jobs in a list
- **Collapsible Groups**: Click to expand/collapse each group
- **Click to Open**: Click any job to view details on GitHub

#### Comments & Reviews Section
- Chronologically sorted comments and reviews
- Author avatar and name
- Review status badges (Approved, Changes Requested, Reviewed)
- Relative timestamps
- Full comment text with proper word wrapping

#### Resizable Panel
- Drag the left edge to resize (minimum 300px)
- Visual feedback during resize

### Header Bar

From left to right:
- **Logo & Name**: CodeLobby branding
- **Live Indicator**: Green pulsing dot showing connection status
- **Rate Limit Bar**: Visual progress showing API usage
  - Green (0-50%): Safe
  - Yellow (50-80%): Caution
  - Red (80%+): Warning
  - Hover for detailed stats (used/remaining/reset time)
- **Refreshing Indicator**: Shows when data is being fetched
- **Refresh Button**: Manually refresh all data
- **Theme Toggle**: Switch between dark and light mode
- **Activity Stream**: Open popover with recent activity
- **User Avatar**: Your GitHub profile picture
- **Logout**: Sign out and clear stored token

### Activity Stream

A popover showing recent activity across all your PRs:
- Comments on PRs
- Review submissions
- Approval/rejection notifications
- Click any event to jump to the PR

### Theming

- **Dark Mode**: Default theme with GitHub-inspired colors
- **Light Mode**: Clean, bright alternative
- **Persistent**: Theme preference is saved locally
- **System-aware**: Follows your OS preference on first launch

### Performance

- **GraphQL API**: Single query fetches PRs, repos, checks, comments, and reviews
- **Tiered Caching**:
  - Pull Requests: 15-minute stale time
  - Repositories: 1-hour stale time
  - Settings/UI: Never stale (Infinity)
- **Manual Refresh**: Click refresh button to update data (no auto-refresh on window focus)
- **No Polling**: Saves API quota by not constantly polling
- **Rate Limit Aware**: Visual indicator helps you stay within limits
- **Persistence**: All data persisted to localStorage, survives app restart

---

## Installation

### Prerequisites

- Node.js 18+
- pnpm 10+
- Git

### Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/codelobby.git
cd codelobby

# Install dependencies (requires pnpm)
pnpm install

# Start development server
pnpm run dev
```

---

## Getting Started

### 1. Create a GitHub Personal Access Token

1. Click **"Create Token on GitHub"** on the login screen, OR
2. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
3. Click **"Generate new token"** → **"Generate new token (classic)"**
4. Name it (e.g., "CodeLobby App")
5. Select the `repo` scope
6. Click **"Generate token"**
7. Copy the token (starts with `ghp_`)

### 2. Sign In

1. Paste your token in the input field
2. Click **"Connect to GitHub"**
3. Wait for validation
4. You're in! 🎉

### 3. Explore Your PRs

- Your repositories with open PRs appear as cards
- Click any PR to see details
- Drag cards to arrange your dashboard
- Use the toolbar to auto-arrange or lock your layout

---

## User Interface

### Interactions

| Action | How |
|--------|-----|
| Move Card | Drag from card header |
| Resize Card | Drag any edge or corner |
| Open PR Details | Click on a PR |
| Close PR Details | Click X button |
| Resize Detail Panel | Drag left edge |
| Open on GitHub | Click external link icon |
| Expand/Collapse Job Group | Click group header |
| Send AI Message | Press Enter |
| Multi-line AI Message | Shift+Enter |
| Save Custom Prompt | Cmd/Ctrl+Enter |

---

## Technical Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 28 |
| Frontend | React 18 |
| Language | TypeScript 5 |
| Build Tool | electron-vite |
| Styling | Tailwind CSS 3 |
| Components | shadcn/ui (Radix UI) |
| State & Data | TanStack Query 5 |
| GitHub API | Direct GraphQL fetch |
| AI Integration | Anthropic Claude SDK |
| Persistence | localStorage (TanStack Query) + electron-store |
| Drag & Resize | react-rnd |

### Project Structure

CodeLobby uses a **flat modular architecture**. Each UI feature is an independent module that registers itself to the app shell via a slot system. Modules are prefixed with `--module-` for easy identification.

```
codelobby/
├── src/
│   ├── main/                      # Electron main process (Node.js)
│   │   ├── index.ts               # App entry, IPC handlers
│   │   ├── claude-api.ts          # Claude AI streaming integration
│   │   ├── store.ts               # Persistent storage (electron-store)
│   │   ├── prompts/               # AI system prompts
│   │   └── *.test.ts              # Colocated tests
│   │
│   ├── preload/                   # Electron preload scripts
│   │   ├── index.ts               # Secure IPC bridge (OS operations)
│   │   └── electron-api.d.ts      # Type definitions for window.electron
│   │
│   └── renderer/                  # React entry point only
│       ├── main.tsx               # Bootstraps the app
│       └── styles/globals.css     # Global styles & Tailwind
│
├── --module-app/                  # App shell (renders slots)
├── --module-data/                 # 🔑 TanStack Query state (THE CORE)
│   ├── client.ts                  # QueryClient + persistence
│   ├── keys.ts                    # Query keys
│   ├── github.ts                  # GitHub API functions
│   ├── queries/                   # useQuery hooks
│   └── mutations/                 # useMutation hooks
├── --module-slot-system/          # Module registration system
├── --module-logger/               # Structured logging (main/renderer)
├── --module-ui-kit/               # Shared UI components (shadcn/ui)
├── --module-header/               # Header bar, settings, rate limit
├── --module-canvas/               # Free-form PR card canvas
├── --module-explorer/             # IDE-style tree view
├── --module-network/              # HTTP request monitoring panel
├── --module-pr-detail/            # PR detail side panel
├── --module-ai-chat/              # Claude AI chat panel
├── --module-test-utils/           # Shared test utilities & mocks
│
├── tsconfig.json                  # Project references root
├── tsconfig.web.json              # Renderer + modules config
├── tsconfig.node.json             # Main process config
└── package.json                   # Build scripts
```

### Modular Architecture

The app uses **TanStack Query as the single source of truth** for ALL state. Modules are self-contained and register themselves to slots:

```typescript
// Each module registers to a slot at import time
// --module-header/index.tsx
import { registerToSlot } from '@slot-system'
import { Header } from './components/Header'

registerToSlot({
  id: 'header',
  slot: 'header',
  component: Header
})
```

**Key Principles:**
- **Zero cross-imports** between UI modules
- **TanStack Query for all state** — reads via useQuery, writes via useMutation
- **Shared types and hooks** via `@data`
- **Test files colocated** with source (e.g., `Header.tsx` + `Header.test.tsx`)

### TypeScript Configuration

The project uses a **project references** setup for Electron's dual-process architecture:

```
tsconfig.json (root)
├── references → tsconfig.web.json    # Renderer + packages
└── references → tsconfig.node.json   # Main process
```

| Config | Purpose | Includes |
|--------|---------|----------|
| `tsconfig.json` | Root with project references | `"files": []` (delegates to children) |
| `tsconfig.web.json` | Browser/renderer context | `--module-*/**/*`, `src/renderer/**/*` |
| `tsconfig.node.json` | Node.js/main process | `src/main/**/*`, `src/preload/**/*` |

**Path Aliases** (defined in `tsconfig.web.json`):
```json
{
  "@ui-kit": ["./--module-ui-kit/index.ts"],
  "@data": ["./--module-data/index.ts"],
  "@slot-system": ["./--module-slot-system/index.tsx"],
  "@header": ["./--module-header/index.tsx"],
  // ... etc
}
```

**Global Types** (`window.electron`):
- Defined in `src/preload/electron-api.d.ts`
- Included via `tsconfig.web.json` → `"include": ["src/preload/electron-api.d.ts"]`
- Uses `declare global { interface Window { electron: ElectronAPI } }`

**IDE Type Checking:**
- Restart TS server after config changes: `Cmd+Shift+P` → "TypeScript: Restart TS Server"
- The root `tsconfig.json` uses project references; IDE resolves via `tsconfig.web.json`

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      External APIs                           │
│        GitHub API (GraphQL)     │      Claude API (REST)     │
└─────────────────────────────────┴────────────────────────────┘
            ▲                                  ▲
            │ fetch() (direct)                 │ IPC (streaming)
            │                                  │
┌───────────┴────────────────────────┬─────────┴───────────────┐
│       @data              │      Main Process       │
│  ┌──────────────────────────────┐  │  ┌───────────────────┐  │
│  │  github.ts (API functions)   │  │  │  claude-api.ts    │  │
│  │  queries/* (useQuery hooks)  │  │  │  (streaming AI)   │  │
│  │  mutations/* (useMutation)   │  │  └───────────────────┘  │
│  └──────────────────────────────┘  │                         │
└────────────────────────────────────┴─────────────────────────┘
            ▲
            │ useQuery / useMutation
            │
┌───────────┴─────────────────────────────────────────────────┐
│                      UI Components                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  TanStack Query Cache (Single Source of Truth)        │  │
│  │  • GitHub data (repos, PRs, user)                     │  │
│  │  • Settings (viewMode, selectedRepos)                 │  │
│  │  • AI state (chatHistory, models)                     │  │
│  │  • UI state (panels, layouts)                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Header │ Canvas │ PRDetail │ AIChat │ Network │ Explorer   │
└──────────────────────────────────────────────────────────────┘
```

**Key Points:**
- **GitHub API calls are direct** — fetch() from renderer, no IPC
- **Claude AI uses IPC** — Streaming requires main process
- **TanStack Query is the single source of truth** — All state in cache
- **Automatic persistence** — Settings & AI data persist to localStorage

### Module Interaction Architecture

The following diagram illustrates how all CodeLobby modules interact with each other:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                                   │
│    ┌─────────────────────────┐              ┌─────────────────────────┐         │
│    │    GitHub API           │              │     Claude API          │         │
│    │  (GraphQL + REST)       │              │    (REST + Streaming)   │         │
│    └───────────┬─────────────┘              └───────────┬─────────────┘         │
└────────────────┼────────────────────────────────────────┼───────────────────────┘
                 │ fetch() direct                          │ Anthropic SDK
                 │                                         │
┌────────────────┼─────────────────────────────────────────┼───────────────────────┐
│                │           ELECTRON MAIN PROCESS          │                       │
│                │              (src/main/)                 ▼                       │
│                │         ┌────────────────────────────────────┐                  │
│                │         │  claude-api.ts (streaming)         │                  │
│                │         │  store.ts (electron-store)         │                  │
│                │         │  prompts/ (system prompts)         │                  │
│                │         └──────────────┬─────────────────────┘                  │
└────────────────┼────────────────────────┼────────────────────────────────────────┘
                 │                        │ IPC (window.electron)
                 │                        │
┌────────────────┼────────────────────────┼────────────────────────────────────────┐
│                │     ELECTRON PRELOAD    │        (src/preload/)                  │
│                │    ┌────────────────────┴────────────────────┐                  │
│                │    │  Secure IPC Bridge (OS operations)      │                  │
│                │    │  • Theme control  • Fullscreen          │                  │
│                │    │  • AI streaming   • Notifications       │                  │
│                │    └────────────────────┬────────────────────┘                  │
└────────────────┼─────────────────────────┼───────────────────────────────────────┘
                 │                         │
                 ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        RENDERER PROCESS (React)                                   │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                    INFRASTRUCTURE LAYER                                      │ │
│  │                                                                              │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    @data (--module-data/)                            │   │ │
│  │  │                   ════════════════════════                           │   │ │
│  │  │          🔑 THE CORE - Single Source of Truth                        │   │ │
│  │  │                                                                      │   │ │
│  │  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │   │ │
│  │  │   │  github.ts  │  │  queries/*  │  │ mutations/* │                 │   │ │
│  │  │   │  (API fns)  │  │ (useQuery)  │  │(useMutation)│                 │   │ │
│  │  │   └─────────────┘  └─────────────┘  └─────────────┘                 │   │ │
│  │  │                                                                      │   │ │
│  │  │   TanStack Query Cache: GitHub data, Settings, AI state, UI state   │   │ │
│  │  └──────────────────────────────────────────────────────────────────────┘   │ │
│  │           ▲                                                                  │ │
│  │           │ import @data                                                     │ │
│  │  ┌────────┴────────────────────────────────────────────────────────────┐    │ │
│  │  │                                                                     │    │ │
│  │  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │    │ │
│  │  │  │  @slot-system    │  │    @ui-kit       │  │    @logger       │  │    │ │
│  │  │  │ ──────────────── │  │ ──────────────── │  │ ──────────────── │  │    │ │
│  │  │  │ registerToSlot() │  │ Button, Input,   │  │ Structured logs  │  │    │ │
│  │  │  │ <Slot name="x"/> │  │ Card, Dialog,    │  │ for main/renderer│  │    │ │
│  │  │  │                  │  │ Tooltip, etc.    │  │                  │  │    │ │
│  │  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │    │ │
│  │  │                                                                     │    │ │
│  │  └─────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                       APPLICATION LAYER                                      │ │
│  │                                                                              │ │
│  │  ┌──────────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    @app (--module-app/)                              │   │ │
│  │  │   App Shell - Renders named <Slot> components                        │   │ │
│  │  │   bootstrap.ts - Imports & initializes all modules                   │   │ │
│  │  └──────────────────────────────────────────────────────────────────────┘   │ │
│  │                               │                                              │ │
│  │               ┌───────────────┼───────────────┐                             │ │
│  │               ▼               ▼               ▼                             │ │
│  │  ┌────────────────────────────────────────────────────────────────────┐     │ │
│  │  │                   SLOT-BASED UI MODULES                            │     │ │
│  │  │          (Self-registering, zero cross-imports)                    │     │ │
│  │  │                                                                    │     │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │     │ │
│  │  │   │                    slot: "header"                           │ │     │ │
│  │  │   │  ┌────────────────────────────────────────────────────────┐ │ │     │ │
│  │  │   │  │ @header (--module-header/)                             │ │ │     │ │
│  │  │   │  │  • Header bar, logo, rate limit gauge                  │ │ │     │ │
│  │  │   │  │  • Theme toggle, user avatar, logout                   │ │ │     │ │
│  │  │   │  │  • Refresh button, activity stream                     │ │ │     │ │
│  │  │   │  │  • LogsViewer, AboutDialog, AICostIndicator            │ │ │     │ │
│  │  │   │  └────────────────────────────────────────────────────────┘ │ │     │ │
│  │  │   └─────────────────────────────────────────────────────────────┘ │     │ │
│  │  │                                                                    │     │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │     │ │
│  │  │   │                   slot: "left-panel"                        │ │     │ │
│  │  │   │  ┌────────────────────────────────────────────────────────┐ │ │     │ │
│  │  │   │  │ @explorer (--module-explorer/)                         │ │ │     │ │
│  │  │   │  │  • IDE-style tree view (repo → PR hierarchy)           │ │ │     │ │
│  │  │   │  │  • Only visible in IDE view mode                       │ │ │     │ │
│  │  │   │  └────────────────────────────────────────────────────────┘ │ │     │ │
│  │  │   └─────────────────────────────────────────────────────────────┘ │     │ │
│  │  │                                                                    │     │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │     │ │
│  │  │   │                     slot: "main"                            │ │     │ │
│  │  │   │  ┌────────────────────────────────────────────────────────┐ │ │     │ │
│  │  │   │  │ @canvas (--module-canvas/)                             │ │ │     │ │
│  │  │   │  │  • Free-form draggable PR card canvas                  │ │ │     │ │
│  │  │   │  │  • PRGrid, PRCard, RepoCard components                 │ │ │     │ │
│  │  │   │  │  • Grid/fill layout tools, lock/unlock                 │ │ │     │ │
│  │  │   │  └────────────────────────────────────────────────────────┘ │ │     │ │
│  │  │   └─────────────────────────────────────────────────────────────┘ │     │ │
│  │  │                                                                    │     │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │     │ │
│  │  │   │               slot: "pr-detail-panel"                       │ │     │ │
│  │  │   │  ┌────────────────────────────────────────────────────────┐ │ │     │ │
│  │  │   │  │ @pr-detail (--module-pr-detail/)                       │ │ │     │ │
│  │  │   │  │  • PR detail side panel with full context              │ │ │     │ │
│  │  │   │  │  • CI checks, comments, reviews, file changes          │ │ │     │ │
│  │  │   │  │  • AI quick actions (analyze, review, CI analysis)     │ │ │     │ │
│  │  │   │  │  • Approve & Merge PR actions                          │ │ │     │ │
│  │  │   │  └────────────────────────────────────────────────────────┘ │ │     │ │
│  │  │   └─────────────────────────────────────────────────────────────┘ │     │ │
│  │  │                                                                    │     │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │     │ │
│  │  │   │                  slot: "ai-panel"                           │ │     │ │
│  │  │   │  ┌────────────────────────────────────────────────────────┐ │ │     │ │
│  │  │   │  │ @ai-chat (--module-ai-chat/)                           │ │ │     │ │
│  │  │   │  │  • Claude AI chat panel with streaming                 │ │ │     │ │
│  │  │   │  │  • PR-specific and general conversations               │ │ │     │ │
│  │  │   │  │  • Quick actions, custom prompts                       │ │ │     │ │
│  │  │   │  │  • AI-generated PR review submission                   │ │ │     │ │
│  │  │   │  │  • Extended thinking visualization                     │ │ │     │ │
│  │  │   │  └────────────────────────────────────────────────────────┘ │ │     │ │
│  │  │   └─────────────────────────────────────────────────────────────┘ │     │ │
│  │  │                                                                    │     │ │
│  │  │   ┌─────────────────────────────────────────────────────────────┐ │     │ │
│  │  │   │                slot: "network-panel"                        │ │     │ │
│  │  │   │  ┌────────────────────────────────────────────────────────┐ │ │     │ │
│  │  │   │  │ @network (--module-network/)                           │ │ │     │ │
│  │  │   │  │  • HTTP request monitoring & debugging                 │ │ │     │ │
│  │  │   │  │  • Request/response inspection                         │ │ │     │ │
│  │  │   │  │  • Fetch interception for all API calls                │ │ │     │ │
│  │  │   │  └────────────────────────────────────────────────────────┘ │ │     │ │
│  │  │   └─────────────────────────────────────────────────────────────┘ │     │ │
│  │  │                                                                    │     │ │
│  │  └────────────────────────────────────────────────────────────────────┘     │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Module Dependency Graph

**Allowed imports flow DOWN. Modules cannot import from siblings or upward.**

```
                              ┌─────────────┐
                              │   @data     │  ← TanStack Query, state, GitHub API
                              └──────┬──────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
   │  @ui-kit    │           │@slot-system │           │  @logger    │
   └─────────────┘           └─────────────┘           └─────────────┘
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     │
                                     ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │                      UI FEATURE MODULES                         │
   │                                                                 │
   │   @header    @canvas    @explorer    @pr-detail    @ai-chat     │
   │                                                                 │
   │                            @network                             │
   │                                                                 │
   │   ❌ These modules CANNOT import from each other ❌              │
   └─────────────────────────────────────────────────────────────────┘
```

### Import Rules (Simple Version)

```
┌────────────────────────────────────────────────────────────────────┐
│  MODULE           │  CAN IMPORT                │  CANNOT IMPORT    │
├────────────────────────────────────────────────────────────────────┤
│                   │                            │                   │
│  @header          │  @data                     │  @canvas          │
│  @canvas          │  @ui-kit                   │  @header          │
│  @explorer        │  @slot-system              │  @explorer        │
│  @pr-detail   ───▶│  @logger                   │  @pr-detail       │
│  @ai-chat         │  react, lucide-react       │  @ai-chat         │
│  @network         │  ./internal files          │  @network         │
│                   │                            │                   │
├────────────────────────────────────────────────────────────────────┤
│                   │                            │                   │
│  @data        ───▶│  @tanstack/react-query     │  @ui-kit          │
│                   │  @logger                   │  @slot-system     │
│                   │                            │  Any UI module    │
│                   │                            │                   │
├────────────────────────────────────────────────────────────────────┤
│                   │                            │                   │
│  @ui-kit      ───▶│  react                     │  @data            │
│                   │  @radix-ui/*               │  @slot-system     │
│                   │  tailwind-merge, clsx      │  @logger          │
│                   │                            │  Any UI module    │
│                   │                            │                   │
├────────────────────────────────────────────────────────────────────┤
│                   │                            │                   │
│  @slot-system ───▶│  react                     │  Everything else  │
│                   │                            │                   │
└────────────────────────────────────────────────────────────────────┘
```

### Forbidden Imports (Examples)

```typescript
// ❌ FORBIDDEN — UI module importing another UI module
import { Header } from '@header'           // ❌ in @canvas
import { PRCard } from '@canvas'           // ❌ in @pr-detail
import { AIChat } from '@ai-chat'          // ❌ in @network

// ❌ FORBIDDEN — @ui-kit importing @data
import { useTheme } from '@data'           // ❌ in @ui-kit

// ❌ FORBIDDEN — @data importing @ui-kit
import { Button } from '@ui-kit'           // ❌ in @data

// ✅ ALLOWED — UI module imports
import { useSelectedPR } from '@data'      // ✅ state hooks
import { Card, Button } from '@ui-kit'     // ✅ components
import { registerToSlot } from '@slot-system'  // ✅ registration
```

### Why?

| Rule | Benefit |
|------|---------|
| UI modules can't import each other | No circular dependencies |
| All state flows through `@data` | Single source of truth |
| `@ui-kit` has no dependencies | Pure, reusable components |
| Modules self-register via slots | Hot-swappable, testable |

### Communication Flow Between Modules

Since UI modules cannot import from each other, all communication happens through `@data`:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     MODULE COMMUNICATION VIA @data                       │
│                                                                          │
│   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐  │
│   │   @canvas    │          │    @data     │          │  @pr-detail  │  │
│   │              │          │              │          │              │  │
│   │  User clicks │──────────│ useMutation: │──────────│ Panel opens  │  │
│   │  on a PR     │  mutate  │ selectPR()   │  reacts  │ showing PR   │  │
│   │              │──────────▶│              │──────────▶│ details      │  │
│   └──────────────┘          │  ┌────────┐  │          └──────────────┘  │
│                             │  │ Cache  │  │                             │
│   ┌──────────────┐          │  │        │  │          ┌──────────────┐  │
│   │   @header    │          │  │selected│  │          │  @ai-chat    │  │
│   │              │◀─────────│  │   PR   │  │──────────▶│              │  │
│   │ Shows PR #   │  useQuery│  │        │  │  useQuery │ Loads PR     │  │
│   │ in breadcrumb│          │  └────────┘  │          │ chat context │  │
│   └──────────────┘          └──────────────┘          └──────────────┘  │
│                                                                          │
│   All modules READ from the same cache and WRITE through mutations       │
│   No direct module-to-module communication                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Registration Flow

Modules self-register to slots at import time via `bootstrap.ts`:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BOOTSTRAP PROCESS                                 │
│                                                                          │
│   main.tsx                                                               │
│      │                                                                   │
│      ▼                                                                   │
│   bootstrap.ts (imports all modules)                                     │
│      │                                                                   │
│      ├──▶ import '@header'    ──▶ registerToSlot({ slot: 'header' })    │
│      ├──▶ import '@explorer'  ──▶ registerToSlot({ slot: 'left-panel' })│
│      ├──▶ import '@canvas'    ──▶ registerToSlot({ slot: 'main' })      │
│      ├──▶ import '@pr-detail' ──▶ registerToSlot({ slot: 'pr-detail' }) │
│      ├──▶ import '@ai-chat'   ──▶ registerToSlot({ slot: 'ai-panel' })  │
│      └──▶ import '@network'   ──▶ registerToSlot({ slot: 'network' })   │
│                                                                          │
│      ▼                                                                   │
│   App.tsx (renders slots)                                                │
│      │                                                                   │
│      ├──▶ <Slot name="header" />      ──▶ Renders Header component      │
│      ├──▶ <Slot name="left-panel" />  ──▶ Renders Explorer (IDE mode)   │
│      ├──▶ <Slot name="main" />        ──▶ Renders Canvas/PRGrid         │
│      ├──▶ <Slot name="pr-detail" />   ──▶ Renders PRDetail panel        │
│      ├──▶ <Slot name="ai-panel" />    ──▶ Renders AIChat panel          │
│      └──▶ <Slot name="network" />     ──▶ Renders Network panel         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### State Categories in @data

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TANSTACK QUERY CACHE CONTENTS                         │
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐│
│   │ GITHUB DATA (fetched, persisted to localStorage)                   ││
│   │   keys.repos            → User's repositories (1h cache)           ││
│   │   keys.prsForRepo(repo) → PRs per repo (15min cache)               ││
│   │   keys.prDetail(r,n)    → Single PR full details                   ││
│   │   keys.prFiles(r,n)     → PR changed files with diffs              ││
│   │   keys.user             → Authenticated user info                  ││
│   │   keys.rateLimit        → GitHub API rate limit                    ││
│   └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐│
│   │ SETTINGS (persisted, staleTime: Infinity)                          ││
│   │   keys.selectedRepos    → Which repos to show                      ││
│   │   keys.viewMode         → 'canvas' | 'ide'                         ││
│   │   keys.githubToken      → GitHub PAT                               ││
│   │   keys.cardLayouts      → Canvas card positions                    ││
│   │   keys.aiPanel          → AI panel open state + width              ││
│   │   keys.prDetailPanel    → PR detail panel state                    ││
│   └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐│
│   │ AI STATE (persisted, staleTime: Infinity)                          ││
│   │   keys.claudeApiKey     → Claude API key                           ││
│   │   keys.selectedModel    → Selected Claude model                    ││
│   │   keys.enableThinking   → Extended thinking toggle                 ││
│   │   keys.enableWebFetch   → Web fetch tool toggle                    ││
│   │   keys.prChatMessages   → PR-specific chat histories               ││
│   │   keys.customPrompts    → User-created quick prompts               ││
│   └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐│
│   │ LOCAL UI STATE (persisted)                                         ││
│   │   keys.local.selectedPRId      → Currently selected PR             ││
│   │   keys.local.networkPanelOpen  → Network panel visibility          ││
│   │   keys.local.networkPanelHeight→ Network panel size                ││
│   └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│   ┌────────────────────────────────────────────────────────────────────┐│
│   │ SYSTEM STATE (runtime only, not persisted)                         ││
│   │   keys.system.fullscreen → Fullscreen mode                         ││
│   │   keys.system.theme      → OS theme                                ││
│   └────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### GraphQL Queries

GitHub data is fetched via GraphQL for efficiency:

```graphql
# Fetch PRs with CI status, comments, and reviews
query GetPRsForRepos($repos: [String!]!) {
  # Rate limit tracking
  rateLimit { limit, remaining, used, resetAt }
  
  # PR data for each repository
  nodes {
    id, number, title, state, isDraft
    createdAt, additions, deletions
    
    # CI status
    commits(last: 1) {
      nodes {
        commit {
          statusCheckRollup { contexts { ... } }
        }
      }
    }
    
    # Comments & reviews
    comments { nodes { ... } }
    reviews { nodes { ... } }
  }
}
```

---

## Configuration

### Storage Locations

| Data | Location | Details |
|------|----------|---------|
| GitHub Token | `localStorage` | Persisted via TanStack Query |
| Theme | `localStorage` | Direct key: `codelobby-theme` |
| View Mode, Selected Repos | `localStorage` | TanStack Query persistence |
| Card Layouts, Repo Colors, Minimized Repos | `localStorage` | TanStack Query persistence (settings keys) |
| Claude API Key | `~/Library/Application Support/codelobby/` | Encrypted via electron-store |
| AI Settings (model, thinking, web fetch) | `~/Library/Application Support/codelobby/` | electron-store |
| General Chat History | `~/Library/Application Support/codelobby/` | electron-store |
| PR-Specific Chats, PR Analyses | `~/Library/Application Support/codelobby/` | electron-store |
| AI Usage Tracking (cost/tokens) | `~/Library/Application Support/codelobby/` | electron-store |
| Custom Quick Prompts | `~/Library/Application Support/codelobby/` | electron-store |

---

## Building for Production

### Build Commands

```bash
# Build for current platform
pnpm run build

# Build for specific platforms
pnpm run build:mac     # macOS (.dmg)
pnpm run build:win     # Windows (.exe)
pnpm run build:linux   # Linux (.AppImage)
```

### Output

Built applications are placed in the `dist/` directory:

```
dist/
├── mac/
│   └── CodeLobby.app
├── mac-arm64/
│   └── CodeLobby.app
├── CodeLobby-1.0.0.dmg
├── CodeLobby-1.0.0-arm64.dmg
└── ... (other platforms)
```

### Code Signing (macOS)

For distribution, you'll need to:
1. Enroll in Apple Developer Program
2. Create certificates in Xcode
3. Set environment variables:
   ```bash
   export APPLE_ID="your@email.com"
   export APPLE_ID_PASSWORD="app-specific-password"
   export APPLE_TEAM_ID="XXXXXXXXXX"
   ```

---

## Troubleshooting

### Common Issues

#### "Invalid Token" Error
- Ensure your token has the `repo` scope
- Check that the token hasn't expired
- Try generating a new token

#### Rate Limit Exceeded
- Wait for the reset time (shown in the rate limit tooltip)
- The app uses GraphQL which has a 5,000 points/hour limit
- Normal usage (~1 request per focus) should stay well under the limit

#### Cards Not Saving Position
- Ensure the app has write permissions to its data directory
- Try clicking the "Grid" button to reset layout, then reposition

#### App Won't Start
```bash
# Clear cache and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
pnpm run dev
```

#### White Screen / Blank Window
- Check the developer console (View → Toggle Developer Tools)
- Look for JavaScript errors
- Try clearing the app data:
  ```bash
  rm -rf ~/Library/Application\ Support/codelobby/
  ```

### Reporting Issues

When reporting bugs, please include:
1. Operating system and version
2. App version
3. Steps to reproduce
4. Console output (if applicable)
5. Screenshots (if UI-related)

---

## License

MIT License - See [LICENSE](LICENSE) for details.

---

## Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop app framework
- [React](https://reactjs.org/) - UI library
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- [TanStack Query](https://tanstack.com/query) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icons
- [GitHub GraphQL API](https://docs.github.com/en/graphql) - Data source

---

## Contributors

<a href="https://github.com/souhaibparcellab/code-lobby/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=souhaibparcellab/code-lobby" />
</a>

<!-- readme: contributors -start -->
<!-- readme: contributors -end -->

---

## Roadmap

### Current
- PR monitoring dashboard with full context (CI, comments, reviews)
- Customizable spatial layout (Canvas & IDE views)
- AI-powered PR analysis and CI failure diagnosis
- PR-specific AI chat with full code diff context
- AI review generation with inline comments (Approve, Request Changes, Comment)
- PR actions (approve, merge, request changes) directly from the app
- Network panel for debugging HTTP requests
- Custom quick prompts
- AI usage tracking (tokens/cost stored, UI pending)

### Next
- AI cost indicator display in header
- Smart suggestions based on comment content
- Natural language PR search
- Comment on PRs directly from the app

### Future
- AI-assisted code fixes
- Deep code review with full codebase access
- Automated actions with human approval

---

[Report Bug](https://github.com/yourusername/codelobby/issues) • [Request Feature](https://github.com/yourusername/codelobby/issues)
