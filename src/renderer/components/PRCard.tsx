import { useQuery } from '@tanstack/react-query'
import { 
  GitPullRequest, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Circle,
  Loader2,
  ExternalLink,
  FileEdit,
  GitBranch
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import { usePRContext } from '../App'
import type { PullRequest, CheckStatus } from './types'

interface PRCardProps {
  pr: PullRequest
}

export function PRCard({ pr }: PRCardProps) {
  const { selectedPR, setSelectedPR } = usePRContext()
  const isSelected = selectedPR?.id === pr.id

  // With GraphQL, checks are already included in PR data - no extra API call!
  const checks = pr.checks

  const getCheckStatusIcon = () => {
    if (!checks) return <Circle className="w-3.5 h-3.5 text-muted-foreground" />
    
    const hasRunning = checks.check_runs.some(cr => cr.status === 'in_progress' || cr.status === 'queued')
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
    
    const hasRunning = checks.check_runs.some(cr => cr.status === 'in_progress' || cr.status === 'queued')
    if (hasRunning) return 'Running'

    const passed = checks.check_runs.filter(cr => cr.conclusion === 'success').length
    const failed = checks.check_runs.filter(cr => cr.conclusion === 'failure').length
    const total = checks.total_count

    if (failed > 0) return `${failed} failed`
    if (passed === total && total > 0) return 'All passed'
    return checks.state
  }

  const totalComments = pr.comments + pr.review_comments

  return (
    <TooltipProvider>
      <div 
        className={cn(
          'group p-3 rounded-lg border transition-all cursor-pointer',
          pr.draft && 'opacity-70',
          isSelected 
            ? 'border-primary/60 bg-primary/5 hover:bg-primary/10 hover:border-primary/80' 
            : 'border-border/50 bg-background/50 hover:bg-background hover:border-border'
        )}
        onClick={() => setSelectedPR(pr)}
      >
        <div className="space-y-2">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <GitPullRequest className={cn(
              'w-4 h-4 mt-0.5 flex-shrink-0',
              pr.draft ? 'text-muted-foreground' : 'text-primary'
            )} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
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
          <div className="flex items-center gap-3 pt-1">
            {/* PR number */}
            <span className="text-xs text-muted-foreground font-mono">
              #{pr.number}
            </span>

            {/* Draft badge */}
            {pr.draft && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                Draft
              </Badge>
            )}

            {/* CI Status */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {getCheckStatusIcon()}
                </div>
              </TooltipTrigger>
              <TooltipContent>{getCheckStatusText()}</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

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
                <TooltipContent>{totalComments} comment{totalComments !== 1 ? 's' : ''}</TooltipContent>
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
    </TooltipProvider>
  )
}
