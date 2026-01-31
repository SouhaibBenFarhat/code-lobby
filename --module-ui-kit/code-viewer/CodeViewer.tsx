/**
 * CodeViewer - Full-featured code viewer component with syntax highlighting.
 *
 * Similar to CodeHighlight but optimized for viewing complete files:
 * - Scrollable container
 * - Click to select lines
 * - Line highlighting for changed lines
 * - Go-to-line support
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { getLanguageFromFileName } from '../code-highlight/CodeHighlight'
import { getHljsLanguage, type HljsToken, tokenizeLine } from '../code-highlight/highlighter'
import { ScrollArea } from '../scroll-area'
import { Skeleton } from '../skeleton'
import { cn } from '../utils'

export interface CodeViewerProps {
  /** The code content to display */
  code: string
  /** Filename (used for language detection) */
  fileName: string
  /** Override language detection */
  language?: string
  /** Lines to highlight (1-indexed) - for showing changed lines */
  highlightLines?: number[]
  /** Line highlight color type */
  highlightType?: 'addition' | 'deletion' | 'modification' | 'default'
  /** Currently selected line (1-indexed) */
  selectedLine?: number
  /** Called when a line is clicked */
  onLineClick?: (lineNumber: number) => void
  /** Initial line to scroll to (1-indexed) */
  initialLine?: number
  /** Whether the content is loading */
  isLoading?: boolean
  /** Error message to display */
  error?: string
  /** Additional CSS classes for the container */
  className?: string
}

const LINE_HEIGHT = 20 // px - matches leading-relaxed at text-xs

