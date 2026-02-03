/**
 * ReviewerNode - Root node for a reviewer in the review tree
 *
 * Structure:
 * - Reviewer header (avatar, name, status, stats)
 * - Review summary (if exists)
 * - Files with comments
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  formatRelativeTime,
  TreeNode,
  TreeNodeChildren,
  TreeNodeHeader
} from '@ui-kit'
import { Bot, Check, Copy, ExternalLink, FileCode, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { FileNode } from './FileNode'
import type { ReviewerData } from './types'

export interface ReviewerNodeProps {
  reviewer: ReviewerData
  prUrl: string
  /** Whether to start expanded */
  defaultExpanded?: boolean
}

export function ReviewerNode({
  reviewer,
  prUrl,
  defaultExpanded = true
}: ReviewerNodeProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (): Promise<void> => {
    let text = `Review by ${reviewer.login}\n`
    if (reviewer.reviewState) {
      text += `Status: ${reviewer.reviewState}\n`
    }
    if (reviewer.reviewBody) {
      text += `\n${reviewer.reviewBody}\n`
    }
    if (reviewer.files.length > 0) {
      text += `\nInline comments:\n`
      for (const file of reviewer.files) {
        for (const c of file.comments) {
          text += `\n${c.path}:${c.line || '?'}\n${c.body}\n`
        }
      }
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Determine variant based on review state
  const variant =
    reviewer.reviewState === 'approved'
      ? 'success'
      : reviewer.reviewState === 'changes_requested'
        ? 'error'
        : 'default'

  const getStateBadge = (): React.JSX.Element | null => {
    switch (reviewer.reviewState) {
      case 'approved':
        return (
          <Badge variant="outline" className="text-[9px] h-4 text-success border-success/50">
            Approved
          </Badge>
        )
      case 'changes_requested':
        return (
          <Badge
            variant="outline"
            className="text-[9px] h-4 text-destructive border-destructive/50"
          >
            Changes requested
          </Badge>
        )
      case 'commented':
        return (
          <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground">
            Commented
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <TreeNode variant={variant} defaultExpanded={defaultExpanded}>
      <TreeNodeHeader className="py-2.5 items-start">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {/* First row: Avatar, name, badges, stats */}
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 flex-shrink-0">
              <AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
              <AvatarFallback className="text-[9px]">
                {reviewer.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <span className="font-medium text-sm">{reviewer.login}</span>

            {reviewer.isBot && (
              <Badge
                variant="outline"
                className="text-[9px] h-4 gap-0.5 text-purple-500 border-purple-500/50"
              >
                <Bot className="w-2 h-2" />
                Bot
              </Badge>
            )}

            {getStateBadge()}

            {/* Stats summary */}
            <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground">
              {reviewer.files.length > 0 && (
                <span className="flex items-center gap-1">
                  <FileCode className="w-3 h-3" />
                  {reviewer.files.length} file{reviewer.files.length !== 1 ? 's' : ''}
                </span>
              )}
              {reviewer.totalComments > 0 && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {reviewer.totalComments}
                </span>
              )}
              {reviewer.totalUnresolved > 0 && (
                <span className="text-warning">{reviewer.totalUnresolved} open</span>
              )}
              {reviewer.reviewDate && <span>{formatRelativeTime(reviewer.reviewDate)}</span>}
            </div>
          </div>

          {/* Second row: Review summary (in the same root card) */}
          {reviewer.reviewBody && (
            <div className="text-xs text-foreground/70 line-clamp-2 pl-8">
              {reviewer.reviewBody
                .replace(/```[\s\S]*?```/g, '[code]')
                .replace(/\n/g, ' ')
                .trim()}
            </div>
          )}
        </div>
      </TreeNodeHeader>

      <TreeNodeChildren>
        {/* Files with comments */}
        {reviewer.files.map((file) => (
          <FileNode key={file.path} file={file} defaultExpanded={reviewer.files.length === 1} />
        ))}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={() => window.open(`${prUrl}/files`, '_blank')}
          >
            <ExternalLink className="w-3 h-3" />
            View in GitHub
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={handleCopy}>
            {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
            Copy
          </Button>
        </div>
      </TreeNodeChildren>
    </TreeNode>
  )
}
