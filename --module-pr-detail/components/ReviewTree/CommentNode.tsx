/**
 * CommentNode - Displays a single inline comment with optional diff hunk
 *
 * Shows directly (no expand step):
 * - Line number and metadata
 * - Full comment body with markdown rendering
 * - Diff hunk preview (collapsible)
 */

import { Badge, cn, DiffViewer, formatRelativeTime, MarkdownContent } from '@ui-kit'
import { CheckCheck, MessageSquare } from 'lucide-react'
import type { InlineComment } from './types'

export interface CommentNodeProps {
  comment: InlineComment
  /** File path for diff highlighting */
  filePath: string
}

export function CommentNode({ comment, filePath }: CommentNodeProps): React.JSX.Element {
  const hasDiff = !!comment.diffHunk

  // Subtle colors matching TreeNode variants (same as reviewer root)
  // Resolved: success variant style, Unresolved: muted variant style
  const borderClass = comment.isResolved ? 'border-success/30' : 'border-border/50'
  const bgClass = comment.isResolved
    ? 'bg-success/10 dark:bg-success/15'
    : 'bg-muted/20 dark:bg-muted/30'

  return (
    <div className={cn('rounded-lg border overflow-hidden text-xs', borderClass)}>
      {/* Diff hunk - the commented code line (shown first) */}
      {hasDiff && (
        <div className="border-b border-border/50">
          <DiffViewer
            patch={comment.diffHunk || null}
            fileName={filePath}
            className="text-[9px] max-h-24 overflow-y-auto"
          />
        </div>
      )}

      {/* Comment content below the code */}
      <div className={cn('p-2.5', bgClass)}>
        {/* Comment header: line number, resolved status, time */}
        <div className="flex items-center gap-2 mb-2 text-[10px] text-muted-foreground">
          {comment.isResolved ? (
            <CheckCheck className="w-3.5 h-3.5 text-success" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5" />
          )}
          {comment.line && <span className="font-mono">Line {comment.line}</span>}
          {comment.isResolved && (
            <Badge
              variant="outline"
              className="text-[8px] h-3.5 text-success border-success/50 gap-0.5"
            >
              <CheckCheck className="w-2 h-2" />
              Resolved
            </Badge>
          )}
          <span className="ml-auto">{formatRelativeTime(comment.created_at)}</span>
        </div>

        {/* Full comment body */}
        <div className="text-foreground/80">
          <MarkdownContent content={comment.body} />
        </div>
      </div>
    </div>
  )
}
