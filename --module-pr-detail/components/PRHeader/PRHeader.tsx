/**
 * PRHeader - Header section for PR detail panel.
 * Uses TanStack Query hooks.
 */

import type { PullRequest } from '@data'
import { useUpdatePRTitle } from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Col,
  cn,
  formatRelativeTime,
  Input,
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
  Edit3,
  ExternalLink,
  FileEdit,
  FileSearch,
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
import { UpdateBranchButton } from '../UpdateBranchButton'

export interface PRHeaderProps {
  onClose: () => void
}

function PRTitleSection({ pr }: { pr: PullRequest }) {
  const [copied, setCopied] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(pr.title)
  const updateTitle = useUpdatePRTitle()

  const copyBranchName = useCallback(async () => {
    await navigator.clipboard.writeText(pr.head.ref)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [pr.head.ref])

  const handleStartEdit = useCallback(() => {
    setEditedTitle(pr.title)
    setIsEditingTitle(true)
  }, [pr.title])

  const handleCancelEdit = useCallback(() => {
    setIsEditingTitle(false)
    setEditedTitle(pr.title)
  }, [pr.title])

  const handleSaveTitle = useCallback(() => {
    if (editedTitle.trim() && editedTitle !== pr.title) {
      updateTitle.mutate(
        {
          prNodeId: pr.id,
          title: editedTitle.trim(),
          repoFullName: pr.base.repo.full_name,
          prNumber: pr.number
        },
        {
          onSuccess: () => {
            setIsEditingTitle(false)
          }
        }
      )
    } else {
      setIsEditingTitle(false)
    }
  }, [editedTitle, pr.title, pr.id, pr.base.repo.full_name, pr.number, updateTitle])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSaveTitle()
      } else if (e.key === 'Escape') {
        handleCancelEdit()
      }
    },
    [handleSaveTitle, handleCancelEdit]
  )

  return (
    <div className="overflow-hidden">
      {isEditingTitle ? (
        <div className="flex items-center gap-2">
          <GitPullRequest
            className={cn(
              'w-4 h-4 flex-shrink-0',
              pr.draft ? 'text-muted-foreground' : 'text-primary'
            )}
          />
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
            #{pr.number}
          </span>
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm font-semibold flex-1"
            autoFocus
            disabled={updateTitle.isPending}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0"
            onClick={handleSaveTitle}
            disabled={updateTitle.isPending || !editedTitle.trim()}
          >
            {updateTitle.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 text-success" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="flex-shrink-0"
            onClick={handleCancelEdit}
            disabled={updateTitle.isPending}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <GitPullRequest
            className={cn(
              'w-4 h-4 flex-shrink-0 mt-0.5',
              pr.draft ? 'text-muted-foreground' : 'text-primary'
            )}
          />
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0 mt-0.5">
            #{pr.number}
          </span>
          {pr.draft && (
            <Badge variant="secondary" className="text-[10px] h-4 flex-shrink-0">
              Draft
            </Badge>
          )}
          <h2 className="font-semibold text-sm leading-tight line-clamp-2 break-words flex-1">
            {pr.title}
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="flex-shrink-0"
                onClick={handleStartEdit}
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit title</TooltipContent>
          </Tooltip>
        </div>
      )}
      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
        <GitBranch className="w-3 h-3 flex-shrink-0" />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={copyBranchName}
              className="font-mono hover:text-foreground transition-colors flex items-center gap-1 group max-w-[180px] truncate"
            >
              <span className="truncate">{pr.head.ref}</span>
              {copied ? (
                <Check className="w-3 h-3 flex-shrink-0 text-success" />
              ) : (
                <Copy className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs break-all">{pr.head.ref}</p>
            <p className="text-muted-foreground mt-1">{copied ? 'Copied!' : 'Click to copy'}</p>
          </TooltipContent>
        </Tooltip>
        <span className="flex-shrink-0 text-muted-foreground/60">→</span>
        <span className="font-mono flex-shrink-0">{pr.base.ref}</span>
      </div>
    </div>
  )
}

export function PRHeader({ onClose }: PRHeaderProps): React.JSX.Element | null {
  const { pr, refresh, isRefreshing } = useSelectedPR()

  if (!pr) return null

  return (
    <div className="p-4 border-b border-border flex-shrink-0 overflow-hidden bg-card/80 dark:bg-card/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10">
      {/* Title and actions using grid system */}
      <Row gutter="sm" align="start" justify="between" wrap>
        {/* Title section - grows to fill, shrinks with min-width */}
        <Col className="min-w-[340px] flex-1 flex-shrink">
          <PRTitleSection pr={pr} />
        </Col>

        {/* Actions section - doesn't shrink, wraps when no space */}
        <Col span="auto" className="flex-shrink-0">
          <Row gutter="xs" align="center" wrap>
            <Col span="auto">
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
            </Col>
            <Col span="auto">
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
            </Col>
            <Col span="auto">
              <Separator orientation="vertical" className="h-5 mx-1" />
            </Col>
            <Col span="auto">
              <FindPreviewButton />
            </Col>
            <Col span="auto">
              <Separator orientation="vertical" className="h-5 mx-1" />
            </Col>
            <Col span="auto">
              <ApproveButton />
            </Col>
            <Col span="auto">
              <UpdateBranchButton />
            </Col>
            <Col span="auto">
              <MergeButton />
            </Col>
            <Col span="auto">
              <ReadyForReviewButton />
            </Col>
            <Col span="auto">
              <ConvertToDraftButton />
            </Col>
            <Col span="auto">
              <CloseButton />
            </Col>
            <Col span="auto">
              <ReopenButton />
            </Col>
            <Col span="auto">
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Stats */}
      <Row gutter="sm" align="center" wrap className="pt-3 text-xs">
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
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Row gutter="xs" align="center">
                  <Col span="auto">
                    <MessageSquare className="w-3 h-3 text-muted-foreground" />
                  </Col>
                  <Col span="auto">
                    <span>{pr.comments + pr.review_comments}</span>
                  </Col>
                </Row>
              </div>
            </TooltipTrigger>
            <TooltipContent>Comments</TooltipContent>
          </Tooltip>
        </Col>
        <Col span="auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Row gutter="xs" align="center">
                  <Col span="auto">
                    <FileSearch className="w-3 h-3 text-muted-foreground" />
                  </Col>
                  {(() => {
                    // Get unique reviewers with their latest review state
                    const uniqueReviewers = Array.from(
                      new Map(
                        (pr.reviews || []).map((r) => [
                          r.author.login,
                          { author: r.author, state: r.state }
                        ])
                      ).values()
                    )
                    return (
                      <>
                        <Col span="auto">
                          <span>{uniqueReviewers.length}</span>
                        </Col>
                        {uniqueReviewers.length > 0 && (
                          <Col span="auto">
                            <div className="flex items-center -space-x-1.5 ml-1">
                              {uniqueReviewers.slice(0, 3).map(({ author, state }) => (
                                <Avatar
                                  key={author.login}
                                  className={cn(
                                    'w-4 h-4 ring-2',
                                    state === 'approved'
                                      ? 'ring-emerald-500'
                                      : state === 'changes_requested'
                                        ? 'ring-red-500'
                                        : 'ring-gray-400'
                                  )}
                                >
                                  <AvatarImage src={author.avatar_url} alt={author.login} />
                                  <AvatarFallback className="text-[6px]">
                                    {author.login.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {uniqueReviewers.length > 3 && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  +{uniqueReviewers.length - 3}
                                </span>
                              )}
                            </div>
                          </Col>
                        )}
                      </>
                    )
                  })()}
                </Row>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {pr.reviews && pr.reviews.length > 0 ? (
                <div>
                  <p className="font-medium mb-1">Reviewers</p>
                  {Array.from(
                    new Map(
                      pr.reviews.map((r) => [r.author.login, { author: r.author, state: r.state }])
                    ).values()
                  ).map(({ author, state }) => (
                    <p key={author.login} className="text-xs flex items-center gap-1">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          state === 'approved'
                            ? 'bg-emerald-500'
                            : state === 'changes_requested'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                        )}
                      />
                      {author.login}
                    </p>
                  ))}
                </div>
              ) : (
                'No reviews yet'
              )}
            </TooltipContent>
          </Tooltip>
        </Col>
      </Row>
    </div>
  )
}
