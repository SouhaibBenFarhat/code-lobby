import { useQuery } from '@tanstack/react-query'
import { 
  Activity, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Eye,
  GitMerge,
  UserPlus,
  Tag,
  GitCommit,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import type { PullRequest, PREvent } from './types'

interface EventItemProps {
  event: PREvent & { prTitle?: string; prNumber?: number; repoName?: string }
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
          <span className="text-sm font-medium truncate">
            {event.actor?.login || 'GitHub'}
          </span>
          <span className="text-xs text-muted-foreground">
            {getEventText(event)}
          </span>
        </div>
        
        {event.prTitle && (
          <p className="text-xs text-muted-foreground truncate">
            <span className="text-foreground/80">#{event.prNumber}</span>
            {' '}
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

      <div className="flex-shrink-0 text-muted-foreground">
        {getEventIcon(event.event)}
      </div>
    </div>
  )
}

export function EventStream() {
  // With GraphQL, we get all events in one call!
  const { data: prsData } = useQuery({
    queryKey: ['prs'],
    queryFn: async () => {
      const result = await window.electron.fetchPRs()
      if (!result.success) return []
      return result.data as PullRequest[]
    },
    refetchOnWindowFocus: true,
    staleTime: 60000
  })

  const prs = prsData || []

  // Extract events from PR data (comments, reviews already included)
  const { data: allEvents, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['pr-events'],
    queryFn: async () => {
      const result = await window.electron.fetchPREvents()
      if (!result.success) return []
      
      // Add PR context to each event
      const eventsWithContext = (result.data as PREvent[]).map(event => {
        // Find the PR this event belongs to by matching timestamps/authors
        const matchingPR = prs.find(pr => 
          pr.commentsList?.some(c => c.id === event.id) ||
          pr.reviews?.some(r => r.id === event.id)
        )
        return {
          ...event,
          prTitle: matchingPR?.title,
          prNumber: matchingPR?.number,
          repoName: matchingPR?.base.repo.full_name
        }
      })
      
      return eventsWithContext
    },
    refetchOnWindowFocus: true,
    staleTime: 60000
  })

  const events = allEvents || []

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
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7" 
            onClick={() => refetch()}
          >
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
                  {index < events.length - 1 && (
                    <Separator className="my-1 mx-3" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
