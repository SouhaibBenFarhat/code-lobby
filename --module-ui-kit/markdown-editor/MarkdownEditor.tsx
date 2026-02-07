/**
 * MarkdownEditor - A GitHub-style markdown editor with Write/Preview modes
 *
 * Features:
 * - Write mode: MDEditor with formatting toolbar (bold, italic, code, etc.)
 * - Preview mode: Renders markdown using MarkdownContent component
 * - Dark/light theme support (auto-detects from document)
 * - GitHub-flavored markdown support
 * - Customizable height
 * - Apple design language styling
 */

import MDEditor, { type ContextStore, commands, type ICommand } from '@uiw/react-md-editor'
import { Eye, Pencil } from 'lucide-react'
import * as React from 'react'
import { MarkdownContent } from '../markdown-content'
import { cn } from '../utils'

// Formatting commands only (no fullscreen, no preview/edit toggles)
const formattingCommands = [
  commands.bold,
  commands.italic,
  commands.strikethrough,
  commands.hr,
  commands.divider,
  commands.link,
  commands.quote,
  commands.code,
  commands.codeBlock,
  commands.divider,
  commands.unorderedListCommand,
  commands.orderedListCommand,
  commands.checkedListCommand
]

/** Active mode in the editor */
export type EditorMode = 'write' | 'preview'

// For backwards compatibility
export type EditorTab = EditorMode

export interface MarkdownEditorProps {
  /** Current value of the editor */
  value: string
  /** Callback when value changes */
  onChange: (value: string) => void
  /** Placeholder text when editor is empty */
  placeholder?: string
  /** Height of the editor/preview area (default: 200) */
  height?: number
  /** Whether the editor is disabled */
  disabled?: boolean
  /** Additional class name for the container */
  className?: string
  /** ID for the textarea element */
  id?: string
  /** Test ID for testing */
  'data-testid'?: string
  /** Default mode (default: 'write') */
  defaultTab?: EditorMode
  /** Callback when mode changes */
  onTabChange?: (mode: EditorMode) => void
}

/**
 * MarkdownEditor component - GitHub-style markdown editor with Write/Preview modes
 *
 * @example
 * ```tsx
 * <MarkdownEditor
 *   value={content}
 *   onChange={setContent}
 *   placeholder="Leave a comment..."
 * />
 * ```
 */
function MarkdownEditorComponent({
  value,
  onChange,
  placeholder = 'Write markdown...',
  height = 200,
  disabled = false,
  className,
  id,
  'data-testid': testId,
  defaultTab = 'write',
  onTabChange
}: MarkdownEditorProps): React.JSX.Element {
  // Active mode state
  const [activeMode, setActiveMode] = React.useState<EditorMode>(defaultTab)

  // Detect dark mode from document class
  const [isDark, setIsDark] = React.useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  )

  // Watch for theme changes
  React.useEffect(() => {
    if (typeof document === 'undefined') return

    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Handle mode change
  const handleModeChange = React.useCallback(
    (mode: EditorMode) => {
      setActiveMode(mode)
      onTabChange?.(mode)
    },
    [onTabChange]
  )

  // Handle MDEditor change
  const handleEditorChange = React.useCallback(
    (val?: string, _event?: React.ChangeEvent<HTMLTextAreaElement>, _state?: ContextStore) => {
      onChange(val ?? '')
    },
    [onChange]
  )

  // Custom Write command
  const writeCommand: ICommand = React.useMemo(
    () => ({
      name: 'write',
      keyCommand: 'write',
      buttonProps: {
        'aria-label': 'Write mode',
        'aria-pressed': activeMode === 'write',
        className: cn('custom-toolbar-button', activeMode === 'write' && 'active')
      },
      icon: (
        <span className="flex items-center gap-1">
          <Pencil className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Write</span>
        </span>
      ),
      execute: () => handleModeChange('write')
    }),
    [activeMode, handleModeChange]
  )

  // Custom Preview command
  const previewCommand: ICommand = React.useMemo(
    () => ({
      name: 'preview',
      keyCommand: 'preview',
      buttonProps: {
        'aria-label': 'Preview mode',
        'aria-pressed': activeMode === 'preview',
        className: cn('custom-toolbar-button', activeMode === 'preview' && 'active')
      },
      icon: (
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Preview</span>
        </span>
      ),
      execute: () => handleModeChange('preview')
    }),
    [activeMode, handleModeChange]
  )

  // Combine all toolbar commands
  const toolbarCommands = React.useMemo(
    () => [writeCommand, previewCommand, commands.divider, ...formattingCommands],
    [writeCommand, previewCommand]
  )

  return (
    <div
      className={cn(
        'markdown-editor-wrapper rounded-lg overflow-hidden border border-border bg-background',
        disabled && 'opacity-50',
        className
      )}
      data-color-mode={isDark ? 'dark' : 'light'}
      data-testid={testId}
    >
      {/* Write Mode - MDEditor with toolbar */}
      {activeMode === 'write' && (
        <section
          id="editor-write-panel"
          aria-label="Markdown editor"
          data-testid={testId ? `${testId}-write-panel` : undefined}
        >
          <MDEditor
            value={value}
            onChange={handleEditorChange}
            height={height}
            preview="edit"
            commands={toolbarCommands}
            extraCommands={[]}
            textareaProps={{
              placeholder,
              disabled,
              id
            }}
          />
        </section>
      )}

      {/* Preview Mode - Rendered markdown with toolbar */}
      {activeMode === 'preview' && (
        <div data-testid={testId ? `${testId}-preview-container` : undefined}>
          {/* Custom toolbar for preview mode */}
          <div className="markdown-editor-preview-toolbar flex items-center gap-1 px-2 py-1 border-b border-border bg-surface">
            <button
              type="button"
              onClick={() => handleModeChange('write')}
              disabled={disabled}
              className={cn(
                'custom-toolbar-button flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              aria-label="Write mode"
              data-testid={testId ? `${testId}-write-btn` : undefined}
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Write</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('preview')}
              disabled={disabled}
              className={cn(
                'custom-toolbar-button flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                'text-foreground bg-info-subtle'
              )}
              aria-label="Preview mode"
              aria-pressed="true"
              data-testid={testId ? `${testId}-preview-btn` : undefined}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
          {/* Preview content */}
          <section
            id="editor-preview-panel"
            aria-label="Markdown preview"
            className="px-3 py-2 overflow-auto text-sm leading-relaxed"
            style={{ minHeight: height }}
            data-testid={testId ? `${testId}-preview` : undefined}
          >
            {value.trim() ? (
              <MarkdownContent content={value} />
            ) : (
              <p className="text-muted-foreground italic">Nothing to preview</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

// Export with display name for debugging
export const MarkdownEditor: React.FC<MarkdownEditorProps> & { displayName: string } =
  Object.assign(MarkdownEditorComponent, { displayName: 'MarkdownEditor' })
