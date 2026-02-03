/**
 * FileNode - Displays a file with its comments as children
 *
 * Shows:
 * - File name (with full path on hover)
 * - Comment count and resolved/unresolved status
 * - Child comments in a tree
 */

import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TreeNode,
  TreeNodeChildren,
  TreeNodeHeader
} from '@ui-kit'
import { CheckCheck, FileCode, MessageSquareWarning } from 'lucide-react'
import { CommentNode } from './CommentNode'
import type { FileComments } from './types'

export interface FileNodeProps {
  file: FileComments
  /** Whether to start expanded */
  defaultExpanded?: boolean
}

export function FileNode({ file, defaultExpanded = false }: FileNodeProps): React.JSX.Element {
  return (
    <TreeNode variant="muted" defaultExpanded={defaultExpanded}>
      <TreeNodeHeader icon={<FileCode className="w-3.5 h-3.5" />} className="text-xs py-1.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-primary truncate">{file.fileName}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-xs">
              {file.path}
            </TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {file.unresolvedCount > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 gap-0.5 text-warning border-warning/50"
              >
                <MessageSquareWarning className="w-2.5 h-2.5" />
                {file.unresolvedCount} open
              </Badge>
            )}
            {file.resolvedCount > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 gap-0.5 text-success border-success/50"
              >
                <CheckCheck className="w-2.5 h-2.5" />
                {file.resolvedCount}
              </Badge>
            )}
            {file.unresolvedCount === 0 && file.resolvedCount === 0 && (
              <span className="text-[10px] text-muted-foreground">
                {file.comments.length} comment{file.comments.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </TreeNodeHeader>

      <TreeNodeChildren>
        {file.comments.map((comment) => (
          <CommentNode key={comment.id} comment={comment} filePath={file.path} />
        ))}
      </TreeNodeChildren>
    </TreeNode>
  )
}
