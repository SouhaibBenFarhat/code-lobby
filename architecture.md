# CodeLobby Architecture

> **The Buffet & Slot Architecture** — A zero cross-import modular system

This document describes the architectural decisions for CodeLobby's modular design, enabling independent development, testing, and deployment of features.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [The Buffet Pattern](#the-buffet-pattern)
4. [The Slot System](#the-slot-system)
5. [Package Structure](#package-structure)
6. [Module Anatomy](#module-anatomy)
7. [Data Flow](#data-flow)
8. [Import Rules](#import-rules)
9. [Adding New Modules](#adding-new-modules)
10. [Testing Strategy](#testing-strategy)

---

## Overview

CodeLobby uses a **layered architecture** with **self-registering modules** to achieve:

- **Zero cross-imports** between UI modules
- **Independent module development** — teams can work in isolation
- **Easy testing** — mock the store, test any module
- **Dynamic loading** — load modules on demand
- **Plugin-ready** — third parties can add modules

```
┌─────────────────────────────────────────────────────────────┐
│                        APP SHELL                             │
│                    (Defines Slots Only)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   SLOT: header                           ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌──────────────┬─────────────────────┬───────────────────┐ │
│  │ SLOT: left   │    SLOT: main       │   SLOT: right     │ │
│  └──────────────┴─────────────────────┴───────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     SHARED STORE                             │
│                   (The Buffet Table)                         │
│    repos │ prs │ user │ aiChats │ layout │ loading │ ...    │
└─────────────────────────────────────────────────────────────┘
        ▲                                        │
        │ PUSH                                   │ PULL
┌───────┴───────┐                    ┌───────────┴───────────┐
│  DATA MODULE  │                    │      UI MODULES       │
│   (Kitchen)   │                    │       (Guests)        │
│  - GitHub API │                    │  Header │ Explorer    │
│  - Claude API │                    │  Canvas │ AI Chat     │
│  - Store      │                    │  PR Detail │ ...      │
└───────────────┘                    └───────────────────────┘
```

---

## Core Principles

### 1. The Buffet Principle 🍽️

> "Chefs (Data Module) put food on the table (Store). Guests (UI Modules) pick what they need. Guests never talk to each other or the kitchen directly."

- **Data Module** fetches data and puts it in the **Shared Store**
- **UI Modules** read from the Shared Store — never from each other
- **No direct communication** between UI modules

### 2. The Slot Principle 🎰

> "The App Shell defines empty slots. Modules jump into slots by themselves."

- **App Shell** only defines WHERE things render (slots)
- **Modules** self-register to slots
- **App Shell never imports UI modules** directly

### 3. Zero Cross-Import Rule ❌

> "UI modules cannot import from other UI modules. Period."

This is enforced via ESLint and code review.

---

## The Buffet Pattern

### Shared Store Structure

All application state lives in a single, reactive store:

```typescript
// packages/shared-store/src/index.ts

export const Store = {
  // ═══════════════════════════════════════
  // GitHub Data
  // ═══════════════════════════════════════
  repos: signal<Repository[]>([]),
  prs: signal<PullRequest[]>([]),
  selectedRepos: signal<string[] | null>(null),  // null = all
  selectedPR: signal<PullRequest | null>(null),
  
  // ═══════════════════════════════════════
  // User Data
  // ═══════════════════════════════════════
  user: signal<GitHubUser | null>(null),
  
  // ═══════════════════════════════════════
  // AI Data
  // ═══════════════════════════════════════
  chatHistory: signal<ChatMessage[]>([]),
  prChats: signal<PRChat[]>([]),
  activeChatId: signal<string | null>(null),
  isAILoading: signal<boolean>(false),
  aiThinking: signal<string>(''),
  
  // ═══════════════════════════════════════
  // Layout State
  // ═══════════════════════════════════════
  viewMode: signal<'canvas' | 'ide'>('canvas'),
  prDetailOpen: signal<boolean>(false),
  aiPanelOpen: signal<boolean>(false),
  
  // ═══════════════════════════════════════
  // Loading & Errors
  // ═══════════════════════════════════════
  loading: {
    repos: signal<boolean>(false),
    prs: signal<boolean>(false),
  },
  errors: {
    github: signal<Error | null>(null),
    ai: signal<Error | null>(null),
  },
}
```

### Actions (Event Emitters)

UI modules trigger actions to request data operations:

```typescript
// packages/shared-store/src/actions.ts

export const Actions = {
  fetchRepos: () => 
    window.dispatchEvent(new CustomEvent('action:fetch-repos')),
  
  fetchPRs: (repos: string[]) => 
    window.dispatchEvent(new CustomEvent('action:fetch-prs', { detail: repos })),
  
  selectPR: (pr: PullRequest | null) => 
    window.dispatchEvent(new CustomEvent('action:select-pr', { detail: pr })),
  
  sendAIMessage: (message: string) => 
    window.dispatchEvent(new CustomEvent('action:send-ai-message', { detail: message })),
  
  signOut: () => 
    window.dispatchEvent(new CustomEvent('action:sign-out')),
}
```

### Data Module (The Kitchen)

Listens for actions, fetches data, and updates the store:

```typescript
// packages/data-module/src/index.ts

export function initDataModule() {
  // Listen for fetch repos action
  window.addEventListener('action:fetch-repos', async () => {
    Store.loading.repos.value = true
    try {
      const result = await window.electron.fetchContributedRepos()
      Store.repos.value = result.data  // PUT ON BUFFET
    } finally {
      Store.loading.repos.value = false
    }
  })

  // Listen for AI message action
  window.addEventListener('action:send-ai-message', async (e: CustomEvent) => {
    Store.isAILoading.value = true
    // ... stream response, update Store.chatHistory
  })
  
  // ... more listeners
}
```

---

## The Slot System

### Slot Registry

Modules register themselves to named slots:

```typescript
// packages/slot-system/src/index.ts

export type SlotName = 
  | 'header'
  | 'left-panel'
  | 'main'
  | 'right-panel'
  | 'modal'
  | 'toast'

interface SlotEntry {
  id: string
  slot: SlotName
  component: ComponentType
  order: number
  visible: () => boolean
}

const slotRegistry = signal<SlotEntry[]>([])

// Modules call this to register themselves
export function registerToSlot(entry: {
  id: string
  slot: SlotName
  component: ComponentType
  order?: number
  visible?: () => boolean
}) {
  slotRegistry.value = [...slotRegistry.value, entry]
}
```

### Slot Component

App Shell uses this to render whatever is in a slot:

```typescript
// packages/slot-system/src/Slot.tsx

export function Slot({ name, className }: { name: SlotName; className?: string }) {
  const entries = computed(() => 
    slotRegistry.value
      .filter(e => e.slot === name)
      .filter(e => e.visible())
      .sort((a, b) => a.order - b.order)
  )
  
  return (
    <div className={className} data-slot={name}>
      {entries.value.map(({ id, component: Component }) => (
        <Suspense key={id} fallback={<Skeleton />}>
          <Component />
        </Suspense>
      ))}
    </div>
  )
}
```

### App Shell (Zero Module Imports!)

```typescript
// packages/app/src/App.tsx
import { Slot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'

// ❌ NO UI MODULE IMPORTS HERE!

export function App() {
  const viewMode = useSignal(Store.viewMode)
  
  return (
    <div className="app-shell">
      <Slot name="header" className="app-header" />
      
      <div className="app-content">
        {viewMode === 'ide' && <Slot name="left-panel" />}
        <Slot name="main" className="app-main" />
        <Slot name="right-panel" className="app-right-panel" />
      </div>
      
      <Slot name="modal" />
      <Slot name="toast" />
    </div>
  )
}
```

### Module Self-Registration

Each module registers itself on import:

```typescript
// packages/header-module/src/index.ts
import { registerToSlot } from '@codelobby/slot-system'
import { Header } from './Header'

registerToSlot({
  id: 'header',
  slot: 'header',
  component: Header,
  order: 0,
})
```

```typescript
// packages/ai-chat-module/src/index.ts
import { registerToSlot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'
import { AIChat } from './AIChat'

registerToSlot({
  id: 'ai-chat',
  slot: 'right-panel',
  component: AIChat,
  order: 2,
  visible: () => Store.aiPanelOpen.value,  // Only when panel is open
})
```

---

## Package Structure

```
packages/
├── slot-system/              # Slot registry & renderer
│   ├── src/
│   │   ├── index.ts          # registerToSlot(), SlotName type
│   │   └── Slot.tsx          # <Slot name="..." /> component
│   └── package.json
│
├── shared-store/             # Global reactive state
│   ├── src/
│   │   ├── index.ts          # Store signals
│   │   ├── actions.ts        # Action emitters
│   │   ├── computed.ts       # Derived state
│   │   └── types.ts          # Shared type definitions
│   └── package.json
│
├── data-module/              # Data fetching & store updates
│   ├── src/
│   │   ├── index.ts          # initDataModule()
│   │   ├── github.ts         # GitHub API handlers
│   │   ├── ai.ts             # Claude API handlers
│   │   └── persistence.ts    # Load/save to electron-store
│   └── package.json
│
├── header-module/            # Header UI
│   ├── src/
│   │   ├── index.ts          # Self-registration
│   │   ├── Header.tsx        # Component
│   │   └── components/       # Sub-components
│   └── package.json
│
├── explorer-module/          # IDE sidebar
│   └── ...
│
├── canvas-module/            # Free-form card view
│   └── ...
│
├── ide-view-module/          # File tree PR view
│   └── ...
│
├── pr-detail-module/         # PR detail panel
│   └── ...
│
├── ai-chat-module/           # AI chat panel
│   └── ...
│
└── app/                      # Main application shell
    ├── src/
    │   ├── bootstrap.ts      # Import modules to trigger registration
    │   ├── App.tsx           # Shell with <Slot /> components
    │   ├── main.tsx          # Entry point
    │   └── styles/           # Global styles
    └── package.json
```

---

## Module Anatomy

Every UI module follows this structure:

```
packages/my-module/
├── src/
│   ├── index.ts              # Self-registration (entry point)
│   ├── MyModule.tsx          # Main component
│   ├── components/           # Sub-components
│   │   ├── SubComponent.tsx
│   │   └── ...
│   ├── hooks/                # Module-specific hooks
│   │   └── useMyData.ts
│   └── styles/               # Module styles (if not using Tailwind)
│       └── module.css
├── tests/
│   ├── MyModule.test.tsx
│   └── ...
└── package.json
```

### Module Entry Point Pattern

```typescript
// packages/my-module/src/index.ts

import { registerToSlot } from '@codelobby/slot-system'
import { Store } from '@codelobby/shared-store'
import { MyModule } from './MyModule'

// Register to slot on import
registerToSlot({
  id: 'my-module',
  slot: 'main',                           // Which slot
  component: MyModule,                     // What to render
  order: 0,                                // Order in slot
  visible: () => Store.someCondition.value // When to show
})

// Optional: export for direct use in tests
export { MyModule }
```

### Module Component Pattern

```typescript
// packages/my-module/src/MyModule.tsx

import { Store, Actions } from '@codelobby/shared-store'
import { useSignal } from '@preact/signals-react'

// ❌ FORBIDDEN: import { Something } from '@codelobby/other-module'
// ✅ ALLOWED: import { Store } from '@codelobby/shared-store'

export function MyModule() {
  // Read from store (the buffet)
  const data = useSignal(Store.someData)
  const loading = useSignal(Store.loading.someData)
  
  // Trigger actions (never call APIs directly)
  const handleRefresh = () => Actions.fetchSomeData()
  
  return (
    <div>
      {loading ? <Spinner /> : <Content data={data} />}
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  )
}
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────┘

1. USER ACTION
   ┌──────────────┐
   │   UI Module  │  User clicks "Refresh"
   └──────┬───────┘
          │
          ▼
2. EMIT ACTION
   ┌──────────────┐
   │   Actions    │  Actions.fetchRepos()
   └──────┬───────┘
          │
          ▼
3. DATA MODULE LISTENS
   ┌──────────────┐
   │ Data Module  │  Receives 'action:fetch-repos' event
   └──────┬───────┘
          │
          ▼
4. API CALL
   ┌──────────────┐
   │ Electron IPC │  window.electron.fetchContributedRepos()
   └──────┬───────┘
          │
          ▼
5. UPDATE STORE
   ┌──────────────┐
   │    Store     │  Store.repos.value = result.data
   └──────┬───────┘
          │
          ▼
6. UI REACTS
   ┌──────────────┐
   │  All Modules │  Any module using Store.repos re-renders
   └──────────────┘
```

---

## Import Rules

### What Each Package Can Import

| Package | Can Import |
|---------|------------|
| `slot-system` | React, signals library |
| `shared-store` | signals library, types |
| `data-module` | shared-store, electron API |
| `ui-modules` | slot-system, shared-store, ui-kit |
| `app` | slot-system, shared-store, data-module |
| `bootstrap.ts` | All modules (to trigger registration) |

### What Is FORBIDDEN

| Package | Cannot Import |
|---------|---------------|
| `ui-modules` | Other `ui-modules` ❌ |
| `ui-modules` | `data-module` ❌ |
| `app` (except bootstrap) | `ui-modules` ❌ |
| `shared-store` | Any module ❌ |

### ESLint Enforcement

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: [
            '@codelobby/header-module',
            '@codelobby/explorer-module',
            '@codelobby/canvas-module',
            '@codelobby/pr-detail-module',
            '@codelobby/ai-chat-module',
            '@codelobby/ide-view-module',
          ],
          message: 'UI modules cannot import from each other. Use shared-store.',
        },
      ],
    }],
  },
  overrides: [
    {
      files: ['**/bootstrap.ts'],
      rules: { 'no-restricted-imports': 'off' },  // Exception for bootstrap
    },
  ],
}
```

---

## Adding New Modules

### Step 1: Create Package

```bash
mkdir -p packages/my-new-module/src
cd packages/my-new-module
npm init -y
```

### Step 2: Add Dependencies

```json
// packages/my-new-module/package.json
{
  "name": "@codelobby/my-new-module",
  "dependencies": {
    "@codelobby/slot-system": "workspace:*",
    "@codelobby/shared-store": "workspace:*"
  }
}
```

### Step 3: Create Module

```typescript
// packages/my-new-module/src/index.ts
import { registerToSlot } from '@codelobby/slot-system'
import { MyNewModule } from './MyNewModule'

registerToSlot({
  id: 'my-new-module',
  slot: 'right-panel',
  component: MyNewModule,
  order: 3,
})
```

### Step 4: Register in Bootstrap

```typescript
// packages/app/src/bootstrap.ts
import '@codelobby/my-new-module'  // Add this line
```

### Step 5: Add Store State (if needed)

```typescript
// packages/shared-store/src/index.ts
export const Store = {
  // ... existing
  myNewModuleData: signal<MyDataType | null>(null),
}
```

### Step 6: Add Data Handler (if needed)

```typescript
// packages/data-module/src/my-new-module.ts
window.addEventListener('action:fetch-my-data', async () => {
  const result = await window.electron.fetchMyData()
  Store.myNewModuleData.value = result
})
```

---

## Testing Strategy

### Unit Testing Modules

Mock the store, test in isolation:

```typescript
// packages/ai-chat-module/tests/AIChat.test.tsx
import { render, screen } from '@testing-library/react'
import { Store } from '@codelobby/shared-store'
import { AIChat } from '../src/AIChat'

describe('AIChat', () => {
  beforeEach(() => {
    // Reset store state
    Store.chatHistory.value = []
    Store.isAILoading.value = false
  })

  it('renders messages from store', () => {
    Store.chatHistory.value = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'Hi there!' },
    ]
    
    render(<AIChat />)
    
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.getByText('Hi there!')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    Store.isAILoading.value = true
    
    render(<AIChat />)
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
```

### Integration Testing

Test data flow through the system:

```typescript
// packages/app/tests/integration/data-flow.test.ts
import { initDataModule } from '@codelobby/data-module'
import { Store, Actions } from '@codelobby/shared-store'

describe('Data Flow', () => {
  beforeAll(() => {
    initDataModule()
  })

  it('fetches repos and updates store', async () => {
    // Mock electron API
    window.electron.fetchContributedRepos = vi.fn().mockResolvedValue({
      success: true,
      data: [{ id: 1, name: 'test-repo' }],
    })
    
    // Trigger action
    Actions.fetchRepos()
    
    // Wait for store update
    await waitFor(() => {
      expect(Store.repos.value).toHaveLength(1)
      expect(Store.repos.value[0].name).toBe('test-repo')
    })
  })
})
```

---

## Migration Path

If migrating from a monolithic structure:

### Phase 1: Extract Shared Store
1. Create `@codelobby/shared-store`
2. Move all signals/state to the store
3. Update imports across the app

### Phase 2: Extract Slot System
1. Create `@codelobby/slot-system`
2. Define slot names
3. Update App.tsx to use `<Slot />` components

### Phase 3: Extract Data Module
1. Create `@codelobby/data-module`
2. Move API calls and event listeners
3. Remove API logic from UI components

### Phase 4: Extract UI Modules (one at a time)
1. Start with the simplest module (e.g., Header)
2. Extract, register to slot, test
3. Repeat for each module

### Phase 5: Enforce Rules
1. Add ESLint rules
2. Update CI to check imports
3. Document patterns for team

---

## Summary

| Concept | Implementation |
|---------|----------------|
| **Buffet Table** | `@codelobby/shared-store` with signals |
| **Kitchen** | `@codelobby/data-module` listens to actions |
| **Guests** | UI modules read from store only |
| **Slots** | `@codelobby/slot-system` with `<Slot />` |
| **Self-Registration** | `registerToSlot()` on module import |
| **Zero Cross-Import** | ESLint rules + code review |

This architecture ensures CodeLobby remains maintainable, testable, and extensible as it grows.

---

*Last updated: January 2026*
