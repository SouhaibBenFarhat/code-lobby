/**
 * PRCard - A card displaying a single PR in the canvas view.
 * Uses TanStack Query for all data.
 */

import { type PullRequest, useSelectedPRId, useSelectPR, useSetPRDetailPanel } from '@data'
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
} from '@ui-kit'
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
  const { data: selectedPRId } = useSelectedPRId()
  const selectPR = useSelectPR()
  const setPRDetailPanel = useSetPRDetailPanel()

  const isSelected =
    selectedPRId?.repoFullName === pr.base.repo.full_name && selectedPRId?.prNumber === pr.number

  const handleSelect = () => {
    selectPR.mutate({
      repoFullName: pr.base.repo.full_name,
      prNumber: pr.number
    })
    // Open the PR detail panel when selecting a PR
    setPRDetailPanel.mutate({ isOpen: true })
  }

  const checks = pr.checks

  const getCheckStatusIcon = () => {
    if (!checks) return <Circle className="w-2.5 h-2.5 text-muted-foreground" />

    const hasRunning = checks.check_runs.some(
      (cr) => cr.status === 'in_progress' || cr.status === 'queued'
    )
    if (hasRunning) {
      return <Loader2 className="w-2.5 h-2.5 text-warning animate-spin" />
    }

    switch (checks.state) {
      case 'success':
        return <CheckCircle2 className="w-2.5 h-2.5 text-success" />
      case 'failure':
      case 'error':
        return <XCircle className="w-2.5 h-2.5 text-destructive" />
      case 'pending':
        return <Circle className="w-2.5 h-2.5 text-warning" />
      default:
        return <Circle className="w-2.5 h-2.5 text-muted-foreground" />
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
        'group p-2 rounded-lg border transition-all cursor-pointer pr-card-item text-left w-full overflow-hidden',
        pr.draft && 'opacity-70',
        isSelected && 'selected'
      )}
      onClick={handleSelect}
    >
      <div className="space-y-1 overflow-hidden">
        {/* Title row */}
        <div className="flex items-start gap-1.5 overflow-hidden">
          <GitPullRequest
            className={cn(
              'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
              pr.draft ? 'text-muted-foreground' : 'text-primary'
            )}
          />
          <p
            className="flex-1 min-w-0 text-sm font-medium leading-tight truncate group-hover:text-primary transition-colors"
            title={pr.title}
          >
            {pr.title}
          </p>
          <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
        </div>

        {/* Metadata row — single line */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground overflow-hidden">
          <span className="font-mono">#{pr.number}</span>
          <span className="text-border">·</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 min-w-0">
                <Avatar className="h-3.5 w-3.5 flex-shrink-0">
                  <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
                  <AvatarFallback className="text-[7px]">
                    {pr.user.login.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[50px]">{pr.user.login}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Author: {pr.user.login}</TooltipContent>
          </Tooltip>
          <span className="text-border">·</span>
          <GitBranch className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate font-mono">{truncate(pr.head.ref, 16)}</span>
          {pr.draft && (
            <>
              <span className="text-border">·</span>
              <Badge variant="secondary" className="h-4 text-[9px] px-1 py-0 leading-none">
                Draft
              </Badge>
            </>
          )}
        </div>

        {/* Labels — only if present */}
        {pr.labels.length > 0 && (
          <div className="flex flex-wrap gap-0.5">
            {pr.labels.slice(0, 3).map((label) => (
              <span
                key={label.name}
                className="px-1 py-0 text-[9px] rounded-full font-medium leading-relaxed"
                style={{
                  backgroundColor: `#${label.color}20`,
                  color: `#${label.color}`,
                  border: `1px solid #${label.color}40`
                }}
              >
                {truncate(label.name, 12)}
              </span>
            ))}
            {pr.labels.length > 3 && (
              <span className="px-1 text-[9px] text-muted-foreground">+{pr.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">{getCheckStatusIcon()}</div>
            </TooltipTrigger>
            <TooltipContent>{getCheckStatusText()}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">
                <FileEdit className="w-2.5 h-2.5" />
                <span className="text-success">+{pr.additions}</span>
                <span className="text-destructive">-{pr.deletions}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>{pr.changed_files} files changed</TooltipContent>
          </Tooltip>

          {totalComments > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5">
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>{totalComments}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {totalComments} comment{totalComments !== 1 ? 's' : ''}
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                <span>{formatRelativeTime(pr.created_at)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Updated {formatRelativeTime(pr.updated_at)}</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Button>
  )
}
