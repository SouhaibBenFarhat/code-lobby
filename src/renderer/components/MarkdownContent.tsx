import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownContentProps {
  content: string
  className?: string
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
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

          // Code
          code: ({ className, children, ...props }) => {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-muted text-[11px] font-mono text-foreground"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <code className={cn('text-[11px]', className)} {...props}>
                {children}
              </code>
            )
          },

          // Code blocks
          pre: ({ children }) => (
            <pre className="my-2 p-3 rounded-lg bg-muted/80 overflow-x-auto text-[11px] leading-relaxed border border-border">
              {children}
            </pre>
          ),

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
                <span
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded border border-border cursor-pointer transition-colors my-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (src) window.open(src, '_blank')
                  }}
                  title="Click to view in browser"
                >
                  <span className="text-primary hover:underline">View image in browser</span>
                  <span className="text-muted-foreground">↗</span>
                </span>
              )
            }

            return (
              <span className="inline-block my-2">
                <img
                  src={src}
                  alt={alt || 'Image'}
                  width={width}
                  height={height}
                  className="max-w-full h-auto rounded border border-border cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ maxHeight: '300px', objectFit: 'contain' }}
                  loading="lazy"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (src) window.open(src, '_blank')
                  }}
                  onError={(e) => {
                    // Hide broken images and show clickable placeholder
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = target.nextElementSibling as HTMLElement
                    if (placeholder) placeholder.style.display = 'inline-flex'
                  }}
                />
                <span
                  className="hidden items-center gap-1 px-2 py-1 text-xs bg-muted/50 hover:bg-muted rounded border border-border cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (src) window.open(src, '_blank')
                  }}
                >
                  <span className="text-primary hover:underline">View image in browser</span>
                  <span className="text-muted-foreground">↗</span>
                </span>
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
