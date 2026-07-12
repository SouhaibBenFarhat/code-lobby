/**
 * UserProfilePanel
 *
 * A panel showing the user's GitHub profile and contribution stats.
 * Placed below the explorer, resizable vertically.
 */

import {
  type ContributionsData,
  useContributions,
  useCurrentUser,
  useRefreshContributions
} from '@data'
import { Avatar, AvatarFallback, AvatarImage, Button, cn, ScrollArea } from '@ui-kit'
import {
  ChevronDown,
  ChevronUp,
  Flame,
  GitCommit,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  User,
  X,
  Zap
} from 'lucide-react'
import { useMemo } from 'react'

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

// Stat card component (compact version for panel)
function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  color
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  suffix?: string
  color: string
}): React.JSX.Element {
  return (
    <div className="bg-surface rounded-lg p-2 border border-border-muted">
      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded-md', color)}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">
            <AnimatedNumber value={value} suffix={suffix} />
          </p>
          <p className="text-[10px] text-muted-foreground truncate">{label}</p>
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

// Activity heatmap visualization (compact)
function ActivityHeatmap({ data }: { data: ContributionsData }): React.JSX.Element {
  const { weeks, maxCount, months } = useMemo(() => {
    const allWeeks = data.weeks
    const allDays = allWeeks.flatMap((w) => w.contributionDays)
    const max = Math.max(...allDays.map((d) => d.contributionCount), 1)

    const monthLabels: { month: string; weekIndex: number }[] = []
    let currentMonth = ''
    allWeeks.forEach((week, weekIndex) => {
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

// Contribution type breakdown (compact)
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
      label: 'PRs',
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
    { label: 'Issues', value: data.totalIssueContributions, icon: Target, color: 'hsl(25 95% 53%)' }
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground">Breakdown</h3>
      <div className="grid grid-cols-2 gap-2">
        {types.map(({ label, value, icon: Icon, color }) => {
          const percent = Math.round((value / total) * 100)
          return (
            <div key={label} className="flex items-center gap-2">
              <CircularProgress value={value} max={total} size={32} strokeWidth={3} color={color}>
                <Icon className="w-3 h-3 text-muted-foreground" />
              </CircularProgress>
              <div>
                <p className="text-xs font-semibold">{value.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">
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
  return (
    <div className="space-y-4 p-3">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Zap}
          label="Total"
          value={data.totalContributions}
          color="bg-info-subtle text-primary"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={data.currentStreak}
          suffix="d"
          color="bg-warning-subtle text-warning"
        />
        <StatCard
          icon={Trophy}
          label="Best"
          value={data.longestStreak}
          suffix="d"
          color="bg-warning-subtle text-warning"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg/Day"
          value={data.averagePerDay}
          color="bg-info-subtle text-info"
        />
      </div>

      {/* Activity Heatmap */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground">Activity (Last Year)</h3>
        <div className="bg-surface rounded-lg p-2 border border-border-muted overflow-x-auto">
          <ActivityHeatmap data={data} />
        </div>
      </div>

      {/* Contribution Breakdown */}
      <ContributionBreakdown data={data} />
    </div>
  )
}

interface UserProfilePanelProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
  onClose?: () => void
}

export function UserProfilePanel({
  isCollapsed,
  onToggleCollapse,
  onClose
}: UserProfilePanelProps): React.JSX.Element {
  const { data: user } = useCurrentUser()

  // Contributions (stats)
  const {
    data: contributionsData,
    isLoading: contributionsLoading,
    isFetching: contributionsFetching,
    error: contributionsError
  } = useContributions(true)
  const refreshContributions = useRefreshContributions()

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — avatar + title + actions in one row */}
      <div className="flex items-center justify-between px-3 h-10 shrink-0 section-header">
        <div className="flex items-center gap-3 min-w-0">
          {user ? (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarImage src={user.avatar_url} alt={user.login} />
              <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : (
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="text-xs font-medium text-foreground truncate">
            {user?.login ?? 'Stats'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshContributions}
            disabled={contributionsFetching}
            className="h-6 w-6"
            aria-label="Refresh stats"
          >
            <RefreshCw className={cn('w-3 h-3', contributionsFetching && 'animate-spin')} />
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-6 w-6"
              aria-label={isCollapsed ? 'Expand profile panel' : 'Collapse profile panel'}
            >
              {isCollapsed ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
              aria-label="Close profile panel"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content — recessed well, matching the Explorer body surface (bg-chat) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden bg-chat">
          <ScrollArea className="h-full">
            {contributionsLoading && !contributionsData && (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            )}

            {contributionsError && !contributionsData && (
              <div className="flex flex-col items-center justify-center h-32 gap-2 text-center p-3">
                <div className="p-2 bg-destructive-subtle rounded-full">
                  <Zap className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-xs text-muted-foreground">Failed to load</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshContributions}
                  className="h-6 text-xs"
                >
                  Retry
                </Button>
              </div>
            )}

            {contributionsData && <ContributionsContent data={contributionsData} />}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
