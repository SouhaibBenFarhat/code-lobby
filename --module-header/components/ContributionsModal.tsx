/**
 * ContributionsModal
 *
 * A creative visualization of user's GitHub contributions.
 * Opens when clicking the profile avatar.
 * Data is lazy-loaded (only fetches when modal opens).
 */

import { type ContributionsData, useContributions, useRefreshContributions } from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@ui-kit'
import {
  Flame,
  GitCommit,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Zap
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface User {
  login: string
  avatar_url: string
  name: string | null
}

interface ContributionsModalProps {
  user: User
  /** Controlled open state. When provided, the modal is controlled by the parent. */
  open?: boolean
  /** Controlled open-change handler (used with `open`). */
  onOpenChange?: (open: boolean) => void
  /** Hide the built-in avatar trigger (e.g. when opened from the account menu). */
  hideTrigger?: boolean
}

// Animated counter component
function AnimatedNumber({
  value,
  suffix = ''
}: {
  value: number
  suffix?: string
}): React.JSX.Element {
  return (
    <span className="tabular-nums font-bold">
      {value.toLocaleString()}
      {suffix}
    </span>
  )
}

// Circular progress ring
function CircularProgress({
  value,
  max,
  size = 80,
  strokeWidth = 6,
  color,
  children
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color: string
  children?: React.ReactNode
}): React.JSX.Element {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percent = max > 0 ? Math.min(value / max, 1) : 0
  const strokeDashoffset = circumference - percent * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size} aria-hidden="true">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-foreground-ghost"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

// Stat card component
function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  color,
  subtext
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  color: string
  subtext?: string
}): React.JSX.Element {
  return (
    <div className="bg-surface rounded-xl p-4 border border-border-muted hover:border-border transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold">
            <AnimatedNumber value={value} suffix={suffix} />
          </p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          {subtext && <p className="text-[10px] text-foreground-muted">{subtext}</p>}
        </div>
      </div>
    </div>
  )
}

// Heatmap color based on contribution count
function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return 'bg-surface'
  const intensity = count / Math.max(maxCount, 1)
  if (intensity > 0.75) return 'bg-green-500'
  if (intensity > 0.5) return 'bg-green-400'
  if (intensity > 0.25) return 'bg-green-300/80'
  return 'bg-green-200/60'
}

