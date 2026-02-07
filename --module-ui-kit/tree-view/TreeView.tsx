/**
 * TreeView - Reusable tree structure with collapsible nodes
 *
 * A flexible tree component for hierarchical data display with:
 * - Collapsible nodes with smooth animations
 * - Customizable node headers and content
 * - Indent-based hierarchy visualization
 * - Support for different node variants (default, success, warning, error)
 * - Keyboard navigation support
 */

import { ChevronRight } from 'lucide-react'
import * as React from 'react'
import { createContext, useContext, useState } from 'react'
import { cn } from '../utils'

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════

interface TreeNodeContextValue {
  isExpanded: boolean
  setIsExpanded: (expanded: boolean) => void
  level: number
  variant: TreeNodeVariant
}

const TreeNodeContext = createContext<TreeNodeContextValue | null>(null)

function useTreeNode(): TreeNodeContextValue {
  const context = useContext(TreeNodeContext)
  if (!context) {
    throw new Error('TreeNode components must be used within a TreeNode')
  }
  return context
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TreeNodeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted'

const variantStyles: Record<TreeNodeVariant, { border: string; bg: string; accent: string }> = {
  default: {
    border: 'border-border',
    bg: 'bg-surface',
    accent: 'text-primary'
  },
  success: {
    border: 'border-success-border',
    bg: 'bg-success-subtle',
    accent: 'text-success'
  },
  warning: {
    border: 'border-warning-border',
    bg: 'bg-warning-subtle',
    accent: 'text-warning'
  },
  error: {
    border: 'border-destructive-border',
    bg: 'bg-destructive-subtle',
    accent: 'text-destructive'
  },
  info: {
    border: 'border-info-border',
    bg: 'bg-info-subtle',
    accent: 'text-info'
  },
  muted: {
    border: 'border-border-muted',
    bg: 'bg-background',
    accent: 'text-muted-foreground'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TREE VIEW ROOT
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeViewProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const TreeView: React.ForwardRefExoticComponent<
  TreeViewProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TreeViewProps>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('space-y-2', className)} {...props}>
      {children}
    </div>
  )
})
TreeView.displayName = 'TreeView'

// ═══════════════════════════════════════════════════════════════════════════
// TREE NODE
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeNodeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the node is expanded (controlled mode) */
  isExpanded?: boolean
  /** Callback when expand state changes */
  onExpandedChange?: (expanded: boolean) => void
  /** Whether to start expanded (uncontrolled mode) */
  defaultExpanded?: boolean
  /** Visual variant of the node */
  variant?: TreeNodeVariant
  /** Nesting level (auto-calculated in children) */
  level?: number
  children: React.ReactNode
}

export const TreeNode: React.ForwardRefExoticComponent<
  TreeNodeProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TreeNodeProps>(
  (
    {
      className,
      isExpanded: controlledExpanded,
      onExpandedChange,
      defaultExpanded = false,
      variant = 'default',
      level = 0,
      children,
      ...props
    },
    ref
  ) => {
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
    const isControlled = controlledExpanded !== undefined
    const isExpanded = isControlled ? controlledExpanded : internalExpanded

    const setIsExpanded = (expanded: boolean): void => {
      if (isControlled) {
        onExpandedChange?.(expanded)
      } else {
        setInternalExpanded(expanded)
      }
    }

    const contextValue: TreeNodeContextValue = {
      isExpanded,
      setIsExpanded,
      level,
      variant
    }

    return (
      <TreeNodeContext.Provider value={contextValue}>
        <div ref={ref} className={cn('relative', className)} data-expanded={isExpanded} {...props}>
          {children}
        </div>
      </TreeNodeContext.Provider>
    )
  }
)
TreeNode.displayName = 'TreeNode'

// ═══════════════════════════════════════════════════════════════════════════
// TREE NODE HEADER (clickable to expand/collapse)
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeNodeHeaderProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Icon to display before the chevron */
  icon?: React.ReactNode
  /** Whether to show the expand chevron */
  showChevron?: boolean
  /** Whether the node has children (affects chevron visibility) */
  hasChildren?: boolean
  children: React.ReactNode
}

