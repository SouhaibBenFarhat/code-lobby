/**
 * FileHeader - GitHub-style header for file paths or line info
 *
 * Used in:
 * - Review comments to show which file a comment belongs to
 * - Diff views to identify the file being shown
 * - File lists with expandable content
 * - Comment headers with line info
 */

import type { LucideIcon } from 'lucide-react'
import { ChevronDown, ChevronRight, FileCode } from 'lucide-react'
import * as React from 'react'
import { cn } from '../utils'

export interface FileHeaderProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Full file path (optional if using children) */
  filePath?: string
  /** Custom icon instead of FileCode */
  icon?: LucideIcon
  /** Whether the file section is expanded (shows chevron) */
  isExpanded?: boolean
  /** Called when the header is clicked (for expand/collapse) */
  onToggle?: () => void
  /** Whether to show the expand/collapse chevron */
  showChevron?: boolean
  /** Optional badge content (e.g., comment count) */
  badge?: React.ReactNode
  /** Additional info to show on the right side */
  info?: React.ReactNode
  /** Whether the header is interactive (clickable) */
  interactive?: boolean
  /** Custom content instead of filePath */
  children?: React.ReactNode
}

export function FileHeader({
  filePath,
  icon: Icon = FileCode,
  isExpanded,
  onToggle,
  showChevron = true,
  badge,
  info,
  interactive = true,
  className,
  children,
  ...props
}: FileHeaderProps): React.JSX.Element {
  const content = (
    <>
      {/* Expand/collapse chevron */}
      {showChevron && interactive && (
        <span className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </span>
      )}

      {/* Icon */}
      <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />

      {/* Content - file path or custom children */}
      {children ? (
        <span className="flex-1 min-w-0 text-left">{children}</span>
      ) : filePath ? (
        <span className="flex-1 min-w-0 font-mono text-sm truncate text-left">{filePath}</span>
      ) : null}

      {/* Badge (e.g., comment count) */}
      {badge && <span className="flex-shrink-0">{badge}</span>}

      {/* Additional info */}
      {info && <span className="flex-shrink-0 text-xs text-muted-foreground">{info}</span>}
    </>
  )

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={filePath}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors text-left',
          className
        )}
        {...props}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className={cn('flex items-center gap-2 px-3 py-2 bg-muted/50', className)}
      {...(props as React.HTMLAttributes<HTMLDivElement>)}
    >
      {content}
    </div>
  )
}
