# CodeLobby - AI Assistant Guidelines

This document captures the architecture, patterns, conventions, and best practices for the CodeLobby codebase. Use this as a reference when working on this project.

---

## 🏗️ Architecture Overview

CodeLobby is an **Electron desktop application** with a clear three-layer architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│        React + TypeScript + TanStack Query               │
│              (src/renderer/)                             │
└───────────────────────┬─────────────────────────────────┘
                        │ IPC (contextBridge)
┌───────────────────────┴─────────────────────────────────┐
│                    Preload Script                        │
│           Type-safe IPC bridge                           │
│              (src/preload/)                              │
└───────────────────────┬─────────────────────────────────┘
                        │ ipcRenderer.invoke
┌───────────────────────┴─────────────────────────────────┐
│                    Main Process                          │
│      Electron + GitHub GraphQL API + electron-store      │
│              (src/main/)                                 │
└─────────────────────────────────────────────────────────┘
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/main/` | Electron main process - API calls, storage, IPC handlers |
| `src/preload/` | Secure bridge between main and renderer |
| `src/renderer/` | React frontend - UI components, state management |
| `src/renderer/components/` | React components |
| `src/renderer/components/ui/` | shadcn/ui base components |
| `src/renderer/styles/` | Global CSS and Tailwind config |
| `src/renderer/lib/` | Utility functions |

---

## 📡 IPC Communication Pattern

### Adding a New IPC Handler

**Step 1: Define in main process (`src/main/index.ts`)**
```typescript
ipcMain.handle('my-new-handler', async (_, arg1: string, arg2: number) => {
  try {
    // Do work
    return { success: true, data: result }
  } catch (error) {
    logger.error(LogCategory.API, 'Handler failed', { error: (error as Error).message })
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 2: Add to preload interface (`src/preload/index.ts`)**
```typescript
// In ElectronAPI interface
myNewHandler: (arg1: string, arg2: number) => Promise<{ success: boolean; data?: MyType; error?: string }>

// In electronAPI object
myNewHandler: (arg1: string, arg2: number) => ipcRenderer.invoke('my-new-handler', arg1, arg2)
```

**Step 3: Use in renderer**
```typescript
const result = await window.electron.myNewHandler('value', 123)
if (result.success) {
  // Use result.data
}
```

### IPC Response Convention
Always return objects with this shape:
```typescript
{ success: boolean; data?: T; error?: string }
```

---

## 🗄️ Data Storage (electron-store)

Storage is handled in `src/main/store.ts`. The store uses encryption for sensitive data.

### Adding New Stored Data

**Step 1: Update schema interface**
```typescript
interface StoreSchema {
  // ... existing fields
  myNewField: MyType
}
```

**Step 2: Add default value**
```typescript
const store = new Store<StoreSchema>({
  defaults: {
    // ... existing defaults
    myNewField: defaultValue
  }
})
```

**Step 3: Create getter/setter functions**
```typescript
export function getMyNewField(): MyType {
  return store.get('myNewField')
}

export function setMyNewField(value: MyType): void {
  store.set('myNewField', value)
}
```

**Step 4: Wire up IPC handlers and preload (see IPC pattern above)**

---

## 🌐 GitHub GraphQL API

### Key Principles

1. **One query fetches everything** - PRs, checks, comments, reviews in a single request
2. **Use pagination** - Always handle `pageInfo.hasNextPage` and `endCursor`
3. **Rate limit awareness** - Include `rateLimit` in every query
4. **Cache responses** - Use `cachedPRData` and `cachedAllRepos` with TTL

### GraphQL Query Structure
```graphql
query MyQuery($cursor: String) {
  rateLimit { limit, remaining, used, resetAt }
  viewer { login }
  # ... rest of query
  pageInfo { hasNextPage, endCursor }
}
```

### Bot Detection Pattern
```typescript
const isBot = author?.__typename === 'Bot' || 
              login.endsWith('[bot]') || 
              (login.includes('bot') && login.includes('-'))
```

---

## ⚛️ React Patterns

### State Management

1. **Global state**: React Context (see `PRContext` in App.tsx)
2. **Server state**: TanStack Query with `window.electron` calls
3. **Local state**: `useState` for component-specific state
4. **Persisted state**: Load from `electron-store` via IPC on mount

### TanStack Query Usage
```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['unique-key', dependency],
  queryFn: async () => {
    const result = await window.electron.fetchSomething()
    if (!result.success) throw new Error(result.error)
    return result.data
  },
  refetchOnWindowFocus: true,
  staleTime: 60000 // 1 minute
})
```

### Component Structure Pattern
```typescript
interface MyComponentProps {
  prop1: string
  onAction?: () => void
}

export function MyComponent({ prop1, onAction }: MyComponentProps) {
  // 1. Hooks (useState, useEffect, useQuery, etc.)
  // 2. Derived values (useMemo, calculations)
  // 3. Event handlers (useCallback)
  // 4. Early returns (loading, error states)
  // 5. Main render
}
```

---

## 🎨 Styling Conventions

### Tailwind + shadcn/ui

- Use `cn()` utility for conditional classes:
  ```typescript
  import { cn } from '@/lib/utils'
  
  <div className={cn(
    'base-classes',
    condition && 'conditional-classes',
    isActive ? 'active-classes' : 'inactive-classes'
  )} />
  ```

### CSS Variables (globals.css)
- Define in `:root` for light mode, `.dark` for dark mode
- Use HSL format: `--primary: 142 70% 45%;`
- Reference with: `hsl(var(--primary))`

### Custom Component Styles
For complex state-based styling (like `.pr-card-item.selected`), define in `globals.css`:
```css
:root .my-component { /* light mode */ }
:root .my-component.state { /* light mode + state */ }
.dark .my-component { /* dark mode */ }
.dark .my-component.state { /* dark mode + state */ }
```

### Z-Index Scale
| Layer | Z-Index |
|-------|---------|
| Base content | 0 |
| Hover cards | 10 |
| Toolbar | 20 |
| Modal overlay | 50 |
| Tooltip | 9999 |

---

## 🧩 UI Component Patterns

### Tooltip Pattern
Single `TooltipProvider` at app root. Components use:
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <button>Hover me</button>
  </TooltipTrigger>
  <TooltipContent>Tooltip text</TooltipContent>
</Tooltip>
```

### Popover Pattern
```tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <button>Open</button>
  </PopoverTrigger>
  <PopoverContent align="end" onClick={(e) => e.stopPropagation()}>
    Content
  </PopoverContent>
</Popover>
```

### Draggable Cards (react-rnd)
```tsx
<Rnd
  position={{ x: layout.x, y: layout.y }}
  size={{ width: layout.w, height: layout.h }}
  minWidth={MIN_W}
  minHeight={MIN_H}
  bounds="parent"
  disableDragging={isLocked}
  enableResizing={!isLocked}
  onDragStop={(_, d) => handleDragStop(id, d.x, d.y)}
  onResizeStop={(_, __, ref, ___, pos) => handleResizeStop(...)}
  dragHandleClassName="drag-handle"
>
  <Component />
</Rnd>
```

---

## 📝 Logging

### Logger Usage (Main Process)
```typescript
import { logger, LogCategory } from './logger'

logger.info(LogCategory.API, 'Message', { details: 'object' })
logger.warn(LogCategory.AUTH, 'Warning message')
logger.error(LogCategory.GRAPHQL, 'Error', { error: err.message })
logger.debug(LogCategory.CACHE, 'Debug info')
```

### Log Categories
- `Auth` - Authentication flow
- `API` - IPC API calls
- `GraphQL` - GitHub API calls
- `Cache` - Caching operations
- `RateLimit` - API rate limiting
- `App` - Application lifecycle
- `Store` - electron-store operations

---

## 🔧 Common Utilities

### `src/renderer/lib/utils.ts`

```typescript
// Tailwind class merging
cn('class1', condition && 'class2')

// Relative time formatting
formatRelativeTime('2024-01-15T10:30:00Z') // "2h ago"

// Array grouping
groupBy(items, item => item.category)

// String truncation
truncate('Long string here', 20) // "Long string here..."
```

---

## ⚠️ Common Pitfalls to Avoid

### 1. Layout Shift on Selection
**Bad**: Changing border-width causes shift
```css
.item { border: 1px solid gray; }
.item.selected { border: 2px solid green; } /* SHIFT! */
```
**Good**: Use box-shadow for visual emphasis
```css
.item.selected { 
  border-color: green;
  box-shadow: inset 0 0 0 1px green; 
}
```

### 2. Multiple TooltipProviders
**Bad**: Wrapping each component with `<TooltipProvider>`
**Good**: Single `<TooltipProvider>` at app root

### 3. Forgetting to Handle Loading/Error States
```typescript
if (isLoading) return <Loader />
if (error) return <Error message={error.message} />
// Then render data
```

### 4. Not Deduplicating Data
When fetching from multiple sources, always deduplicate:
```typescript
const seenIds = new Set<string>()
for (const item of items) {
  if (seenIds.has(item.id)) continue
  seenIds.add(item.id)
  // process item
}
```

### 5. CSS Specificity Issues
Tailwind classes can be overridden by CSS. For complex states, use CSS classes in `globals.css` instead of Tailwind conditionals.

---

## 📦 Dependencies & Their Roles

| Package | Purpose |
|---------|---------|
| `@tanstack/react-query` | Server state management, caching |
| `@octokit/graphql` | GitHub GraphQL API client |
| `electron-store` | Encrypted persistent storage |
| `react-rnd` | Draggable/resizable components |
| `react-markdown` | Render GitHub Flavored Markdown |
| `remark-gfm` | GitHub Flavored Markdown support |
| `rehype-highlight` | Syntax highlighting in markdown |
| `lucide-react` | Icon library |
| `@radix-ui/*` | Headless UI components (shadcn/ui) |
| `tailwind-merge` | Merge Tailwind classes intelligently |
| `clsx` | Conditional class names |

---

## 🚀 Development Workflow

### Starting Development
```bash
npm run dev
```

### Building for Production
```bash
npm run build        # Build only
npm run build:mac    # Build for macOS
npm run build:win    # Build for Windows
npm run build:linux  # Build for Linux
```

### Project Scripts
| Script | Purpose |
|--------|---------|
| `dev` | Start development with hot reload |
| `build` | Build for production |
| `preview` | Preview production build |

---

## 🎯 Code Style Guidelines

1. **TypeScript**: Always use strict types, avoid `any`
2. **Components**: Functional components with hooks only
3. **Naming**: 
   - Components: PascalCase (`PRCard.tsx`)
   - Utilities: camelCase (`formatRelativeTime`)
   - CSS classes: kebab-case (`pr-card-item`)
4. **Imports**: Group by external → internal → types
5. **Comments**: Explain "why", not "what"

---

## 🐛 Debugging Rules

### Always Log API Calls
**Every API call (GitHub, Claude, external services) must be logged** so errors can be viewed in the in-app LogsViewer and shared for debugging.

**Pattern for API calls:**
```typescript
logger.info(LogCategory.API, 'Starting API call', { endpoint: 'description', params: relevantParams })

try {
  const result = await apiCall()
  logger.info(LogCategory.API, 'API call successful', { 
    endpoint: 'description',
    responsePreview: summarizeResponse(result) 
  })
  return result
} catch (error) {
  logger.error(LogCategory.API, 'API call failed', { 
    endpoint: 'description',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  })
  throw error
}
```

**Required logging for:**
- All GitHub GraphQL queries
- All Claude API calls (requests and responses)
- All IPC handler invocations
- Cache hits/misses
- Rate limit status changes

**Log levels:**
- `info` - Successful operations, status updates
- `warn` - Recoverable issues, fallbacks used
- `error` - Failures that need attention
- `debug` - Detailed info for troubleshooting

---

## 🔮 Vision Context

CodeLobby is evolving toward **intent-driven development** where:
- PRs are the atomic unit (not files)
- Comments/CI failures are "lines of code"
- Natural language commands drive actions

When adding features, consider how they fit this paradigm shift from code-centric to PR-centric workflows.
