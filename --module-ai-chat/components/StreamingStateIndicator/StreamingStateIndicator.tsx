/**
 * StreamingStateIndicator - Shows what Claude is currently doing
 * Now shows full tool commands inline (like Cursor)
 * CSS animations defined in globals.css for performance
 */

import { cn } from '@ui-kit'
import { FileText, Folder, Globe, Loader2, Search, Terminal } from 'lucide-react'
import React from 'react'
import type { StreamingStatus, ToolActivity } from '../../types'

export interface StreamingStateIndicatorProps {
  status: StreamingStatus
  activity: ToolActivity | null
  className?: string
}

// Tool icons
const TOOL_ICONS: Record<string, React.ElementType> = {
  Read: FileText,
  Write: FileText,
  Edit: FileText,
  StrReplace: FileText,
  Glob: Folder,
  Grep: Search,
  LS: Folder,
  Bash: Terminal,
  Shell: Terminal,
  WebSearch: Globe,
  WebFetch: Globe
}

// Friendly labels for tools
const _TOOL_LABELS: Record<string, string> = {
  Read: 'Reading',
  Write: 'Writing',
  Edit: 'Editing',
  StrReplace: 'Editing',
  Glob: 'Finding files',
  Grep: 'Searching',
  LS: 'Listing',
  Bash: 'Running',
  Shell: 'Running',
  WebSearch: 'Searching web',
  WebFetch: 'Fetching'
}

// State config: color class and label
const STATE_CONFIG: Record<string, { colorClass: string; bgClass: string; label: string }> = {
  thinking: {
    colorClass: 'text-violet-500 dark:text-violet-400',
    bgClass: 'bg-violet-500/10 border-violet-500/20',
    label: 'Reasoning...'
  },
  tool_use: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    label: 'Working...'
  },
  writing: {
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    label: 'Writing...'
  },
  composing: {
    colorClass: 'text-blue-500 dark:text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    label: 'Processing...'
  }
}

function StreamingStateIndicatorInner({
  status,
  activity,
  className
}: StreamingStateIndicatorProps): React.JSX.Element | null {
  if (status === 'idle') return null

  const config = STATE_CONFIG[status]
  if (!config) return null

  // For tool_use, show the tool with its command - compact single line
  if (status === 'tool_use' && activity) {
    const Icon = TOOL_ICONS[activity.toolName] || Loader2
    const displayInput = activity.input
      ? activity.input.length > 50
        ? `${activity.input.slice(0, 50)}...`
        : activity.input
      : ''

    return (
      <div className={cn('flex items-center gap-1.5 text-[11px]', config.colorClass, className)}>
        <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
        <Icon className="w-3 h-3 flex-shrink-0" />
        {displayInput && (
          <code className="font-mono truncate" title={activity.input}>
            {displayInput}
          </code>
        )}
      </div>
    )
  }

  // For other states, show simple indicator
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('w-3 h-3 animate-spin', config.colorClass)} />
      <span className={cn('text-xs font-medium', config.colorClass)}>{config.label}</span>
    </div>
  )
}

export const StreamingStateIndicator: React.MemoExoticComponent<
  typeof StreamingStateIndicatorInner
> = React.memo(StreamingStateIndicatorInner)
