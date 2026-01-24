/**
 * Shared Grid System Types
 *
 * These types are used by Container, Row, and Col components.
 */

/** Responsive breakpoint names */
export type Breakpoint = 'default' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

/** Column span values (1-12, 'auto', or 'full') */
export type ColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full'

/** Offset values (0-11) */
export type ColOffset = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

/** Order values (1-12, 'first', 'last', 'none') */
export type ColOrder = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'first' | 'last' | 'none'

/** Responsive value - can be a single value or object with breakpoint-specific values */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>

/** Gutter sizes */
export type GutterSize = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** Justify content values */
export type JustifyContent = 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'

/** Align items values */
export type AlignItems = 'start' | 'end' | 'center' | 'baseline' | 'stretch'
