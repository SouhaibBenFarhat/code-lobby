/**
 * ListMenu Component
 *
 * A reusable list menu for dropdowns, popovers, and sidebars.
 * Handles overflow, active states, and consistent styling.
 */

import * as React from 'react'
import { cn } from '../utils'

// ═══════════════════════════════════════════════════════════════════════════
// LIST MENU ROOT
// ═══════════════════════════════════════════════════════════════════════════

interface ListMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const ListMenu: React.ForwardRefExoticComponent<
  ListMenuProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ListMenuProps>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('overflow-hidden', className)} role="menu" {...props}>
      {children}
    </div>
  )
})
ListMenu.displayName = 'ListMenu'

// ═══════════════════════════════════════════════════════════════════════════
// LIST MENU HEADER
// ═══════════════════════════════════════════════════════════════════════════

interface ListMenuHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const ListMenuHeader: React.ForwardRefExoticComponent<
  ListMenuHeaderProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ListMenuHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('px-3 py-2 border-b border-border', className)} {...props}>
        {children}
      </div>
    )
  }
)
ListMenuHeader.displayName = 'ListMenuHeader'

// ═══════════════════════════════════════════════════════════════════════════
// LIST MENU CONTENT (scrollable area)
// ═══════════════════════════════════════════════════════════════════════════

interface ListMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  maxHeight?: string
}

const ListMenuContent: React.ForwardRefExoticComponent<
  ListMenuContentProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ListMenuContentProps>(
  ({ className, children, maxHeight = '300px', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('overflow-y-auto overflow-x-hidden', className)}
        style={{ maxHeight }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ListMenuContent.displayName = 'ListMenuContent'

// ═══════════════════════════════════════════════════════════════════════════
// LIST MENU GROUP
// ═══════════════════════════════════════════════════════════════════════════

interface ListMenuGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
  children: React.ReactNode
}

const ListMenuGroup: React.ForwardRefExoticComponent<
  ListMenuGroupProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, ListMenuGroupProps>(
  ({ className, label, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {label && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium bg-surface">
            {label}
          </div>
        )}
        {children}
      </div>
    )
  }
)
ListMenuGroup.displayName = 'ListMenuGroup'

// ═══════════════════════════════════════════════════════════════════════════
// LIST MENU ITEM
// ═══════════════════════════════════════════════════════════════════════════

interface ListMenuItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'title'> {
  /** Icon to display on the left */
  icon?: React.ReactNode
  /** Primary text/title */
  title: React.ReactNode
  /** Secondary description text */
  description?: React.ReactNode
  /** Content to display on the right (e.g., badge, status) */
  trailing?: React.ReactNode
  /** Whether this item is currently active/selected */
  active?: boolean
  /** Action button content (shown on hover, e.g., delete icon) */
  actionButton?: React.ReactNode
  /** Callback when action button is clicked */
  onAction?: (e: React.MouseEvent) => void
  /** Accessible title for the action button */
  actionTitle?: string
}

const ListMenuItem: React.ForwardRefExoticComponent<
  ListMenuItemProps & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef<HTMLButtonElement, ListMenuItemProps>(
  (
    {
      className,
      icon,
      title,
      description,
      trailing,
      active,
      actionButton,
      onAction,
      actionTitle,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('group flex items-start gap-2 w-full', active && 'bg-info-subtle')}>
        <button
          ref={ref}
          type="button"
          className={cn(
            'flex-1 flex items-start gap-2 px-3 py-2 text-left min-w-0',
            'hover:bg-interactive-hover transition-colors',
            'focus-visible:outline-none focus-visible:bg-interactive-hover',
            className
          )}
          {...props}
        >
          {icon && <span className="flex-shrink-0 mt-0.5">{icon}</span>}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-start gap-2 min-w-0">
              <span className="text-sm font-medium min-w-0 whitespace-normal break-words">
                {title}
              </span>
              {trailing && <span className="flex-shrink-0 mt-0.5">{trailing}</span>}
            </div>
            {description && (
              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{description}</div>
            )}
          </div>
        </button>
        {actionButton && (
          <button
            type="button"
            title={actionTitle}
            className={cn(
              'opacity-0 group-hover:opacity-100 p-1 mr-2 mt-2',
              'hover:bg-destructive-subtle rounded transition-opacity',
              'focus-visible:opacity-100 focus-visible:outline-none'
            )}
            onClick={(e) => {
              e.stopPropagation()
              onAction?.(e)
            }}
          >
            {actionButton}
          </button>
        )}
      </div>
    )
  }
)
ListMenuItem.displayName = 'ListMenuItem'

// ═══════════════════════════════════════════════════════════════════════════
// LIST MENU SEPARATOR
// ═══════════════════════════════════════════════════════════════════════════

interface ListMenuSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

const ListMenuSeparator: React.ForwardRefExoticComponent<
  ListMenuSeparatorProps & React.RefAttributes<HTMLHRElement>
> = React.forwardRef<HTMLHRElement, ListMenuSeparatorProps>(({ className, ...props }, ref) => {
  return <hr ref={ref} className={cn('h-px bg-border my-1 border-0', className)} {...props} />
})
ListMenuSeparator.displayName = 'ListMenuSeparator'

export { ListMenu, ListMenuHeader, ListMenuContent, ListMenuGroup, ListMenuItem, ListMenuSeparator }
