/**
 * PRHeader - Header section for PR detail panel.
 * Uses TanStack Query hooks.
 */

import { type PullRequest, useSetAIPanel } from '@codelobby/data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  ClaudeIcon,
  Col,
  cn,
  formatRelativeTime,
  Row,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  truncate
} from '@codelobby/ui-kit'
import {
  Clock,
  ExternalLink,
  FileEdit,
  GitBranch,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  X
} from 'lucide-react'
import { useCallback } from 'react'

import { useSelectedPR } from '../../hooks'
import { ApproveButton } from '../ApproveButton'
import { CloseButton } from '../CloseButton'
import { ConvertToDraftButton } from '../ConvertToDraftButton'
import { MergeButton } from '../MergeButton'
import { ReadyForReviewButton } from '../ReadyForReviewButton'
import { ReopenButton } from '../ReopenButton'

export interface PRHeaderProps {
  onClose: () => void
}

function PRTitleSection({ pr }: { pr: PullRequest }) {
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
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground overflow-hidden">
        <GitBranch className="w-3 h-3 flex-shrink-0" />
        <span className="font-mono truncate max-w-[100px]">{truncate(pr.head.ref, 25)}</span>
        <span className="flex-shrink-0">→</span>
        <span className="font-mono truncate max-w-[80px]">{truncate(pr.base.ref, 15)}</span>
      </div>
    </div>
  )
}

export function PRHeader({ onClose }: PRHeaderProps): React.JSX.Element | null {
  const { pr, refresh, isRefreshing } = useSelectedPR()
  const setAIPanel = useSetAIPanel()

  const openPRInChat = useCallback(
    (_pr: PullRequest) => {
      // Just open the AI panel - the AIChat component will use the selected PR
      setAIPanel.mutate({ isOpen: true })
    },
    [setAIPanel]
  )

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
                onClick={() => openPRInChat(pr)}
              >
                <ClaudeIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-center">
              <p className="font-medium">Start AI Chat</p>
              <p className="text-xs text-muted-foreground">
                Open AI assistant with this PR's context
              </p>
            </TooltipContent>
          </Tooltip>
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
          <Row gutter="xs" align="center">
            <Col span="auto">
              <Avatar className="w-4 h-4">
                <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
                <AvatarFallback className="text-[8px]">
                  {pr.user.login.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Col>
            <Col span="auto">
              <span className="truncate max-w-[80px]">{pr.user.login}</span>
            </Col>
          </Row>
        </Col>
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
