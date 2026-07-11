/**
 * EventStream - Activity feed showing real GitHub events for the repos the
 * current user is monitoring (their selected repos).
 *
 * Data comes from the GitHub Events API (GET /repos/:owner/:repo/events) via
 * useWatchedRepoEvents(), fanned out across the watched repos. This surfaces
 * everyone's activity — pushes, PRs, reviews, comments, issues, branch changes —
 * not just the current user's.
 */

import { type UserEvent, useWatchedRepoEvents } from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  formatRelativeTime,
  ScrollArea,
  truncate
} from '@ui-kit'
import {
  Activity,
  Bell,
  CircleDot,
  Eye,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  MessageSquare,
  RefreshCw
} from 'lucide-react'

interface EventItemProps {
  event: UserEvent
}

function getEventIcon(icon: UserEvent['icon']) {
  switch (icon) {
    case 'commit':
      return <GitCommit className="w-3.5 h-3.5" />
    case 'pr':
      return <GitPullRequest className="w-3.5 h-3.5 text-primary" />
    case 'review':
      return <Eye className="w-3.5 h-3.5 text-success" />
    case 'comment':
      return <MessageSquare className="w-3.5 h-3.5" />
    case 'issue':
      return <CircleDot className="w-3.5 h-3.5" />
    case 'branch':
      return <GitBranch className="w-3.5 h-3.5" />
    default:
      return <Activity className="w-3.5 h-3.5" />
  }
}

function EventItem({ event }: EventItemProps) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-surface border border-border-muted shadow-elevation-low transition-all duration-fast hover:bg-surface-hover hover:border-border hover:shadow-elevation-medium animate-slideIn">
      <div className="flex-shrink-0 mt-0.5">
        {event.actor ? (
          <Avatar className="h-7 w-7 ring-1 ring-border-subtle">
            <AvatarImage src={event.actor.avatar_url} alt={event.actor.login} />
            <AvatarFallback className="text-[10px] bg-surface-raised">
              {event.actor.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-7 w-7 rounded-full bg-surface-raised flex items-center justify-center text-foreground-subtle">
            {getEventIcon(event.icon)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate text-foreground">
            {event.actor?.login || 'GitHub'}
          </span>
          <span className="text-xs text-foreground-muted truncate">{event.title}</span>
        </div>

        {event.description && (
          <p className="text-xs text-foreground-muted line-clamp-2 leading-relaxed">
            {truncate(event.description, 100)}
          </p>
        )}

        <p className="text-[10px] text-foreground-subtle">
          {formatRelativeTime(event.timestamp)}
          {event.repoName && (
            <>
              {' · '}
              <span className="font-mono text-foreground-muted">
                {event.repoName.split('/')[1] || event.repoName}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="flex-shrink-0 text-foreground-subtle">{getEventIcon(event.icon)}</div>
    </div>
  )
}

export function EventStream(): React.JSX.Element {
  const { data: events = [], isLoading, isFetching, refetch } = useWatchedRepoEvents()

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="section-header flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm text-foreground">Activity Stream</h2>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-foreground-subtle" />
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-foreground-subtle">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="w-8 h-8 text-foreground-subtle mb-3" />
              <p className="text-sm font-medium text-foreground">No recent activity</p>
              <p className="text-xs text-foreground-subtle mt-1">
                Events will appear here as they happen
              </p>
            </div>
          ) : (
            events.map((event) => <EventItem key={event.id} event={event} />)
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
