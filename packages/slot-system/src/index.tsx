/**
 * @codelobby/slot-system
 *
 * A slot-based module registration system that enables zero cross-imports
 * between UI modules. Modules register themselves to named slots, and the
 * App Shell renders whatever is in each slot.
 */

import {
  type ComponentType,
  type ReactNode,
  Suspense,
  useCallback,
  useSyncExternalStore
} from 'react'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Available slot names in the application.
 * Add new slots here when needed.
 */
export type SlotName =
  | 'header'
  | 'left-panel'
  | 'main'
  | 'right-panel'
  | 'footer'
  | 'modal'
  | 'toast'

/**
 * A registered module entry in a slot.
 */
export interface SlotEntry {
  /** Unique identifier for the module */
  id: string
  /** Which slot this module belongs to */
  slot: SlotName
  /** The React component to render */
  component: ComponentType
  /** Render order within the slot (lower = first) */
  order: number
  /** Function that returns whether the module should be visible */
  visible: () => boolean
}

/**
 * Options for registering a module to a slot.
 */
export interface RegisterOptions {
  /** Unique identifier for the module */
  id: string
  /** Which slot to register to */
  slot: SlotName
  /** The React component to render */
  component: ComponentType
  /** Render order within the slot (default: 0) */
  order?: number
  /** Visibility condition (default: always visible) */
  visible?: () => boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRY (Internal State)
// ═══════════════════════════════════════════════════════════════════════════

/** Internal registry of all slot entries */
let slotRegistry: SlotEntry[] = []

/** Subscribers for state changes */
const subscribers = new Set<() => void>()

/** Notify all subscribers of a state change */
function notifySubscribers() {
  subscribers.forEach((callback) => callback())
}

/** Subscribe to registry changes */
function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

/** Get current snapshot of registry */
function getSnapshot() {
  return slotRegistry
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Register a module to a slot.
 * Call this at the top level of your module's index.ts
 *
 * @example
 * ```typescript
 * // packages/header-module/src/index.ts
 * import { registerToSlot } from '@codelobby/slot-system'
 * import { Header } from './Header'
 *
 * registerToSlot({
 *   id: 'header',
 *   slot: 'header',
 *   component: Header,
 * })
 * ```
 */
export function registerToSlot(options: RegisterOptions): void {
  const entry: SlotEntry = {
    id: options.id,
    slot: options.slot,
    component: options.component,
    order: options.order ?? 0,
    visible: options.visible ?? (() => true)
  }

  // Check for duplicate IDs
  if (slotRegistry.some((e) => e.id === entry.id)) {
    console.warn(`[slot-system] Module with id "${entry.id}" is already registered. Skipping.`)
    return
  }

  slotRegistry = [...slotRegistry, entry]
  notifySubscribers()

  console.debug(`[slot-system] Registered "${entry.id}" to slot "${entry.slot}"`)
}

/**
 * Unregister a module from its slot.
 * Useful for dynamic module loading/unloading.
 *
 * @param id - The module ID to unregister
 */
export function unregisterFromSlot(id: string): void {
  const before = slotRegistry.length
  slotRegistry = slotRegistry.filter((e) => e.id !== id)

  if (slotRegistry.length < before) {
    notifySubscribers()
    console.debug(`[slot-system] Unregistered "${id}"`)
  }
}

/**
 * Get all modules registered to a specific slot.
 * Returns only visible modules, sorted by order.
 *
 * @param slotName - The slot to query
 * @returns Array of slot entries
 */
export function getModulesForSlot(slotName: SlotName): SlotEntry[] {
  return slotRegistry
    .filter((e) => e.slot === slotName)
    .filter((e) => e.visible())
    .sort((a, b) => a.order - b.order)
}

/**
 * Check if any modules are registered to a slot.
 *
 * @param slotName - The slot to check
 * @returns true if at least one visible module is registered
 */
export function hasModulesInSlot(slotName: SlotName): boolean {
  return getModulesForSlot(slotName).length > 0
}

/**
 * Clear all registered modules.
 * Useful for testing.
 */
export function clearRegistry(): void {
  slotRegistry = []
  notifySubscribers()
}

// ═══════════════════════════════════════════════════════════════════════════
// REACT HOOKS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Hook to get modules for a slot with automatic re-rendering on changes.
 *
 * @param slotName - The slot to watch
 * @returns Array of slot entries
 */
export function useSlotModules(slotName: SlotName): SlotEntry[] {
  const registry = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  return registry
    .filter((e) => e.slot === slotName)
    .filter((e) => e.visible())
    .sort((a, b) => a.order - b.order)
}

// ═══════════════════════════════════════════════════════════════════════════
// SLOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Default loading skeleton for slots
 */
function SlotSkeleton() {
  return (
    <div
      className="animate-pulse bg-muted/50 rounded"
      style={{ minHeight: '2rem', width: '100%' }}
    />
  )
}

/**
 * Props for the Slot component
 */
export interface SlotProps {
  /** Which slot to render */
  name: SlotName
  /** Fallback content when slot is empty */
  fallback?: ReactNode
  /** CSS class name for the slot container */
  className?: string
  /** Custom loading component */
  loadingFallback?: ReactNode
  /** Whether to wrap in a container div (default: true) */
  wrapInContainer?: boolean
}

/**
 * Render all modules registered to a slot.
 *
 * @example
 * ```tsx
 * // App.tsx
 * import { Slot } from '@codelobby/slot-system'
 *
 * function App() {
 *   return (
 *     <div className="app">
 *       <Slot name="header" className="app-header" />
 *       <Slot name="main" className="app-main" />
 *       <Slot name="right-panel" className="app-panel" />
 *     </div>
 *   )
 * }
 * ```
 */
export function Slot({
  name,
  fallback = null,
  className = '',
  loadingFallback,
  wrapInContainer = true
}: SlotProps) {
  const modules = useSlotModules(name)

  // If no modules, render fallback
  if (modules.length === 0) {
    return fallback ? <>{fallback}</> : null
  }

  const content = modules.map(({ id, component: Component }) => (
    <Suspense key={id} fallback={loadingFallback ?? <SlotSkeleton />}>
      <Component />
    </Suspense>
  ))

  if (!wrapInContainer) {
    return <>{content}</>
  }

  return (
    <div className={className} data-slot={name}>
      {content}
    </div>
  )
}

/**
 * Conditional slot that only renders if modules are registered.
 * Useful for panels that should not take space when empty.
 */
export function ConditionalSlot(props: SlotProps) {
  const modules = useSlotModules(props.name)

  if (modules.length === 0) {
    return null
  }

  return <Slot {...props} />
}
