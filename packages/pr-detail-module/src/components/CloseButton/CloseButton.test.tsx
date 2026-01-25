/**
 * CloseButton Component Tests
 *
 * Tests for close button states, confirmation popover, and submission.
 * Components subscribe to store directly - use initialSelectedPR option in render.
 */

import {
  createMockMergeablePR,
  createMockPullRequest,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CloseButton } from './CloseButton'

describe('CloseButton', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('rendering', () => {
    it('should render close button for open PR', () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      expect(screen.getByRole('button', { name: /Close/i })).toBeInTheDocument()
    })

    it('should render X icon', () => {
      const pr = createMockMergeablePR()
      const { container } = render(<CloseButton />, { initialSelectedPR: pr })

      const xIcon = container.querySelector('.lucide-x')
      expect(xIcon).toBeInTheDocument()
    })

    it('should not render when no PR is selected', () => {
      const { container } = render(<CloseButton />, { initialSelectedPR: null })
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('button states', () => {
    it('should be enabled for open PRs', () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      expect(button).not.toBeDisabled()
    })

    it('should be disabled for already closed PRs', () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Closed/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for merged PRs', () => {
      const pr = createMockPullRequest({ state: 'MERGED' })
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      expect(button).toBeDisabled()
    })
  })

  describe('confirmation popover', () => {
    it('should open confirmation popover on click', async () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close Pull Request?')).toBeInTheDocument()
      })
    })

    it('should show cancel and confirm buttons in popover', async () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Close PR/i })).toBeInTheDocument()
      })
    })

    it('should close popover when cancel is clicked', async () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close Pull Request?')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Close Pull Request?')).not.toBeInTheDocument()
      })
    })
  })

  describe('close submission', () => {
    it('should call closePR on confirm', async () => {
      const pr = createMockMergeablePR()
      window.electron.closePR = vi.fn().mockResolvedValue({ success: true })

      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close Pull Request?')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Close PR/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(window.electron.closePR).toHaveBeenCalledWith(pr.id, undefined)
      })
    })

    it('should show error message on failure', async () => {
      const pr = createMockMergeablePR()
      window.electron.closePR = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Permission denied' })

      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close Pull Request?')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Close PR/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Permission denied')).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      const pr = createMockMergeablePR()
      window.electron.closePR = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
        )

      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close Pull Request?')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Close PR/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Closing...')).toBeInTheDocument()
      })
    })
  })

  describe('closing with comment', () => {
    it('should show comment textarea in popover', async () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByLabelText(/closing comment/i)).toBeInTheDocument()
      })
    })

    it('should pass comment to closePR when provided', async () => {
      const pr = createMockMergeablePR()
      window.electron.closePR = vi.fn().mockResolvedValue({ success: true })

      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByLabelText(/closing comment/i)).toBeInTheDocument()
      })

      const textarea = screen.getByLabelText(/closing comment/i)
      fireEvent.change(textarea, { target: { value: 'Closing because no longer needed' } })

      const confirmButton = screen.getByRole('button', { name: /Close PR/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(window.electron.closePR).toHaveBeenCalledWith(
          pr.id,
          'Closing because no longer needed'
        )
      })
    })

    it('should pass undefined for empty comment', async () => {
      const pr = createMockMergeablePR()
      window.electron.closePR = vi.fn().mockResolvedValue({ success: true })

      render(<CloseButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Close Pull Request?')).toBeInTheDocument()
      })

      // Don't enter a comment, just close
      const confirmButton = screen.getByRole('button', { name: /Close PR/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(window.electron.closePR).toHaveBeenCalledWith(pr.id, undefined)
      })
    })

    it('should reset comment when popover closes', async () => {
      const pr = createMockMergeablePR()
      render(<CloseButton />, { initialSelectedPR: pr })

      // Open popover
      const button = screen.getByRole('button', { name: /Close/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByLabelText(/closing comment/i)).toBeInTheDocument()
      })

      // Enter a comment
      const textarea = screen.getByLabelText(/closing comment/i)
      fireEvent.change(textarea, { target: { value: 'Some comment' } })
      expect(textarea).toHaveValue('Some comment')

      // Cancel/close popover
      const cancelButton = screen.getByRole('button', { name: /Cancel/i })
      fireEvent.click(cancelButton)

      // Reopen popover
      fireEvent.click(button)

      await waitFor(() => {
        const newTextarea = screen.getByLabelText(/closing comment/i)
        expect(newTextarea).toHaveValue('')
      })
    })
  })
})
