/**
 * DiffViewer - Displays code diff with syntax highlighting.
 */

import { cn } from '@ui-kit'
import { useMemo } from 'react'
import type { DiffLine } from '../types'

export interface DiffViewerProps {
  patch: string | null
  fileName: string
}

/** Parse diff patch into structured lines */
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

export function DiffViewer({ patch, fileName }: DiffViewerProps): React.JSX.Element {
  const lines = useMemo(() => parseDiffLines(patch), [patch])

  if (!patch) {
    return (
      <div className="p-3 text-xs text-muted-foreground italic bg-muted/30">
        Binary file or diff too large to display
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-[#0d1117] dark:bg-[#0d1117] rounded-b-md">
      <table className="w-full text-[11px] font-mono leading-relaxed">
        <tbody>
          {lines.map((line) => {
            // Create a stable unique key from line properties
            const lineKey = `${fileName}-${line.type}-${line.oldLineNum ?? 'x'}-${line.newLineNum ?? 'x'}-${line.content.slice(0, 20)}`

            const bgClass =
              line.type === 'addition'
                ? 'bg-success/15'
                : line.type === 'deletion'
                  ? 'bg-destructive/15'
                  : line.type === 'header'
                    ? 'bg-primary/10'
                    : ''

            const textClass =
              line.type === 'addition'
                ? 'text-success'
                : line.type === 'deletion'
                  ? 'text-destructive'
                  : line.type === 'header'
                    ? 'text-primary font-semibold'
                    : line.type === 'info'
                      ? 'text-muted-foreground italic'
                      : 'text-foreground/80'

            const prefix =
              line.type === 'addition'
                ? '+'
                : line.type === 'deletion'
                  ? '-'
                  : line.type === 'context'
                    ? ' '
                    : ''

            return (
              <tr key={lineKey} className={cn(bgClass, 'hover:bg-muted/20')}>
                {/* Line numbers */}
                <td className="w-10 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30 sticky left-0 bg-inherit">
                  {line.oldLineNum || ''}
                </td>
                <td className="w-10 text-right pr-2 text-muted-foreground/50 select-none border-r border-border/30">
                  {line.newLineNum || ''}
                </td>
                {/* Prefix (+/-/space) */}
                <td className={cn('w-4 text-center select-none', textClass)}>{prefix}</td>
                {/* Content */}
                <td className={cn('pl-2 pr-4 whitespace-pre', textClass)}>
                  {line.content || (line.type === 'header' ? line.content : ' ')}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
