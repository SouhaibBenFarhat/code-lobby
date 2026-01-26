# CodeLobby Application Architecture

This document provides a technical overview of the CodeLobby application architecture, updated to reflect the **TanStack Query-based** state management system.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Process Architecture (Electron)](#2-process-architecture-electron)
3. [Package Structure (Monorepo)](#3-package-structure-monorepo)
4. [State Management (TanStack Query)](#4-state-management-tanstack-query)
5. [Slot-Based Module System](#5-slot-based-module-system)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Query Keys & Persistence](#7-query-keys--persistence)
8. [Component Architecture Patterns](#8-component-architecture-patterns)
9. [TypeScript Configuration](#9-typescript-configuration)
10. [Adding New Features](#10-adding-new-features)

---

## 1. High-Level Overview

CodeLobby is an **Electron desktop application** built with:

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 28 |
| Frontend | React 18 + TypeScript 5 |
| State Management | **TanStack Query 5** |
| Build Tool | electron-vite |
| Styling | Tailwind CSS 3 + shadcn/ui |
| GitHub API | GraphQL (direct fetch) |
| AI Integration | Anthropic Claude API |
| Persistence | localStorage + TanStack Query Persist |

### Architectural Philosophy

```
┌─────────────────────────────────────────────────────────────┐
│                 TanStack Query Cache                         │
│        (Single Source of Truth for ALL state)               │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   GitHub    │  │  Settings   │  │    UI State         │ │
│  │   Data      │  │  (persisted)│  │  (local/persisted)  │ │
│  │ repos, prs  │  │ viewMode,   │  │  selectedPR,        │ │
│  │ user, rate  │  │ selectedRepo│  │  aiPanel, etc.      │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
        ▲                                        │
        │ useQuery                               │ useMutation
        │ (read)                                 │ (write)
┌───────┴────────────────────────────────────────┴───────────┐
│                      UI Components                          │
│  Header │ Canvas │ PRDetail │ AIChat │ Network │ Explorer  │
└─────────────────────────────────────────────────────────────┘
```

**Key Principles:**

1. **TanStack Query is the single source of truth** — ALL state lives in the query cache
2. **useQuery for reads** — Components read data via query hooks
3. **useMutation for writes** — Components write data via mutation hooks
4. **Automatic persistence** — Settings and AI data persist to localStorage
5. **No custom state management** — No signals, no Redux, no custom stores

---

## 2. Process Architecture (Electron)

Electron runs two separate processes:

```
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│        React + TanStack Query + Direct fetch()               │
│              (--module-*/ + src/renderer/)                   │
└───────────────────────┬─────────────────────────────────────┘
                        │ window.electron (IPC)
┌───────────────────────┴─────────────────────────────────────┐
│                    Preload Script                            │
│           Type-safe IPC bridge (for OS operations)           │
│              (src/preload/)                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ ipcRenderer.invoke
┌───────────────────────┴─────────────────────────────────────┐
│                    Main Process                              │
│      Electron + Claude API + electron-store (AI only)        │
│              (src/main/)                                     │
└─────────────────────────────────────────────────────────────┘
```

### What Lives Where

| Process | Responsibility |
|---------|----------------|
| **Renderer** | ALL GitHub API calls, state management, UI |
| **Preload** | OS operations (fullscreen, theme, notifications) |
| **Main** | Claude AI streaming, system prompts, electron-store |

### Key Change from Old Architecture

**Before (old):** GitHub API calls went through Main Process via IPC
**Now:** GitHub API calls happen directly in Renderer via `fetch()`

---

## 3. Module Structure (Flat Architecture)

Modules are prefixed with `--module-` and live at the project root:

```
--module-app/               # App shell (renders slots)
├── App.tsx                 # Main layout with <Slot> components
├── bootstrap.ts            # Module registration & initialization
└── index.ts

--module-data/              # 🔑 THE CORE - TanStack Query state
├── client.ts               # QueryClient + persistence config
├── keys.ts                 # All query keys (organized by category)
├── types.ts                # Shared TypeScript types
├── github.ts               # GitHub API functions (direct fetch)
├── queries/                # useQuery hooks
│   ├── repository.ts
│   ├── pull-request.ts
│   ├── user.ts
│   ├── settings.ts
│   ├── ai.ts
│   ├── system.ts
│   └── network.ts
└── mutations/              # useMutation hooks
    ├── pull-request.ts
    ├── user.ts
    ├── settings.ts
    ├── ai.ts
    ├── system.ts
    └── network.ts

--module-slot-system/       # Module registration
└── index.tsx               # registerToSlot, <Slot>

--module-ui-kit/            # Shared UI components (shadcn/ui)
                            # Button, Input, Card, etc.

--module-logger/            # Structured logging

--module-test-utils/        # Test utilities & mocks

# UI Feature Modules (self-registering)
--module-header/
--module-explorer/
--module-canvas/
--module-pr-detail/
--module-ai-chat/
--module-network/
```

### Module Dependencies (Allowed Imports)

| Module | Can Import |
|--------|------------|
| UI modules | `@data`, `@slot-system`, `@ui-kit` |
| `@data` | `@tanstack/react-query`, types |
| `@slot-system` | React |

### ❌ FORBIDDEN Imports

```typescript
// ❌ NEVER import one UI module from another
import { SomeComponent } from '@canvas'
```

---

## 4. State Management (TanStack Query)

### Everything is a Query or Mutation

```typescript
// READING data - useQuery
const { data: repos } = useRepos()
const { data: theme } = useTheme()
const { data: selectedPR } = useSelectedPR()

// WRITING data - useMutation
const setTheme = useSetTheme()
const selectPR = useSelectPR()
const signIn = useSignIn()

// Usage
setTheme.mutate('dark')
selectPR.mutate({ owner: 'org', repo: 'app', number: 123 })
```

### Query Cache as State Store

```typescript
// @data/src/queries/settings.ts
export function useViewMode() {
  const qc = useQueryClient()
  return useQuery({
    queryKey: keys.viewMode,
    queryFn: () => qc.getQueryData<ViewMode>(keys.viewMode) ?? 'canvas',
    staleTime: Infinity
  })
}

// @data/src/mutations/settings.ts
export function useSetViewMode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (mode: ViewMode) => {
      qc.setQueryData(keys.viewMode, mode)
      localStorage.setItem('codelobby-view-mode', mode)
      return mode
    }
  })
}
```

### No More Signals, No More Actions

**Old (deleted):**
```typescript
// ❌ OLD - Don't use
import { Store, Actions } from '@codelobby/shared-store'
Store.selectedPR.value = pr  // Signal write
Actions.selectPR(pr)         // Action emit
```

**New:**
```typescript
// ✅ NEW - Use this
import { useSelectedPR, useSelectPR } from '@data'
const { data: selectedPR } = useSelectedPR()  // Read
const selectPR = useSelectPR()
selectPR.mutate(prIdentifier)                  // Write
```

---

## 5. Slot-Based Module System

The slot system remains unchanged — modules self-register to named slots.

### Available Slots

| Slot Name | Purpose | Module |
|-----------|---------|--------|
| `header` | App header bar | header-module |
| `left-panel` | Explorer sidebar | explorer-module |
| `main` | Main content area | canvas-module |
| `pr-detail-panel` | PR detail sidebar | pr-detail-module |
| `ai-panel` | Claude AI chat panel | ai-chat-module |
| `network-panel` | HTTP request monitor | network-module |

### Module Registration Pattern

```typescript
// --module-network/index.tsx
import { registerToSlot } from '@slot-system'
import { useNetworkPanel } from '@data'
import { MyComponent } from './components/MyComponent'

function MyComponentWrapper() {
  const { data: isOpen } = useNetworkPanel()
  if (!isOpen) return null
  return <MyComponent />
}

registerToSlot({
  id: 'my-module',
  slot: 'network-panel',
  component: MyComponentWrapper,
  order: 0
})
```

---

## 6. Data Flow Architecture

### GitHub Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub API                            │
│                    (api.github.com)                          │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ fetch() (direct from renderer)
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    @data                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  github.ts - API functions (fetchRepos, fetchPRs, etc.) ││
│  └─────────────────────────────────────────────────────────┘│
│                              ▲                               │
│                              │ queryFn                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  queries/repository.ts - useRepos(), usePRs()           ││
│  └─────────────────────────────────────────────────────────┘│
│                              ▲                               │
│                              │ useQuery                      │
└─────────────────────────────┴───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                           │
│  PRGrid.tsx, Header.tsx, etc.                               │
└─────────────────────────────────────────────────────────────┘
```

### Complete Flow Example: Fetching PRs

```typescript
// 1. Component uses hook
const { data: prs, isLoading } = usePRs()

// 2. Hook definition (queries/pull-request.ts)
export function usePRs() {
  const qc = useQueryClient()
  const { data: selectedRepos } = useSelectedRepos()
  const token = qc.getQueryData<string>(keys.githubToken)

  return useQuery({
    queryKey: keys.prs(selectedRepos ?? []),
    queryFn: async () => {
      // 3. Direct fetch to GitHub
      return github.fetchPRsForRepos(token!, selectedRepos!)
    },
    enabled: !!token && !!selectedRepos?.length,
    staleTime: 15 * 60 * 1000  // 15 minutes
  })
}

// 4. API function (github.ts)
export async function fetchPRsForRepos(token: string, repos: string[]) {
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query: GET_PRS_QUERY, variables: { repos } })
  })
  return transformResponse(await response.json())
}
```

---

## 7. Query Keys & Persistence

### Key Organization

```typescript
// @data/src/keys.ts
export const keys = {
  // GitHub (NOT persisted - fetched fresh)
  repos: ['github', 'repos'],
  prs: (repos) => ['github', 'prs', ...repos],
  user: ['github', 'user'],
  rateLimit: ['github', 'rate-limit'],

  // Settings (PERSISTED to localStorage)
  selectedRepos: ['settings', 'selected-repos'],
  viewMode: ['settings', 'view-mode'],
  githubToken: ['settings', 'github-token'],

  // AI (PERSISTED to localStorage)
  claudeApiKey: ['ai', 'claude-api-key'],
  chatHistory: ['ai', 'chat-history'],

  // Local UI state (PERSISTED)
  local: {
    selectedPRId: ['local', 'selected-pr-id'],
    networkPanelOpen: ['local', 'network-panel-open'],
    networkPanelHeight: ['local', 'network-panel-height']
  },

  // System (OS state - NOT persisted)
  system: {
    fullscreen: ['system', 'fullscreen'],
    theme: ['system', 'theme']
  }
}
```

### Persistence Configuration

```typescript
// @data/src/client.ts
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'codelobby-cache'
})

persistQueryClient({
  queryClient,
  persister,
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = query.queryKey[0]
      // Only persist settings, ai, local, and github data
      return ['settings', 'ai', 'local', 'github'].includes(key as string)
    }
  }
})
```

---

## 8. Component Architecture Patterns

### Reading State

```typescript
import { useSelectedPR, useViewMode, useTheme } from '@data'

