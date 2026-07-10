# CodeLobby

<div align="center">

![CodeLobby Logo](build/icon.svg)

A PR-centric desktop application for code review workflows with integrated AI assistance.

Built with Electron • React • TypeScript • GraphQL

</div>

---

## Install (macOS)

```bash
brew install --cask souhaibbenfarhat/tap/codelobby
```

Apple Silicon (arm64). Prefer a direct download? Grab the latest `.dmg` from the [Releases page](https://github.com/SouhaibBenFarhat/code-lobby/releases/latest).

---

## Why CodeLobby

AI assistants made writing code fast, which moved the bottleneck to **code review**. Queues grow, PRs sit for days, and reviewers burn time context-switching between dozens of PRs across repos: open GitHub, find PR, read diff, check CI, read comments, switch tab, repeat.

CodeLobby is built on one premise — **the Pull Request is the atomic unit of software, not the file**. What matters when reviewing is: *What problem does this PR solve? Does CI pass? What feedback exists? What's blocking merge?* CodeLobby puts those questions front and center, with Claude assistance to answer them:

- **Aggregates PRs** across all your repositories in one spatial view
- **Shows full context** — CI, comments, reviews, file diffs — without tab switching
- **Integrates Claude** for PR analysis, review generation, and CI-failure diagnosis
- **Acts** — approve, merge, comment — directly from the app

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
│ 🔍 Analyzing CI logs...                                     │
│ 💡 Found: TypeError at src/utils/parser.ts:45               │
│        [📝 Generate Review]  [💬 Comment]  [✅ Approve]     │
└─────────────────────────────────────────────────────────────┘
```

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Interactions](#interactions)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Building for Production](#building-for-production)
- [Troubleshooting](#troubleshooting)

---

## Features

**Authentication** — **Sign in with GitHub** (OAuth device flow — no token to create, no scopes to pick), with a Personal Access Token (`repo` scope) available as an Advanced fallback. The resulting token is stored locally via TanStack Query persistence.

**Dashboard** — two views, switchable anytime:
- **Canvas** — free-form draggable/resizable repo cards on a 50px grid; infinite canvas; lock, auto-grid, and fill-equal layout tools; layout persists.
- **IDE** — repository → PR tree view.

**Repository cards** — name, owner avatar, language, stars, description, last-updated, open-PR count badge, scrollable PR list, GitHub link.

**PR detail panel** (click any PR) — resizable side panel (min 300px) with:
- Header: number/title, draft status, `head → base`, author, created time, additions/deletions, comment count, GitHub link
- CI checks: search, group-by-state (🟡 Running / 🔴 Failed / 🟢 Passed / ⚪ Other) or flat view, click through to GitHub logs
- Comments & reviews: chronological, avatars, status badges (Approved / Changes Requested / Reviewed), Markdown

**AI (Claude Code CLI)** — PR-specific and general chat with full code-diff context; "why is this PR still open?" blocker analysis; CI-failure diagnosis; AI review generation with inline comments (Approve / Request Changes / Comment); quick actions and custom prompts; extended-thinking visualization.

**PR actions** — approve, merge (squash/merge/rebase), and comment directly from the app.

**Header bar** — logo, live connection dot, rate-limit gauge (🟢 <50% / 🟡 50–80% / 🔴 >80%, hover for stats), refresh, theme toggle, activity stream, user avatar, logout.

**Activity stream** — popover of recent PR comments, reviews, and approvals; click an event to jump to its PR.

**Network monitor** — inspect every HTTP request/response (a dev/debug panel that intercepts `fetch()`).

**Theming** — dark (default, GitHub-inspired) and light; system-aware on first launch; persisted.

**Performance** — one GraphQL query fetches PRs/repos/checks/comments/reviews; tiered caching (PRs 15 min, repos 1 h, settings/UI ∞); manual refresh, **no polling** (saves API quota); rate-limit aware; all state persisted to localStorage.

---

## Installation

### Prerequisites

- Node.js 18+
- pnpm 10+
- Git
- **Claude Code CLI** (for AI features) — the AI runs through the CLI using your existing Claude subscription, so **no Anthropic API key is required**:
  1. Install: `npm install -g @anthropic-ai/claude-code`
  2. Log in: run `claude` once and follow the OAuth prompt (a Claude Pro/Max plan is recommended)

The app shows a banner with install instructions if the CLI isn't detected.

### Clone & Install

```bash
git clone https://github.com/yourusername/codelobby.git
cd codelobby
pnpm install
pnpm run dev
```

---

## Getting Started

1. **Sign in** — click **"Sign in with GitHub"** on the login screen. Your browser opens to GitHub with the code pre-filled; click **Authorize** and you're in — no token to create, no scopes to choose.
2. **(Advanced) Personal Access Token** — prefer a token, or does your org restrict OAuth apps? Expand **"Use a Personal Access Token instead"**, generate a **classic** token with the `repo` scope (there's a pre-filled link), and paste it (starts with `ghp_`).
3. **Explore** — your repos with open PRs appear as cards; click a PR for details, drag cards to arrange, use the toolbar to auto-arrange or lock the layout.

> **GitHub sign-in** ships with a public OAuth App **Client ID**, so it works out of the box. To point at your own OAuth App, register one at [Settings → Developer settings](https://github.com/settings/developers), tick **Enable Device Flow**, and set `GITHUB_CLIENT_ID` to override the default. (OAuth App client IDs are public — no client secret is ever required or shipped.)

---

## Interactions

| Action | How |
|--------|-----|
| Move / resize card | Drag card header / any edge |
| Open / close PR details | Click a PR / click ✕ |
| Resize detail panel | Drag left edge |
| Open on GitHub | Click external-link icon |
| Expand/collapse job group | Click group header |
| Send AI message | Enter (Shift+Enter for newline) |
| Save custom prompt | Cmd/Ctrl+Enter |

---

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 28 |
| Frontend | React 18 + TypeScript 5 |
| Build | electron-vite |
| Styling | Tailwind CSS 3 + shadcn/ui (Radix) |
| State & Data | TanStack Query 5 |
| GitHub API | Direct GraphQL fetch |
| AI | Claude Code CLI (spawned subprocess) |
| Persistence | SQLite (Drizzle ORM) + localStorage + electron-store |
| Drag & resize | react-rnd |

### Modular Architecture

CodeLobby uses a **flat, slot-based modular architecture**. Each UI feature is an independent module (prefixed `--module-`) that self-registers to a named slot at import time — so **UI modules never import each other**. **TanStack Query is the single source of truth** for all state.

```typescript
// --module-header/index.tsx — registers itself to the "header" slot
import { registerToSlot } from '@slot-system'
import { Header } from './components/Header'

registerToSlot({ id: 'header', slot: 'header', component: Header })
```

**Slots and their modules:**

| Slot | Module | Renders |
|------|--------|---------|
| `header` | `@header` | Header bar, rate limit, theme, activity, user |
| `left-panel` | `@explorer` | IDE tree (repo → PR), IDE view only |
| `main` | `@canvas` / `@pr-detail` | Canvas PR cards / PR detail (IDE mode) |
| `pr-detail-panel` | `@pr-detail` | PR detail side panel (Canvas mode) |
| `ai-panel` | `@ai-chat` | Claude chat, streaming, review submission |
| `network-panel` | `@network` | HTTP request monitor |

**Import rules** (dependencies flow one way; siblings and upward imports are forbidden):

| Module | May import | Must NOT import |
|--------|-----------|-----------------|
| UI modules (`@header`, `@canvas`, `@explorer`, `@pr-detail`, `@ai-chat`, `@network`) | `@data`, `@ui-kit`, `@slot-system`, `@logger`, react, lucide-react, own internals | **each other** |
| `@data` | `@tanstack/react-query`, `@logger` | `@ui-kit`, `@slot-system`, any UI module |
| `@ui-kit` | react, `@radix-ui/*`, tailwind-merge, clsx | `@data`, `@slot-system`, any UI module |
| `@slot-system` | react | everything else |

> Modules communicate only through `@data`: reads via `useQuery`, writes via `useMutation`. No direct module-to-module calls → no circular deps, single source of truth, hot-swappable and testable modules.

### Data Flow

```
   GitHub API (GraphQL/REST)              Claude Code CLI
            │                                     │
   fetch() from renderer          spawn → stream-json over IPC
            ▼                                     ▼
   @data (--module-data/)                  Main process
   github.ts · queries · mutations         claude-cli.ts subprocess
   useQuery = read · useMutation = write    relays claude:* IPC events
            │                                     │
            └────────────────┬────────────────────┘
                             ▼
   ┌───────────────────────────────────────────────────────────┐
   │  TanStack Query Cache — the single source of truth         │
   │  GitHub data · Settings · AI state · UI state              │
   │  Header · Canvas · PRDetail · AIChat · Network · Explorer  │
   └───────────────────────────────────────────────────────────┘
```

- **GitHub** — direct `fetch()` from the renderer, no IPC.
- **Claude** — main process spawns the `claude` CLI subprocess and relays its `stream-json` stdout to the renderer as `claude:chunk` / `claude:done` / `claude:error` / `claude:review` IPC events (OAuth via your Claude subscription — no API key).
- **State** — everything lives in the TanStack Query cache; settings/AI/GitHub data persist to localStorage.

### State in `@data`

| Category | Persistence | Example keys |
|----------|-------------|--------------|
| GitHub data | localStorage | `repos` (1 h), `prsForRepo` (15 min), `prDetail`, `prFiles`, `user`, `rateLimit` |
| Settings | localStorage (∞) | `selectedRepos`, `viewMode`, `githubToken`, `cardLayouts`, `aiPanel`, `prDetailPanel` |
| AI | localStorage (∞) | `selectedModel`, `enableThinking`, `enableWebFetch`, `prChatMessages`, `customPrompts` |
| Local UI | localStorage | `local.selectedPRId`, `local.networkPanelOpen`, `local.networkPanelHeight` |
| System | runtime only | `system.fullscreen`, `system.theme` |

### Project Layout

```
src/
  main/        # Electron main: index.ts (IPC), claude-cli.ts (AI backend), store.ts, prompts/
  preload/     # Secure IPC bridge (OS operations) + window.electron types
  renderer/    # React entry point + globals.css
--module-app/          # App shell — renders <Slot>s, bootstrap.ts registers modules
--module-data/         # 🔑 THE CORE — TanStack Query state, GitHub API, queries/, mutations/
--module-slot-system/  # registerToSlot() + <Slot>
--module-ui-kit/       # Shared shadcn/ui components
--module-logger/       # Structured logging (main + renderer)
--module-persistence/  # SQLite (Drizzle ORM): main/ schema + hooks/
--module-header/  --module-canvas/  --module-explorer/
--module-pr-detail/  --module-ai-chat/  --module-network/   # UI feature modules
--module-test-utils/   # Shared test utilities & mocks
```

### TypeScript

Project-references setup for Electron's dual process: `tsconfig.web.json` (renderer + `--module-*`) and `tsconfig.node.json` (`src/main`, `src/preload`), both referenced by the root `tsconfig.json`. Path aliases (`@data`, `@ui-kit`, …) live in `tsconfig.web.json`. `isolatedDeclarations: true` requires **explicit type annotations on all exports**. `window.electron` types are declared in `src/preload/electron-api.d.ts`.

> For the full architecture deep-dive (data flow, module registration, patterns), see [`knowledge/app_architecture.md`](knowledge/app_architecture.md).

---

## Configuration

### Storage Locations

| Data | Location | Notes |
|------|----------|-------|
| GitHub token, theme, view mode, selected repos, card layouts | `localStorage` | TanStack Query persistence |
| Claude authentication | Handled by the Claude Code CLI (OAuth) | No API key stored — uses your Claude subscription |
| AI settings (model, thinking) | `~/Library/Application Support/codelobby/` | electron-store |
| Conversations, messages, custom prompts, AI usage | `~/Library/Application Support/codelobby/codelobby.db` | SQLite (Drizzle ORM) |

---

## Building for Production

```bash
pnpm run build         # current platform
pnpm run build:mac     # macOS (.dmg)
pnpm run build:win     # Windows (.exe)
pnpm run build:linux   # Linux (.AppImage)
```

Output lands in `dist/` (e.g. `dist/mac-arm64/CodeLobby.app`, `dist/CodeLobby-1.0.0-arm64.dmg`).

**Code signing (macOS)** — enroll in the Apple Developer Program, create certificates in Xcode, then set `APPLE_ID`, `APPLE_ID_PASSWORD` (app-specific password), and `APPLE_TEAM_ID` before building.

---

## Troubleshooting

**"Invalid Token"** — ensure the token has the `repo` scope and hasn't expired; generate a new one if needed.

**Rate limit exceeded** — wait for the reset time (shown in the rate-limit tooltip). GraphQL has a 5,000 points/hour limit; normal usage stays well under it.

**Cards not saving position** — ensure the app can write to its data directory; click "Grid" to reset the layout, then reposition.

**App won't start** — clear and reinstall:
```bash
rm -rf node_modules pnpm-lock.yaml && pnpm install && pnpm run dev
```

**White screen** — open the dev console (View → Toggle Developer Tools) and check for errors; if needed, clear app data: `rm -rf ~/Library/Application\ Support/codelobby/`.

When reporting a bug, include OS + app version, steps to reproduce, and console output/screenshots if relevant.

---

## Acknowledgments

[Electron](https://www.electronjs.org/) · [React](https://reactjs.org/) · [shadcn/ui](https://ui.shadcn.com/) · [TanStack Query](https://tanstack.com/query) · [Tailwind CSS](https://tailwindcss.com/) · [Lucide Icons](https://lucide.dev/) · [GitHub GraphQL API](https://docs.github.com/en/graphql) · [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)


---

## Roadmap

**Current** — PR dashboard with full context (CI, comments, reviews); Canvas & IDE views; AI PR analysis, CI-failure diagnosis, and PR-specific chat with diff context (via Claude Code CLI); AI review generation with inline comments; PR actions (approve/merge/request changes); network debug panel; custom quick prompts; usage & memory indicators; SQLite persistence.

**Next** — smart suggestions from comment content; natural-language PR search; one-click pull branch to local machine.

**Future** — AI-assisted code fixes; deep code review with full codebase access; automated actions with human approval.

---

[Report Bug](https://github.com/yourusername/codelobby/issues) • [Request Feature](https://github.com/yourusername/codelobby/issues)
