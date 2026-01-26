/**
 * Container Component
 *
 * Centered container with max-width constraints for responsive layouts.
 */

import * as React from 'react'
import { cn } from '../../utils'

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * When true, container takes full width at all breakpoints
   * @default false
   */
  fluid?: boolean

  /**
   * Set a max-width at a specific breakpoint
   * Container will be 100% wide until the specified breakpoint
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

/** Max-width classes for each breakpoint */
const containerMaxWidthClasses: Record<string, string> = {
  sm: 'max-w-[640px]',
  md: 'max-w-[768px]',
  lg: 'max-w-[1024px]',
  xl: 'max-w-[1280px]',
  '2xl': 'max-w-[1536px]'
}

export const Container: React.ForwardRefExoticComponent<
  ContainerProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, fluid = false, maxWidth, children, ...props }, ref) => {
    const containerClasses = cn(
      'w-full mx-auto px-4',
      // Default container behavior: max-width at 2xl unless fluid
      !fluid &&
        !maxWidth &&
        'sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] xl:max-w-[1280px] 2xl:max-w-[1536px]',
      // Custom max-width constraint
      maxWidth && containerMaxWidthClasses[maxWidth],
      className
    )

    return (
      <div ref={ref} className={containerClasses} {...props}>
        {children}
      </div>
    )
  }
)
Container.displayName = 'Container'