export function CodeViewer({
  code,
  fileName,
  language,
  highlightLines = [],
  highlightType = 'default',
  selectedLine,
  onLineClick,
  initialLine,
  isLoading = false,
  error,
  className
}: CodeViewerProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)
  const detectedLanguage =
    language || getLanguageFromFileName(fileName) || getHljsLanguage(fileName)

  // Tokenize all lines
  const tokenizedLines = useMemo(() => {
    if (!code) return []
    const lines = code.split('\n')
    return lines.map((line) => tokenizeLine(line, detectedLanguage))
  }, [code, detectedLanguage])

  // Create a Set for faster lookup
  const highlightSet = useMemo(() => new Set(highlightLines), [highlightLines])

  // Scroll to initial line on mount or when initialLine changes
  useEffect(() => {
    if (initialLine && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        const targetPosition = (initialLine - 1) * LINE_HEIGHT
        // Center the line in the viewport
        const viewportHeight = scrollContainer.clientHeight
        const scrollPosition = Math.max(0, targetPosition - viewportHeight / 2 + LINE_HEIGHT / 2)
        scrollContainer.scrollTo({ top: scrollPosition, behavior: 'smooth' })
      }
    }
  }, [initialLine])

  const handleLineClick = useCallback(
    (lineNumber: number) => {
      onLineClick?.(lineNumber)
    },
    [onLineClick]
  )

  // Get highlight background class based on type
  const getHighlightClass = useCallback(
    (lineNumber: number): string => {
      if (!highlightSet.has(lineNumber)) return ''
      switch (highlightType) {
        case 'addition':
          return 'bg-success/20'
        case 'deletion':
          return 'bg-destructive/20'
        case 'modification':
          return 'bg-warning/20'
        default:
          return 'bg-primary/20'
      }
    },
    [highlightSet, highlightType]
  )

  if (isLoading) {
    return (
      <div className={cn('code-viewer h-full bg-[#0d1117]', className)}>
        <div className="font-mono text-xs p-0">
          <table className="w-full border-collapse">
            <tbody>
              {/* Generate skeleton lines that look like code */}
              {Array.from({ length: 25 }).map((_, index) => {
                const lineNumber = index + 1
                // Vary the skeleton widths to look more like real code
                const widths = [
                  '60%',
                  '45%',
                  '75%',
                  '30%',
                  '55%',
                  '80%',
                  '40%',
                  '65%',
                  '50%',
                  '70%',
                  '35%',
                  '85%',
                  '25%',
                  '60%',
                  '45%',
                  '75%',
                  '55%',
                  '40%',
                  '65%',
                  '50%',
                  '70%',
                  '35%',
                  '80%',
                  '45%',
                  '60%'
                ]
                const width = widths[index % widths.length]
                // Some lines appear empty (like blank lines in code)
                const isEmpty = [4, 9, 14, 19, 24].includes(index)

                return (
                  <tr
                    key={`skeleton-${lineNumber}`}
                    className="leading-relaxed"
                    style={{ height: LINE_HEIGHT }}
                  >
                    {/* Line number skeleton */}
                    <td
                      className="text-right pr-4 pl-2 select-none border-r border-border/20 sticky left-0 bg-[#0d1117]"
                      style={{ width: 50, minWidth: 50 }}
                    >
                      <Skeleton className="h-3 w-4 ml-auto bg-muted-foreground/10" />
                    </td>

                    {/* Code content skeleton */}
                    <td className="pl-4 pr-4">
                      {!isEmpty && (
                        <Skeleton className="h-3 bg-muted-foreground/10" style={{ width }} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full bg-[#0d1117] text-destructive',
          className
        )}
      >
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <span className="text-sm font-medium">Failed to load file</span>
          <span className="text-xs text-muted-foreground">{error}</span>
        </div>
      </div>
    )
  }

  if (!code) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-full bg-[#0d1117] text-muted-foreground',
          className
        )}
      >
        <span className="text-sm">No content to display</span>
      </div>
    )
  }

  const lineCount = tokenizedLines.length
  const lineNumberWidth = Math.max(3, String(lineCount).length) * 10 + 16 // Estimate width based on digits

  return (
    <div ref={scrollRef} className={cn('code-viewer h-full bg-[#0d1117]', className)}>
      <ScrollArea className="h-full">
        <div className="font-mono text-xs">
          {/* Sticky header with filename info (optional) */}
          <table className="w-full border-collapse">
            <tbody>
              {tokenizedLines.map((tokens, index) => {
                const lineNumber = index + 1
                const isSelected = selectedLine === lineNumber
                const highlightClass = getHighlightClass(lineNumber)

                return (
                  <tr
                    key={`line-${lineNumber}`}
                    className={cn(
                      'leading-relaxed hover:bg-white/5 transition-colors cursor-pointer',
                      highlightClass,
                      isSelected && 'bg-primary/30 hover:bg-primary/35'
                    )}
                    onClick={() => handleLineClick(lineNumber)}
                    data-line={lineNumber}
                    style={{ height: LINE_HEIGHT }}
                  >
                    {/* Line number */}
                    <td
                      className="text-right pr-4 pl-2 text-muted-foreground/50 select-none border-r border-border/20 sticky left-0 bg-[#0d1117]"
                      style={{ width: lineNumberWidth, minWidth: lineNumberWidth }}
                    >
                      {lineNumber}
                    </td>

                    {/* Code content */}
                    <td className="pl-4 pr-4 whitespace-pre overflow-visible">
                      <HighlightedLine tokens={tokens} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Add some padding at the bottom for better scrolling */}
          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  )
}

/** Render a line with syntax highlighting tokens */
function HighlightedLine({ tokens }: { tokens: HljsToken[] }): React.JSX.Element {
  if (tokens.length === 0) {
    // Empty line - render a space to maintain height
    return <span> </span>
  }

  return (
    <span>
      {tokens.map((token, i) => (
        <span
          key={`${i}-${token.content.slice(0, 10)}`}
          style={{ color: token.color }}
          className={token.fontStyle === 1 ? 'italic' : token.fontStyle === 2 ? 'font-bold' : ''}
        >
          {token.content}
        </span>
      ))}
    </span>
  )
}
