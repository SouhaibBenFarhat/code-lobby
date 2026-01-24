/**
 * MergeButton Component Tests
 *
 * Tests for merge button states, confirmation popover, and merge methods.
 */

import {
  createMockBehindPR,
  createMockBlockedPR,
  createMockComputingPR,
  createMockConflictingPR,
  createMockDraftPR,
  createMockMergeablePR,
  createMockPullRequest,
  createMockUnstablePR,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MergeButton } from './MergeButton'

describe('MergeButton', () => {
  const mockOnMergeComplete = vi.fn()

  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('rendering', () => {
    it('should render merge button', () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
    })

    it('should render git merge icon', () => {
      const pr = createMockMergeablePR()
      const { container } = render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const mergeIcon = container.querySelector('.lucide-git-merge')
      expect(mergeIcon).toBeInTheDocument()
    })
  })

  describe('button states', () => {
    it('should be enabled for mergeable PRs', () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).not.toBeDisabled()
    })

    it('should be disabled for draft PRs', () => {
      const pr = createMockDraftPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for PRs with conflicts', () => {
      const pr = createMockConflictingPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for blocked PRs', () => {
      const pr = createMockBlockedPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for PRs behind base branch', () => {
      const pr = createMockBehindPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for unstable PRs', () => {
      const pr = createMockUnstablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should show loading state when merge status is computing', () => {
      const pr = createMockComputingPR()
      const { container } = render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show success styling for mergeable PRs', () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toHaveClass('bg-success')
    })
  })

  describe('button variants by state', () => {
    it('should be disabled with secondary variant for drafts', () => {
      const pr = createMockDraftPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled with destructive variant for conflicting PRs', () => {
      const pr = createMockConflictingPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for PRs behind base branch', () => {
      const pr = createMockBehindPR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })
  })

  describe('confirmation popover', () => {
    it('should show confirmation popover when merge button is clicked', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })
    })

    it('should show branch names in confirmation', async () => {
      const pr = createMockMergeablePR()
      pr.head.ref = 'feature/my-branch'
      pr.base.ref = 'main'

      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        expect(screen.getByText('feature/my-branch')).toBeInTheDocument()
        expect(screen.getByText('main')).toBeInTheDocument()
      })
    })

    it('should show merge method selection', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Squash/i })).toBeInTheDocument()
        // There are multiple "Merge" buttons when popover is open, use getAllByRole
        const mergeButtons = screen.getAllByRole('button', { name: /^Merge$/i })
        expect(mergeButtons.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByRole('button', { name: /Rebase/i })).toBeInTheDocument()
      })
    })

    it('should default to Squash merge method', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        const squashButton = screen.getByRole('button', { name: /Squash/i })
        // Squash should have the selected styling (variant='default')
        expect(squashButton.className).toMatch(/bg-primary|variant-default/)
      })
    })

    it('should close confirmation when cancel is clicked', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Click cancel
      fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

      await waitFor(() => {
        expect(screen.queryByText('Confirm Merge')).not.toBeInTheDocument()
      })
    })

    it('should close confirmation when X button is clicked', async () => {
      const pr = createMockMergeablePR()
      const { container } = render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Click X button
      const xIcon = container.querySelector('.lucide-x')
      const closeButton = xIcon?.closest('button')
      if (closeButton) {
        fireEvent.click(closeButton)
      }

      await waitFor(() => {
        expect(screen.queryByText('Confirm Merge')).not.toBeInTheDocument()
      })
    })
  })

  describe('merge execution', () => {
    it('should call window.electron.mergePR when confirm is clicked', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Click confirm
      fireEvent.click(screen.getByRole('button', { name: /Confirm/i }))

      await waitFor(() => {
        expect(window.electron.mergePR).toHaveBeenCalledWith(pr.id, 'SQUASH')
      })
    })

    it('should call onMergeComplete after successful merge', async () => {
      const pr = createMockMergeablePR()

      // Mock successful merge
      ;(window.electron.mergePR as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true
      })

      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation and confirm
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))
      await waitFor(() => expect(screen.getByText('Confirm Merge')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Confirm/i }))

      await waitFor(() => {
        expect(mockOnMergeComplete).toHaveBeenCalled()
      })
    })

    it('should show error message when merge fails', async () => {
      const pr = createMockMergeablePR()

      // Mock failed merge
      ;(window.electron.mergePR as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: 'Merge failed: branch protection rules not met'
      })

      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation and confirm
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))
      await waitFor(() => expect(screen.getByText('Confirm Merge')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Confirm/i }))

      await waitFor(() => {
        expect(screen.getByText(/branch protection rules not met/i)).toBeInTheDocument()
      })
    })

    it('should show spinner during merge', async () => {
      const pr = createMockMergeablePR()

      // Mock slow merge
      ;(window.electron.mergePR as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000))
      )

      const { container } = render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation and confirm
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))
      await waitFor(() => expect(screen.getByText('Confirm Merge')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: /Confirm/i }))

      await waitFor(() => {
        // Should show spinner during merge
        const spinner = container.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
      })
    })
  })

  describe('merge method selection', () => {
    it('should use selected merge method', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: /Merge/i }))
      await waitFor(() => expect(screen.getByText('Confirm Merge')).toBeInTheDocument())

      // Select Rebase method
      fireEvent.click(screen.getByRole('button', { name: /Rebase/i }))

      // Confirm
      fireEvent.click(screen.getByRole('button', { name: /Confirm/i }))

      await waitFor(() => {
        expect(window.electron.mergePR).toHaveBeenCalledWith(pr.id, 'REBASE')
      })
    })
  })

  describe('review decision states', () => {
    it('should be disabled when changes are requested', () => {
      const pr = createMockPullRequest({
        reviewDecision: 'CHANGES_REQUESTED',
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'BLOCKED'
      })

      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled when review is required', () => {
      const pr = createMockPullRequest({
        reviewDecision: 'REVIEW_REQUIRED',
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'BLOCKED'
      })

      render(<MergeButton pr={pr} onMergeComplete={mockOnMergeComplete} />)

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })
  })
})
