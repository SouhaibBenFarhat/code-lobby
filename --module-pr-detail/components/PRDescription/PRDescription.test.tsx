/**
 * PRDescription Component Tests
 *
 * Tests for PR description display, collapsing/expanding, and inline editing.
 */

import { fireEvent, render, screen, waitFor } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRDescription } from './PRDescription'

// Mock the mutation hook
const mockMutateAsync = vi.fn()
vi.mock('@data', () => ({
  useUpdatePRBody: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false
  })
}))

// Mock MarkdownEditor
vi.mock('@ui-kit', async () => {
  const actual = await vi.importActual<typeof import('@ui-kit')>('@ui-kit')
  return {
    ...actual,
    MarkdownEditor: ({
      value,
      onChange,
      'data-testid': testId
    }: {
      value: string
      onChange: (value: string) => void
      'data-testid'?: string
    }) => <textarea value={value} onChange={(e) => onChange(e.target.value)} data-testid={testId} />
  }
})

describe('PRDescription', () => {
  const defaultProps = {
    body: 'This is the PR description body text.',
    prNodeId: 'PR_kwDOTest123',
    repoFullName: 'test-org/repo',
    prNumber: 1
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockMutateAsync.mockResolvedValue({ success: true })
    // defineProperty (not Object.assign) so it works under happy-dom, where
    // navigator.clipboard is a getter-only property.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true
    })
  })

  describe('rendering', () => {
    it('should render description header', () => {
      render(<PRDescription {...defaultProps} />)

      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('should render description body', () => {
      render(<PRDescription {...defaultProps} />)

      expect(screen.getByText('This is the PR description body text.')).toBeInTheDocument()
    })

    it('should render file icon', () => {
      const { container } = render(<PRDescription {...defaultProps} />)

      const fileIcon = container.querySelector('.lucide-file-text')
      expect(fileIcon).toBeInTheDocument()
    })

    it('should show "No description provided" when body is null', () => {
      render(<PRDescription {...defaultProps} body={null} />)

      expect(screen.getByText('No description provided')).toBeInTheDocument()
    })

    it('should show Edit button when body is null', () => {
      render(<PRDescription {...defaultProps} body={null} />)

      // The Edit (pencil) button should be visible to add a description
      expect(screen.getByTitle('Edit description')).toBeInTheDocument()
    })
  })

  describe('collapse/expand', () => {
    it('should be expanded by default', () => {
      render(<PRDescription {...defaultProps} />)

      expect(screen.getByText('This is the PR description body text.')).toBeInTheDocument()
    })

    it('should collapse when header is clicked', async () => {
      render(<PRDescription {...defaultProps} />)

      // Click on the header row to collapse
      const header = screen.getByText('Description').closest('div[class*="cursor-pointer"]')
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.queryByText('This is the PR description body text.')).not.toBeInTheDocument()
      })
    })

    it('should expand when header is clicked again', async () => {
      render(<PRDescription {...defaultProps} />)

      const header = screen.getByText('Description').closest('div[class*="cursor-pointer"]')

      // Collapse
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.queryByText('This is the PR description body text.')).not.toBeInTheDocument()
      })

      // Expand
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.getByText('This is the PR description body text.')).toBeInTheDocument()
      })
    })

    it('should show chevron down when expanded', () => {
      const { container } = render(<PRDescription {...defaultProps} />)

      const chevronDown = container.querySelector('.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })

    it('should show chevron right when collapsed', async () => {
      const { container } = render(<PRDescription {...defaultProps} />)

      const header = screen.getByText('Description').closest('div[class*="cursor-pointer"]')
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        const chevronRight = container.querySelector('.lucide-chevron-right')
        expect(chevronRight).toBeInTheDocument()
      })
    })
  })

  describe('copy functionality', () => {
    it('should copy description when copy button is clicked', async () => {
      render(<PRDescription {...defaultProps} />)

      const copyIcon = document.querySelector('.lucide-copy')
      const copyButton = copyIcon?.closest('button')

      if (copyButton) {
        fireEvent.click(copyButton)

        await waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            'This is the PR description body text.'
          )
        })
      }
    })

    it('should show check icon after successful copy', async () => {
      render(<PRDescription {...defaultProps} />)

      const copyIcon = document.querySelector('.lucide-copy')
      const copyButton = copyIcon?.closest('button')

      if (copyButton) {
        fireEvent.click(copyButton)

        await waitFor(() => {
          const checkIcon = document.querySelector('.lucide-check')
          expect(checkIcon).toBeInTheDocument()
        })
      }
    })

    it('should not show copy button when body is null', () => {
      render(<PRDescription {...defaultProps} body={null} />)

      const copyIcon = document.querySelector('.lucide-copy')
      expect(copyIcon).not.toBeInTheDocument()
    })
  })

  describe('inline editing', () => {
    it('should show edit button in header', () => {
      render(<PRDescription {...defaultProps} />)

      const editIcon = document.querySelector('.lucide-pencil')
      expect(editIcon).toBeInTheDocument()
    })

    it('should enter edit mode when edit button is clicked', async () => {
      render(<PRDescription {...defaultProps} />)

      const editIcon = document.querySelector('.lucide-pencil')
      const editButton = editIcon?.closest('button')

      if (editButton) {
        fireEvent.click(editButton)

        await waitFor(() => {
          expect(screen.getByTestId('description-editor')).toBeInTheDocument()
        })
      }
    })

    it('should show Save and Cancel buttons in edit mode', async () => {
      render(<PRDescription {...defaultProps} />)

      const editIcon = document.querySelector('.lucide-pencil')
      const editButton = editIcon?.closest('button')

      if (editButton) {
        fireEvent.click(editButton)

        await waitFor(() => {
          expect(screen.getByText('Save')).toBeInTheDocument()
          expect(screen.getByText('Cancel')).toBeInTheDocument()
        })
      }
    })

    it('should exit edit mode when Cancel is clicked', async () => {
      render(<PRDescription {...defaultProps} />)

      // Enter edit mode
      const editIcon = document.querySelector('.lucide-pencil')
      const editButton = editIcon?.closest('button')
      if (editButton) {
        fireEvent.click(editButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('description-editor')).toBeInTheDocument()
      })

      // Click Cancel
      fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByTestId('description-editor')).not.toBeInTheDocument()
      })
    })

    it('should call mutation when Save is clicked', async () => {
      render(<PRDescription {...defaultProps} />)

      // Enter edit mode
      const editIcon = document.querySelector('.lucide-pencil')
      const editButton = editIcon?.closest('button')
      if (editButton) {
        fireEvent.click(editButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('description-editor')).toBeInTheDocument()
      })

      // Modify text
      const editor = screen.getByTestId('description-editor')
      fireEvent.change(editor, { target: { value: 'Updated description' } })

      // Click Save
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          prNodeId: 'PR_kwDOTest123',
          body: 'Updated description',
          repoFullName: 'test-org/repo',
          prNumber: 1
        })
      })
    })

    it('should exit edit mode after successful save', async () => {
      render(<PRDescription {...defaultProps} />)

      // Enter edit mode
      const editIcon = document.querySelector('.lucide-pencil')
      const editButton = editIcon?.closest('button')
      if (editButton) {
        fireEvent.click(editButton)
      }

      await waitFor(() => {
        expect(screen.getByTestId('description-editor')).toBeInTheDocument()
      })

      // Click Save
      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByTestId('description-editor')).not.toBeInTheDocument()
      })
    })

    it('should show Edit button that enters edit mode when clicked for empty description', async () => {
      render(<PRDescription {...defaultProps} body={null} />)

      const editButton = screen.getByTitle('Edit description')
      fireEvent.click(editButton)

      await waitFor(() => {
        expect(screen.getByTestId('description-editor')).toBeInTheDocument()
      })
    })
  })

  describe('truncation', () => {
    const longBody = 'A'.repeat(350) // More than DESCRIPTION_PREVIEW_LENGTH (300)

    it('should truncate long descriptions', () => {
      render(<PRDescription {...defaultProps} body={longBody} />)

      expect(screen.getByText(/Read more/i)).toBeInTheDocument()
    })

    it('should not show "Read more" for short descriptions', () => {
      render(<PRDescription {...defaultProps} />)

      expect(screen.queryByText(/Read more/i)).not.toBeInTheDocument()
    })

    it('should expand when "Read more" is clicked', async () => {
      render(<PRDescription {...defaultProps} body={longBody} />)

      const readMoreButton = screen.getByText(/Read more/i)
      fireEvent.click(readMoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Show less/i)).toBeInTheDocument()
      })
    })

    it('should collapse when "Show less" is clicked', async () => {
      render(<PRDescription {...defaultProps} body={longBody} />)

      // Expand first
      fireEvent.click(screen.getByText(/Read more/i))

      await waitFor(() => {
        expect(screen.getByText(/Show less/i)).toBeInTheDocument()
      })

      // Collapse
      fireEvent.click(screen.getByText(/Show less/i))

      await waitFor(() => {
        expect(screen.getByText(/Read more/i)).toBeInTheDocument()
      })
    })
  })

  describe('markdown rendering', () => {
    it('should render markdown content', () => {
      const markdownBody = '## Heading\n\nThis is **bold** text.'

      render(<PRDescription {...defaultProps} body={markdownBody} />)

      // MarkdownContent component should be used
      expect(screen.getByText(/bold/)).toBeInTheDocument()
    })
  })
})
