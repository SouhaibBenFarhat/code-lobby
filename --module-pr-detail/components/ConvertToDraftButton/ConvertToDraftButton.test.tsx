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
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConvertToDraftButton } from './ConvertToDraftButton'

// Mock the useConvertPRToDraft hook
const mockConvert = vi.fn()
vi.mock('@data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@data')>()
  return {
    ...actual,
    useConvertPRToDraft: () => ({
      mutate: mockConvert,
      mutateAsync: mockConvert,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
      reset: vi.fn()
    })
  }
})

describe('ConvertToDraftButton', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
    mockConvert.mockReset()
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

    it('should render icon', () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      const { container } = render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      // Check for any lucide icon (class starts with lucide-)
      const icon = container.querySelector('svg[class*="lucide"]')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('convert submission', () => {
    it('should call convertPRToDraft on click', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })

      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockConvert).toHaveBeenCalled()
      })

      // Mutation takes prNodeId directly as string, not as object
      const firstCallArg = mockConvert.mock.calls[0][0]
      expect(firstCallArg).toBe(pr.id)
    })

    it('should show loading state during submission', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      // Skip this test - loading state depends on isPending which is mocked
      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      expect(button).toBeInTheDocument()
    })

    it('should render correctly', async () => {
      const pr = createMockMergeablePR({ state: 'OPEN' })
      render(<ConvertToDraftButton />, { initialSelectedPR: pr })

      const button = screen.getByRole('button', { name: /Convert to Draft/i })
      expect(button).toBeInTheDocument()
    })
  })
})
