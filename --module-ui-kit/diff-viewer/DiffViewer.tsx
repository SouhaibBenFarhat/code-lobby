/**
 * DiffViewer - Displays unified diff with syntax highlighting.
 *
 * A reusable component for rendering code diffs with:
 * - Syntax highlighting (via highlight.js)
 * - Line numbers (old/new)
 * - Addition/deletion/context styling
 * - Hunk header support
 * - Inline comments support
 */

import React, { useEffect, useMemo, useState } from 'react'
import { getHljsLanguage, type HljsToken, tokenizeLine } from '../code-highlight/highlighter'
import { cn } from '../utils'

/** Diff line type for unified diff format */
export interface DiffLine {
  type: 'addition' | 'deletion' | 'context' | 'header' | 'info'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

/** Comment to display inline in the diff */
export interface DiffComment {
  /** Unique identifier for the comment */
  id: string
  /** Line number (new file line number) where comment appears */
  line: number
  /** Comment content - can be any React node or use renderComment */
  content?: React.ReactNode
}

export interface DiffViewerProps {
  /** The unified diff patch string */
  patch: string | null
  /** Filename (used for language detection) */
  fileName: string
  /** Optional className for the container */
  className?: string
  /** Inline comments to display below specific lines */
  comments?: DiffComment[]
  /** Custom render function for comments (receives comment and returns ReactNode) */
  renderComment?: (comment: DiffComment) => React.ReactNode
  /** Line number to focus on - only show lines around this line */
  focusLine?: number
  /** Number of context lines to show before and after focusLine (default: 3) */
  contextLines?: number
}

/** Parse unified diff patch into structured lines */
function parseDiffLines(patch: string | null): DiffLine[] {
  if (!patch) return []

  const lines = patch.split('\n')
  const result: DiffLine[] = []
  let oldLineNum = 0
  let newLineNum = 0

  for (const line of lines) {
    if (line.startsWith('@@')) {
      // Parse hunk header like @@ -1,5 +1,6 @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (match) {
        oldLineNum = Number.parseInt(match[1], 10)
        newLineNum = Number.parseInt(match[2], 10)
      }
      result.push({ type: 'header', content: line })
    } else if (line.startsWith('+')) {
      result.push({ type: 'addition', content: line.slice(1), newLineNum })
      newLineNum++
    } else if (line.startsWith('-')) {
      result.push({ type: 'deletion', content: line.slice(1), oldLineNum })
      oldLineNum++
    } else if (line.startsWith(' ')) {
      result.push({ type: 'context', content: line.slice(1), oldLineNum, newLineNum })
      oldLineNum++
      newLineNum++
    } else if (line.startsWith('\\')) {
      // "\ No newline at end of file"
      result.push({ type: 'info', content: line })
    }
  }

  return result
}

/** Token cache to avoid re-highlighting */
const tokenCache = new Map<string, Map<number, HljsToken[]>>()

/** Line with original index for token mapping */
interface IndexedLine extends DiffLine {
  originalIndex: number
}

