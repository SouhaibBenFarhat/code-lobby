import { Heart, User } from 'lucide-react'
import { JSX } from 'react/jsx-runtime'
import { Avatar, AvatarFallback, AvatarImage } from '../avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { cn } from '../utils'

export interface MatchedUser {
  login: string
  avatar_url: string
}

export interface MatchedAvatarsProps {
  /** The PR author/owner */
  author: MatchedUser
  /** The assignees (match shown if at least one) */
  assignees?: MatchedUser[]
  /** Size variant */
  size?: 'sm' | 'md'
  /** Whether to show names alongside avatars (only for md size) */
  showNames?: boolean
  /** Custom class name */
  className?: string
}

/**
 * MatchedAvatars - Dating app style "It's a match!" avatar display
 * Shows author ❤️ assignee when there's an assignee, otherwise just the author.
 */
export function MatchedAvatars({
  author,
  assignees = [],
  size = 'sm',
  showNames = false,
  className
}: MatchedAvatarsProps): JSX.Element {
  const hasMatch = assignees.length > 0
  const avatarSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  const heartSize = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
  const heartMargin = size === 'sm' ? '-mx-0.5' : '-mx-0.5'
  const ringSize = size === 'sm' ? 'ring-1' : 'ring-2'

  if (!hasMatch) {
    // No assignee - just show author
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 cursor-default', className)}>
            <Avatar className={avatarSize}>
              <AvatarImage src={author.avatar_url} alt={author.login} />
              <AvatarFallback className="text-[6px]">
                {size === 'sm' ? (
                  <User className="w-2.5 h-2.5" />
                ) : (
                  author.login.slice(0, 2).toUpperCase()
                )}
              </AvatarFallback>
            </Avatar>
            {showNames && size === 'md' && <span>{author.login}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>Author: {author.login}</TooltipContent>
      </Tooltip>
    )
  }

  // Has assignee - show match UI
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('flex items-center gap-1 cursor-default group/match', className)}>
          {showNames && size === 'md' && <span>{author.login}</span>}
          <Avatar
            className={cn(
              avatarSize,
              ringSize,
              'ring-pink-400/50 transition-transform group-hover/match:scale-110'
            )}
          >
            <AvatarImage src={author.avatar_url} alt={author.login} />
            <AvatarFallback className="text-[6px] bg-pink-100 text-pink-600">
              {size === 'sm' ? (
                <User className="w-2.5 h-2.5" />
              ) : (
                author.login.slice(0, 2).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          <Heart
            className={cn(
              heartSize,
              heartMargin,
              'text-pink-500 fill-pink-500 animate-pulse z-10 group-hover/match:scale-125 transition-transform'
            )}
          />
          <Avatar
            className={cn(
              avatarSize,
              ringSize,
              'ring-pink-400/50 transition-transform group-hover/match:scale-110'
            )}
          >
            <AvatarImage src={assignees[0].avatar_url} alt={assignees[0].login} />
            <AvatarFallback className="text-[6px] bg-pink-100 text-pink-600">
              {size === 'sm' ? (
                <User className="w-2.5 h-2.5" />
              ) : (
                assignees[0].login.slice(0, 2).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          {showNames && size === 'md' && <span>{assignees[0].login}</span>}
          {assignees.length > 1 && (
            <span className="text-[10px] text-pink-500 ml-0.5">+{assignees.length - 1}</span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-center">
        <p className="font-medium text-pink-500">It's a match! 💕</p>
        <p className="text-xs text-muted-foreground">
          {author.login} → {assignees.map((a) => a.login).join(', ')}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
