/**
 * ConvertToDraftButton Component Tests
 *
 * Tests for convert to draft button states, visibility, and submission.
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
import { ConvertToDraftButton } from './ConvertToDraftButton'

describe('ConvertToDraftButton', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('visibility', () => {
    it('should render for open non-draft PRs', () => {
      const pr = createMockMergeablePR({ state: 'OPEN' }) // open and not draft
      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      expect(screen.getByRole('button', { name: /Convert to Draft/i })).toBeInTheDocument()
    })

    it('should NOT render for draft PRs', () => {
      const pr = createMockPullRequest({ state: 'OPEN', draft: true })
      const { container } = render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render for closed PRs', () => {
      const pr = createMockPullRequest({ state: 'CLOSED', draft: false })
      const { container } = render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render for merged PRs', () => {
      const pr = createMockPullRequest({ state: 'MERGED', draft: false })
      const { container } = render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      expect(container).toBeEmptyDOMElement()
    })

    it('should NOT render when no PR is selected', () => {
      const { container } = render(<ConvertToDraftButton />, { initialSelectedPR: null })

      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('button states', () => {
    it('should be enabled for open non-draft PRs', () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      expect(button).not.toBeDisabled()
    })

    it('should render file-edit icon', () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      const { container } = render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const fileEditIcon = container.querySelector('.lucide-file-edit')
      expect(fileEditIcon).toBeInTheDocument()
    })
  })

  describe('convert submission', () => {
    it('should call convertPRToDraft on click', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      window.electron.convertPRToDraft = vi.fn().mockResolvedValue({ success: true })

      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(window.electron.convertPRToDraft).toHaveBeenCalledWith(pr.id)
      })
    })

    it('should show loading state during submission', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      window.electron.convertPRToDraft = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
        )

      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Converting...')).toBeInTheDocument()
      })
    })

    it('should show success state after converting', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      window.electron.convertPRToDraft = vi.fn().mockResolvedValue({ success: true })

      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(screen.getByText('Converted!')).toBeInTheDocument()
      })
    })

    it('should handle errors gracefully', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      window.electron.convertPRToDraft = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Permission denied' })

      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      fireEvent.click(button)

      // Error shows in tooltip, so check button is still there and not in success state
      await waitFor(() => {
        expect(screen.queryByText('Converted!')).not.toBeInTheDocument()
      })
    })
  })
})
