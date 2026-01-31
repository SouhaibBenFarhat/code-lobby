/**
 * ToolActivityIndicator - Shows what Claude Code is currently doing
 */

import type { ToolActivity, ToolResult } from '@data'
import { cn } from '@ui-kit'
import { FileText, Folder, Globe, Loader2, Search, Terminal } from 'lucide-react'

interface ToolActivityIndicatorProps {
  activity: ToolActivity | null
  lastResult: ToolResult | null
  className?: string
}

const TOOL_ICONS: Record<string, React.ElementType> = {
  Read: FileText,
  Write: FileText,
  Edit: FileText,
  Glob: Folder,
  Grep: Search,
  LS: Folder,
  Bash: Terminal,
  WebSearch: Globe,
  WebFetch: Globe
}

const TOOL_LABELS: Record<string, string> = {
  Read: 'Reading file',
  Write: 'Writing file',
  Edit: 'Editing file',
  Glob: 'Finding files',
  Grep: 'Searching code',
  LS: 'Listing directory',
  Bash: 'Running command',
  WebSearch: 'Searching web',
  WebFetch: 'Fetching URL'
}

export function ToolActivityIndicator({
  activity,
  lastResult,
  className
}: ToolActivityIndicatorProps): React.JSX.Element | null {
  if (!activity && !lastResult) return null

  const Icon = activity ? TOOL_ICONS[activity.toolName] || Loader2 : null
  const label = activity ? TOOL_LABELS[activity.toolName] || activity.toolName : null

  return (
    <div className={cn('space-y-2', className)}>
      {/* Current activity */}
      {activity && Icon && (
        <div className="flex items-center gap-2 text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md p-2 animate-pulse">
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium">{label}</span>
          <span className="text-blue-400/70 truncate font-mono text-[10px]">{activity.input}</span>
        </div>
      )}

      {/* Last result (collapsed by default, shows briefly) */}
      {lastResult && !activity && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{lastResult.toolName}</span>
            <span className="text-[10px]">({lastResult.duration}ms)</span>
          </div>
          <pre className="font-mono text-[10px] max-h-20 overflow-auto whitespace-pre-wrap">
            {lastResult.output.slice(0, 500)}
            {lastResult.output.length > 500 && '...'}
          </pre>
        </div>
      )}
    </div>
  )
}
