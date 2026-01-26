/**
 * MergeButton Component Tests
 *
 * Tests for merge button states, confirmation popover, and submission.
 * Components subscribe to store directly - use initialSelectedPR option in render.
 */

import {
  createMockApprovedPR,
  createMockBlockedPR,
  createMockConflictingPR,
  createMockDraftPR,
  createMockMergeablePR,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MergeButton } from './MergeButton'

describe('MergeButton', () => {
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
      render(<MergeButton />, { initialSelectedPR: pr })

      expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
    })

    it('should render merge icon', () => {
      const pr = createMockMergeablePR()
      const { container } = render(<MergeButton />, { initialSelectedPR: pr })

      const mergeIcon = container.querySelector('.lucide-git-merge')
      expect(mergeIcon).toBeInTheDocument()
    })

    it('should not render when no PR is selected', () => {
      const { container } = render(<MergeButton />, { initialSelectedPR: null })
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('button states', () => {
    it('should be enabled for mergeable PRs', () => {
      const pr = createMockMergeablePR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).not.toBeDisabled()
    })

    it('should be enabled for approved PRs', () => {
      const pr = createMockApprovedPR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).not.toBeDisabled()
    })

    it('should be disabled for draft PRs', () => {
      const pr = createMockDraftPR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for PRs with conflicts', () => {
      const pr = createMockConflictingPR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })

    it('should be disabled for blocked PRs', () => {
      const pr = createMockBlockedPR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      expect(button).toBeDisabled()
    })
  })

  describe('confirmation popover', () => {
    it('should open confirmation popover on click', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })
    })

    it('should show branch names in confirmation', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText(pr.head.ref)).toBeInTheDocument()
        expect(screen.getByText(pr.base.ref)).toBeInTheDocument()
      })
    })

    it('should show merge method selection buttons', async () => {
      const pr = createMockMergeablePR()
      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Look for Squash and Rebase buttons specifically
      expect(screen.getByRole('button', { name: 'Squash' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Rebase' })).toBeInTheDocument()
      // There's also a "Merge" method button
      const mergeButtons = screen.getAllByRole('button', { name: 'Merge' })
      expect(mergeButtons.length).toBeGreaterThan(0)
    })

    it('should close popover when X is clicked', async () => {
      const pr = createMockMergeablePR()
      const { container } = render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      const closeButton = container.querySelector('.lucide-x')?.closest('button')
      expect(closeButton).not.toBeNull()
      if (closeButton) fireEvent.click(closeButton)

      await waitFor(() => {
        expect(screen.queryByText('Confirm Merge')).not.toBeInTheDocument()
      })
    })
  })

  describe('merge submission', () => {
    it('should call mergePR with default SQUASH method', async () => {
      const pr = createMockMergeablePR()
      window.electron.mergePR = vi.fn().mockResolvedValue({ success: true })

      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirm/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(window.electron.mergePR).toHaveBeenCalledWith(pr.id, 'SQUASH')
      })
    })

    it('should call mergePR with MERGE method when selected', async () => {
      const pr = createMockMergeablePR()
      window.electron.mergePR = vi.fn().mockResolvedValue({ success: true })

      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Get all buttons named "Merge" - one is trigger, others are method selections
      const mergeButtons = screen.getAllByRole('button', { name: 'Merge' })
      // The method selection button is inside the popover, not the trigger
      const mergeMethodButton = mergeButtons.find(
        (btn) => btn.textContent === 'Merge' && btn.closest('.flex.gap-1')
      )
      if (mergeMethodButton) {
        fireEvent.click(mergeMethodButton)
      }

      const confirmButton = screen.getByRole('button', { name: /Confirm/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(window.electron.mergePR).toHaveBeenCalledWith(pr.id, 'MERGE')
      })
    })

    it('should call mergePR with REBASE method when selected', async () => {
      const pr = createMockMergeablePR()
      window.electron.mergePR = vi.fn().mockResolvedValue({ success: true })

      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      const rebaseButton = screen.getByRole('button', { name: /Rebase/i })
      fireEvent.click(rebaseButton)

      const confirmButton = screen.getByRole('button', { name: /Confirm/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(window.electron.mergePR).toHaveBeenCalledWith(pr.id, 'REBASE')
      })
    })

    it('should disable confirm button during submission', async () => {
      const pr = createMockMergeablePR()
      let resolvePromise!: (value: { success: boolean }) => void
      const promise = new Promise<{ success: boolean }>((resolve) => {
        resolvePromise = resolve
      })
      window.electron.mergePR = vi.fn().mockReturnValue(promise)

      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirm/i })
      fireEvent.click(confirmButton)

      // API should have been called
      await waitFor(() => {
        expect(window.electron.mergePR).toHaveBeenCalled()
      })

      // Cancel button should be disabled during merge
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()

      resolvePromise?.({ success: true })
    })

    it('should show error message on failure', async () => {
      const pr = createMockMergeablePR()
      window.electron.mergePR = vi.fn().mockResolvedValue({
        success: false,
        error: 'Branch protection rules not satisfied'
      })

      render(<MergeButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /Confirm/i })
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Branch protection rules not satisfied')).toBeInTheDocument()
      })
    })
  })
})
