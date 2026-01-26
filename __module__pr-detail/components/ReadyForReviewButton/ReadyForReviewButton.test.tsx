/**
 * ReadyForReviewButton Component Tests
 *
 * Tests for ready for review button states, visibility, and submission.
 * Components subscribe to store directly - use initialSelectedPR option in render.
 */

import {
  createMockPullRequest,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadyForReviewButton } from './ReadyForReviewButton'

describe('ReadyForReviewButton', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('visibility', () => {
    it('should render for draft PRs', () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      expect(screen.getByRole('button', { name: /Ready for Review/i })).toBeInTheDocument()
    })

    it('should NOT render for non-draft PRs', () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: false })
      const { container } = render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render for closed draft PRs', () => {
      const pr = createMockPullRequest({ state: 'CLOSED', draft: true })
      const { container } = render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render for merged PRs', () => {
      const pr = createMockPullRequest({ state: undefined, draft: false })
      const { container } = render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render when no PR is selected', () => {
      const { container } = render(<ReadyForReviewButton />, { initialSelectedPR: null })

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('button states', () => {
    it('should be enabled for draft PRs', () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Ready for Review/i })
      expect(button).not.toBeDisabled()
    })

    it('should render eye icon', () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      const { container } = render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      const eyeIcon = container.querySelector('.lucide-eye')
      expect(eyeIcon).toBeInTheDocument()
    })
  })

  describe('mark ready submission', () => {
    it('should call markPRReady on click', async () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      window.electron.markPRReady = vi.fn().mockResolvedValue({ success: true })

      render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Ready for Review/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(window.electron.markPRReady).toHaveBeenCalledWith(pr.id)
      })
    })

    it('should show loading state during submission', async () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      window.electron.markPRReady = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
        )

      render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Ready for Review/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Marking...')).toBeInTheDocument()
      })
    })

    it('should show success state after marking ready', async () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      window.electron.markPRReady = vi.fn().mockResolvedValue({ success: true })

      render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Ready for Review/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Ready!')).toBeInTheDocument()
      })
    })

    it('should handle errors gracefully', async () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      window.electron.markPRReady = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Permission denied' })

      render(<ReadyForReviewButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Ready for Review/i })
      fireEvent.click(button)

      // Error shows in tooltip, so check button is still there and not in success state
      await waitFor(() => {
        expect(screen.queryByText('Ready!')).not.toBeInTheDocument()
      })
    })
  })
})
