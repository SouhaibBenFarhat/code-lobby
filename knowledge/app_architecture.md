# CodeLobby Application Architecture

This document provides an extensive technical overview of the CodeLobby application architecture. It serves as a reference for developers working on the codebase.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Process Architecture (Electron)](#2-process-architecture-electron)
3. [Package Structure (Monorepo)](#3-package-structure-monorepo)
4. [Slot-Based Module System](#4-slot-based-module-system)
5. [State Management (Shared Store)](#5-state-management-shared-store)
6. [Action System (Event-Driven)](#6-action-system-event-driven)
7. [Data Flow Architecture](#7-data-flow-architecture)
8. [IPC Communication Layer](#8-ipc-communication-layer)
9. [API Client Layer](#9-api-client-layer)
10. [Component Architecture Patterns](#10-component-architecture-patterns)
11. [TypeScript Configuration](#11-typescript-configuration)
12. [Available Slots & Modules](#12-available-slots--modules)
13. [Adding New Features](#13-adding-new-features)

---

## 1. High-Level Overview

CodeLobby is an **Electron desktop application** built with:

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 28 |
| Frontend | React 18 + TypeScript 5 |
| State Management | Custom Signals (@preact/signals-inspired) |
| Build Tool | electron-vite |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Data Fetching | TanStack Query 5 |
| GitHub API | @octokit/graphql |
| AI Integration | Anthropic Claude API |
| Persistence | electron-store (encrypted) |

### Architectural Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                    "Buffet Pattern"                         │
│                                                             │
│   Data Module (Kitchen)                                     │
│   └─► Fetches data from APIs                                │
│   └─► Writes to Shared Store                                │
│                                                             │
│   Shared Store (Buffet Table)                               │
│   └─► Single source of truth                                │
│   └─► Reactive signals                                      │
│                                                             │
│   UI Modules (Guests)                                       │
│   └─► Read from store                                       │
│   └─► Emit actions (never write directly)                   │
│   └─► No cross-module imports                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Process Architecture (Electron)

Electron runs two separate processes that communicate via IPC:

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│        React + TypeScript + TanStack Query                   │
│              (packages/* + src/renderer/)                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ IPC (contextBridge)
┌───────────────────────┴─────────────────────────────────────┐
│                    Preload Script                            │
│           Type-safe IPC bridge (window.electron)             │
│              (src/preload/)                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ ipcRenderer.invoke
┌───────────────────────┴─────────────────────────────────────┐
│                    Main Process                              │
│      Electron + GitHub API + Claude API + electron-store     │
│              (src/main/)                                     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Responsibilities

| Directory | Process | Purpose |
|-----------|---------|---------|
| `src/main/` | Main | IPC handlers, API calls, storage, prompts |
| `src/preload/` | Preload | Secure bridge exposing `window.electron` |
| `src/renderer/` | Renderer | Entry point (`main.tsx`), global styles |
| `packages/*` | Renderer | All UI modules, state, components |

### Key Files in Main Process

| File | Purpose |
|------|---------|
| `index.ts` | App entry, window creation, IPC handler registration |
| `store.ts` | electron-store wrapper, persistence logic |
| `github-graphql.ts` | GitHub GraphQL queries |
| `claude-api.ts` | Anthropic Claude API integration |
| `http-client.ts` | Centralized HTTP logging |
| `prompts/*.ts` | AI system prompts |

---

## 3. Package Structure (Monorepo)

CodeLobby uses npm workspaces with the following structure:

```
packages/
├── app/                    # App shell (renders slots)
│   └── src/
│       ├── App.tsx         # Main layout with <Slot> components
│       ├── bootstrap.ts    # Module registration & initialization
│       └── index.ts        # Export
│
├── shared-store/           # Reactive state management
│   └── src/
│       ├── store.ts        # Signal-based store
│       ├── actions.ts      # Action emitters
│       └── types.ts        # Shared TypeScript types
│
├── slot-system/            # Module registration
│   └── src/index.tsx       # registerToSlot, <Slot>, useSlotModules
│
├── api/                    # IPC client wrapper
│   └── src/
│       ├── client.ts       # Main api object
│       ├── logger.ts       # Request logging
│       └── namespaces/     # Grouped API methods
│           ├── github.ts
│           ├── ai.ts
│           ├── settings.ts
│           └── logs.ts
│
├── data-module/            # Data fetching & store updates
│   └── src/index.ts        # Action listeners, IPC calls, store writes
│
├── ui-kit/                 # Shared UI components (shadcn/ui)
│   └── src/                # Button, Input, Card, Dialog, etc.
│
├── queries/                # TanStack Query definitions
│
├── logger/                 # Structured logging
│   └── src/
│       ├── main-logger.ts      # Main process logger
│       └── renderer-logger.ts  # Renderer process logger
│
├── test-utils/             # Test utilities & mocks
│
└── [ui-modules]/           # Feature modules (self-registering)
    ├── header-module/
    ├── explorer-module/
    ├── canvas-module/
    ├── pr-detail-module/
    ├── ai-chat-module/
    └── network-module/
```

### Package Dependencies (Allowed Imports)

Each module can **ONLY** import from:

| Allowed Import | Purpose |
|----------------|---------|
| `@codelobby/shared-store` | Global state (Store, Actions, signals) |
| `@codelobby/slot-system` | Slot registration |
| `@codelobby/ui-kit` | Shared UI components |
| `@codelobby/queries` | Data fetching hooks |
| `@codelobby/data-module` | Data utilities |
| `@codelobby/api` | IPC client |
| `@codelobby/logger` | Logging |
| `@codelobby/test-utils` | Test utilities |
| `./components/*` | Own internal components |

### ❌ FORBIDDEN Imports

```typescript
// ❌ NEVER import one UI module from another
import { SomeComponent } from '@codelobby/canvas-module'
import { AnotherComponent } from '@codelobby/header-module'
```

---

## 4. Slot-Based Module System

The slot system enables **zero cross-imports** between UI modules. Each module self-registers to a named slot at import time.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                     App Shell (App.tsx)                      │
│   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐   │
│   │ <Slot   │ │ <Slot   │ │ <Slot   │ │ <Slot           │   │
│   │ name=   │ │ name=   │ │ name=   │ │ name=           │   │
│   │"header">│ │"left-   │ │"main">  │ │"ai-panel">      │   │
│   │         │ │panel">  │ │         │ │                 │   │
│   └────┬────┘ └────┬────┘ └────┬────┘ └────────┬────────┘   │
└────────┼──────────┼──────────┼─────────────────┼────────────┘
         │          │          │                 │
    ┌────▼────┐┌────▼────┐┌────▼────┐      ┌────▼────┐
    │ header- ││explorer-││ canvas- │      │ai-chat- │
    │ module  ││ module  ││ module  │      │ module  │
    └─────────┘└─────────┘└─────────┘      └─────────┘
    
    Each module self-registers to its slot via registerToSlot()
```

### Available Slots

| Slot Name | Purpose | Module |
|-----------|---------|--------|
| `header` | App header bar | header-module |
| `left-panel` | Explorer sidebar (IDE mode) | explorer-module |
| `main` | Main content area | canvas-module |
| `pr-detail-panel` | PR detail sidebar | pr-detail-module |
| `ai-panel` | Claude AI chat panel | ai-chat-module |
| `network-panel` | HTTP request monitor | network-module |
| `right-panel` | Generic right panel | - |
| `footer` | Footer area | - |
| `modal` | Modal dialogs | - |
| `toast` | Toast notifications | - |

### Module Registration Pattern

Every UI module **MUST** follow this pattern:

```typescript
// packages/my-module/src/index.tsx

import { Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { MyComponent } from './components/MyComponent'

// Wrapper connects component to shared store
function MyComponentWrapper() {
  const someState = useSignal(Store.someState)
  
  return <MyComponent state={someState} />
}

// CRITICAL: Self-register to slot
registerToSlot({
  id: 'my-module',
  slot: 'main',  // or 'header', 'left-panel', etc.
  component: MyComponentWrapper,
  order: 0,
  visible: () => Store.someCondition.value
})
```

### Bootstrap Process

Modules are loaded in `packages/app/src/bootstrap.ts`:

```typescript
// Each import triggers the module's registerToSlot() call
import '@codelobby/header-module'
import '@codelobby/explorer-module'
import '@codelobby/canvas-module'
import '@codelobby/pr-detail-module'
import '@codelobby/ai-chat-module'
import '@codelobby/network-module'
```

---

## 5. State Management (Shared Store)

The shared store is the **single source of truth** for all application state. It uses a custom signal-based implementation inspired by @preact/signals.

### Signal Implementation

```typescript
// packages/shared-store/src/store.ts

export interface Signal<T> {
  value: T
  subscribe(fn: () => void): () => boolean
  getSnapshot(): T
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue
  const subscribers = new Set<() => void>()

  return {
    get value(): T {
      return value
    },
    set value(newValue: T) {
      if (newValue !== value) {
        value = newValue
        for (const fn of subscribers) fn()
      }
    },
    subscribe(fn) {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    getSnapshot(): T {
      return value
    }
  }
}
```

### Using Signals in React

```typescript
import { Store, useSignal } from '@codelobby/shared-store'

function MyComponent() {
  // Automatically re-renders when signal value changes
  const selectedPR = useSignal(Store.selectedPR)
  const viewMode = useSignal(Store.viewMode)
  
  return <div>{selectedPR?.title}</div>
}
```

### Store Structure

```typescript
export const Store: StoreType = {
  // Authentication
  user: createSignal<GitHubUser | null>(null),
  isAuthenticated: createSignal<boolean>(false),

  // GitHub Data
  repos: createSignal<Repository[]>([]),
  prs: createSignal<PullRequest[]>([]),
  selectedRepos: createSignal<string[] | null>(null),
  selectedPR: createSignal<PullRequest | null>(null),
  rateLimit: createSignal<RateLimit | null>(null),

  // AI Chat
  chatHistory: createSignal<ChatMessage[]>([]),
  prChats: createSignal<PRChat[]>([]),
  linkedPRChat: createSignal<LinkedPRChat | null>(null),
  claudeApiKey: createSignal<string | null>(null),
  selectedModel: createSignal<string | null>(null),
  enableThinking: createSignal<boolean>(true),

  // Layout & UI State
  viewMode: createSignal<ViewMode>('canvas'),
  prDetailOpen: createSignal<boolean>(false),
  aiPanelOpen: createSignal<boolean>(false),
  explorerWidth: createSignal<number>(280),
  cardLayouts: createSignal<CardLayout[]>([]),

  // Loading States
  loading: {
    repos: createSignal<boolean>(false),
    prs: createSignal<boolean>(false),
    prDetail: createSignal<boolean>(false),
    auth: createSignal<boolean>(true)
  },

  // Errors
  errors: {
    github: createSignal<Error | null>(null),
    ai: createSignal<Error | null>(null),
    auth: createSignal<Error | null>(null)
  }
}
```

### ❌ FORBIDDEN: Writing to Store Outside data-module

**ONLY `data-module` is allowed to write to Store!**

```typescript
// ❌ NEVER DO THIS in UI modules or queries
import { Store } from '@codelobby/shared-store'
Store.selectedPR.value = newPR  // FORBIDDEN!

// ✅ CORRECT - Emit an action, let data-module handle it
import { Actions } from '@codelobby/shared-store'
Actions.selectPR(newPR)
```

---

## 6. Action System (Event-Driven)

Actions are event emitters that UI modules use to request data operations. The data module listens for these events and updates the store.

### Data Flow

```
UI Module → emit Action → Data Module listens → IPC call → Update Store → UI reacts
```

### Action Implementation

```typescript
// packages/shared-store/src/actions.ts

// Emit an action event
function emit<K extends keyof ActionEvents>(
  action: K,
  ...args: ActionEvents[K] extends void ? [] : [ActionEvents[K]]
): void {
  const detail = args[0]
  window.dispatchEvent(new CustomEvent(action, { detail }))
}

// Listen for an action event (used by data-module)
export function onAction<K extends keyof ActionEvents>(
  action: K,
  handler: (payload: ActionEvents[K]) => void
): () => void {
  const listener = ((e: CustomEvent) => handler(e.detail)) as EventListener
  window.addEventListener(action, listener)
  return () => window.removeEventListener(action, listener)
}
```

### Available Actions

```typescript
export const Actions = {
  // GitHub Actions
  fetchRepos: () => emit('action:fetch-repos'),
  fetchPRs: (repos: string[]) => emit('action:fetch-prs', { repos }),
  selectPR: (pr: PullRequest | null) => emit('action:select-pr', { pr }),
  refreshPRDetail: (repoFullName, prNumber) => emit('action:refresh-pr-detail', {...}),

  // AI Actions
  sendAIMessage: (message, systemContext?) => emit('action:send-ai-message', {...}),
  createPRChat: (pr) => emit('action:create-pr-chat', { pr }),
  analyzeCIFailure: (owner, repo, checkRunId, checkName) => emit('action:analyze-ci-failure', {...}),

  // Auth Actions
  signIn: (token) => emit('action:sign-in', { token }),
  signOut: () => emit('action:sign-out'),

  // Layout Actions
  setViewMode: (mode) => emit('action:set-view-mode', { mode }),
  toggleAIPanel: () => emit('action:toggle-ai-panel'),
  togglePRDetail: () => emit('action:toggle-pr-detail'),

  // Data Actions
  clearCache: () => emit('action:clear-cache'),
  factoryReset: () => emit('action:factory-reset'),
}
```

### Using Actions in UI

```typescript
import { Actions } from '@codelobby/shared-store'

function PRCard({ pr }) {
  const handleClick = () => {
    Actions.selectPR(pr)  // Emits event, data-module handles it
  }
  
  return <div onClick={handleClick}>{pr.title}</div>
}
```

---

## 7. Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub API                            │
│                    (GraphQL Endpoint)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ github-graphql  │  │     store       │  │    IPC      │  │
│  │   .ts           │  │     .ts         │  │  Handlers   │  │
│  │                 │  │                 │  │             │  │
│  │ • GraphQL       │  │ • Token         │  │ • fetch-prs │  │
│  │   queries       │  │ • User cache    │  │ • get-token │  │
│  │ • Data parsing  │  │ • Card layouts  │  │ • etc.      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                         (IPC Bridge)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │   @codelobby/   │  │  @codelobby/    │  │ UI Modules  │  │
│  │      api        │  │  shared-store   │  │             │  │
│  │                 │  │                 │  │ • header    │  │
│  │ • Typed IPC     │  │ • Signals       │  │ • canvas    │  │
│  │ • Logging       │  │ • Actions       │  │ • ai-chat   │  │
│  │ • Namespaces    │  │ • useSignal()   │  │ • pr-detail │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
│           │                    ▲                  │          │
│           │                    │                  │          │
│           ▼                    │                  ▼          │
│  ┌─────────────────────────────┴──────────────────────────┐ │
│  │                   @codelobby/data-module               │ │
│  │  • Listens for actions                                 │ │
│  │  • Calls api.* methods                                 │ │
│  │  • Updates Store                                       │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Complete Flow Example: Selecting a PR

1. **User clicks PR card** → UI component
2. **Component calls** `Actions.selectPR(pr)`
3. **data-module listens** → `onAction('action:select-pr', ...)`
4. **data-module updates store**:
   ```typescript
   Store.selectedPR.value = pr
   Store.prDetailOpen.value = pr !== null
   ```
5. **All components using** `useSignal(Store.selectedPR)` **re-render**

---

## 8. IPC Communication Layer

### Preload Script (`src/preload/index.ts`)

The preload script exposes a type-safe `window.electron` object:

```typescript
const electronAPI: ElectronAPI = {
  // Token management
  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token) => ipcRenderer.invoke('set-token', token),
  
  // GitHub API
  fetchPRs: () => ipcRenderer.invoke('fetch-prs'),
  fetchAllPRsForRepos: (repos) => ipcRenderer.invoke('fetch-all-prs-for-repos', repos),
  
  // AI Chat
  sendChatMessageStreaming: (message, systemContext?) =>
    ipcRenderer.invoke('send-chat-message-streaming', message, systemContext),
  onChatStreamChunk: (callback) => {
    ipcRenderer.on('chat-stream-chunk', (_, chunk) => callback(chunk))
    return () => ipcRenderer.removeListener('chat-stream-chunk', handler)
  },
  
  // Settings
  getViewMode: () => ipcRenderer.invoke('get-view-mode'),
  setViewMode: (mode) => ipcRenderer.invoke('set-view-mode', mode),
}

contextBridge.exposeInMainWorld('electron', electronAPI)
```

### Main Process IPC Handlers (`src/main/index.ts`)

```typescript
// Pattern for IPC handlers
ipcMain.handle('fetch-prs', async () => {
  try {
    const token = getToken()
    if (!token) return { success: false, error: 'Not authenticated' }
    
    const data = await fetchAllPRsForRepos(token, repos)
    return { success: true, data }
  } catch (error) {
    logger.error(LogCategory.API, 'Failed to fetch PRs', { error })
    return { success: false, error: error.message }
  }
})
```

### IPC Response Convention

All IPC handlers return objects with this shape:

```typescript
{ success: boolean; data?: T; error?: string }
```

---

## 9. API Client Layer

The `@codelobby/api` package provides a typed wrapper around `window.electron`:

### Structure

```typescript
// packages/api/src/client.ts
export const api = {
  github: {
    fetchContributedRepos: () => window.electron.fetchContributedRepos(),
    fetchAllPRsForRepos: (repos) => window.electron.fetchAllPRsForRepos(repos),
    validateToken: () => window.electron.validateToken(),
    // ...
  },
  
  settings: {
    getViewMode: () => window.electron.getViewMode(),
    setViewMode: (mode) => window.electron.setViewMode(mode),
    // ...
  },
  
  ai: {
    sendChatMessageStreaming: (message, systemContext) => 
      window.electron.sendChatMessageStreaming(message, systemContext),
    onChatStreamChunk: (callback) => 
      window.electron.onChatStreamChunk(callback),
    // ...
  },
  
  logs: {
    getLogs: () => window.electron.getLogs(),
    clearLogs: () => window.electron.clearLogs(),
    // ...
  }
}
```

### Usage in data-module

```typescript
import { api } from '@codelobby/api'

onAction('action:fetch-repos', async () => {
  Store.loading.repos.value = true
  try {
    const result = await api.github.fetchContributedRepos()
    if (result.success && result.data) {
      Store.repos.value = result.data
    }
  } finally {
    Store.loading.repos.value = false
  }
})
```

---

## 10. Component Architecture Patterns

### Folder Structure

Every component lives in its own folder:

```
components/
└── MyComponent/
    ├── index.ts              # Barrel export
    ├── MyComponent.tsx       # Component code
    └── MyComponent.test.tsx  # Tests (colocated)
```

### Dumb Component Pattern

When splitting large components, keep child components **"dumb" (presentational)**:

```typescript
// ✅ GOOD - Dumb presentational component
// ChatHeader.tsx
import { Button } from '@codelobby/ui-kit'

interface ChatHeaderProps {
  title: string
  onClose: () => void           // ← Callback prop
  onClearHistory: () => void    // ← Callback prop
}

export function ChatHeader({ title, onClose, onClearHistory }: ChatHeaderProps) {
  return (
    <div>
      <h2>{title}</h2>
      <Button onClick={onClose}>Close</Button>
      <Button onClick={onClearHistory}>Clear</Button>
    </div>
  )
}
```

```typescript
// ❌ BAD - Component reaching outside for data/actions
import { Store, Actions } from '@codelobby/shared-store'  // ❌

export function ChatHeader() {
  const linkedPRChat = useSignal(Store.linkedPRChat)  // ❌ Direct store access
  
  const handleClear = async () => {
    await window.electron.clearChatHistory()  // ❌ Direct IPC call
    Actions.clearChat()  // ❌ Direct action dispatch
  }
}
```

### Orchestrator Pattern

```
┌─────────────────────────────────────────────────────┐
│  index.tsx (Wrapper)                                │
│  - Connects to shared-store via useSignal()         │
│  - Passes props down                                │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│  MainComponent.tsx (Orchestrator)                   │
│  - Manages local state                              │
│  - Calls window.electron for IPC                    │
│  - Passes data + callbacks to children              │
└─────────────────────┬───────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───┐        ┌────▼────┐       ┌────▼────┐
│Header │        │ Content │       │  Input  │
│(dumb) │        │ (dumb)  │       │ (dumb)  │
└───────┘        └─────────┘       └─────────┘
```

### Always Use UI-Kit Components

```typescript
// ❌ BAD - Raw HTML input
<input type="text" placeholder="Search..." className="..." />

// ✅ GOOD - Use the Input component from ui-kit
import { Input } from '@codelobby/ui-kit'
<Input type="text" placeholder="Search..." />
```

---

## 11. TypeScript Configuration

The project uses **project references** for Electron's dual-process architecture:

```
tsconfig.json (root)
├── references → tsconfig.web.json    # Renderer + packages
└── references → tsconfig.node.json   # Main process
```

| Config | Purpose | Includes |
|--------|---------|----------|
| `tsconfig.json` | Root with project references | `"files": []` |
| `tsconfig.web.json` | Browser/renderer context | `packages/**/*`, `src/renderer/**/*` |
| `tsconfig.node.json` | Node.js/main process | `src/main/**/*`, `src/preload/**/*` |

### Path Aliases (tsconfig.web.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@codelobby/shared-store": ["packages/shared-store/src/index.ts"],
      "@codelobby/ui-kit": ["packages/ui-kit/src/index.ts"],
      "@codelobby/slot-system": ["packages/slot-system/src/index.tsx"],
      "@codelobby/api": ["packages/api/src/index.ts"],
      "@codelobby/data-module": ["packages/data-module/src/index.ts"],
      "@codelobby/logger": ["packages/logger/src/index.ts"],
      "@codelobby/queries": ["packages/queries/src/index.ts"],
      "@codelobby/test-utils": ["packages/test-utils/src/index.ts"],
      // UI modules
      "@codelobby/header-module": ["packages/header-module/src/index.tsx"],
      "@codelobby/explorer-module": ["packages/explorer-module/src/index.tsx"],
      "@codelobby/canvas-module": ["packages/canvas-module/src/index.tsx"],
      "@codelobby/pr-detail-module": ["packages/pr-detail-module/src/index.tsx"],
      "@codelobby/ai-chat-module": ["packages/ai-chat-module/src/index.tsx"],
      "@codelobby/network-module": ["packages/network-module/src/index.tsx"]
    }
  }
}
```

---

## 12. Available Slots & Modules

| Slot | Module | Description |
|------|--------|-------------|
| `header` | header-module | App header with nav, settings, user avatar |
| `left-panel` | explorer-module | IDE-style tree view sidebar |
| `main` | canvas-module | Free-form PR card canvas |
| `pr-detail-panel` | pr-detail-module | PR detail sidebar with CI, comments |
| `ai-panel` | ai-chat-module | Claude AI chat panel |
| `network-panel` | network-module | HTTP request monitoring |

---

## 13. Adding New Features

### Adding a New IPC Handler

**Step 1: Define in main process** (`src/main/index.ts`)

```typescript
ipcMain.handle('my-new-handler', async (_, arg1: string, arg2: number) => {
  try {
    const result = await doSomething(arg1, arg2)
    return { success: true, data: result }
  } catch (error) {
    logger.error(LogCategory.API, 'Handler failed', { error })
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 2: Add to preload** (`src/preload/index.ts`)

```typescript
// In electronAPI object
myNewHandler: (arg1: string, arg2: number) => 
  ipcRenderer.invoke('my-new-handler', arg1, arg2),
```

**Step 3: Add TypeScript types** (`src/preload/electron-api.d.ts`)

```typescript
interface ElectronAPI {
  myNewHandler: (arg1: string, arg2: number) => Promise<{ success: boolean; data?: T; error?: string }>
}
```

**Step 4: Add to API client** (`packages/api/src/namespaces/...`)

```typescript
export const myNamespace = {
  myNewHandler: (arg1: string, arg2: number) => 
    window.electron.myNewHandler(arg1, arg2)
}
```

### Adding a New UI Module

**Step 1: Create package structure**

```
packages/my-new-module/
├── package.json
└── src/
    ├── index.tsx           # Entry + slot registration
    └── components/
        └── MyComponent/
            ├── index.ts
            ├── MyComponent.tsx
            └── MyComponent.test.tsx
```

**Step 2: package.json**

```json
{
  "name": "@codelobby/my-new-module",
  "version": "1.0.0",
  "main": "src/index.tsx",
  "dependencies": {
    "@codelobby/shared-store": "workspace:*",
    "@codelobby/slot-system": "workspace:*",
    "@codelobby/ui-kit": "workspace:*"
  }
}
```

**Step 3: Create index.tsx with slot registration**

```typescript
// packages/my-new-module/src/index.tsx
import { Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { MyComponent } from './components/MyComponent'

function MyComponentWrapper() {
  const someState = useSignal(Store.someState)
  return <MyComponent state={someState} />
}

registerToSlot({
  id: 'my-new-module',
  slot: 'main',  // or appropriate slot
  component: MyComponentWrapper,
  order: 0,
  visible: () => true
})
```

**Step 4: Add to bootstrap.ts**

```typescript
// packages/app/src/bootstrap.ts
import '@codelobby/my-new-module'
```

**Step 5: Add path alias to tsconfig.web.json**

```json
{
  "paths": {
    "@codelobby/my-new-module": ["packages/my-new-module/src/index.tsx"]
  }
}
```

### Adding a New Action

**Step 1: Define action type** (`packages/shared-store/src/actions.ts`)

```typescript
export type ActionEvents = {
  // ... existing actions
  'action:my-new-action': { param1: string; param2: number }
}
```

**Step 2: Add action emitter**

```typescript
export const Actions = {
  // ... existing actions
  myNewAction: (param1: string, param2: number) => 
    emit('action:my-new-action', { param1, param2 }),
}
```

**Step 3: Handle in data-module** (`packages/data-module/src/index.ts`)

```typescript
cleanupFunctions.push(
  onAction('action:my-new-action', async ({ param1, param2 }) => {
    try {
      const result = await api.myNamespace.myNewHandler(param1, param2)
      if (result.success) {
        Store.myData.value = result.data
      }
    } catch (error) {
      Store.errors.myError.value = error as Error
    }
  })
)
```

---

## Quick Reference

### Key Commands

```bash
npm run dev          # Start development
npm run build        # Build for production
npm run lint         # Run Biome linter
npm run lint:fix     # Auto-fix lint issues
npm run test         # Run tests
```

### Key Principles Summary

1. **Single Source of Truth**: Renderer's Store is authoritative
2. **Unidirectional Data Flow**: Actions → Data Module → Store → UI
3. **Zero Cross-Imports**: UI modules never import from each other
4. **Only data-module Writes**: UI modules read from Store, emit Actions
5. **Dumb Components**: Pass data/callbacks via props
6. **Colocated Tests**: Test files live next to source files
7. **Type-Safe IPC**: All IPC calls are typed via ElectronAPI interface

---

*Last updated: January 2026*
