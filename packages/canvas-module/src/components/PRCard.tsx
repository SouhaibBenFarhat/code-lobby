/**
 * PRCard - A card displaying a single PR in the canvas view.
 * Uses shared-store instead of React Context.
 */

import type { PullRequest } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  cn,
  formatRelativeTime,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  truncate
} from '@codelobby/ui-kit'
import {
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  FileEdit,
  GitBranch,
  GitPullRequest,
  Loader2,
  MessageSquare,
  XCircle
} from 'lucide-react'

interface PRCardProps {
  pr: PullRequest
}

export function PRCard({ pr }: PRCardProps): React.JSX.Element {
  // Use shared store instead of context
  const selectedPR = useSignal(Store.selectedPR)
  const isSelected = selectedPR?.id === pr.id

  const handleSelect = () => {
    Actions.selectPR(pr)
  }

  // With GraphQL, checks are already included in PR data - no extra API call!
  const checks = pr.checks

  const getCheckStatusIcon = () => {
    if (!checks) return <Circle className="w-3.5 h-3.5 text-muted-foreground" />

    const hasRunning = checks.check_runs.some(
      (cr) => cr.status === 'in_progress' || cr.status === 'queued'
    )
    if (hasRunning) {
      return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />
    }

    switch (checks.state) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success" />
      case 'failure':
      case 'error':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />
      case 'pending':
        return <Circle className="w-3.5 h-3.5 text-warning" />
      default:
        return <Circle className="w-3.5 h-3.5 text-muted-foreground" />
    }
  }

  const getCheckStatusText = () => {
    if (!checks) return 'No status'

    const hasRunning = checks.check_runs.some(
      (cr) => cr.status === 'in_progress' || cr.status === 'queued'
    )
    if (hasRunning) return 'Running'

    const passed = checks.check_runs.filter((cr) => cr.conclusion === 'success').length
    const failed = checks.check_runs.filter((cr) => cr.conclusion === 'failure').length
    const total = checks.total_count

    if (failed > 0) return `${failed} failed`
    if (passed === total && total > 0) return 'All passed'
    return checks.state
  }

  const totalComments = pr.comments + pr.review_comments

  return (
    <Button
      variant="unstyled"
      size="none"
      className={cn(
        'group p-3 rounded-lg border transition-all cursor-pointer pr-card-item text-left w-full overflow-hidden',
        pr.draft && 'opacity-70',
        isSelected && 'selected'
      )}
      onClick={handleSelect}
    >
      <div className="space-y-2 overflow-hidden">
        {/* Title row */}
        <div className="flex items-start gap-2 overflow-hidden">
          <GitPullRequest
            className={cn(
              'w-4 h-4 mt-0.5 flex-shrink-0',
              pr.draft ? 'text-muted-foreground' : 'text-primary'
            )}
          />
          <div className="flex-1 min-w-0 overflow-hidden">
            <p
              className="text-sm font-medium leading-tight truncate group-hover:text-primary transition-colors"
              title={pr.title}
            >
              {pr.title}
            </p>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Branch info */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
          <GitBranch className="w-3 h-3" />
          <span className="truncate">{truncate(pr.head.ref, 20)}</span>
          <span>→</span>
          <span className="truncate">{truncate(pr.base.ref, 15)}</span>
        </div>

        {/* Labels */}
        {pr.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pr.labels.slice(0, 3).map((label) => (
              <span
                key={label.name}
                className="px-1.5 py-0.5 text-[10px] rounded-full font-medium"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                  border: `1px solid #${label.color}40`
                }}
              >
                {truncate(label.name, 15)}
              </span>
            ))}
            {pr.labels.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground">
                +{pr.labels.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {/* Left group: PR number, author, draft, CI */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>

            {/* Author */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
                    <AvatarFallback className="text-[8px]">
                      {pr.user.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                    {pr.user.login}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Author: {pr.user.login}</TooltipContent>
            </Tooltip>

            {/* Draft badge */}
            {pr.draft && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                Draft
              </Badge>
            )}

            {/* CI Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">{getCheckStatusIcon()}</div>
              </TooltipTrigger>
              <TooltipContent>{getCheckStatusText()}</TooltipContent>
            </Tooltip>
          </div>

          {/* Right group: Changes, comments, time */}
          <div className="flex items-center gap-2">
            {/* Changes */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs">
                  <FileEdit className="w-3 h-3 text-muted-foreground" />
                  <span className="text-success">+{pr.additions}</span>
                  <span className="text-destructive">-{pr.deletions}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{pr.changed_files} files changed</TooltipContent>
            </Tooltip>

            {/* Comments */}
            {totalComments > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquare className="w-3 h-3" />
                    <span>{totalComments}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {totalComments} comment{totalComments !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Time */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(pr.created_at)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Updated {formatRelativeTime(pr.updated_at)}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </Button>
  )
}