export const TreeNodeHeader: React.ForwardRefExoticComponent<
  TreeNodeHeaderProps & React.RefAttributes<HTMLButtonElement>
> = React.forwardRef<HTMLButtonElement, TreeNodeHeaderProps>(
  ({ className, icon, showChevron = true, hasChildren = true, children, ...props }, ref) => {
    const { isExpanded, setIsExpanded, variant } = useTreeNode()
    const styles = variantStyles[variant]

    const handleClick = (): void => {
      if (hasChildren) {
        setIsExpanded(!isExpanded)
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      } else if (e.key === 'ArrowRight' && !isExpanded && hasChildren) {
        e.preventDefault()
        setIsExpanded(true)
      } else if (e.key === 'ArrowLeft' && isExpanded) {
        e.preventDefault()
        setIsExpanded(false)
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
          'hover:bg-interactive-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          styles.bg,
          className
        )}
        {...props}
      >
        {showChevron && hasChildren && (
          <ChevronRight
            className={cn(
              'w-4 h-4 flex-shrink-0 transition-transform duration-200',
              styles.accent,
              isExpanded && 'rotate-90'
            )}
          />
        )}
        {!hasChildren && showChevron && <span className="w-4" />}
        {icon && <span className={cn('flex-shrink-0', styles.accent)}>{icon}</span>}
        <span className="flex-1 text-left">{children}</span>
      </button>
    )
  }
)
TreeNodeHeader.displayName = 'TreeNodeHeader'

// ═══════════════════════════════════════════════════════════════════════════
// TREE NODE CONTENT (collapsible content area)
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeNodeContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const TreeNodeContent: React.ForwardRefExoticComponent<
  TreeNodeContentProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TreeNodeContentProps>(
  ({ className, children, ...props }, ref) => {
    const { isExpanded, variant } = useTreeNode()
    const styles = variantStyles[variant]

    if (!isExpanded) return null

    return (
      <div
        ref={ref}
        className={cn(
          'mt-1 ml-3 pl-3 border-l-2 animate-in fade-in-0 slide-in-from-top-1 duration-200',
          styles.border,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
TreeNodeContent.displayName = 'TreeNodeContent'

// ═══════════════════════════════════════════════════════════════════════════
// TREE NODE CHILDREN (wrapper for nested nodes)
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeNodeChildrenProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const TreeNodeChildren: React.ForwardRefExoticComponent<
  TreeNodeChildrenProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TreeNodeChildrenProps>(
  ({ className, children, ...props }, ref) => {
    const { isExpanded, level } = useTreeNode()

    if (!isExpanded) return null

    // Clone children to pass incremented level
    const childrenWithLevel = React.Children.map(children, (child) => {
      if (React.isValidElement<TreeNodeProps>(child) && child.type === TreeNode) {
        return React.cloneElement(child, { level: level + 1 })
      }
      return child
    })

    return (
      <div
        ref={ref}
        className={cn('mt-1 ml-5 space-y-1 animate-in fade-in-0 duration-200', className)}
        {...props}
      >
        {childrenWithLevel}
      </div>
    )
  }
)
TreeNodeChildren.displayName = 'TreeNodeChildren'

// ═══════════════════════════════════════════════════════════════════════════
// TREE LEAF (non-expandable item)
// ═══════════════════════════════════════════════════════════════════════════

export interface TreeLeafProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Icon to display */
  icon?: React.ReactNode
  /** Visual variant */
  variant?: TreeNodeVariant
  children: React.ReactNode
}

export const TreeLeaf: React.ForwardRefExoticComponent<
  TreeLeafProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TreeLeafProps>(
  ({ className, icon, variant = 'muted', children, ...props }, ref) => {
    const styles = variantStyles[variant]

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', styles.bg, className)}
        {...props}
      >
        {icon && <span className={cn('flex-shrink-0', styles.accent)}>{icon}</span>}
        <span className="flex-1">{children}</span>
      </div>
    )
  }
)
TreeLeaf.displayName = 'TreeLeaf'
