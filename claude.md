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

## 🍎 Apple Design Language

CodeLobby follows Apple's Human Interface Guidelines to create a native macOS feel. Here are the core principles:

### Design Philosophy

1. **Clarity** - Content is paramount. UI chrome should be minimal and supportive
2. **Deference** - The interface helps users understand and interact with content
3. **Depth** - Visual layers and realistic motion provide hierarchy and feedback

### Typography (SF Pro)

```css
/* Font stack - uses native Apple fonts */
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif;

/* Apple's tight letter-spacing */
letter-spacing: -0.01em;  /* body */
letter-spacing: -0.02em;  /* headings */

/* Font weights */
400 - Regular (body text)
500 - Medium (subtle emphasis)
600 - Semibold (headings, buttons)
700 - Bold (sparingly, strong emphasis)
```

### Color Palette

| Purpose | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#FAFAFA` (98% white) | `#000000` (true black) |
| Card/Surface | `#FFFFFF` | `#1C1C1E` |
| Text Primary | `#1D1D1F` | `#F5F5F7` |
| Text Secondary | `#86868B` | `#8E8E93` |
| Accent (Blue) | `#007AFF` | `#0A84FF` |
| Border | `rgba(0,0,0,0.06)` | `rgba(255,255,255,0.08)` |

### Border Radii

| Element | Radius |
|---------|--------|
| Buttons (small) | 6px |
| Buttons (default) | 8px |
| Cards | 12px |
| Modals/Popovers | 14px |
| Large panels | 20px |

### Shadows

```css
/* Apple uses subtle, diffused shadows */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.16);

/* Dark mode - deeper shadows */
--shadow-md-dark: 0 4px 12px rgba(0, 0, 0, 0.4);
```

### Vibrancy & Materials

Apple uses frosted glass effects for toolbars and sidebars:

```css
.apple-toolbar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}

.dark .apple-toolbar {
  background: rgba(28, 28, 30, 0.8);
}
```

### Animation Timing

```css
/* Apple's signature easing curve */
transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);

/* Durations */
150ms - Micro-interactions (hover, focus)
250ms - Standard transitions
350ms - Page/panel transitions
500ms - Modal/sheet presentations
```

### Interactive States

```css
/* Buttons - scale on press */
button:active {
  transform: scale(0.97);
}

/* Cards - lift on hover */
.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

/* Focus rings - blue glow */
:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.4);
}
```

### Spacing System

| Name | Value | Use Case |
|------|-------|----------|
| xs | 4px | Icon padding, tight spacing |
| sm | 8px | Component internal spacing |
| md | 12px | Between related elements |
| lg | 16px | Section padding |
| xl | 24px | Major section gaps |
| 2xl | 32px | Page margins |

### UI Component Guidelines

**Buttons:**
- Primary: Filled blue, white text, subtle shadow
- Secondary: Gray background, black text
- Ghost: No background, hover reveals subtle fill
- All buttons scale to 0.97 on press

**Inputs:**
- Light gray background (not white borders)
- Subtle hover state (slightly darker)
- Blue border and white background on focus
- Placeholder text at 60% opacity

**Cards:**
- Nearly invisible border (6% opacity black)
- Subtle shadow
- 12px border radius
- Content padding: 16px

**Lists/Tables:**
- Alternating backgrounds (optional)
- Hover highlight
- Selection uses blue accent with subtle background tint

### Do's and Don'ts

✅ **Do:**
- Use generous whitespace
- Keep UI chrome minimal
- Use system fonts
- Animate with purpose
- Maintain consistent radii
- Use subtle shadows

❌ **Don't:**
- Use harsh borders (>8% opacity)
- Overuse color - let blue be special
- Use bouncy/playful animations
- Mix border radii styles
- Use drop shadows with hard edges
- Neglect dark mode

### Implementation Checklist

When building new components:

- [ ] Uses SF Pro / system font stack
- [ ] Border radius matches design system (6/8/12/14px)
- [ ] Shadows are subtle and diffused
- [ ] Hover states use scale or lift
- [ ] Active states scale to 0.97
- [ ] Focus uses blue ring (3px, 40% opacity)
- [ ] Colors from Apple palette
- [ ] Spacing uses 4px grid
- [ ] Animations use Apple easing curve
- [ ] Dark mode tested and polished

---

## 👁️ UX Scannability Rules

When displaying lists of items with multiple data points (status, date, title, etc.):

