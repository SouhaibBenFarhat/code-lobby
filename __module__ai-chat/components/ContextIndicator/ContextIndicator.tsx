/**
 * ContextIndicator - Shows the context window usage for the current chat
 */

import { cn, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@ui-kit'
import { CONTEXT_WINDOWS, DEFAULT_CONTEXT_WINDOW } from '../../constants'
import type { ChatMessage } from '../../types'
import { calculateTotalTokens, estimateTokens } from '../../utils/tokens'

export interface ContextIndicatorProps {
  messages: ChatMessage[]
  streamingContent?: string
  streamingThinking?: string
  model: string
  inputText?: string
}

export function ContextIndicator({
  messages,
  streamingContent,
  streamingThinking,
  model,
  inputText
}: ContextIndicatorProps): React.JSX.Element {
  const maxTokens = CONTEXT_WINDOWS[model] || DEFAULT_CONTEXT_WINDOW
  const usedTokens =
    calculateTotalTokens(messages, streamingContent, streamingThinking) +
    estimateTokens(inputText || '')
  const percentage = Math.min((usedTokens / maxTokens) * 100, 100)

  // Color based on usage
  const getColor = () => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    if (percentage < 95) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Format numbers with K suffix
  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', getColor())}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {percentage >= 95 && <span className="text-[10px] text-red-500">⚠️</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-2 py-1">
          <span>
            {percentage.toFixed(1)}% • {formatTokens(usedTokens)} / {formatTokens(maxTokens)}{' '}
            context used
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
