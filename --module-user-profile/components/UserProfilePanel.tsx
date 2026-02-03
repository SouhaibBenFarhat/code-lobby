/**
 * UserProfilePanel
 *
 * A panel showing user's GitHub profile and contributions.
 * Placed below the explorer, resizable vertically.
 */

import {
  type ContributionsData,
  type UserEvent,
  useContributions,
  useCurrentUser,
  useRefreshContributions,
  useRefreshUserEvents,
  useUserEvents
} from '@data'
import { Avatar, AvatarFallback, AvatarImage, Button, cn, ScrollArea } from '@ui-kit'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Flame,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  User,
  Zap
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { DailySpeechModal } from './DailySpeechModal'

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
          className="text-muted/30"
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
    <div className="bg-card/50 rounded-lg p-2 border border-border/50">
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
  if (count === 0) return 'bg-muted/40'
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
        <div className="w-[6px] h-[6px] rounded-[1px] bg-muted/40" />
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
          color="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Flame}
          label="Streak"
          value={data.currentStreak}
          suffix="d"
          color="bg-orange-500/10 text-orange-500"
        />
        <StatCard
          icon={Trophy}
          label="Best"
          value={data.longestStreak}
          suffix="d"
          color="bg-yellow-500/10 text-yellow-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg/Day"
          value={data.averagePerDay}
          color="bg-blue-500/10 text-blue-500"
        />
      </div>

      {/* Activity Heatmap */}
      <div className="space-y-1">
        <h3 className="text-xs font-medium text-muted-foreground">Activity (Last Year)</h3>
        <div className="bg-card/30 rounded-lg p-2 border border-border/50 overflow-x-auto">
          <ActivityHeatmap data={data} />
        </div>
      </div>

      {/* Contribution Breakdown */}
      <ContributionBreakdown data={data} />
    </div>
  )
}

// Event icon based on type
function EventIcon({ icon }: { icon: UserEvent['icon'] }): React.JSX.Element {
  const iconClass = 'w-3.5 h-3.5'
  switch (icon) {
    case 'commit':
      return <GitCommit className={cn(iconClass, 'text-green-500')} />
    case 'pr':
      return <GitPullRequest className={cn(iconClass, 'text-blue-500')} />
    case 'review':
      return <MessageSquare className={cn(iconClass, 'text-purple-500')} />
    case 'comment':
      return <MessageSquare className={cn(iconClass, 'text-yellow-500')} />
    case 'issue':
      return <CircleDot className={cn(iconClass, 'text-orange-500')} />
    case 'branch':
      return <GitBranch className={cn(iconClass, 'text-cyan-500')} />
    default:
      return <Zap className={cn(iconClass, 'text-muted-foreground')} />
  }
}

// Single event item
function EventItem({ event }: { event: UserEvent }): React.JSX.Element {
  const time = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="flex items-start gap-2 py-2 px-3 hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
      <div className="mt-0.5">
        <EventIcon icon={event.icon} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{event.title}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">{time}</span>
        </div>
        {event.description && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{event.description}</p>
        )}
        <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">{event.repoName}</p>
      </div>
    </div>
  )
}