### Align Status Indicators Consistently

**Put status icons at the far right (or far left) so they align vertically:**
```tsx
// ✅ GOOD - Status icons align on the right edge for easy scanning
<div className="flex items-center gap-1.5">
  <span>{formatRelativeTime(item.date)}</span>  {/* Variable width */}
  {getStatusIcon()}                              {/* Fixed position - far right */}
</div>

// ❌ BAD - Status icons at varying positions due to variable-width content before them
<div className="flex items-center gap-1.5">
  {getStatusIcon()}                              {/* Position varies based on content */}
  <span>{formatRelativeTime(item.date)}</span>  {/* "4d ago" vs "1mo ago" shifts icon */}
</div>
```

### Why This Matters
- Users scan lists vertically, looking for specific statuses
- Misaligned icons force the eye to hunt horizontally
- Consistent positioning enables "at a glance" status checking

### General Rule
**Variable-width content → Fixed-width indicators**

Put variable-length text (dates, titles, names) BEFORE fixed-width elements (icons, badges, status indicators) so the fixed elements align consistently.

---

## 📜 Virtual Scrolling & Chat Patterns

### TanStack Virtual Best Practices

**Use `scrollToIndex` instead of manual scroll calculations:**
```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => containerRef.current,
  estimateSize: () => 100, // Slightly overestimate for safety
  overscan: 5,
})

// More reliable than container.scrollTop = container.scrollHeight
virtualizer.scrollToIndex(items.length - 1, { align: 'end' })
```

**Keep streaming content OUTSIDE the virtualizer:**
```tsx
// ❌ BAD - streaming causes constant re-measurement
<VirtualList>
  {messages.map(msg => <Message key={msg.id} />)}
  {isStreaming && <StreamingMessage content={streamContent} />}
</VirtualList>

// ✅ GOOD - streaming is separate, virtualizer stays stable
<VirtualList>
  {messages.map(msg => <Message key={msg.id} />)}
</VirtualList>
{isStreaming && <StreamingMessage content={streamContent} />}
```

### Streaming Content Performance

**Throttle state updates to ~30fps:**
```typescript
function useThrottledValue<T>(value: T, fps = 30): T {
  const [throttled, setThrottled] = useState(value)
  const lastUpdate = useRef(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const minInterval = 1000 / fps
    const now = performance.now()
    
    if (now - lastUpdate.current >= minInterval) {
      setThrottled(value)
      lastUpdate.current = now
    } else {
      frame.current = requestAnimationFrame(() => {
        setThrottled(value)
        lastUpdate.current = performance.now()
      })
    }
    return () => frame.current && cancelAnimationFrame(frame.current)
  }, [value, fps])

  return throttled
}

// Usage: display throttled, store original
const [streaming, setStreaming] = useState({ content: '', isStreaming: false })
const throttledStreaming = useThrottledValue(streaming, 30)
```

**Use instant scroll during streaming, smooth otherwise:**
```typescript
const scrollToBottom = (force = false, instant = false) => {
  requestAnimationFrame(() => {
    if (force || !isUserScrolledUp) {
      // Instant during streaming prevents animation conflicts
      container.scrollTo({
        top: container.scrollHeight,
        behavior: instant ? 'auto' : 'smooth'
      })
    }
  })
}

// During streaming: instant scroll
useLayoutEffect(() => {
  if (streaming.isStreaming && !isUserScrolledUp) {
    scrollToBottom(false, true) // instant
  }
}, [throttledStreaming.content])

// After new message: smooth scroll
useEffect(() => {
  if (!streaming.isStreaming) {
    scrollToBottom(false, false) // smooth
  }
}, [messages.length])
```

**CSS containment for streaming elements:**
```tsx
<div style={{ 
  contain: 'content',      // Isolate layout changes
  willChange: 'contents'   // Hint GPU acceleration
}}>
  <StreamingContent />
</div>
```

### Loading States with Skeleton UI

**Two-phase loading pattern:**
```typescript
const [isLoading, setIsLoading] = useState(true)
const [isContentReady, setIsContentReady] = useState(false)

// Phase 1: Fetch data
useEffect(() => {
  loadData().then(() => setIsLoading(false))
}, [])

// Phase 2: Wait for virtualizer to measure and scroll
const handleVirtualizerReady = useCallback((scrollToEnd: () => void) => {
  if (!isLoading && messages.length > 0) {
    requestAnimationFrame(() => {
      scrollToEnd()
      setIsContentReady(true)
    })
  }
}, [isLoading, messages.length])

// Show skeleton until BOTH phases complete
{(isLoading || !isContentReady) && <SkeletonUI />}
```

