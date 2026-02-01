import { Check, Copy } from 'lucide-react'
import { type JSX, useCallback, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { Button } from '../button'
import { CodeHighlight } from '../code-highlight/CodeHighlight'
import { cn } from '../utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

/** Code block with copy button */
function CodeBlockWithCopy({ code, language }: { code: string; language: string }): JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = code
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [code])

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-muted/80 hover:bg-muted border border-border/50',
          copied && 'opacity-100'
        )}
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy code'}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
      <CodeHighlight
        code={code}
        language={language}
        showLineNumbers={code.split('\n').length > 3}
        className="text-[11px]"
      />
    </div>
  )
}

export function MarkdownContent({ content, className }: MarkdownContentProps): JSX.Element {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Paragraphs
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,

          // Headings
          h1: ({ children }) => (
            <h1 className="text-base font-bold mb-2 mt-3 first:mt-0 border-b border-border pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0 border-b border-border pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold mb-1 mt-2 first:mt-0">{children}</h4>
          ),

          // Code - use CodeBlockWithCopy for blocks, inline styling for inline code
          code: ({ className, children, node, ...props }) => {
            // Check if this is a code block (has language class) or inline code
            const match = /language-(\w+)/.exec(className || '')
            const language = match?.[1]
            const codeString = String(children).replace(/\n$/, '')

            // Check if parent is a <pre> tag (code block vs inline)
            const isCodeBlock = node?.position && language

            if (isCodeBlock && language) {
              // Use CodeBlockWithCopy for code blocks (includes copy button)
              return <CodeBlockWithCopy code={codeString} language={language} />
            }

            // Inline code
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono text-foreground"
                {...props}
              >
                {children}
              </code>
            )
          },

          // Code blocks - pass through since CodeHighlight handles its own container
          pre: ({ children }) => <div className="my-2">{children}</div>,

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                if (href) window.open(href, '_blank')
              }}
            >
              {children}
            </a>
          ),

          // Images - render with click to open full size
          img: ({ src, alt, width, height }) => {
            const isGitHubUserAttachment =
              src?.includes('github.com/user-attachments') || src?.includes('githubusercontent.com')

            // For GitHub authenticated images, show a clickable link instead of trying to load
            if (isGitHubUserAttachment) {
              return (
                <Button
                  variant="unstyled"
                  size="none"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded border border-border cursor-pointer transition-colors my-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (src) window.open(src, '_blank')
                  }}
                  title="Click to view in browser"
                >
                  <span className="text-primary hover:underline">View image in browser</span>
                  <span className="text-muted-foreground">↗</span>
                </Button>
              )
            }

            return (
              <span className="inline-block my-2">
                <img
                  src={src}
                  alt={alt || 'Image - click to open'}
                  width={width}
                  height={height}
                  className="max-w-full h-auto rounded border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  loading="lazy"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (src) window.open(src, '_blank')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (src) window.open(src, '_blank')
                    }
                  }}
                  onError={(e) => {
                    // Hide broken images and show clickable placeholder
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = target.nextElementSibling as HTMLElement
                    if (placeholder) placeholder.style.display = 'inline-flex'
                  }}
                />
                <Button
                  variant="unstyled"
                  size="none"
                  className="hidden items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded border border-border cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (src) window.open(src, '_blank')
                  }}
                >
                  <span className="text-primary hover:underline">View image in browser</span>
                  <span className="text-muted-foreground">↗</span>
                </Button>
                {alt && alt !== 'image' && (
                  <span className="block text-[10px] text-muted-foreground mt-1">{alt}</span>
                )}
              </span>
            )
          },

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-2 space-y-0.5 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-2 space-y-0.5 ml-1">{children}</ol>
          ),
          li: ({ children, className }) => {
            // Handle task list items
            const isTaskList = className?.includes('task-list-item')
            return (
              <li
                className={cn(
                  'leading-relaxed',
                  isTaskList && 'list-none flex items-start gap-1.5'
                )}
              >
                {children}
              </li>
            )
          },

          // Task list checkboxes
          input: ({ type, checked }) => {
            if (type === 'checkbox') {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mt-0.5 rounded border-border"
                />
              )
            }
            return <input type={type} />
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 my-2 text-muted-foreground italic">
              {children}
            </blockquote>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="min-w-full border-collapse text-[11px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,

          // Horizontal rule
          hr: () => <hr className="my-3 border-border" />,

          // Strong/Bold
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,

          // Emphasis/Italic
          em: ({ children }) => <em className="italic">{children}</em>,

          // Strikethrough
          del: ({ children }) => (
            <del className="line-through text-muted-foreground">{children}</del>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