function MyComponent() {
  const { data: selectedPR } = useSelectedPR()
  const { data: viewMode } = useViewMode()
  const { data: theme } = useTheme()

  return <div>{selectedPR?.title}</div>
}
```

### Writing State

```typescript
import { useSelectPR, useSetViewMode } from '@data'

function MyComponent() {
  const selectPR = useSelectPR()
  const setViewMode = useSetViewMode()

  const handleClick = () => {
    selectPR.mutate({ owner: 'org', repo: 'app', number: 123 })
    setViewMode.mutate('ide')
  }
}
```

### Dumb Component Pattern

Keep child components presentational:

```typescript
// ✅ GOOD - Dumb presentational component
function PRCard({ pr, onSelect }: { pr: PullRequest; onSelect: () => void }) {
  return (
    <div onClick={onSelect}>
      <h3>{pr.title}</h3>
    </div>
  )
}

// Parent handles state
function PRList() {
  const { data: prs } = usePRs()
  const selectPR = useSelectPR()

  return prs?.map(pr => (
    <PRCard 
      key={pr.id} 
      pr={pr} 
      onSelect={() => selectPR.mutate(pr)} 
    />
  ))
}
```

---

## 9. TypeScript Configuration

The project uses **project references** for Electron's dual-process architecture:

```
tsconfig.json (root)
├── references → tsconfig.web.json    # Renderer + packages
└── references → tsconfig.node.json   # Main process
```

### Isolated Declarations (tsconfig.web.json)

The project uses `isolatedDeclarations: true` for faster declaration generation. This requires **explicit type annotations** on all exported functions and variables:

```typescript
// ❌ BAD - Missing explicit return type
export function useMyQuery() {
  return useQuery({ ... })
}

