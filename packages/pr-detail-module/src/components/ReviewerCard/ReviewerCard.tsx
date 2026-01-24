/**
 * ReviewerCard - Displays a reviewer's feedback including review state and inline comments.
 */

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  formatRelativeTime,
  MarkdownContent
} from '@codelobby/ui-kit'
import {
  Bot,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCode,
  MessageSquare,
  XCircle
} from 'lucide-react'
import { useState } from 'react'
import type { ReviewerFeedback } from '../types'

export interface ReviewerCardProps {
  reviewer: ReviewerFeedback
  prUrl: string
}

export function ReviewerCard({ reviewer, prUrl }: ReviewerCardProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    let text = `Review by ${reviewer.login}\n`
    if (reviewer.reviewState) {
      text += `Status: ${reviewer.reviewState}\n`
    }
    if (reviewer.reviewBody) {
      text += `\n${reviewer.reviewBody}\n`
    }
    if (reviewer.inlineComments.length > 0) {
      text += `\nInline comments:\n`
      for (const c of reviewer.inlineComments) {
        text += `\n${c.path}:${c.line || '?'}\n${c.body}\n`
      }
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getStateIcon = () => {
    switch (reviewer.reviewState) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'changes_requested':
        return <XCircle className="w-4 h-4 text-destructive" />
      default:
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStateBadge = () => {
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

  const resolvedCount = reviewer.inlineComments.filter((c) => c.isResolved).length
  const unresolvedCount = reviewer.inlineComments.filter((c) => !c.isResolved).length

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        reviewer.reviewState === 'approved'
          ? 'border-success/30'
          : reviewer.reviewState === 'changes_requested'
            ? 'border-destructive/30'
            : 'border-border'
      )}
    >
      {/* Reviewer header */}
      <Button
        variant="unstyled"
        size="none"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center gap-2 p-3 hover:bg-muted/60 transition-colors',
          reviewer.reviewState === 'approved'
            ? 'bg-success/15 dark:bg-success/20'
            : reviewer.reviewState === 'changes_requested'
              ? 'bg-destructive/15 dark:bg-destructive/20'
              : 'bg-muted/40 dark:bg-muted/50'
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
          <AvatarFallback className="text-[9px]">
            {reviewer.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{reviewer.login}</span>
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
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {reviewer.inlineComments.length > 0 && (
            <span className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {reviewer.inlineComments.length}
            </span>
          )}
          {reviewer.reviewDate && <span>{formatRelativeTime(reviewer.reviewDate)}</span>}
        </div>
      </Button>

      {isExpanded && (
        <div className="border-t border-border">
          {/* Review body (summary comment) */}
          {reviewer.reviewBody && (
            <div className="p-3 bg-muted/30 dark:bg-muted/40 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                {getStateIcon()}
                <span className="text-xs font-medium">Review Summary</span>
              </div>
              <div className="text-xs text-foreground/80 dark:text-foreground/70">
                <MarkdownContent content={reviewer.reviewBody} />
              </div>
            </div>
          )}

          {/* Inline comments */}
          {reviewer.inlineComments.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Inline Comments ({reviewer.inlineComments.length})
                </span>
                {unresolvedCount > 0 && (
                  <span className="text-[10px] text-warning">{unresolvedCount} open</span>
                )}
                {resolvedCount > 0 && (
                  <span className="text-[10px] text-success">{resolvedCount} resolved</span>
                )}
              </div>

              <div className="space-y-2">
                {reviewer.inlineComments.map((comment) => {
                  const fileName = comment.path.split('/').pop() || comment.path
                  return (
                    <div
                      key={comment.id}
                      className={cn(
                        'rounded border p-2',
                        comment.isResolved
                          ? 'bg-success/15 border-success/30 dark:bg-success/20'
                          : 'bg-muted/40 border-border dark:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                        <FileCode className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="font-mono text-primary truncate">{fileName}</span>
                        {comment.line && (
                          <span className="text-muted-foreground">L{comment.line}</span>
                        )}
                        {comment.isResolved && (
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 text-success border-success/50 gap-0.5"
                          >
                            <CheckCheck className="w-2 h-2" />
                            Resolved
                          </Badge>
                        )}
                        <span className="text-muted-foreground ml-auto">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>

                      {/* Diff hunk preview */}
                      {comment.diffHunk && (
                        <pre className="p-1.5 mb-1.5 bg-muted/60 dark:bg-muted/70 text-[9px] font-mono overflow-x-auto rounded max-h-16 overflow-y-auto border border-border/50">
                          {comment.diffHunk.split('\n').slice(-4).join('\n')}
                        </pre>
                      )}

                      <div className="text-xs text-foreground/80 dark:text-foreground/70">
                        <MarkdownContent content={comment.body} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 p-2 border-t border-border bg-muted/30 dark:bg-muted/40">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => window.open(`${prUrl}/files`, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
              View in GitHub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