**Skeleton overlay pattern:**
```tsx
{/* Skeleton overlays content until ready */}
{!isContentReady && messages.length > 0 && (
  <div className="absolute inset-0 z-10 bg-background">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse bg-muted rounded-lg h-16 mb-3" />
    ))}
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Loader2 className="animate-spin" />
      <span>Loading conversation...</span>
    </div>
  </div>
)}
```

---

## 🔄 Component Persistence Patterns

### Preventing Remount on View Switches

**Problem:** Components inside conditional blocks remount when conditions change:
```tsx
// ❌ BAD - Panel remounts when switching views
{viewMode === 'canvas' && (
  <div>
    <CanvasContent />
    <SidePanel /> {/* Instance A */}
  </div>
)}
{viewMode === 'ide' && (
  <div>
    <IDEContent />
    <SidePanel /> {/* Instance B - NEW! */}
  </div>
)}
```

**Solution:** Render persistent components as siblings outside conditionals:
```tsx
// ✅ GOOD - Panel persists across view switches
<div className="flex">
  {/* Views switch, but are siblings */}
  {viewMode === 'canvas' && <CanvasContent />}
  {viewMode === 'ide' && <IDEContent />}
  
  {/* Panel is outside conditionals - single instance */}
  {isPanelOpen && <SidePanel />}
</div>
```

**Key principle:** If a component's state should persist across parent state changes (like view modes), render it at the same tree level as a sibling, not nested inside conditional blocks.

### State Isolation Pattern

For panels/sidebars that should maintain state independently:
```typescript
// State lives at App level, not inside view components
const [isPanelOpen, setIsPanelOpen] = useState(false)
const [panelData, setPanelData] = useState(null)

// Panel rendered once, receives state as props
<App>
  <ViewSwitcher mode={viewMode} />
  <PersistentPanel 
    isOpen={isPanelOpen} 
    data={panelData}
    onClose={() => setIsPanelOpen(false)}
  />
</App>
```

---

## 🧹 Biome Linting & Formatting

CodeLobby uses **Biome** for fast linting and formatting.

### Commands
```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues  
npm run format      # Format code
```

### Pre-commit Hook
The `.husky/pre-commit` hook runs `npm run lint` and `npm test` before each commit. Both must pass.

### Rules Configuration

**Errors (blocking):**
- All `recommended` rules by default
- `useButtonType` - All `<button>` elements must have `type="button"` 
- `noInvalidUseBeforeDeclaration` - Variables must be declared before use
- `useIterableCallbackReturn` - `forEach` callbacks shouldn't return values
- `noUnusedVariables` / `noUnusedImports` - Clean up dead code

**Warnings (non-blocking):**
| Rule | Why Warning |
|------|-------------|
| `noExplicitAny` | Off - sometimes needed for complex types |
| `useImportType` | Off - import style preference |
| `noNonNullAssertion` | Warn - `!` assertions sometimes needed in tests |
| `noStaticElementInteractions` | Warn - requires adding `role` to clickable divs |
| `useKeyWithClickEvents` | Warn - requires keyboard handlers on click elements |
| `noSvgWithoutTitle` | Warn - SVG accessibility can be addressed incrementally |
| `useExhaustiveDependencies` | Warn - sometimes intentional to skip deps |
| `noArrayIndexKey` | Warn - sometimes index key is acceptable |

### Common Patterns to Avoid Lint Errors

**Always add `type="button"` to buttons:**
```tsx
// ❌ BAD - Biome error
<button onClick={handleClick}>Click me</button>

// ✅ GOOD
<button type="button" onClick={handleClick}>Click me</button>
```

**Use block syntax in forEach to avoid implicit returns:**
```tsx
// ❌ BAD - cats.add() returns the Set, implicit return
items.forEach((item) => cats.add(item.category))

// ✅ GOOD - block syntax, no return
items.forEach((item) => {
  cats.add(item.category)
})
```

**Declare functions before using in dependencies:**
```tsx
// ❌ BAD - loadData used before declaration
useEffect(() => { loadData() }, [loadData])
const loadData = useCallback(async () => { ... }, [])

// ✅ GOOD - loadData declared first
const loadData = useCallback(async () => { ... }, [])
useEffect(() => { loadData() }, [loadData])
```

