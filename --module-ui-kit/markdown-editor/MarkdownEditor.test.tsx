/**
 * MarkdownEditor Component Tests
 *
 * Tests the GitHub-style markdown editor with Write/Preview modes
 * - Write mode: MDEditor with formatting toolbar including Write/Preview buttons
 * - Preview mode: Rendered markdown with mode toggle buttons
 */

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

// Mock MDEditor since it has complex DOM interactions
vi.mock('@uiw/react-md-editor', () => ({
  default: ({
    value,
    onChange,
    height,
    preview,
    commands: toolbarCommands,
    textareaProps
  }: {
    value: string
    onChange: (val?: string) => void
    height?: number
    preview?: string
    commands?: Array<{ name: string; execute?: () => void; icon?: React.ReactNode }>
    textareaProps?: {
      placeholder?: string
      disabled?: boolean
      id?: string
    }
  }) => {
    // Find Write and Preview commands
    const writeCmd = toolbarCommands?.find((c) => c.name === 'write')
    const previewCmd = toolbarCommands?.find((c) => c.name === 'preview')

    return (
      <div
        data-testid="mock-md-editor"
        data-height={height}
        data-preview={preview}
        style={{ height }}
      >
        <div data-testid="mock-toolbar">
          {writeCmd && (
            <button type="button" data-testid="mock-write-btn" onClick={() => writeCmd.execute?.()}>
              Write
            </button>
          )}
          {previewCmd && (
            <button
              type="button"
              data-testid="mock-preview-btn"
              onClick={() => previewCmd.execute?.()}
            >
              Preview
            </button>
          )}
          <span>Formatting Toolbar</span>
        </div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={textareaProps?.placeholder}
          disabled={textareaProps?.disabled}
          id={textareaProps?.id}
          data-testid="mock-textarea"
        />
      </div>
    )
  },
  // Mock commands for toolbar customization
  commands: {
    bold: { name: 'bold' },
    italic: { name: 'italic' },
    strikethrough: { name: 'strikethrough' },
    hr: { name: 'hr' },
    divider: { name: 'divider' },
    link: { name: 'link' },
    quote: { name: 'quote' },
    code: { name: 'code' },
    codeBlock: { name: 'codeBlock' },
    unorderedListCommand: { name: 'unorderedListCommand' },
    orderedListCommand: { name: 'orderedListCommand' },
    checkedListCommand: { name: 'checkedListCommand' }
  }
}))

// Mock MarkdownContent for preview
vi.mock('../markdown-content', () => ({
  MarkdownContent: ({ content, className }: { content: string; className?: string }) => (
    <div data-testid="mock-markdown-content" className={className}>
      {content}
    </div>
  )
}))

