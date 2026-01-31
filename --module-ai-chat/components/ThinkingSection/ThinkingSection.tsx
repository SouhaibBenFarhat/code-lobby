/**
 * ThinkingSection - Collapsible section showing Claude's thinking/reasoning
 */

import { cn } from '@ui-kit'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface ThinkingSectionProps {
  thinking: string
  isStreaming?: boolean
  defaultExpanded?: boolean
  className?: string
}

export function ThinkingSection({
  thinking,
  isStreaming = false,
  defaultExpanded = false,
  className
}: ThinkingSectionProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (!thinking) return null

  return (
    <div className={cn('border-l-2 border-blue-500/50 pl-3', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-blue-500/70 hover:text-blue-500 transition-colors w-full text-left"
      >
        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Brain className="w-3 h-3" />
        <span className="font-medium">Thinking</span>
        {isStreaming && (
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
          {thinking}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-blue-500/50 animate-pulse ml-0.5" />
          )}
        </div>
      )}
    </div>
  )
}
