/**
 * CodeHighlight - Syntax highlighting component using highlight.js.
 * Provides syntax highlighting for code snippets.
 */

import { useMemo } from 'react'
import { cn } from '../utils'
import { getHljsLanguage, type HljsToken, tokenizeLine } from './highlighter'

/** Map file extensions to highlight.js language identifiers */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',

  // Web
  html: 'xml',
  htm: 'xml',
  css: 'css',
  scss: 'scss',
  vue: 'xml',
  svelte: 'xml',

  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',

  // Backend languages
  py: 'python',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  kt: 'kotlin',
  go: 'go',
  rs: 'rust',
  c: 'c',
  cpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',

  // Shell/Config
  sh: 'bash',
  bash: 'bash',

  // Markup/Docs
  md: 'markdown',

  // Other
  sql: 'sql',
  graphql: 'graphql',
  gql: 'graphql'
}

/** Get language from filename */
export function getLanguageFromFileName(fileName: string): string {
  const baseName = fileName.split('/').pop()?.toLowerCase() || ''

  // Handle special files
  if (baseName === 'dockerfile') return 'bash'
  if (baseName === 'makefile') return 'bash'
  if (baseName === '.gitignore') return 'bash'

  // Get extension
  const ext = baseName.includes('.') ? baseName.split('.').pop()?.toLowerCase() : ''

  if (ext && ext in EXTENSION_TO_LANGUAGE) {
    return EXTENSION_TO_LANGUAGE[ext]
  }

  return ''
}

export interface CodeHighlightProps {
  /** The code content to highlight */
  code: string
  /** The filename (used to detect language) */
  fileName?: string
  /** Override language detection */
  language?: string
  /** Show line numbers */
  showLineNumbers?: boolean
  /** Starting line number (default 1) */
  startLineNumber?: number
  /** Lines to highlight (1-indexed) */
  highlightLines?: number[]
  /** Additional CSS classes */
  className?: string
}

/**
 * CodeHighlight - Renders syntax-highlighted code using highlight.js.
 */
export function CodeHighlight({
  code,
  fileName = '',
  language,
  showLineNumbers = false,
  startLineNumber = 1,
  highlightLines = [],
  className
}: CodeHighlightProps): React.JSX.Element {
  const detectedLanguage =
    language || getLanguageFromFileName(fileName) || getHljsLanguage(fileName)

  // Tokenize all lines
  const tokenizedLines = useMemo(() => {
    const lines = code.split('\n')
    return lines.map((line) => tokenizeLine(line, detectedLanguage))
  }, [code, detectedLanguage])

  return (
    <div
      className={cn(
        'code-highlight font-mono text-xs overflow-x-auto bg-code text-code-foreground p-3 rounded',
        showLineNumbers && 'with-line-numbers',
        className
      )}
    >
      <pre className="m-0">
        <code>
          {tokenizedLines.map((tokens, lineIndex) => {
            const lineNumber = startLineNumber + lineIndex
            const isHighlighted = highlightLines.includes(lineNumber)

            return (
              <div
                key={`line-${lineNumber}`}
                className={cn('leading-relaxed', isHighlighted && 'bg-info-subtle')}
                data-line={lineNumber}
              >
                {showLineNumbers && (
                  <span className="inline-block w-8 text-right pr-3 text-foreground-subtle select-none">
                    {lineNumber}
                  </span>
                )}
                <HighlightedLine tokens={tokens} />
              </div>
            )
          })}
        </code>
      </pre>
    </div>
  )
}

/** Render a line with syntax highlighting tokens */
function HighlightedLine({ tokens }: { tokens: HljsToken[] }): React.JSX.Element {
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

/**
 * Highlight code and return HTML string.
 * For use in non-React contexts.
 */
export async function highlightCode(
  code: string,
  options: {
    fileName?: string
    language?: string
  } = {}
): Promise<string> {
  const { fileName = '', language } = options
  const detectedLanguage = language || getLanguageFromFileName(fileName)

  const lines = code.split('\n')
  const htmlLines = lines.map((line) => {
    const tokens = tokenizeLine(line, detectedLanguage)
    return tokens
      .map((token) => {
        const style = token.color ? `color: ${token.color}` : ''
        return `<span style="${style}">${escapeHtml(token.content)}</span>`
      })
      .join('')
  })

  return `<pre class="shiki"><code>${htmlLines.join('\n')}</code></pre>`
}

/** Escape HTML entities */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
