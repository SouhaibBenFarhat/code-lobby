/**
 * FileNode - Displays a file with its comments as children
 *
 * Uses FileHeader for consistent file path display
 */

import { cn, FileHeader, TreeNode, TreeNodeChildren } from '@ui-kit'
import { useState } from 'react'
import { CommentNode } from './CommentNode'
import type { FileComments } from './types'

export interface FileNodeProps {
  file: FileComments
  /** Whether to start expanded */
  defaultExpanded?: boolean
}

export function FileNode({ file, defaultExpanded = false }: FileNodeProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const hasUnresolved = file.unresolvedCount > 0
  const totalComments = file.comments.length

  const commentInfo = hasUnresolved
    ? `${file.unresolvedCount} open`
    : `${totalComments} comment${totalComments !== 1 ? 's' : ''}`

  return (
    <TreeNode variant="muted" isExpanded={isExpanded} onExpandedChange={setIsExpanded}>
      <FileHeader
        filePath={file.path}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
        info={
          <span
            className={cn('text-[10px]', hasUnresolved ? 'text-warning' : 'text-muted-foreground')}
          >
            {commentInfo}
          </span>
        }
        className="py-1 text-xs rounded-md"
      />

      <TreeNodeChildren>
        {file.comments.map((comment) => (
          <CommentNode key={comment.id} comment={comment} filePath={file.path} />
        ))}
      </TreeNodeChildren>
    </TreeNode>
  )
}