describe('MarkdownEditor', () => {
  describe('rendering', () => {
    it('should render the editor', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      expect(screen.getByTestId('editor')).toBeInTheDocument()
    })

    it('should render Write and Preview buttons in toolbar', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      expect(screen.getByText('Write')).toBeInTheDocument()
      expect(screen.getByText('Preview')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <MarkdownEditor
          value=""
          onChange={() => {}}
          className="custom-class"
          data-testid="editor"
        />
      )
      expect(screen.getByTestId('editor')).toHaveClass('custom-class')
    })

    it('should have wrapper styling classes', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const wrapper = screen.getByTestId('editor')
      expect(wrapper).toHaveClass('markdown-editor-wrapper')
      expect(wrapper).toHaveClass('rounded-lg')
      expect(wrapper).toHaveClass('border')
    })
  })

  describe('Write mode (default)', () => {
    it('should show MDEditor with toolbar in Write mode by default', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      expect(screen.getByTestId('mock-md-editor')).toBeInTheDocument()
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument()
    })

    it('should display value in MDEditor', () => {
      render(<MarkdownEditor value="# Hello World" onChange={() => {}} data-testid="editor" />)
      const textarea = screen.getByTestId('mock-textarea')
      expect(textarea).toHaveValue('# Hello World')
    })

    it('should display placeholder in textarea', () => {
      render(
        <MarkdownEditor
          value=""
          onChange={() => {}}
          placeholder="Enter markdown..."
          data-testid="editor"
        />
      )
      const textarea = screen.getByTestId('mock-textarea')
      expect(textarea).toHaveAttribute('placeholder', 'Enter markdown...')
    })

    it('should display default placeholder', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const textarea = screen.getByTestId('mock-textarea')
      expect(textarea).toHaveAttribute('placeholder', 'Write markdown...')
    })

    it('should call onChange when typing', async () => {
      const handleChange = vi.fn()
      render(<MarkdownEditor value="" onChange={handleChange} data-testid="editor" />)

      const textarea = screen.getByTestId('mock-textarea')
      fireEvent.change(textarea, { target: { value: 'New content' } })

      expect(handleChange).toHaveBeenCalledWith('New content')
    })

    it('should pass id to textarea', () => {
      render(<MarkdownEditor value="" onChange={() => {}} id="my-editor" data-testid="editor" />)
      const textarea = screen.getByTestId('mock-textarea')
      expect(textarea).toHaveAttribute('id', 'my-editor')
    })

    it('should pass height to MDEditor', () => {
      render(<MarkdownEditor value="" onChange={() => {}} height={300} data-testid="editor" />)
      const mdEditor = screen.getByTestId('mock-md-editor')
      expect(mdEditor).toHaveAttribute('data-height', '300')
    })

    it('should use edit preview mode for MDEditor', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const mdEditor = screen.getByTestId('mock-md-editor')
      expect(mdEditor).toHaveAttribute('data-preview', 'edit')
    })
  })

  describe('Preview mode', () => {
    it('should switch to Preview mode when clicking Preview button', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="# Hello" onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      expect(screen.getByTestId('editor-preview')).toBeInTheDocument()
      expect(screen.queryByTestId('mock-md-editor')).not.toBeInTheDocument()
    })

    it('should show rendered markdown in Preview mode', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="# Hello World" onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      expect(screen.getByTestId('editor-preview')).toBeInTheDocument()
      expect(screen.getByTestId('mock-markdown-content')).toHaveTextContent('# Hello World')
    })

    it('should show "Nothing to preview" when content is empty', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      expect(screen.getByText('Nothing to preview')).toBeInTheDocument()
    })

    it('should show "Nothing to preview" when content is only whitespace', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="   " onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      expect(screen.getByText('Nothing to preview')).toBeInTheDocument()
    })

    it('should hide MDEditor when in Preview mode', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      expect(screen.queryByTestId('mock-md-editor')).not.toBeInTheDocument()
      expect(screen.queryByTestId('mock-toolbar')).not.toBeInTheDocument()
    })

    it('should show Write/Preview buttons in preview mode toolbar', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="# Hello" onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      expect(screen.getByTestId('editor-write-btn')).toBeInTheDocument()
      expect(screen.getByTestId('editor-preview-btn')).toBeInTheDocument()
    })
  })

  describe('mode switching', () => {
    it('should switch back to Write mode with toolbar', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="Hello" onChange={() => {}} data-testid="editor" />)

      // Switch to Preview
      await user.click(screen.getByTestId('mock-preview-btn'))
      expect(screen.queryByTestId('mock-md-editor')).not.toBeInTheDocument()

      // Switch back to Write
      await user.click(screen.getByTestId('editor-write-btn'))
      expect(screen.getByTestId('mock-md-editor')).toBeInTheDocument()
      expect(screen.getByTestId('mock-toolbar')).toBeInTheDocument()
    })

    it('should call onTabChange when switching modes', async () => {
      const user = userEvent.setup()
      const handleTabChange = vi.fn()
      render(
        <MarkdownEditor
          value=""
          onChange={() => {}}
          onTabChange={handleTabChange}
          data-testid="editor"
        />
      )

      await user.click(screen.getByTestId('mock-preview-btn'))
      expect(handleTabChange).toHaveBeenCalledWith('preview')

      await user.click(screen.getByTestId('editor-write-btn'))
      expect(handleTabChange).toHaveBeenCalledWith('write')
    })

    it('should preserve content when switching between modes', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="# My Content" onChange={() => {}} data-testid="editor" />)

      // Verify initial content
      expect(screen.getByTestId('mock-textarea')).toHaveValue('# My Content')

      // Switch to Preview
      await user.click(screen.getByTestId('mock-preview-btn'))
      expect(screen.getByTestId('mock-markdown-content')).toHaveTextContent('# My Content')

      // Switch back to Write
      await user.click(screen.getByTestId('editor-write-btn'))
      expect(screen.getByTestId('mock-textarea')).toHaveValue('# My Content')
    })
  })

  describe('defaultTab prop', () => {
    it('should start with Write mode by default', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      expect(screen.getByTestId('mock-md-editor')).toBeInTheDocument()
    })

    it('should start with Preview mode when defaultTab is preview', () => {
      render(
        <MarkdownEditor
          value="# Hello"
          onChange={() => {}}
          defaultTab="preview"
          data-testid="editor"
        />
      )
      expect(screen.getByTestId('editor-preview')).toBeInTheDocument()
      expect(screen.queryByTestId('mock-md-editor')).not.toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should disable textarea when disabled', () => {
      render(<MarkdownEditor value="" onChange={() => {}} disabled data-testid="editor" />)
      const textarea = screen.getByTestId('mock-textarea')
      expect(textarea).toBeDisabled()
    })

    it('should apply disabled styling to wrapper', () => {
      render(<MarkdownEditor value="" onChange={() => {}} disabled data-testid="editor" />)
      expect(screen.getByTestId('editor')).toHaveClass('opacity-50')
    })
  })

  describe('height prop', () => {
    it('should apply default height to MDEditor', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const mdEditor = screen.getByTestId('mock-md-editor')
      expect(mdEditor).toHaveAttribute('data-height', '200')
    })

    it('should apply custom height to MDEditor', () => {
      render(<MarkdownEditor value="" onChange={() => {}} height={400} data-testid="editor" />)
      const mdEditor = screen.getByTestId('mock-md-editor')
      expect(mdEditor).toHaveAttribute('data-height', '400')
    })

    it('should apply height to preview panel', async () => {
      const user = userEvent.setup()
      render(
        <MarkdownEditor value="# Hello" onChange={() => {}} height={250} data-testid="editor" />
      )

      await user.click(screen.getByTestId('mock-preview-btn'))

      const preview = screen.getByTestId('editor-preview')
      expect(preview).toHaveStyle({ minHeight: '250px' })
    })
  })

  describe('theme detection', () => {
    it('should set light color mode when document is not dark', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const wrapper = screen.getByTestId('editor')
      expect(wrapper).toHaveAttribute('data-color-mode', 'light')
    })

    it('should set dark color mode when document has dark class', () => {
      document.documentElement.classList.add('dark')
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const wrapper = screen.getByTestId('editor')
      expect(wrapper).toHaveAttribute('data-color-mode', 'dark')
      document.documentElement.classList.remove('dark')
    })
  })

  describe('accessibility', () => {
    it('should have proper section structure for Write panel', () => {
      render(<MarkdownEditor value="" onChange={() => {}} data-testid="editor" />)
      const panel = screen.getByTestId('editor-write-panel')
      expect(panel.tagName).toBe('SECTION')
      expect(panel).toHaveAttribute('aria-label', 'Markdown editor')
    })

    it('should have proper section structure for Preview panel', async () => {
      const user = userEvent.setup()
      render(<MarkdownEditor value="Hello" onChange={() => {}} data-testid="editor" />)

      await user.click(screen.getByTestId('mock-preview-btn'))

      const panel = screen.getByTestId('editor-preview')
      expect(panel.tagName).toBe('SECTION')
      expect(panel).toHaveAttribute('aria-label', 'Markdown preview')
    })

    it('should support keyboard input in editor', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      render(<MarkdownEditor value="" onChange={handleChange} data-testid="editor" />)

      const textarea = screen.getByTestId('mock-textarea')
      await user.type(textarea, 'Hello')

      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('display name', () => {
    it('should have correct display name', () => {
      expect(MarkdownEditor.displayName).toBe('MarkdownEditor')
    })
  })

  describe('controlled component', () => {
    it('should update textarea value when prop changes', () => {
      const { rerender } = render(
        <MarkdownEditor value="Initial" onChange={() => {}} data-testid="editor" />
      )
      expect(screen.getByTestId('mock-textarea')).toHaveValue('Initial')

      rerender(<MarkdownEditor value="Updated" onChange={() => {}} data-testid="editor" />)
      expect(screen.getByTestId('mock-textarea')).toHaveValue('Updated')
    })

    it('should update preview when value prop changes', async () => {
      const user = userEvent.setup()
      const { rerender } = render(
        <MarkdownEditor value="Initial content" onChange={() => {}} data-testid="editor" />
      )

      await user.click(screen.getByTestId('mock-preview-btn'))
      expect(screen.getByTestId('mock-markdown-content')).toHaveTextContent('Initial content')

      rerender(<MarkdownEditor value="Updated content" onChange={() => {}} data-testid="editor" />)
      expect(screen.getByTestId('mock-markdown-content')).toHaveTextContent('Updated content')
    })
  })
})
