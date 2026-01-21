/**
 * QueuedMessageBubble - Renders a queued user message (waiting to be sent)
 */

import { Avatar, AvatarFallback, AvatarImage } from '@codelobby/ui-kit'
import { User, X } from 'lucide-react'
import React from 'react'
import type { GitHubUser, QueuedMessage } from '../../types'

export interface QueuedMessageBubbleProps {
  message: QueuedMessage
  index: number
  onRemove: () => void
  user?: GitHubUser | null
}

function QueuedMessageBubbleInner({
  message,
  index,
  onRemove,
  user
}: QueuedMessageBubbleProps): React.JSX.Element {
  return (
    <div className="flex gap-2 justify-end opacity-60">
      <div className="max-w-[85%] rounded-lg bg-primary/50 text-primary-foreground px-3 py-2 relative group selection:bg-white/30 selection:text-white">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove from queue"
        >
          <X className="w-3 h-3" />
        </button>
        <span className="absolute -bottom-1 -left-1 text-[9px] bg-muted text-muted-foreground px-1 rounded">
          #{index + 1}
        </span>
      </div>
      <Avatar className="w-7 h-7 flex-shrink-0 opacity-50">
        {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.login} /> : null}
        <AvatarFallback className="bg-muted/50">
          <User className="w-3.5 h-3.5" />
        </AvatarFallback>
      </Avatar>
    </div>
  )
}

export const QueuedMessageBubble: React.NamedExoticComponent<QueuedMessageBubbleProps> =
  React.memo(QueuedMessageBubbleInner)