**Break circular useCallback dependencies with refs:**
```tsx
// ❌ BAD - circular dependency between A and B
const funcA = useCallback(() => { funcB() }, [funcB])
const funcB = useCallback(() => { funcA() }, [funcA])

// ✅ GOOD - use ref to break cycle
const funcARef = useRef<() => void>()

const funcB = useCallback(() => { funcARef.current?.() }, [])
const funcA = useCallback(() => { funcB() }, [funcB])

useEffect(() => { funcARef.current = funcA }, [funcA])
```

---

## 🧈 Smooth Resize Pattern (Cursor-Level Performance)

When implementing resizable panels, **never update React state during drag**. This causes full re-renders and creates "clunky" resize behavior.

### The Problem

```typescript
// ❌ BAD - Re-renders entire tree 60+ times per second!
const handleMouseMove = (e: MouseEvent) => {
  if (isResizing) {
    const newWidth = calculateWidth(e)
    setWidth(newWidth) // Triggers re-render EVERY mouse move
  }
}
```

### The Solution

Use refs + `requestAnimationFrame` + direct DOM manipulation:

```typescript
// ✅ GOOD - Zero re-renders during drag, 1 on release
const panelRef = useRef<HTMLElement>(null)
const currentWidthRef = useRef(defaultWidth)  // Track width without state
const rafRef = useRef<number | null>(null)    // Animation frame ID

const handleResizeStart = useCallback((e: React.MouseEvent) => {
  e.preventDefault()
  setIsResizing(true)
  currentWidthRef.current = width // Store starting width
  resizeRef.current = { startX: e.clientX, startWidth: width }
}, [width])

// In effect for mousemove:
const handleMouseMove = (e: MouseEvent) => {
  if (!isResizing || !resizeRef.current) return
  
  // Cancel previous frame
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
  }
  
  // Batch update to next frame (60fps max)
  rafRef.current = requestAnimationFrame(() => {
    if (!resizeRef.current) return
    
    const delta = resizeRef.current.startX - e.clientX
    const newWidth = Math.min(MAX, Math.max(MIN, resizeRef.current.startWidth + delta))
    
    // Direct DOM update - NO React involved!
    if (panelRef.current) {
      panelRef.current.style.width = `${newWidth}px`
      panelRef.current.style.minWidth = `${newWidth}px`
      panelRef.current.style.maxWidth = `${newWidth}px`
    }
    currentWidthRef.current = newWidth
  })
}

const handleMouseUp = () => {
  // Cancel pending animation
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }
  
  // Sync final width to state - ONLY re-render!
  if (isResizing) {
    setWidth(currentWidthRef.current)
  }
  
  setIsResizing(false)
  resizeRef.current = null
}
```

### CSS Optimizations

```tsx
<aside
  ref={panelRef}
  style={{
    width: panelWidth,
    minWidth: panelWidth,
    maxWidth: panelWidth,
    willChange: isResizing ? 'width' : 'auto',  // GPU hint during drag
    contain: 'layout style'                      // Isolate repaints
  }}
>
  {children}
</aside>
```

### Key Principles

| Technique | Why |
|-----------|-----|
| `useRef` for width during drag | Avoid React state updates |
| `requestAnimationFrame` | Cap at 60fps, batch paints |
| Direct `style.width = ...` | Skip React reconciliation |
| `will-change: width` | Tell GPU to optimize |
| `contain: layout style` | Isolate layout thrashing |
| State sync only on `mouseup` | ONE re-render when done |

### Before vs After

```
BEFORE (clunky):
mousemove → setState → React re-render → entire component tree
           ↑ 60+ times per second = lag

AFTER (smooth):
mousemove → RAF → DOM update only → panel resizes instantly
           ↑ React not involved!

mouseup → setState → ONE re-render to persist final width
```

---

## 🧩 Slot-Based Modular Architecture

CodeLobby uses a **slot-based module system** that enables **zero cross-imports between UI modules**. This is a CRITICAL architectural pattern.

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
    NO imports between modules - only to shared packages!