export function DiffViewer({
  patch,
  fileName,
  className,
  comments = [],
  renderComment,
  focusLine,
  contextLines = 3
}: DiffViewerProps): React.JSX.Element {
  const allLines = useMemo(() => parseDiffLines(patch), [patch])

  // Filter lines to show only around focusLine if specified, preserving original indices
  const lines = useMemo((): IndexedLine[] => {
    const indexedLines = allLines.map((line, idx) => ({ ...line, originalIndex: idx }))

    if (focusLine === undefined) return indexedLines

    // Find lines that are within contextLines of the focusLine
    const filteredLines: IndexedLine[] = []
    let lastHeaderIndex = -1

    for (let i = 0; i < indexedLines.length; i++) {
      const line = indexedLines[i]

      // Track headers
      if (line.type === 'header') {
        lastHeaderIndex = i
        continue
      }

      // Check if this line is within range of focusLine
      const lineNum = line.newLineNum ?? line.oldLineNum
      if (lineNum !== undefined) {
        const distance = Math.abs(lineNum - focusLine)
        if (distance <= contextLines) {
          // Include the header if we haven't added it yet and there's a recent one
          if (
            lastHeaderIndex !== -1 &&
            !filteredLines.some((l) => l.originalIndex === lastHeaderIndex)
          ) {
            filteredLines.push(indexedLines[lastHeaderIndex])
          }
          filteredLines.push(line)
        }
      }

      // Include info lines (like "No newline at end of file") if they follow included content
      if (line.type === 'info' && filteredLines.length > 0) {
        const lastIncluded = filteredLines[filteredLines.length - 1]
        if (lastIncluded && lastIncluded.type !== 'header' && lastIncluded.type !== 'info') {
          filteredLines.push(line)
        }
      }
    }

    return filteredLines
  }, [allLines, focusLine, contextLines])
  const [tokenizedLines, setTokenizedLines] = useState<Map<number, HljsToken[]>>(new Map())
  const [highlightStatus, setHighlightStatus] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle'
  )

  const language = useMemo(() => getHljsLanguage(fileName), [fileName])

  // Build a map of line numbers to comments
  const commentsByLine = useMemo(() => {
    const map = new Map<number, DiffComment[]>()
    for (const comment of comments) {
      const existing = map.get(comment.line) || []
      existing.push(comment)
      map.set(comment.line, existing)
    }
    return map
  }, [comments])

  // Extract code content for highlighting (excluding headers and info lines)
  // Use allLines to ensure all tokens are available for filtered views
  const codeLines = useMemo(() => {
    return allLines
      .map((line, index) => ({
        index,
        content: line.content,
        type: line.type
      }))
      .filter((l) => l.type !== 'header' && l.type !== 'info')
  }, [allLines])

  useEffect(() => {
    if (!patch || codeLines.length === 0) {
      setHighlightStatus('idle')
      return
    }

    // Check cache first
    const cacheKey = `${fileName}:${patch.slice(0, 100)}`
    const cachedTokens = tokenCache.get(cacheKey)
    if (cachedTokens) {
      setTokenizedLines(cachedTokens)
      setHighlightStatus('done')
      return
    }

    setHighlightStatus('loading')

    // Tokenize synchronously (highlight.js is sync)
    try {
      const lineTokenMap = new Map<number, HljsToken[]>()

      for (const codeLine of codeLines) {
        const tokens = tokenizeLine(codeLine.content, language)
        lineTokenMap.set(codeLine.index, tokens)
      }

      // Cache the result
      tokenCache.set(cacheKey, lineTokenMap)

      // Limit cache size
      if (tokenCache.size > 50) {
        const firstKey = tokenCache.keys().next().value
        if (firstKey) tokenCache.delete(firstKey)
      }

      setTokenizedLines(lineTokenMap)
      setHighlightStatus('done')
    } catch (err) {
      console.error('[DiffViewer] Highlighting error:', err)
      setHighlightStatus('error')
    }
  }, [patch, fileName, language, codeLines])

  if (!patch) {
    return (
      <div className="p-3 text-xs text-muted-foreground italic bg-surface">
        Binary file or diff too large to display
      </div>
    )
  }

  return (
    <div
      className={cn(
        'overflow-x-auto bg-background dark:bg-code text-code-foreground rounded-b-md',
        className
      )}
    >
      <table className="w-full text-[11px] font-mono border-collapse">
        <tbody>
          {lines.map((line) => {
            const lineKey = `${fileName}-${line.type}-${line.oldLineNum ?? 'x'}-${line.newLineNum ?? 'x'}-${line.originalIndex}`

            const bgClass =
              line.type === 'addition'
                ? // Use themed diff tint tokens (defined in globals.css for light + dark)
                  'bg-[color:var(--diff-addition-bg)]'
                : line.type === 'deletion'
                  ? 'bg-[color:var(--diff-deletion-bg)]'
                  : line.type === 'header'
                    ? 'bg-info-subtle'
                    : ''

            const textClass =
              line.type === 'header'
                ? 'text-primary font-semibold'
                : line.type === 'info'
                  ? 'text-muted-foreground italic'
                  : ''

            const prefix =
              line.type === 'addition'
                ? '+'
                : line.type === 'deletion'
                  ? '-'
                  : line.type === 'context'
                    ? ' '
                    : ''

            const prefixClass =
              line.type === 'addition'
                ? 'text-success'
                : line.type === 'deletion'
                  ? 'text-destructive'
                  : 'text-muted-foreground'

            // Use originalIndex for token lookup to work with filtered views
            const tokens = tokenizedLines.get(line.originalIndex)

            // Get comments for this line (use newLineNum for additions/context, skip for deletions)
            const lineComments =
              line.newLineNum !== undefined ? commentsByLine.get(line.newLineNum) || [] : []

            // For new files (all additions), only show the new line number
            const lineNum = line.newLineNum ?? line.oldLineNum ?? ''

            return (
              <React.Fragment key={lineKey}>
                <tr className={cn(bgClass, 'hover:bg-interactive-hover h-5')}>
                  {/* Single line number column */}
                  <td className="w-12 min-w-12 text-right pr-2 text-foreground-subtle select-none border-r border-border-subtle align-top">
                    {lineNum}
                  </td>
                  {/* Prefix (+/-/space) */}
                  <td className={cn('w-4 min-w-4 text-center select-none align-top', prefixClass)}>
                    {prefix}
                  </td>
                  {/* Content with syntax highlighting */}
                  <td className={cn('pl-2 pr-4 whitespace-pre align-top', textClass)}>
                    {line.type === 'header' || line.type === 'info' ? (
                      line.content
                    ) : tokens && tokens.length > 0 ? (
                      <HighlightedLine tokens={tokens} lineType={line.type} />
                    ) : highlightStatus === 'loading' ? (
                      <span className="text-code-foreground">{line.content || ' '}</span>
                    ) : (
                      <span className="text-code-foreground">{line.content || ' '}</span>
                    )}
                  </td>
                </tr>
                {/* Inline comments */}
                {lineComments.map((comment) => (
                  <tr key={`comment-${comment.id}`} className="bg-transparent">
                    <td colSpan={3} className="p-0">
                      {renderComment ? (
                        renderComment(comment)
                      ) : (
                        <DefaultCommentDisplay comment={comment} />
                      )}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Default comment display when no renderComment is provided */
function DefaultCommentDisplay({ comment }: { comment: DiffComment }): React.JSX.Element {
  return (
    <div className="mx-3 my-2 bg-info-subtle border border-info-border rounded-lg p-3 font-sans text-sm">
      {comment.content || (
        <span className="text-muted-foreground italic">Comment on line {comment.line}</span>
      )}
    </div>
  )
}

/** Render a line with syntax highlighting tokens */
function HighlightedLine({
  tokens,
  lineType
}: {
  tokens: HljsToken[]
  lineType: DiffLine['type']
}): React.JSX.Element {
  const opacityClass = lineType === 'addition' || lineType === 'deletion' ? 'brightness-110' : ''

  return (
    <span className={opacityClass}>
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
