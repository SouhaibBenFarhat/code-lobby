/**
 * StreamingStateIndicator - Shows what Claude is currently doing
 * Simple ripple dot with different colors per state
 * CSS animations defined in globals.css for performance
 */

import { cn } from '@ui-kit'
import React from 'react'
import type { StreamingStatus, ToolActivity } from '../../types'

export interface StreamingStateIndicatorProps {
  status: StreamingStatus
  activity: ToolActivity | null
  className?: string
}

// State config: color class and label
const STATE_CONFIG: Record<string, { colorClass: string; label: string }> = {
  thinking: {
    colorClass: 'text-violet-500 dark:text-violet-400',
    label: 'Reasoning'
  },
  tool_use: {
    colorClass: 'text-amber-500 dark:text-amber-400',
    label: 'Working'
  },
  writing: {
    colorClass: 'text-emerald-500 dark:text-emerald-400',
    label: 'Writing'
  },
  composing: {
    colorClass: 'text-blue-500 dark:text-blue-400',
    label: 'Processing'
  }
}

// Background color classes for the dot
const DOT_BG: Record<string, string> = {
  thinking: 'bg-violet-500',
  tool_use: 'bg-amber-500',
  writing: 'bg-emerald-500',
  composing: 'bg-blue-500'
}

function StreamingStateIndicatorInner({
  status,
  activity,
  className
}: StreamingStateIndicatorProps): React.JSX.Element | null {
  if (status === 'idle') return null

  const config = STATE_CONFIG[status]
  if (!config) return null

  const dotBg = DOT_BG[status]
  const label = status === 'tool_use' && activity?.toolName ? activity.toolName : config.label

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Ripple dot using CSS classes from globals.css */}
      <div className="ripple-dot">
        <span className={cn('ripple-dot-core', dotBg)} />
        <span className={cn('ripple-dot-ring', dotBg)} />
        <span className={cn('ripple-dot-ring', dotBg)} />
      </div>
      <span className={cn('text-xs font-medium', config.colorClass)}>{label}</span>
    </div>
  )
}

export const StreamingStateIndicator: React.MemoExoticComponent<
  typeof StreamingStateIndicatorInner
> = React.memo(StreamingStateIndicatorInner)
