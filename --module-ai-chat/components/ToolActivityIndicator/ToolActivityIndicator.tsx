/**
 * ToolActivityIndicator - Shows what Claude Code is currently doing
 * Now includes a history of recent tool calls for visibility
 */

import type { ToolActivity, ToolHistoryEntry, ToolResult } from '@data'
import { cn } from '@ui-kit'
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  Globe,
  Loader2,
  Search,
  Terminal,
  XCircle
} from 'lucide-react'
import { useState } from 'react'

interface ToolActivityIndicatorProps {
  activity: ToolActivity | null
  lastResult: ToolResult | null
  toolHistory?: ToolHistoryEntry[]
  className?: string
}

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
  WebFetch: Globe,
  Task: Loader2,
  TodoWrite: FileText
}

const TOOL_LABELS: Record<string, string> = {
  Read: 'Reading file',
  Write: 'Writing file',
  Edit: 'Editing file',
  StrReplace: 'Editing file',
  Glob: 'Finding files',
  Grep: 'Searching code',
  LS: 'Listing directory',
  Bash: 'Running command',
  Shell: 'Running command',
  WebSearch: 'Searching web',
  WebFetch: 'Fetching URL',
  Task: 'Running task',
  TodoWrite: 'Updating todos'
}

export function ToolActivityIndicator({
  activity,
  lastResult,
  toolHistory = [],
  className
}: ToolActivityIndicatorProps): React.JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(true)

  // Show nothing if no activity and no history
  if (!activity && !lastResult && toolHistory.length === 0) return null

  const Icon = activity ? TOOL_ICONS[activity.toolName] || Loader2 : null
  const label = activity ? TOOL_LABELS[activity.toolName] || activity.toolName : null

  // Get last 10 history entries (most recent first)
  const recentHistory = [...toolHistory].reverse().slice(0, 10)

  return (
    <div className={cn('space-y-1', className)}>
      {/* Current activity - always visible */}
      {activity && Icon && (
        <div className="bg-surface text-foreground-muted border border-border-muted rounded-md px-2 py-1.5">
          <div className="flex items-center gap-2 text-xs">
            <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-medium">{label}</span>
          </div>
          {activity.input && (
            <div className="mt-1 text-[11px] font-mono text-foreground-muted bg-background rounded px-2 py-1 break-all">
              {activity.input}
            </div>
          )}
        </div>
      )}

      {/* Tool history section */}
      {recentHistory.length > 0 && (
        <div className="bg-surface rounded-md border border-border-muted">
          {/* Header - click to expand/collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 w-full px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="font-medium">Tool Activity</span>
            <span className="text-foreground-subtle">({toolHistory.length} calls)</span>
          </button>

          {/* History list */}
          {isExpanded && (
            <div className="px-2 pb-2 space-y-1 max-h-60 overflow-y-auto">
              {recentHistory.map((entry) => {
                const EntryIcon = TOOL_ICONS[entry.toolName] || FileText
                const isRunning = entry.status === 'running'
                const isError = entry.status === 'error'

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'text-[10px] py-1 px-1.5 rounded border',
                      isRunning && 'bg-surface text-foreground border-border-muted',
                      isError && 'bg-destructive-subtle text-destructive border-destructive-border',
                      !isRunning && !isError && 'text-muted-foreground border-border-subtle'
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-center gap-1.5">
                      {/* Status icon */}
                      {isRunning ? (
                        <Loader2 className="w-2.5 h-2.5 animate-spin flex-shrink-0" />
                      ) : isError ? (
                        <XCircle className="w-2.5 h-2.5 flex-shrink-0" />
                      ) : (
                        <Check className="w-2.5 h-2.5 flex-shrink-0 text-green-500" />
                      )}

                      {/* Tool icon */}
                      <EntryIcon className="w-2.5 h-2.5 flex-shrink-0" />

                      {/* Tool name */}
                      <span className="font-medium">{entry.toolName}</span>

                      {/* Duration */}
                      {entry.duration !== undefined && (
                        <span className="text-foreground-subtle ml-auto flex-shrink-0">
                          {entry.duration}ms
                        </span>
                      )}
                    </div>

                    {/* Input - full command on separate line */}
                    {entry.input && (
                      <div className="mt-0.5 font-mono text-[9px] opacity-80 break-all bg-surface rounded px-1 py-0.5">
                        {entry.input}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