// Activity heatmap visualization (365 days like GitHub)
function ActivityHeatmap({ data }: { data: ContributionsData }): React.JSX.Element {
  const { weeks, maxCount, months } = useMemo(() => {
    // Get all weeks from the data
    const allWeeks = data.weeks
    const allDays = allWeeks.flatMap((w) => w.contributionDays)
    const max = Math.max(...allDays.map((d) => d.contributionCount), 1)

    // Log first and last dates for debugging
    if (allDays.length > 0) {
      console.log(
        '[Heatmap] Date range:',
        allDays[0]?.date,
        'to',
        allDays[allDays.length - 1]?.date,
        'weeks:',
        allWeeks.length
      )
    }

    // Calculate month labels based on the first day of each week that starts a new month
    const monthLabels: { month: string; weekIndex: number }[] = []
    let currentMonth = ''
    allWeeks.forEach((week, weekIndex) => {
      // Check all days in the week for month changes (not just first day)
      for (const day of week.contributionDays) {
        const date = new Date(day.date)
        const month = date.toLocaleDateString('en-US', { month: 'short' })
        if (month !== currentMonth) {
          currentMonth = month
          monthLabels.push({ month, weekIndex })
          break
        }
      }
    })

    return { weeks: allWeeks, maxCount: max, months: monthLabels }
  }, [data.weeks])

  const dayLabels = [
    { key: 'sun', label: '' },
    { key: 'mon', label: 'M' },
    { key: 'tue', label: '' },
    { key: 'wed', label: 'W' },
    { key: 'thu', label: '' },
    { key: 'fri', label: 'F' },
    { key: 'sat', label: '' }
  ]

  // Cell size + gap = 7px per week (6px cell + 1px gap)
  const weekWidth = 7

  return (
    <div className="space-y-0.5">
      {/* Month labels */}
      <div className="flex text-[8px] text-muted-foreground ml-3 relative h-3">
        {months.map(({ month, weekIndex }) => (
          <span
            key={`${month}-${weekIndex}`}
            className="absolute whitespace-nowrap"
            style={{ left: `${weekIndex * weekWidth}px` }}
          >
            {month}
          </span>
        ))}
      </div>

      <div className="flex">
        {/* Day labels */}
        <div className="flex flex-col gap-px text-[7px] text-muted-foreground pr-0.5 w-3 shrink-0">
          {dayLabels.map(({ key, label }) => (
            <span key={key} className="h-[6px] leading-[6px]">
              {label}
            </span>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="flex gap-px flex-nowrap">
          {weeks.map((week) => {
            const weekKey = week.contributionDays[0]?.date ?? Math.random().toString()
            return (
              <div key={weekKey} className="flex flex-col gap-px shrink-0">
                {week.contributionDays.map((day) => (
                  <div
                    key={day.date}
                    role="img"
                    aria-label={`${day.date}: ${day.contributionCount} contributions`}
                    className={cn(
                      'w-[6px] h-[6px] rounded-[1px] hover:ring-1 hover:ring-foreground/50',
                      getHeatmapColor(day.contributionCount, maxCount)
                    )}
                    title={`${day.date}: ${day.contributionCount} contribution${day.contributionCount !== 1 ? 's' : ''}`}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-0.5 pt-1 text-[7px] text-muted-foreground">
        <span>Less</span>
        <div className="w-[6px] h-[6px] rounded-[1px] bg-surface" />
        <div className="w-[6px] h-[6px] rounded-[1px] bg-green-200/60" />
        <div className="w-[6px] h-[6px] rounded-[1px] bg-green-300/80" />
        <div className="w-[6px] h-[6px] rounded-[1px] bg-green-400" />
        <div className="w-[6px] h-[6px] rounded-[1px] bg-green-500" />
        <span>More</span>
      </div>
    </div>
  )
}

// Contribution type breakdown
function ContributionBreakdown({ data }: { data: ContributionsData }): React.JSX.Element {
  const total = data.totalContributions || 1
  const types = [
    {
      label: 'Commits',
      value: data.totalCommitContributions,
      icon: GitCommit,
      color: 'hsl(142 76% 45%)'
    },
    {
      label: 'Pull Requests',
      value: data.totalPullRequestContributions,
      icon: GitPullRequest,
      color: 'hsl(221 83% 53%)'
    },
    {
      label: 'Reviews',
      value: data.totalPullRequestReviewContributions,
      icon: MessageSquare,
      color: 'hsl(262 83% 58%)'
    },
    {
      label: 'Issues',
      value: data.totalIssueContributions,
      icon: Target,
      color: 'hsl(25 95% 53%)'
    }
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Contribution Breakdown</h3>
      <div className="grid grid-cols-2 gap-3">
        {types.map(({ label, value, icon: Icon, color }) => {
          const percent = Math.round((value / total) * 100)
          return (
            <div key={label} className="flex items-center gap-3">
              <CircularProgress value={value} max={total} size={48} strokeWidth={4} color={color}>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </CircularProgress>
              <div>
                <p className="text-sm font-semibold">{value.toLocaleString()}</p>
                <p className="text-[10px] text-foreground-muted">
                  {label} ({percent}%)
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Main content when data is loaded
function ContributionsContent({ data }: { data: ContributionsData }): React.JSX.Element {
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Zap}
          label="Total Contributions"
          value={data.totalContributions}
          color="bg-info-subtle text-primary"
        />
        <StatCard
          icon={Flame}
          label="Current Streak"
          value={data.currentStreak}
          suffix=" days"
          color="bg-warning-subtle text-warning"
        />
        <StatCard
          icon={Trophy}
          label="Longest Streak"
          value={data.longestStreak}
          suffix=" days"
          color="bg-warning-subtle text-warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Daily Average"
          value={data.averagePerDay}
          color="bg-info-subtle text-info"
        />
      </div>

      {/* Activity Heatmap */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Activity (Last Year)</h3>
        <div className="bg-surface rounded-xl p-2 border border-border-muted overflow-x-auto">
          <ActivityHeatmap data={data} />
        </div>
      </div>

      {/* Contribution Breakdown */}
      <ContributionBreakdown data={data} />

      {/* Most Active Day */}
      {data.mostActiveDay && data.mostActiveDayCount > 0 && (
        <div className="bg-info-subtle rounded-xl p-4 border border-primary">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info-subtle rounded-lg">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Most Active Day</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{data.mostActiveDayCount}</span>{' '}
                contributions on {formatDate(data.mostActiveDay)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ContributionsModal({
  user,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false
}: ContributionsModalProps): React.JSX.Element {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const { data, isLoading, isFetching, error } = useContributions(open)
  const refreshContributions = useRefreshContributions()

  const handleRefresh = (): void => {
    refreshContributions()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-7 w-7 ring-2 ring-transparent hover:ring-primary/50 transition-all">
              <AvatarImage src={user.avatar_url} alt={user.login} />
              <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.login}</span>
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url} alt={user.login} />
                <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg">{user.name || user.login}</DialogTitle>
                <p className="text-sm text-muted-foreground">@{user.login}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-8 w-8"
            >
              <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
            </Button>
          </div>
        </DialogHeader>

        <div className="py-4 min-h-[400px]">
          {isLoading && !data && (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading contributions...</p>
            </div>
          )}

          {error && !data && (
            <div className="flex flex-col items-center justify-center h-[300px] gap-3 text-center">
              <div className="p-3 bg-destructive-subtle rounded-full">
                <Zap className="w-6 h-6 text-destructive" />
              </div>
              <p className="text-sm text-muted-foreground">Failed to load contributions</p>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Try Again
              </Button>
            </div>
          )}

          {data && <ContributionsContent data={data} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
