/**
 * Col Component
 *
 * Flexible column component with responsive spans, offsets, and ordering.
 */

import * as React from 'react'
import { cn } from '../../utils'
import type { Breakpoint, ColOffset, ColOrder, ColSpan, ResponsiveValue } from '../types'

export interface ColProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Column span (1-12, 'auto' for content-based, 'full' for 100%)
   * Can be responsive: { default: 12, sm: 6, md: 4, lg: 3 }
   */
  span?: ResponsiveValue<ColSpan>

  /**
   * Column offset (pushes column to the right)
   * Can be responsive
   */
  offset?: ResponsiveValue<ColOffset>

  /**
   * Column order for reordering in flex
   * Can be responsive
   */
  order?: ResponsiveValue<ColOrder>
}

/**
 * Generates span classes for a given breakpoint
 */
function getSpanClass(span: ColSpan, breakpoint?: string): string {
  const prefix = breakpoint ? `${breakpoint}:` : ''

  if (span === 'auto') {
    return `${prefix}flex-none ${prefix}w-auto`
  }

  if (span === 'full') {
    return `${prefix}w-full`
  }

  // Calculate percentage width for 12-column grid
  const widthMap: Record<number, string> = {
    1: 'w-[8.333333%]',
    2: 'w-[16.666667%]',
    3: 'w-1/4',
    4: 'w-1/3',
    5: 'w-[41.666667%]',
    6: 'w-1/2',
    7: 'w-[58.333333%]',
    8: 'w-2/3',
    9: 'w-3/4',
    10: 'w-[83.333333%]',
    11: 'w-[91.666667%]',
    12: 'w-full'
  }

  return `${prefix}${widthMap[span]}`
}

/**
 * Generates offset classes for a given breakpoint
 */
function getOffsetClass(offset: ColOffset, breakpoint?: string): string {
  if (offset === 0) return ''

  const prefix = breakpoint ? `${breakpoint}:` : ''

  const offsetMap: Record<number, string> = {
    1: 'ml-[8.333333%]',
    2: 'ml-[16.666667%]',
    3: 'ml-1/4',
    4: 'ml-1/3',
    5: 'ml-[41.666667%]',
    6: 'ml-1/2',
    7: 'ml-[58.333333%]',
    8: 'ml-2/3',
    9: 'ml-3/4',
    10: 'ml-[83.333333%]',
    11: 'ml-[91.666667%]'
  }

  return `${prefix}${offsetMap[offset]}`
}

/**
 * Generates order classes for a given breakpoint
 */
function getOrderClass(order: ColOrder, breakpoint?: string): string {
  const prefix = breakpoint ? `${breakpoint}:` : ''

  if (order === 'first') return `${prefix}order-first`
  if (order === 'last') return `${prefix}order-last`
  if (order === 'none') return `${prefix}order-none`

  return `${prefix}order-${order}`
}

/**
 * Generates responsive classes from a ResponsiveValue
 */
function generateResponsiveClasses<T>(
  value: ResponsiveValue<T> | undefined,
  getClassFn: (val: T, breakpoint?: string) => string
): string {
  if (value === undefined) return ''

  // Single value (not responsive object)
  if (typeof value !== 'object' || value === null) {
    return getClassFn(value as T)
  }

  // Responsive object
  const responsiveValue = value as Partial<Record<Breakpoint, T>>
  const classes: string[] = []

  // Process each breakpoint
  const breakpointOrder: Breakpoint[] = ['default', 'sm', 'md', 'lg', 'xl', '2xl']

  for (const bp of breakpointOrder) {
    if (responsiveValue[bp] !== undefined) {
      const bpPrefix = bp === 'default' ? undefined : bp
      classes.push(getClassFn(responsiveValue[bp] as T, bpPrefix))
    }
  }

  return classes.join(' ')
}

export const Col: React.ForwardRefExoticComponent<ColProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, ColProps>(
    ({ className, span, offset, order, children, ...props }, ref) => {
      // Generate responsive span classes
      const spanClasses =
        span !== undefined ? generateResponsiveClasses(span, getSpanClass) : 'flex-1 min-w-0' // Default: grow to fill space

      // Generate responsive offset classes
      const offsetClasses =
        offset !== undefined ? generateResponsiveClasses(offset, getOffsetClass) : ''

      // Generate responsive order classes
      const orderClasses =
        order !== undefined ? generateResponsiveClasses(order, getOrderClass) : ''

      const colClasses = cn(spanClasses, offsetClasses, orderClasses, className)

      return (
        <div ref={ref} className={colClasses} {...props}>
          {children}
        </div>
      )
    }
  )
Col.displayName = 'Col'
