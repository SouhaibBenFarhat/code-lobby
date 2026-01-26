/**
 * ViewHeader - A reusable header component for panels, views, and the main app.
 *
 * Features:
 * - Flexible layout with left, center, and right sections
 * - Built-in elevation effect
 * - Size variants (sm, md, lg)
 * - Optional title, subtitle, and icon
 * - Sticky positioning support
 */

import * as React from 'react'
import { cn } from './utils'

export interface ViewHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Size variant - affects height and padding */
  size?: 'sm' | 'md' | 'lg'
  /** Whether to show elevation shadow */
  elevated?: boolean
  /** Whether the header is sticky */
  sticky?: boolean
  /** z-index level */
  zIndex?: number
  /** Icon element to display before title */
  icon?: React.ReactNode
  /** Main title text (can be string or React node) */
  title?: React.ReactNode
  /** Subtitle text below title */
  subtitle?: React.ReactNode
  /** Content for the left section (replaces icon/title if provided) */
  leftContent?: React.ReactNode
  /** Content for the center section */
  centerContent?: React.ReactNode
  /** Content for the right section (action buttons, etc.) */
  rightContent?: React.ReactNode
  /** Additional content below the main header row */
  bottomContent?: React.ReactNode
  /** Whether this is a draggable region (for Electron window) */
  draggable?: boolean
  /** Custom class for the inner container */
  innerClassName?: string
}

const sizeConfig = {
  sm: {
    height: 'h-10',
    padding: 'px-3 py-2',
    titleSize: 'text-sm',
    subtitleSize: 'text-[10px]',
    iconSize: 'w-4 h-4',
    gap: 'gap-2'
  },
  md: {
    height: 'h-12',
    padding: 'px-4 py-2.5',
    titleSize: 'text-sm',
    subtitleSize: 'text-xs',
    iconSize: 'w-4 h-4',
    gap: 'gap-3'
  },
  lg: {
    height: 'h-14',
    padding: 'px-4 py-3',
    titleSize: 'text-base',
    subtitleSize: 'text-xs',
    iconSize: 'w-5 h-5',
    gap: 'gap-4'
  }
}

export const ViewHeader = React.forwardRef<HTMLDivElement, ViewHeaderProps>(
  (
    {
      size = 'md',
      elevated = true,
      sticky = false,
      zIndex = 10,
      icon,
      title,
      subtitle,
      leftContent,
      centerContent,
      rightContent,
      bottomContent,
      draggable = false,
      className,
      innerClassName,
      children,
      ...props
    },
    ref
  ) => {
    const config = sizeConfig[size]

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'border-b border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm',
          'flex-shrink-0 overflow-hidden',
          // Elevation
          elevated && [
            'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]',
            'dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]'
          ],
          // Positioning
          sticky && 'sticky top-0',
          // Draggable region for Electron
          draggable && 'drag-region',
          className
        )}
        style={{ zIndex }}
        {...props}
      >
        <div
          className={cn(
            'flex items-center justify-between w-full',
            config.height,
            config.padding,
            config.gap,
            innerClassName
          )}
        >
          {/* Left Section */}
          <div className={cn('flex items-center', config.gap, 'min-w-0 flex-shrink-0')}>
            {leftContent || (
              <>
                {icon && (
                  <div className={cn(config.iconSize, 'flex-shrink-0 text-primary')}>{icon}</div>
                )}
                {(title || subtitle) && (
                  <div className="flex flex-col min-w-0">
                    {title && (
                      <span
                        className={cn(config.titleSize, 'font-semibold leading-tight truncate')}
                      >
                        {title}
                      </span>
                    )}
                    {subtitle && (
                      <span
                        className={cn(
                          config.subtitleSize,
                          'text-muted-foreground leading-tight truncate'
                        )}
                      >
                        {subtitle}
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Center Section */}
          {centerContent && (
            <div className="flex-1 flex items-center justify-center min-w-0 px-4">
              {centerContent}
            </div>
          )}

          {/* Spacer when no center content */}
          {!centerContent && <div className="flex-1" />}

          {/* Right Section */}
          {rightContent && (
            <div className={cn('flex items-center', config.gap, 'flex-shrink-0')}>
              {rightContent}
            </div>
          )}

          {/* Children as fallback content */}
          {children}
        </div>

        {/* Bottom Content (tabs, stats, etc.) */}
        {bottomContent && (
          <div className={cn('border-t border-border/50', config.padding, 'py-2')}>
            {bottomContent}
          </div>
        )}
      </div>
    )
  }
)

ViewHeader.displayName = 'ViewHeader'

/**
 * ViewHeaderActions - A container for header action buttons with consistent spacing
 */
export interface ViewHeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Gap between action items */
  gap?: 'xs' | 'sm' | 'md'
}

const gapConfig = {
  xs: 'gap-0.5',
  sm: 'gap-1',
  md: 'gap-2'
}

export const ViewHeaderActions = React.forwardRef<HTMLDivElement, ViewHeaderActionsProps>(
  ({ gap = 'sm', className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center', gapConfig[gap], className)} {...props}>
        {children}
      </div>
    )
  }
)

ViewHeaderActions.displayName = 'ViewHeaderActions'

/**
 * ViewHeaderDivider - A vertical divider for separating header sections
 */
export interface ViewHeaderDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Height of the divider */
  size?: 'sm' | 'md' | 'lg'
}

const dividerSizeConfig = {
  sm: 'h-4',
  md: 'h-5',
  lg: 'h-6'
}

export const ViewHeaderDivider = React.forwardRef<HTMLDivElement, ViewHeaderDividerProps>(
  ({ size = 'md', className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('w-px bg-border mx-1', dividerSizeConfig[size], className)}
        {...props}
      />
    )
  }
)

ViewHeaderDivider.displayName = 'ViewHeaderDivider'