// ✅ GOOD - Explicit return type
export function useMyQuery(): UseQueryResult<MyType, Error> {
  return useQuery({ ... })
}

// ❌ BAD - Missing variable type
export const myClient = new QueryClient({ ... })

// ✅ GOOD - Explicit type annotation
export const myClient: QueryClient = new QueryClient({ ... })

// ❌ BAD - React.forwardRef without type
export const MyComponent = React.forwardRef<HTMLDivElement, Props>(...)

// ✅ GOOD - With ForwardRefExoticComponent type
export const MyComponent: React.ForwardRefExoticComponent<
  Props & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, Props>(...)
```

### Path Aliases (tsconfig.web.json)

```json
{
  "compilerOptions": {
    "paths": {
      "@data": ["./--module-data/index.ts"],
      "@ui-kit": ["./--module-ui-kit/index.ts"],
      "@slot-system": ["./--module-slot-system/index.tsx"],
      "@header": ["./--module-header/index.tsx"],
      // ... etc
    }
  }
}
```

---

## 10. Adding New Features

### Adding New State

**1. Add query key** in `keys.ts`:
```typescript
export const keys = {
  // ...
  myNewState: ['settings', 'my-new-state'] as const
}
```

**2. Create query hook** in `queries/`:
```typescript
export function useMyNewState() {
  const qc = useQueryClient()
  return useQuery({
    queryKey: keys.myNewState,
    queryFn: () => qc.getQueryData<MyType>(keys.myNewState) ?? defaultValue,
    staleTime: Infinity
  })
}
```

**3. Create mutation hook** in `mutations/`:
```typescript
export function useSetMyNewState() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (value: MyType) => {
      qc.setQueryData(keys.myNewState, value)
      return value
    }
  })
}
```

**4. Export** from `index.ts`.

### Adding a New UI Module

1. Create `--module-my/` with standard structure
2. Import hooks from `@data`
3. Register to slot via `registerToSlot()`
4. Import in `bootstrap.ts`

---

## Quick Reference

### Key Commands

```bash
pnpm run dev          # Start development
pnpm run build        # Build for production
pnpm run lint         # Run Biome linter
pnpm run lint:fix     # Auto-fix lint issues
pnpm run test         # Run tests
```

### Key Principles Summary

1. **TanStack Query is the single source of truth** — No other state management
2. **useQuery for reads, useMutation for writes** — Consistent patterns
3. **Direct fetch() for GitHub** — No IPC layer for data fetching
4. **Settings/AI persisted, GitHub fresh** — Selective persistence
5. **Zero cross-imports between UI modules** — Use @data
6. **Slot system for module composition** — Self-registering modules

---

*Last updated: January 26, 2026*
