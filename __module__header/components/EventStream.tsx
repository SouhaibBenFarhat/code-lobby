/**
 * EventStream - Activity feed showing PR events.
 * Uses TanStack Query for data.
 */

import { type PullRequest, usePRs } from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  formatRelativeTime,
  ScrollArea,
  Separator,
  truncate
} from '@ui-kit'
import {
  Activity,
  CheckCircle2,
  Eye,
  GitCommit,
  GitMerge,
  Loader2,
  MessageSquare,
  RefreshCw,
  Tag,
  UserPlus,
  XCircle
} from 'lucide-react'
import { useMemo } from 'react'

interface PREvent {
  id: number
  event: string
  state?: 'approved' | 'changes_requested' | 'commented'
  actor?: { login: string; avatar_url: string }
  created_at: string
  body?: string
  prTitle?: string
  prNumber?: number
  repoName?: string
}

interface EventItemProps {
  event: PREvent
}

function getEventIcon(eventType: string) {
  switch (eventType) {
    case 'commented':
    case 'review_comment':
      return <MessageSquare className="w-3.5 h-3.5" />
    case 'reviewed':
      return <Eye className="w-3.5 h-3.5" />
    case 'approved':
      return <CheckCircle2 className="w-3.5 h-3.5 text-success" />
    case 'changes_requested':
      return <XCircle className="w-3.5 h-3.5 text-destructive" />
    case 'merged':
      return <GitMerge className="w-3.5 h-3.5 text-purple-500" />
    case 'review_requested':
      return <UserPlus className="w-3.5 h-3.5" />
    case 'labeled':
    case 'unlabeled':
      return <Tag className="w-3.5 h-3.5" />
    case 'committed':
      return <GitCommit className="w-3.5 h-3.5" />
    default:
      return <Activity className="w-3.5 h-3.5" />
  }
}

function getEventText(event: PREvent): string {
  switch (event.event) {
    case 'commented':
      return 'commented'
    case 'review_comment':
      return 'left a review comment'
    case 'reviewed':
      if (event.state === 'approved') return 'approved'
      if (event.state === 'changes_requested') return 'requested changes'
      return 'reviewed'
    case 'merged':
      return 'merged the PR'
    case 'review_requested':
      return 'requested a review'
    case 'labeled':
      return 'added a label'
    case 'unlabeled':
      return 'removed a label'
    case 'committed':
      return 'pushed commits'
    case 'head_ref_force_pushed':
      return 'force-pushed'
    case 'closed':
      return 'closed'
    case 'reopened':
      return 'reopened'
    default:
      return event.event.replace(/_/g, ' ')
  }
}

function EventItem({ event }: EventItemProps) {
  return (
    <div className="flex gap-3 p-3 hover:bg-muted/30 transition-colors rounded-lg animate-slideIn">
      <div className="flex-shrink-0 mt-1">
        {event.actor ? (
          <Avatar className="h-7 w-7">
            <AvatarImage src={event.actor.avatar_url} alt={event.actor.login} />
            <AvatarFallback className="text-[10px]">
              {event.actor.login.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
            {getEventIcon(event.event)}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{event.actor?.login || 'GitHub'}</span>
          <span className="text-xs text-muted-foreground">{getEventText(event)}</span>
        </div>

        {event.prTitle && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="text-foreground/80">#{event.prNumber}</span>{' '}
            {truncate(event.prTitle, 40)}
          </p>
        )}

        {event.body && (
          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded p-2 mt-1">
            {truncate(event.body, 100)}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground">
          {formatRelativeTime(event.created_at)}
          {event.repoName && (
            <>
              {' · '}
              <span className="font-mono">{event.repoName.split('/')[1]}</span>
            </>
          )}
        </p>
      </div>

      <div className="flex-shrink-0 text-muted-foreground">{getEventIcon(event.event)}</div>
    </div>
  )
}

export function EventStream(): React.JSX.Element {
  const { data: prs = [], isLoading, isFetching, refetch } = usePRs()

  const events = useMemo(() => {
    const allEvents: PREvent[] = []

    for (const pr of prs as PullRequest[]) {
      if (pr.commentsList) {
        for (const comment of pr.commentsList) {
          allEvents.push({
            id: Number(comment.id) || Date.now(),
            event: 'commented',
            actor: comment.author
              ? { login: comment.author.login, avatar_url: comment.author.avatar_url || '' }
              : undefined,
            created_at: comment.created_at,
            body: comment.body,
            prTitle: pr.title,
            prNumber: pr.number,
            repoName: pr.base.repo.full_name
          })
        }
      }

      if (pr.reviews) {
        for (const review of pr.reviews) {
          allEvents.push({
            id: Number(review.id) || Date.now(),
            event: 'reviewed',
            state: review.state.toLowerCase() as 'approved' | 'changes_requested' | 'commented',
            actor: review.author
              ? { login: review.author.login, avatar_url: review.author.avatar_url || '' }
              : undefined,
            created_at: review.created_at,
            body: review.body || undefined,
            prTitle: pr.title,
            prNumber: pr.number,
            repoName: pr.base.repo.full_name
          })
        }
      }
    }

    return allEvents.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [prs])

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-sm">Activity Stream</h2>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-xs">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">No recent activity</p>
              <p className="text-xs text-muted-foreground mt-1">
                Events will appear here as they happen
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((event, index) => (
                <div key={`${event.id}-${index}`}>
                  <EventItem event={event} />
                  {index < events.length - 1 && <Separator className="my-1 mx-3" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
