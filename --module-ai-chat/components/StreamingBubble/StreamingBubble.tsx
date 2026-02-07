/**
 * StreamingBubble - Renders the currently streaming assistant response
 * Shows tool activity inline (like Cursor) with full command visibility
 *
 * Note: Scroll management is handled by parent component (AIChat)
 * Note: Review detection is handled via tool events, not text parsing
 */

import { ClaudeIcon, MarkdownContent } from '@ui-kit'
import { Brain, Check, FileText, Folder, Globe, Loader2, Search, Terminal } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import type { StreamingState, ToolHistoryEntry } from '../../types'
import { StreamingStateIndicator } from '../StreamingStateIndicator'

/**
 * Fix incomplete markdown code blocks for streaming display (e.g. open ``` without close).
 */
function fixIncompleteMarkdown(content: string): string {
  const fenceMatches = content.match(/```/g)
  const fenceCount = fenceMatches?.length || 0
  if (fenceCount % 2 === 1) {
    return `${content}\n\`\`\``
  }
  return content
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
  WebFetch: Globe,
  Task: Loader2,
  TodoWrite: FileText
}

// Friendly labels
const TOOL_LABELS: Record<string, string> = {
  Read: 'Read',
  Write: 'Write',
  Edit: 'Edit',
  StrReplace: 'Edit',
  Glob: 'Find files',
  Grep: 'Search',
  LS: 'List',
  Bash: 'Run',
  Shell: 'Run',
  WebSearch: 'Web search',
  WebFetch: 'Fetch URL',
  Task: 'Task',
  TodoWrite: 'Update todos'
}

/** Renders tool activity in Cursor-style - current running + completed count */
function ToolActivitySection({
  toolHistory,
  currentActivity
}: {
  toolHistory: ToolHistoryEntry[]
  currentActivity: { toolName: string; input: string } | null
}): React.JSX.Element | null {
  const completedTools = toolHistory.filter((t) => t.status === 'completed')
  const runningTool = toolHistory.find((t) => t.status === 'running')

  // Get the display info for current/running tool
  const activeToolName = currentActivity?.toolName || runningTool?.toolName
  const activeInput = currentActivity?.input || runningTool?.input || ''
  const ActiveIcon = activeToolName ? TOOL_ICONS[activeToolName] || Terminal : Terminal

  // Truncate input for display
  const displayInput = activeInput
    ? activeInput.length > 50
      ? `${activeInput.slice(0, 50)}...`
      : activeInput
    : ''

  if (!activeToolName && completedTools.length === 0) return null

  return (
    <div className="text-[11px] space-y-1">
      {/* Completed tools summary - collapsed */}
      {completedTools.length > 0 && (
        <div className="flex items-center gap-1.5 text-foreground-muted">
          <Check className="w-3 h-3 text-green-500" />
          <span>
            {completedTools.length} tool{completedTools.length > 1 ? 's' : ''} executed
          </span>
        </div>
      )}

      {/* Currently running tool */}
      {activeToolName && (
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          <ActiveIcon className="w-3 h-3" />
          {displayInput ? (
            <code className="font-mono truncate" title={activeInput}>
              {displayInput}
            </code>
          ) : (
            <span>{TOOL_LABELS[activeToolName] || activeToolName}...</span>
          )}
        </div>
      )}
    </div>
  )
}

export interface StreamingBubbleProps {
  streaming: StreamingState
}

function StreamingBubbleInner({ streaming }: StreamingBubbleProps): React.JSX.Element {
  const thinkingRef = useRef<HTMLPreElement>(null)
  const lastScrollRef = useRef(0)

  // Throttled auto-scroll for thinking section
  useEffect(() => {
    if (thinkingRef.current && streaming.thinking) {
      const now = Date.now()
      if (now - lastScrollRef.current > 100) {
        thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
        lastScrollRef.current = now
      }
    }
  }, [streaming.thinking])

  // Get tool history (most recent last for natural reading order)
  const toolHistory = streaming.toolHistory || []

  return (
    <div className="flex gap-2" style={{ contain: 'layout' }}>
      {/* Avatar */}
      <div className="w-7 h-7 rounded-full bg-info-subtle flex items-center justify-center flex-shrink-0">
        <ClaudeIcon className="w-3.5 h-3.5 text-primary" />
      </div>

      {/* Content - min-height avoids collapse jump when thinking/tools appear */}
      <div className="max-w-[85%] rounded-lg bg-chat-bubble border border-border shadow-elevation-low min-h-[40px]">
        {/* Thinking section - compact, no blue borders, same radius as bubble */}
        {streaming.thinking && (
          <div className="bg-info-subtle rounded-t-lg">
            <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-primary">
              <Brain className="w-2.5 h-2.5 animate-pulse flex-shrink-0" />
              <span className="font-medium">Thinking...</span>
              <span className="text-[9px] text-muted-foreground ml-auto">Extended reasoning</span>
            </div>
            <div className="px-2 pb-2 text-[10px] text-foreground-muted bg-info-subtle ml-2 mr-2 mb-1.5 rounded-lg border-l-2 border-border-muted">
              <pre
                ref={thinkingRef}
                className="whitespace-pre-wrap font-mono text-[9px] max-h-32 overflow-y-auto leading-tight"
              >
                {streaming.thinking.replace(/\n+$/, '')}
                <span className="streaming-cursor" />
              </pre>
            </div>
          </div>
        )}

        {/* Tool activity - Cursor style: summary + current running */}
        {(toolHistory.length > 0 || streaming.activity) && (
          <div className="px-3 py-2 border-b border-border-subtle">
            <ToolActivitySection toolHistory={toolHistory} currentActivity={streaming.activity} />
          </div>
        )}

        {/* State indicator when no content/tools yet */}
        {!streaming.content &&
          !streaming.thinking &&
          toolHistory.length === 0 &&
          !streaming.activity &&
          streaming.status !== 'idle' && (
            <div className="px-3 py-2 border-b border-border-muted">
              <StreamingStateIndicator status={streaming.status} activity={streaming.activity} />
            </div>
          )}

        {/* Main content - markdown during stream so users see formatting as it streams */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm px-3 py-2">
          {streaming.content ? (
            <>
              <div className="leading-relaxed">
                <MarkdownContent
                  content={fixIncompleteMarkdown(streaming.content.replace(/\n+$/, ''))}
                />
                <span className="streaming-cursor" />
              </div>

              {/* Show current tool activity if there's content but Claude is working */}
              {streaming.status === 'tool_use' && streaming.activity && (
                <div className="mt-2 pt-2 border-t border-border-subtle">
                  <StreamingStateIndicator
                    status={streaming.status}
                    activity={streaming.activity}
                  />
                </div>
              )}
            </>
          ) : (
            !streaming.thinking &&
            toolHistory.length === 0 &&
            streaming.status === 'idle' && (
              <StreamingStateIndicator status="composing" activity={null} />
            )
          )}
        </div>
      </div>
    </div>
  )
}

export const StreamingBubble: React.MemoExoticComponent<typeof StreamingBubbleInner> =
  React.memo(StreamingBubbleInner)
