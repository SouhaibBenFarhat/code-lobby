/**
 * ThinkingSection - Collapsible section showing AI thinking/reasoning
 *
 * Features:
 * - Collapsible thinking text display in a neutral panel
 * - Optional streaming indicator
 * - Optional tool activity display (current tool, tool count)
 * - Auto-scroll support
 * - Controlled or uncontrolled expand state
 */

import { Brain, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../utils'

export interface ToolActivity {
  name: string
  input?: string
}

export interface ThinkingSectionProps {
  /** The thinking/reasoning text to display */
  thinking: string
  /** Whether the thinking is still streaming */
  isStreaming?: boolean
  /** Whether expanded (controlled mode) */
  isExpanded?: boolean
  /** Callback when expand state changes (controlled mode) */
  onExpandedChange?: (expanded: boolean) => void
  /** Whether to start expanded (uncontrolled mode) */
  defaultExpanded?: boolean
  /** Additional class name */
  className?: string
  /** Current tool being used (optional) */
  currentTool?: ToolActivity | null
  /** Number of tools used (optional, shows badge) */
  toolCount?: number
  /** Maximum height of the content area (default: 120px) */
  maxHeight?: number
  /** Label text (default: "Thinking") */
  label?: string
  /** Whether to auto-scroll to bottom as content streams */
  autoScroll?: boolean
  /** Show click hint text */
  showHint?: boolean
}

/**
 * ThinkingSection - Displays AI thinking/reasoning in a collapsible panel
 *
 * @example Basic usage (uncontrolled)
 * ```tsx
 * <ThinkingSection thinking={thinkingText} isStreaming={isGenerating} />
 * ```
 *
 * @example Controlled expand state
 * ```tsx
 * <ThinkingSection
 *   thinking={thinkingText}
 *   isExpanded={expanded}
 *   onExpandedChange={setExpanded}
 * />
 * ```
 *
 * @example With tool activity
 * ```tsx
 * <ThinkingSection
 *   thinking={thinkingText}
 *   currentTool={{ name: 'Read', input: 'src/index.ts' }}
 *   toolCount={5}
 *   autoScroll
 * />
 * ```
 */
export function ThinkingSection({
  thinking,
  isStreaming = false,
  isExpanded: controlledExpanded,
  onExpandedChange,
  defaultExpanded = false,
  className,
  currentTool,
  toolCount,
  maxHeight = 120,
  label = 'Thinking',
  autoScroll = false,
  showHint = false
}: ThinkingSectionProps): React.JSX.Element | null {
  // Support both controlled and uncontrolled modes
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isControlled = controlledExpanded !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded

  const contentRef = useRef<HTMLDivElement>(null)
  const prevThinkingLengthRef = useRef(thinking.length)

  const handleToggle = (): void => {
    if (isControlled) {
      onExpandedChange?.(!expanded)
    } else {
      setInternalExpanded(!expanded)
    }
  }

  // Auto-scroll when content changes
  useEffect(() => {
    if (
      autoScroll &&
      expanded &&
      contentRef.current &&
      thinking.length > prevThinkingLengthRef.current
    ) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
    prevThinkingLengthRef.current = thinking.length
  })

  // Don't render if no thinking and no current tool
  if (!thinking && !currentTool) return null

  return (
    <div className={cn('transition-colors rounded-lg bg-surface', className)}>
      {/* Header button */}
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1 w-full px-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={cn('w-2.5 h-2.5 transition-transform', expanded && 'rotate-90')} />
        <Brain className={cn('w-2.5 h-2.5', expanded && 'text-foreground')} />
        <span>{label}</span>
        {isStreaming && (
          <span className="ml-1 w-1.5 h-1.5 rounded-full bg-foreground-muted animate-pulse" />
        )}
        {toolCount !== undefined && toolCount > 0 && (
          <span className="text-foreground-subtle">• {toolCount} tools used</span>
        )}
        {showHint && (
          <span className="text-[9px] text-foreground-subtle ml-auto">
            Click to {expanded ? 'hide' : 'show'}
          </span>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-2 pb-2 mx-2 mb-1.5 bg-surface rounded-lg border-l-2 border-border-muted">
          {/* Thinking text */}
          <div
            ref={contentRef}
            className="overflow-y-auto text-[10px] text-foreground-muted"
            style={{ maxHeight }}
          >
            <pre className="whitespace-pre-wrap font-mono text-[9px] leading-tight pt-1.5">
              {thinking || 'Starting...'}
              {isStreaming && (
                <span className="inline-block w-1.5 h-3 bg-foreground-muted animate-pulse ml-0.5 align-middle" />
              )}
            </pre>
          </div>

          {/* Current tool activity */}
          {currentTool && (
            <div className="flex items-center gap-1 text-[10px] mt-1.5 px-2 py-1 bg-surface rounded text-foreground-muted">
              <span className="font-medium">{currentTool.name}</span>
              {currentTool.input && (
                <span className="text-foreground-subtle truncate">{currentTool.input}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
