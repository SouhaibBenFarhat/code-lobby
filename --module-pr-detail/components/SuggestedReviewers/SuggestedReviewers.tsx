/**
 * SuggestedReviewers - Displays ranked reviewer suggestions from git blame analysis.
 *
 * States: loading, result (ranked list), error (with retry), empty.
 */

import type { ReviewerSuggestionResult, SuggestedReviewer } from '@data'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, cn } from '@ui-kit'
import { AlertCircle, Clock, FileCode, Hash, Loader2, RefreshCw, Trophy, Users } from 'lucide-react'
import { useMemo } from 'react'

export interface SuggestedReviewersProps {
  result: (ReviewerSuggestionResult & { error?: string }) | undefined
  isLoading: boolean
  onRetry?: () => void
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRecencyLabel(score: number): { label: string; className: string } {
  if (score >= 3) return { label: 'Very active', className: 'text-success' }
  if (score >= 2) return { label: 'Active', className: 'text-primary' }
  return { label: 'Less active', className: 'text-muted-foreground' }
}

function ScoreBar({ score, maxScore }: { score: number; maxScore: number }): React.JSX.Element {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <div className="h-1.5 flex-1 rounded-full bg-border-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono w-8 text-right shrink-0">
        {Math.round(score)}
      </span>
    </div>
  )
}

function ReviewerRow({
  reviewer,
  rank,
  maxScore
}: {
  reviewer: SuggestedReviewer
  rank: number
  maxScore: number
}): React.JSX.Element {
  const recency = getRecencyLabel(reviewer.recencyScore)
  const avatarUrl = reviewer.login ? `https://github.com/${reviewer.login}.png?size=40` : undefined

  return (
    <div className="flex items-center gap-2.5 py-1.5 px-2 rounded-md hover:bg-surface-hover transition-colors">
      {/* Rank */}
      <span
        className={cn(
          'text-[10px] font-bold w-4 text-center shrink-0',
          rank === 1
            ? 'text-warning'
            : rank === 2
              ? 'text-muted-foreground'
              : rank === 3
                ? 'text-warning/60'
                : 'text-muted-foreground/60'
        )}
      >
        {rank <= 3 ? <Trophy className="w-3 h-3 inline" /> : `#${rank}`}
      </span>

      {/* Avatar */}
      <Avatar className="w-6 h-6 shrink-0">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={reviewer.name} />}
        <AvatarFallback className="text-[9px] bg-surface-elevated">
          {getInitials(reviewer.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name & login */}
      <div className="flex flex-col min-w-0 flex-shrink">
        <span className="text-xs font-medium truncate leading-tight">
          {reviewer.login || reviewer.name}
        </span>
        {reviewer.login && reviewer.login !== reviewer.name && (
          <span className="text-[10px] text-muted-foreground truncate leading-tight">
            {reviewer.name}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5 font-normal">
          <FileCode className="w-2.5 h-2.5" />
          {reviewer.filesOwned}
        </Badge>
        <Badge variant="secondary" className="text-[9px] h-4 px-1 gap-0.5 font-normal">
          <Hash className="w-2.5 h-2.5" />
          {reviewer.linesOwned}
        </Badge>
        <span className={cn('text-[9px]', recency.className)}>
          <Clock className="w-2.5 h-2.5 inline mr-0.5" />
          {recency.label}
        </span>
      </div>

      {/* Score bar */}
      <div className="w-20 shrink-0">
        <ScoreBar score={reviewer.totalScore} maxScore={maxScore} />
      </div>
    </div>
  )
}

export function SuggestedReviewers({
  result,
  isLoading,
  onRetry
}: SuggestedReviewersProps): React.JSX.Element {
  const maxScore = useMemo(() => {
    if (!result?.reviewers?.length) return 0
    return Math.max(...result.reviewers.map((r) => r.totalScore))
  }, [result])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Analyzing code ownership...</span>
        <span className="text-[10px] text-muted-foreground/60">
          Running git blame on changed files
        </span>
      </div>
    )
  }

  // Error state
  if (result?.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <AlertCircle className="w-5 h-5 text-destructive" />
        <span className="text-xs text-muted-foreground text-center max-w-[250px]">
          {result.error}
        </span>
        {onRetry && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={onRetry}
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </Button>
        )}
      </div>
    )
  }

  // Empty state
  if (!result?.reviewers?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <Users className="w-5 h-5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">No reviewers found</span>
      </div>
    )
  }

  // Result state
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="text-[10px] text-muted-foreground">
          Analyzed {result.analyzedFiles} file{result.analyzedFiles !== 1 ? 's' : ''}
        </span>
        {onRetry && (
          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={onRetry}>
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-col">
        {result.reviewers.map((reviewer, index) => (
          <ReviewerRow
            key={reviewer.email}
            reviewer={reviewer}
            rank={index + 1}
            maxScore={maxScore}
          />
        ))}
      </div>
    </div>
  )
}