```

### Available Slots

| Slot | Purpose | Module |
|------|---------|--------|
| `header` | App header with nav & controls | header-module |
| `left-panel` | Explorer sidebar (IDE mode) | explorer-module |
| `main` | Main content area | canvas-module, pr-detail-module |
| `pr-detail-panel` | PR detail sidebar (Canvas mode) | pr-detail-module |
| `ai-panel` | Claude AI chat panel | ai-chat-module |

### Module Registration Pattern

Every UI module MUST follow this pattern:

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

### Allowed Dependencies Per Module

Each module can ONLY import from:
- ✅ `@codelobby/shared-store` - Global state (Store, Actions, signals)
- ✅ `@codelobby/slot-system` - Slot registration
- ✅ `@codelobby/ui-kit` - Shared UI components
- ✅ `@codelobby/queries` - Data fetching hooks
- ✅ `@codelobby/data-module` - Data utilities
- ✅ `@codelobby/test-utils` - Test utilities
- ✅ Its own internal components (`./components/...`)

### ❌ FORBIDDEN Imports

**Never import one UI module from another:**
```typescript
// ❌ NEVER DO THIS
import { SomeComponent } from '@codelobby/canvas-module'
import { AnotherComponent } from '@codelobby/header-module'
```

### ⚠️ CRITICAL: Never Remove Slot Registration

**When refactoring a module, ALWAYS preserve the slot registration code!**

```typescript
// ❌ BAD - Removed slot registration during refactor
export { MyComponent } from './components/MyComponent'
// Registration code was here but got deleted...

// ✅ GOOD - Slot registration preserved alongside exports
export { MyComponent } from './components/MyComponent'

// KEEP THIS - connects module to the app!
function MyComponentWrapper() { ... }

registerToSlot({
  id: 'my-module',
  slot: 'main',
  component: MyComponentWrapper,
  ...
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
```

### Refactoring Checklist

When refactoring any module:

- [ ] Preserve `registerToSlot()` call in `index.tsx`
- [ ] Keep the Wrapper component that connects to shared-store
- [ ] Verify no cross-module imports added
- [ ] Test that module appears in the correct slot after refactor
- [ ] Check `npm run dev` shows the module rendering correctly

### 🎯 Dumb Component Pattern (When Splitting Components)

When extracting smaller components from a larger one, keep them **"dumb" (presentational)**:

**✅ Dumb components SHOULD:**
- Receive all data via **props**
- Receive all handlers via **callback props**
- Only import from:
  - `@codelobby/ui-kit` (shared UI components)
  - `lucide-react` or other icon libraries
  - `react` and React hooks
  - Internal types (`../types`)
  - Sibling components (`./OtherComponent`)

**❌ Dumb components should NOT:**
- Call `window.electron` directly
- Import `@codelobby/shared-store`
- Import `@codelobby/queries`
- Manage global state
- Make API calls

**Example - Correct Pattern:**
```typescript
// ✅ GOOD - Dumb presentational component
// ChatHeader.tsx
import { Button, ClaudeIcon } from '@codelobby/ui-kit'
import { Settings } from 'lucide-react'
import type { LinkedPRChat } from '../types'

interface ChatHeaderProps {
  linkedPRChat: LinkedPRChat | null
  onClose: () => void           // ← Callback prop
  onClearHistory: () => void    // ← Callback prop
}

export function ChatHeader({ linkedPRChat, onClose, onClearHistory }: ChatHeaderProps) {
  return (
    <div>
      <Button onClick={onClose}>Close</Button>
      <Button onClick={onClearHistory}>Clear</Button>
    </div>
  )
}
```

```typescript
// ❌ BAD - Component reaching outside for data/actions
// ChatHeader.tsx
import { Store, Actions } from '@codelobby/shared-store'  // ❌ Direct store access

export function ChatHeader() {
  const linkedPRChat = useSignal(Store.linkedPRChat)  // ❌ Reading from store
  
  const handleClear = async () => {
    await window.electron.clearChatHistory()  // ❌ Direct IPC call
    Actions.clearChat()  // ❌ Direct action dispatch
  }
  
  return <Button onClick={handleClear}>Clear</Button>
}
```

**The orchestrator pattern:**
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
   All receive props, none access global state directly
```

This pattern ensures:
1. **Testability** - Dumb components are easy to test with mock props
2. **Reusability** - No hidden dependencies on global state
3. **Maintainability** - Clear data flow, easy to understand
4. **Module isolation** - Components stay within their module boundaries

---

## 🔮 Vision Context

CodeLobby is evolving toward **intent-driven development** where:
- PRs are the atomic unit (not files)
- Comments/CI failures are "lines of code"
- Natural language commands drive actions

When adding features, consider how they fit this paradigm shift from code-centric to PR-centric workflows.