// Group events by date
function groupEventsByDate(events: UserEvent[]): Map<string, UserEvent[]> {
  const groups = new Map<string, UserEvent[]>()

  for (const event of events) {
    const date = new Date(event.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    const existing = groups.get(date) || []
    groups.set(date, [...existing, event])
  }

  return groups
}

// Format date label (Today, Yesterday, or date)
function formatDateLabel(dateStr: string): string {
  const eventDate = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Reset time for comparison
  const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (eventDateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  }
  if (eventDateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday'
  }
  return dateStr
}

// Events list content
function EventsContent({
  events,
  isLoading,
  error,
  onRefresh,
  onGenerateDaily
}: {
  events: UserEvent[]
  isLoading: boolean
  error: Error | null
  onRefresh: () => void
  onGenerateDaily: () => void
}): React.JSX.Element {
  const groupedEvents = useMemo(() => groupEventsByDate(events), [events])

  if (isLoading && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Loading events...</p>
      </div>
    )
  }

  if (error && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center p-3">
        <div className="p-2 bg-destructive/10 rounded-full">
          <Zap className="w-4 h-4 text-destructive" />
        </div>
        <p className="text-xs text-muted-foreground">Failed to load events</p>
        <Button variant="outline" size="sm" onClick={onRefresh} className="h-6 text-xs">
          Retry
        </Button>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-center p-3">
        <div className="p-2 bg-muted rounded-full">
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">No recent activity</p>
        <p className="text-[10px] text-muted-foreground/70">Your events will appear here</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Recent Activity</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {events.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateDaily}
            className="h-6 text-[10px] gap-1 text-primary hover:text-primary"
          >
            <Sparkles className="w-3 h-3" />
            Generate Daily
          </Button>
        </div>
      </div>

      {/* Grouped events */}
      {Array.from(groupedEvents.entries()).map(([date, dateEvents]) => (
        <div key={date}>
          {/* Date header */}
          <div className="px-3 py-1.5 bg-muted border-b border-border/30 sticky top-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">
                {formatDateLabel(date)}
              </span>
              <span className="text-[9px] text-muted-foreground/60">({dateEvents.length})</span>
            </div>
          </div>
          {/* Events for this date */}
          <div className="divide-y divide-border/30">
            {dateEvents.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

interface UserProfilePanelProps {
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function UserProfilePanel({
  isCollapsed,
  onToggleCollapse
}: UserProfilePanelProps): React.JSX.Element {
  const { data: user } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'today' | 'stats'>('today')
  const [isDailySpeechModalOpen, setIsDailySpeechModalOpen] = useState(false)

  // Contributions
  const {
    data: contributionsData,
    isLoading: contributionsLoading,
    isFetching: contributionsFetching,
    error: contributionsError
  } = useContributions(true)
  const refreshContributions = useRefreshContributions()

  // Events
  const {
    data: eventsData = [],
    isLoading: eventsLoading,
    isFetching: eventsFetching,
    error: eventsError
  } = useUserEvents(true)
  const refreshEvents = useRefreshUserEvents()

  const handleRefresh = (): void => {
    refreshContributions()
    refreshEvents()
  }

  const isRefreshing = contributionsFetching || eventsFetching

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url} alt={user.login} />
                <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user.name || user.login}</p>
              </div>
            </>
          ) : (
            <>
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Profile</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6"
          >
            <RefreshCw className={cn('w-3 h-3', isRefreshing && 'animate-spin')} />
          </Button>
          {onToggleCollapse && (
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="h-6 w-6">
              {isCollapsed ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Content with Tabs */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab buttons */}
          <div className="flex border-b border-border bg-card/30 px-2 py-1 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('today')}
              className={cn(
                'text-xs h-7 px-3 rounded-sm transition-colors flex items-center gap-1.5',
                activeTab === 'today'
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              Today
              {eventsData.length > 0 && (
                <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">
                  {eventsData.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stats')}
              className={cn(
                'text-xs h-7 px-3 rounded-sm transition-colors',
                activeTab === 'stats'
                  ? 'bg-muted text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              Stats
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'today' && (
              <ScrollArea className="h-full">
                <EventsContent
                  events={eventsData}
                  isLoading={eventsLoading}
                  error={eventsError}
                  onRefresh={refreshEvents}
                  onGenerateDaily={() => setIsDailySpeechModalOpen(true)}
                />
              </ScrollArea>
            )}

            {activeTab === 'stats' && (
              <ScrollArea className="h-full">
                {contributionsLoading && !contributionsData && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                )}

                {contributionsError && !contributionsData && (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-center p-3">
                    <div className="p-2 bg-destructive/10 rounded-full">
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
            )}
          </div>
        </div>
      )}

      {/* Daily Speech Modal */}
      <DailySpeechModal
        isOpen={isDailySpeechModalOpen}
        onClose={() => setIsDailySpeechModalOpen(false)}
        events={eventsData}
      />
    </div>
  )
}
