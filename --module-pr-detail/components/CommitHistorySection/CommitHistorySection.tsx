/**
 * CommitHistorySection - Displays PR commit history in a compact timeline
 * with a heatmap impact bar. Merge commits are hidden by default with a toggle.
 */

import type { PRCommit } from '@data'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, cn } from '@ui-kit'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GitCommitHorizontal,
  GitMerge
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

export interface CommitHistorySectionProps {
  commits: PRCommit[]
  totalCommits: number
  /** Full name like "owner/repo" */
  repoFullName: string
}

/** Format a date into a human-readable relative string */
function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 30) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (diffDay > 0) return `${diffDay}d`
  if (diffHour > 0) return `${diffHour}h`
  if (diffMin > 0) return `${diffMin}m`
  return 'now'
}

/**
 * Heatmap color stops: cool (small impact) → hot (large impact)
 */
const HEAT_COLORS = [
  'oklch(0.65 0.15 250)', // cool blue (minimal changes)
  'oklch(0.70 0.15 180)', // teal
  'oklch(0.75 0.18 155)', // green
  'oklch(0.75 0.15 95)', // yellow-green
  'oklch(0.72 0.17 75)', // yellow
  'oklch(0.68 0.19 55)', // orange
  'oklch(0.62 0.22 30)' // red-orange (massive changes)
]

/** Get a heatmap color for a normalized value 0–1 */
function getHeatColor(normalized: number): string {
  const idx = Math.min(Math.floor(normalized * HEAT_COLORS.length), HEAT_COLORS.length - 1)
  return HEAT_COLORS[idx]
}

/** Detect merge commits by message heuristic */
function isMergeCommit(commit: PRCommit): boolean {
  const msg = commit.messageHeadline.toLowerCase()
  return (
    msg.startsWith('merge branch') ||
    msg.startsWith('merge remote-tracking branch') ||
    msg.startsWith('merge pull request')
  )
}

/** Compute weighted impact score for a commit */
function commitImpact(commit: PRCommit): number {
  if (isMergeCommit(commit)) return 0
  const linesChanged = commit.additions + commit.deletions
  const filesChanged = commit.changedFilesCount
  return linesChanged + filesChanged * 5
}

