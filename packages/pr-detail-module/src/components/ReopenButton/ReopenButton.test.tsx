/**
 * ReopenButton Component Tests
 *
 * Tests for reopen button states, visibility, and submission.
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
import { ReopenButton } from './ReopenButton'

describe('ReopenButton', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('visibility', () => {
    it('should render reopen button for closed PRs', () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      render(<ReopenButton />, { initialSelectedPR: pr })

      expect(screen.getByRole('button', { name: /Reopen/i })).toBeInTheDocument()
    })

    it('should NOT render for open PRs', () => {
      const pr = createMockMergeablePR() // open by default
      const { container } = render(<ReopenButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render for merged PRs', () => {
      const pr = createMockPullRequest({ state: 'MERGED' })
      const { container } = render(<ReopenButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render when no PR is selected', () => {
      const { container } = render(<ReopenButton />, { initialSelectedPR: null })

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('button states', () => {
    it('should be enabled for closed PRs', () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      render(<ReopenButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Reopen/i })
      expect(button).not.toBeDisabled()
    })

    it('should render rotate icon', () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      const { container } = render(<ReopenButton />, { initialSelectedPR: pr })

      const rotateIcon = container.querySelector('.lucide-rotate-ccw')
      expect(rotateIcon).toBeInTheDocument()
    })
  })

  describe('reopen submission', () => {
    it('should call reopenPR on click', async () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      window.electron.reopenPR = vi.fn().mockResolvedValue({ success: true })

      render(<ReopenButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Reopen/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(window.electron.reopenPR).toHaveBeenCalledWith(pr.id)
      })
    })

    it('should show loading state during submission', async () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      window.electron.reopenPR = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
        )

      render(<ReopenButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Reopen/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Reopening...')).toBeInTheDocument()
      })
    })

    it('should show success state after reopening', async () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      window.electron.reopenPR = vi.fn().mockResolvedValue({ success: true })

      render(<ReopenButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Reopen/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Reopened!')).toBeInTheDocument()
      })
    })

    it('should handle errors gracefully', async () => {
      const pr = createMockPullRequest({ state: 'CLOSED' })
      window.electron.reopenPR = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Permission denied' })

      render(<ReopenButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Reopen/i })
      fireEvent.click(button)

      // Error shows in tooltip, so check button is still there and not in success state
      await waitFor(() => {
        expect(screen.queryByText('Reopened!')).not.toBeInTheDocument()
      })
    })
  })
})
