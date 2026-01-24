/**
 * ApproveButton Component Tests
 *
 * Tests for approve button states, submission, and feedback.
 */

import {
  createMockApprovedPR,
  createMockDraftPR,
  createMockNeedsReviewPR,
  createMockOwnPR,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApproveButton } from './ApproveButton'

describe('ApproveButton', () => {
  const mockOnApproveComplete = vi.fn()
  const currentUser = 'testuser'

  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('rendering', () => {
    it('should render approve button', () => {
      const pr = createMockNeedsReviewPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument()
    })

    it('should render check icon when can approve', () => {
      const pr = createMockNeedsReviewPR()
      const { container } = render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const checkIcon = container.querySelector('.lucide-check')
      expect(checkIcon).toBeInTheDocument()
    })
  })

  describe('button states', () => {
    it('should be enabled when user can approve', () => {
      const pr = createMockNeedsReviewPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).not.toBeDisabled()
    })

    it('should be disabled for draft PRs', () => {
      const pr = createMockDraftPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled when user is the PR author', () => {
      const pr = createMockOwnPR(currentUser)
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled when PR is already approved', () => {
      const pr = createMockApprovedPR('otherreviewer')
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled when current user has already approved', () => {
      const pr = createMockApprovedPR(currentUser)
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
    })

    it('should show double check icon when already approved', () => {
      const pr = createMockApprovedPR(currentUser)
      const { container } = render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const checkCheckIcon = container.querySelector('.lucide-check-check')
      expect(checkCheckIcon).toBeInTheDocument()
    })
  })

  describe('button state reasons', () => {
    it('should be disabled with secondary variant for drafts', () => {
      const pr = createMockDraftPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('bg-secondary')
    })

    it('should be disabled with secondary variant for own PRs', () => {
      const pr = createMockOwnPR(currentUser)
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('bg-secondary')
    })

    it('should be disabled with green styling when already approved', () => {
      const pr = createMockApprovedPR(currentUser)
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass('bg-green-600')
    })

    it('should be enabled with green styling when can approve', () => {
      const pr = createMockNeedsReviewPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).not.toBeDisabled()
      expect(button).toHaveClass('bg-green-600')
    })
  })

  describe('approval submission', () => {
    it('should call window.electron.submitPRReview when clicked', async () => {
      const pr = createMockNeedsReviewPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      await waitFor(() => {
        expect(window.electron.submitPRReview).toHaveBeenCalledWith(pr.id, 'APPROVE')
      })
    })

    it('should call onApproveComplete after successful approval', async () => {
      const pr = createMockNeedsReviewPR()

      ;(window.electron.submitPRReview as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true
      })

      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      await waitFor(() => {
        expect(mockOnApproveComplete).toHaveBeenCalled()
      })
    })

    it('should show "Approving..." text during submission', async () => {
      const pr = createMockNeedsReviewPR()

      ;(window.electron.submitPRReview as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      )

      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      await waitFor(() => {
        expect(screen.getByText(/Approving.../i)).toBeInTheDocument()
      })
    })

    it('should show spinner during submission', async () => {
      const pr = createMockNeedsReviewPR()

      ;(window.electron.submitPRReview as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      )

      const { container } = render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      await waitFor(() => {
        const spinner = container.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should not call onApproveComplete when approval fails', async () => {
      const pr = createMockNeedsReviewPR()

      ;(window.electron.submitPRReview as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: 'Failed to submit review'
      })

      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      await waitFor(() => {
        expect(mockOnApproveComplete).not.toHaveBeenCalled()
      })
    })

    it('should handle thrown errors gracefully', async () => {
      const pr = createMockNeedsReviewPR()

      ;(window.electron.submitPRReview as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      )

      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      // Should not throw and should re-enable button
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /Approve/i })
        expect(button).not.toBeDisabled()
      })
    })
  })

  describe('success feedback', () => {
    it('should show double check icon after successful approval', async () => {
      const pr = createMockNeedsReviewPR()

      ;(window.electron.submitPRReview as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true
      })

      const { container } = render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      fireEvent.click(screen.getByRole('button', { name: /Approve/i }))

      await waitFor(() => {
        const checkCheckIcon = container.querySelector('.lucide-check-check')
        expect(checkCheckIcon).toBeInTheDocument()
      })
    })
  })

  describe('styling', () => {
    it('should have green styling when can approve', () => {
      const pr = createMockNeedsReviewPR()
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toHaveClass('bg-green-600')
    })

    it('should keep green styling when already approved', () => {
      const pr = createMockApprovedPR(currentUser)
      render(
        <ApproveButton
          pr={pr}
          currentUser={currentUser}
          onApproveComplete={mockOnApproveComplete}
        />
      )

      const button = screen.getByRole('button', { name: /Approve/i })
      expect(button).toHaveClass('bg-green-600')
    })
  })

  describe('null current user', () => {
    it('should handle null currentUser gracefully', () => {
      const pr = createMockNeedsReviewPR()
      render(<ApproveButton pr={pr} currentUser={null} onApproveComplete={mockOnApproveComplete} />)

      // Should still render the button
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument()
    })
  })
})