export function CommitHistorySection({
  commits,
  totalCommits,
  repoFullName
}: CommitHistorySectionProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showMergeCommits, setShowMergeCommits] = useState(false)
  const [copiedSha, setCopiedSha] = useState<string | null>(null)

  // Reverse for display: newest first.
  const allCommits = useMemo(() => [...commits].reverse(), [commits])

  // Count merge commits
  const mergeCount = useMemo(() => allCommits.filter(isMergeCommit).length, [allCommits])

  // Filter based on toggle
  const visibleCommits = useMemo(
    () => (showMergeCommits ? allCommits : allCommits.filter((c) => !isMergeCommit(c))),
    [allCommits, showMergeCommits]
  )

  // Compute impact scores normalized across visible commits
  const impactData = useMemo(() => {
    const scores = visibleCommits.map(commitImpact)
    const maxScore = Math.max(...scores, 1)
    return scores.map((score) => ({
      score,
      normalized: score / maxScore
    }))
  }, [visibleCommits])

  const handleCopySha = useCallback((e: React.MouseEvent, sha: string) => {
    e.stopPropagation()
    e.preventDefault()
    navigator.clipboard.writeText(sha)
    setCopiedSha(sha)
    setTimeout(() => setCopiedSha(null), 2000)
  }, [])

  const handleOpenOnGitHub = useCallback(
    (sha: string) => {
      window.open(`https://github.com/${repoFullName}/commit/${sha}`, '_blank')
    },
    [repoFullName]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="unstyled"
          size="none"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1"
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-primary" />
            ) : (
              <ChevronRight className="w-4 h-4 text-primary" />
            )}
            <GitCommitHorizontal className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Commits</h3>
            <Badge variant="secondary" className="text-[10px] h-5">
              {totalCommits}
            </Badge>
          </div>
        </Button>

        {/* Merge commits toggle */}
        {mergeCount > 0 && isExpanded && (
          <label
            className="flex items-center gap-1.5 cursor-pointer select-none"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={showMergeCommits}
              onChange={(e) => setShowMergeCommits(e.target.checked)}
              className="w-3 h-3 rounded accent-primary cursor-pointer"
            />
            <GitMerge className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Merges ({mergeCount})</span>
          </label>
        )}
      </div>

      {/* Timeline */}
      {isExpanded && visibleCommits.length > 0 && (
        <div>
          <div className="relative ml-2">
            {/* Vertical timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-primary/40 via-primary/20 to-primary/40 rounded-full" />

            {/* Start label — Latest */}
            <div className="flex items-center gap-2 pl-8 pb-1">
              <div className="absolute left-[3px] w-[10px] h-[10px] rounded-full bg-info-subtle border-2 border-primary" />
              <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">
                Latest
              </span>
            </div>

            <div className="pt-1 pb-1">
              {visibleCommits.map((commit, idx) => {
                const merge = isMergeCommit(commit)
                return (
                  <button
                    key={commit.oid}
                    type="button"
                    onClick={() => handleOpenOnGitHub(commit.oid)}
                    className={cn(
                      'relative w-full pb-0.5 group flex items-center bg-transparent border-none pt-0 pr-0 pb-0 pl-8 cursor-pointer text-left',
                      merge && 'opacity-50'
                    )}
                  >
                    {/* Timeline dot */}
                    {merge ? (
                      <div className="absolute left-[1px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 flex items-center justify-center">
                        <GitMerge className="w-3 h-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="absolute left-[2px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary/60 bg-background flex items-center justify-center transition-transform group-hover:scale-125 group-hover:border-primary">
                        <div className="w-1 h-1 rounded-full bg-primary/60 group-hover:bg-primary" />
                      </div>
                    )}

                    {/* Commit row */}
                    <div className="flex items-center gap-1.5 py-1 rounded-md px-2 w-full group-hover:bg-surface-hover transition-colors min-w-0">
                      {/* Avatar */}
                      {commit.author.user ? (
                        <Avatar className="w-4 h-4 flex-shrink-0">
                          <AvatarImage
                            src={commit.author.user.avatar_url}
                            alt={commit.author.user.login}
                          />
                          <AvatarFallback className="text-[6px]">
                            {commit.author.user.login.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="w-4 h-4 flex-shrink-0">
                          <AvatarFallback className="text-[6px] bg-surface-raised">
                            {commit.author.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {/* Message */}
                      <span
                        className={cn(
                          'text-[11px] truncate flex-1 min-w-0',
                          merge ? 'text-muted-foreground italic' : 'text-foreground'
                        )}
                      >
                        {commit.messageHeadline}
                      </span>

                      {/* SHA (click copies) */}
                      <button
                        type="button"
                        className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors flex-shrink-0 bg-transparent border-none p-0 cursor-pointer w-12 text-right"
                        onClick={(e) => handleCopySha(e, commit.oid)}
                      >
                        {copiedSha === commit.oid ? (
                          <span className="text-success">copied</span>
                        ) : (
                          commit.oid.slice(0, 7)
                        )}
                      </button>

                      {/* +/- stats */}
                      <span className="text-[9px] flex-shrink-0 w-16 text-right">
                        {commit.additions > 0 && (
                          <span className="text-success">+{commit.additions}</span>
                        )}
                        {commit.additions > 0 && commit.deletions > 0 && ' '}
                        {commit.deletions > 0 && (
                          <span className="text-destructive">-{commit.deletions}</span>
                        )}
                      </span>

                      {/* External link icon */}
                      <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

                      {/* Time */}
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 w-6 text-right">
                        {timeAgo(commit.committedDate)}
                      </span>

                      {/* Heat indicator */}
                      <div
                        className="flex-shrink-0 w-2 h-4 rounded-sm"
                        style={{
                          backgroundColor: merge
                            ? 'oklch(0.4 0 0)'
                            : getHeatColor(impactData[idx].normalized),
                          opacity: merge ? 0.3 : 0.3 + impactData[idx].normalized * 0.7
                        }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* End label — First */}
            <div className="relative flex items-center gap-2 pl-8 pt-1">
              <div className="absolute left-[3px] w-[10px] h-[10px] rounded-full bg-info-subtle border-2 border-primary" />
              <span className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">
                First
              </span>
            </div>

            {/* Overflow notice */}
            {totalCommits > commits.length && (
              <div className="pl-7 pt-1 pb-1 text-[10px] text-muted-foreground">
                Showing {commits.length} of {totalCommits} commits
              </div>
            )}
          </div>
        </div>
      )}

      {isExpanded && visibleCommits.length === 0 && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <GitCommitHorizontal className="w-5 h-5 mx-auto mb-2 opacity-50" />
          No commits found
        </div>
      )}
    </div>
  )
}
