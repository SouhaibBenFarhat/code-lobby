/**
 * PRHeader - Header section for PR detail panel.
 * Uses TanStack Query hooks.
 */

import type { PullRequest } from '@data'
import {
  Badge,
  Button,
  Col,
  cn,
  formatRelativeTime,
  MatchedAvatars,
  Row,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileEdit,
  GitBranch,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  X
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { useSelectedPR } from '../../hooks'
import { ApproveButton } from '../ApproveButton'
import { CloseButton } from '../CloseButton'
import { ConvertToDraftButton } from '../ConvertToDraftButton'
import { FindPreviewButton } from '../FindPreviewButton'
import { MergeButton } from '../MergeButton'
import { ReadyForReviewButton } from '../ReadyForReviewButton'
import { ReopenButton } from '../ReopenButton'

export interface PRHeaderProps {
  onClose: () => void
}

function PRTitleSection({ pr }: { pr: PullRequest }) {
  const [copied, setCopied] = useState(false)

  const copyBranchName = useCallback(async () => {
    await navigator.clipboard.writeText(pr.head.ref)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [pr.head.ref])

  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <GitPullRequest
          className={cn(
            'w-4 h-4 flex-shrink-0',
            pr.draft ? 'text-muted-foreground' : 'text-primary'
          )}
        />
        <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>
        {pr.draft && (
          <Badge variant="secondary" className="text-[10px] h-4">
            Draft
          </Badge>
        )}
      </div>
      <h2 className="font-semibold text-sm leading-tight line-clamp-2 break-words">{pr.title}</h2>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
        <GitBranch className="w-3 h-3 flex-shrink-0" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copyBranchName}
              className="font-mono hover:text-foreground transition-colors flex items-center gap-1 group"
            >
              {pr.head.ref}
              {copied ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>{copied ? 'Copied!' : 'Copy branch name'}</TooltipContent>
        </Tooltip>
        <span className="flex-shrink-0">→</span>
        <span className="font-mono">{pr.base.ref}</span>
      </div>
    </div>
  )
}

export function PRHeader({ onClose }: PRHeaderProps): React.JSX.Element | null {
  const { pr, refresh, isRefreshing } = useSelectedPR()

  if (!pr) return null

  return (
    <div className="p-4 border-b border-border flex-shrink-0 overflow-hidden bg-card/80 dark:bg-card/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10">
      <div className="flex items-start justify-between gap-3">
        <PRTitleSection pr={pr} />
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={refresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh PR details</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(pr.html_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in GitHub</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <FindPreviewButton />
          <Separator orientation="vertical" className="h-5 mx-1" />
          <ApproveButton />
          <MergeButton />
          <ReadyForReviewButton />
          <ConvertToDraftButton />
          <CloseButton />
          <ReopenButton />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <Row gutter="md" align="center" className="pt-3 text-xs">
        <Col span="auto">
          <MatchedAvatars
            author={{ login: pr.user.login, avatar_url: pr.user.avatar_url }}
            assignees={pr.assignees}
            size="md"
            showNames
          />
        </Col>
        {pr.labels && pr.labels.length > 0 && (
          <Col span="auto">
            <div className="flex items-center gap-1 flex-wrap">
              {pr.labels.slice(0, 3).map((label) => (
                <span
                  key={label.name}
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`
                  }}
                >
                  {label.name}
                </span>
              ))}
              {pr.labels.length > 3 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-[10px] text-muted-foreground cursor-default">
                      +{pr.labels.length - 3}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium mb-1">All Labels</p>
                    {pr.labels.map((l) => (
                      <p key={l.name} className="text-xs" style={{ color: `#${l.color}` }}>
                        {l.name}
                      </p>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </Col>
        )}
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <Clock className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span>{formatRelativeTime(pr.created_at)}</span>
            </Col>
          </Row>
        </Col>
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <FileEdit className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span className="text-success">+{pr.additions}</span>
            </Col>
            <Col span="auto">
              <span className="text-destructive">-{pr.deletions}</span>
            </Col>
          </Row>
        </Col>
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span>{pr.comments + pr.review_comments}</span>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  )
}
