/**
 * Row Component
 *
 * Flex container for columns with configurable gutters and alignment.
 */

import * as React from 'react'
import { cn } from '../../utils'
import type { AlignItems, GutterSize, JustifyContent } from '../types'

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Gutter (gap) size between columns
   * @default 'md'
   */
  gutter?: GutterSize

  /**
   * Horizontal gutter only
   */
  gutterX?: GutterSize

  /**
   * Vertical gutter only
   */
  gutterY?: GutterSize

  /**
   * Horizontal alignment of columns
   */
  justify?: JustifyContent

  /**
   * Vertical alignment of columns
   */
  align?: AlignItems

  /**
   * Allow columns to wrap to next line
   * @default true
   */
  wrap?: boolean

  /**
   * Reverse column order
   * @default false
   */
  reverse?: boolean
}

/** Gutter size to Tailwind gap class mapping */
const gutterClasses: Record<GutterSize, string> = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
}

/** Horizontal gutter classes */
const gutterXClasses: Record<GutterSize, string> = {
  none: 'gap-x-0',
  xs: 'gap-x-1',
  sm: 'gap-x-2',
  md: 'gap-x-4',
  lg: 'gap-x-6',
  xl: 'gap-x-8'
}

/** Vertical gutter classes */
const gutterYClasses: Record<GutterSize, string> = {
  none: 'gap-y-0',
  xs: 'gap-y-1',
  sm: 'gap-y-2',
  md: 'gap-y-4',
  lg: 'gap-y-6',
  xl: 'gap-y-8'
}

/** Justify content class mapping */
const justifyClasses: Record<JustifyContent, string> = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}

/** Align items class mapping */
const alignClasses: Record<AlignItems, string> = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch'
}

export const Row: React.ForwardRefExoticComponent<RowProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, RowProps>(
    (
      {
        className,
        gutter = 'md',
        gutterX,
        gutterY,
        justify,
        align,
        wrap = true,
        reverse = false,
        children,
        ...props
      },
      ref
    ) => {
      // Determine gutter classes
      let gapClasses: string
      if (gutterX !== undefined || gutterY !== undefined) {
        // Use individual axis gutters if specified
        gapClasses = cn(
          gutterX !== undefined && gutterXClasses[gutterX],
          gutterY !== undefined && gutterYClasses[gutterY]
        )
      } else {
        // Use combined gutter
        gapClasses = gutterClasses[gutter]
      }

      const rowClasses = cn(
        'flex',
        wrap ? 'flex-wrap' : 'flex-nowrap',
        reverse && 'flex-row-reverse',
        gapClasses,
        justify && justifyClasses[justify],
        align && alignClasses[align],
        className
      )

      return (
        <div ref={ref} className={rowClasses} {...props}>
          {children}
        </div>
      )
    }
  )
Row.displayName = 'Row'
