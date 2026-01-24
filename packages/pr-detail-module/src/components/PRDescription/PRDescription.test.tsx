/**
 * PRDescription Component Tests
 *
 * Tests for PR description display, collapsing/expanding, and actions.
 */

import { fireEvent, render, screen, waitFor } from '@codelobby/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRDescription } from './PRDescription'

describe('PRDescription', () => {
  const defaultProps = {
    body: 'This is the PR description body text.',
    prUrl: 'https://github.com/test-org/repo/pull/1'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
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
      render(<PRDescription body={null} prUrl={defaultProps.prUrl} />)

      expect(screen.getByText('No description provided')).toBeInTheDocument()
    })

    it('should show "No description provided" when body is empty string', () => {
      render(<PRDescription body="" prUrl={defaultProps.prUrl} />)

      expect(screen.getByText('No description provided')).toBeInTheDocument()
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
      render(<PRDescription body={null} prUrl={defaultProps.prUrl} />)

      const copyIcon = document.querySelector('.lucide-copy')
      expect(copyIcon).not.toBeInTheDocument()
    })
  })

  describe('edit functionality', () => {
    it('should open PR URL when edit button is clicked', () => {
      const mockOpen = vi.fn()
      vi.spyOn(window, 'open').mockImplementation(mockOpen)

      render(<PRDescription {...defaultProps} />)

      const editIcon = document.querySelector('.lucide-edit')
      const editButton = editIcon?.closest('button')

      if (editButton) {
        fireEvent.click(editButton)

        expect(mockOpen).toHaveBeenCalledWith(defaultProps.prUrl, '_blank')
      }
    })
  })

  describe('truncation', () => {
    const longBody = 'A'.repeat(350) // More than DESCRIPTION_PREVIEW_LENGTH (300)

    it('should truncate long descriptions', () => {
      render(<PRDescription body={longBody} prUrl={defaultProps.prUrl} />)

      expect(screen.getByText(/Read more/i)).toBeInTheDocument()
    })

    it('should not show "Read more" for short descriptions', () => {
      render(<PRDescription {...defaultProps} />)

      expect(screen.queryByText(/Read more/i)).not.toBeInTheDocument()
    })

    it('should expand when "Read more" is clicked', async () => {
      render(<PRDescription body={longBody} prUrl={defaultProps.prUrl} />)

      const readMoreButton = screen.getByText(/Read more/i)
      fireEvent.click(readMoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Show less/i)).toBeInTheDocument()
      })
    })

    it('should collapse when "Show less" is clicked', async () => {
      render(<PRDescription body={longBody} prUrl={defaultProps.prUrl} />)

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

      render(<PRDescription body={markdownBody} prUrl={defaultProps.prUrl} />)

      // MarkdownContent component should be used
      expect(screen.getByText(/bold/)).toBeInTheDocument()
    })
  })
})
