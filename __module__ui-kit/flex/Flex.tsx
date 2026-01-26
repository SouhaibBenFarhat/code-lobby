/**
 * Flex Component
 *
 * Simple flexbox container for inline horizontal/vertical layouts.
 * Use this for: icon + text, avatar + name, button groups, etc.
 * Use Row/Col for: 12-column grid layouts with responsive spans.
 */

import * as React from 'react'
import { cn } from '../utils'

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Gap size between items. @default 'md' */
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Flex direction. @default 'row' */
  direction?: 'row' | 'col'
  /** Horizontal alignment */
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  /** Vertical alignment */
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
  /** Allow items to wrap. @default false */
  wrap?: boolean
  /** Render as inline-flex instead of flex. @default false */
  inline?: boolean
}

const gapClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8'
}

const directionClasses = {
  row: 'flex-row',
  col: 'flex-col'
}

const justifyClasses = {
  start: 'justify-start',
  end: 'justify-end',
  center: 'justify-center',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
}

const alignClasses = {
  start: 'items-start',
  end: 'items-end',
  center: 'items-center',
  baseline: 'items-baseline',
  stretch: 'items-stretch'
}

export const Flex: React.ForwardRefExoticComponent<
  FlexProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      className,
      gap = 'md',
      direction = 'row',
      justify,
      align,
      wrap = false,
      inline = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          inline ? 'inline-flex' : 'flex',
          directionClasses[direction],
          gapClasses[gap],
          wrap && 'flex-wrap',
          justify && justifyClasses[justify],
          align && alignClasses[align],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Flex.displayName = 'Flex'
