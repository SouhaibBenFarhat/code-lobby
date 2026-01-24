/**
 * CheckItem Component Tests
 *
 * Tests for CI check display, status icons, and AI analysis functionality.
 */

import {
  createMockCheckRun,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CheckItem } from './CheckItem'

describe('CheckItem', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('rendering', () => {
    it('should render check name', () => {
      const check = createMockCheckRun({ name: 'Build and Test' })

      render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      expect(screen.getByText('Build and Test')).toBeInTheDocument()
    })

    it('should render check status badge', () => {
      const check = createMockCheckRun({ status: 'completed', conclusion: 'success' })

      render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      expect(screen.getByText('success')).toBeInTheDocument()
    })

    it('should show "Running" for in-progress checks', () => {
      const check = createMockCheckRun({ status: 'in_progress', conclusion: null })

      render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      expect(screen.getByText('Running')).toBeInTheDocument()
    })
  })

  describe('status icons', () => {
    it('should show success icon for successful checks', () => {
      const check = createMockCheckRun({ status: 'completed', conclusion: 'success' })

      const { container } = render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      // Lucide uses lucide-check-circle-2 or similar
      const successIcon = container.querySelector(
        '[class*="lucide-check-circle"], .text-success svg'
      )
      expect(successIcon).toBeInTheDocument()
    })

    it('should show failure icon for failed checks', () => {
      const check = createMockCheckRun({ status: 'completed', conclusion: 'failure' })

      const { container } = render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      // XCircle icon has class containing x-circle
      const failureIcon = container.querySelector('svg.text-destructive, svg[class*="x-circle"]')
      expect(failureIcon).toBeInTheDocument()
    })

    it('should show spinner for in-progress checks', () => {
      const check = createMockCheckRun({ status: 'in_progress', conclusion: null })

      const { container } = render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show spinner for queued checks', () => {
      const check = createMockCheckRun({ status: 'queued', conclusion: null })

      const { container } = render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show neutral icon for cancelled checks', () => {
      const check = createMockCheckRun({ status: 'completed', conclusion: 'cancelled' })

      const { container } = render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      const neutralIcon = container.querySelector('[class*="lucide-circle"]')
      expect(neutralIcon).toBeInTheDocument()
    })

    it('should show neutral icon for skipped checks', () => {
      const check = createMockCheckRun({ status: 'completed', conclusion: 'skipped' })

      const { container } = render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      const neutralIcon = container.querySelector('[class*="lucide-circle"]')
      expect(neutralIcon).toBeInTheDocument()
    })
  })

  describe('AI analysis button', () => {
    it('should show AI analyze button only for failed checks', () => {
      const failedCheck = createMockCheckRun({ status: 'completed', conclusion: 'failure' })

      const { container } = render(
        <CheckItem check={failedCheck} owner="test-org" repo="test-repo" />
      )

      const sparklesIcon = container.querySelector('.lucide-sparkles')
      expect(sparklesIcon).toBeInTheDocument()
    })

    it('should not show AI analyze button for successful checks', () => {
      const successCheck = createMockCheckRun({ status: 'completed', conclusion: 'success' })

      const { container } = render(
        <CheckItem check={successCheck} owner="test-org" repo="test-repo" />
      )

      const sparklesIcon = container.querySelector('.lucide-sparkles')
      expect(sparklesIcon).not.toBeInTheDocument()
    })

    it('should not show AI analyze button for running checks', () => {
      const runningCheck = createMockCheckRun({ status: 'in_progress', conclusion: null })

      const { container } = render(
        <CheckItem check={runningCheck} owner="test-org" repo="test-repo" />
      )

      const sparklesIcon = container.querySelector('.lucide-sparkles')
      expect(sparklesIcon).not.toBeInTheDocument()
    })
  })

  describe('click behavior', () => {
    it('should open check URL when check name is clicked', () => {
      const mockOpen = vi.fn()
      vi.spyOn(window, 'open').mockImplementation(mockOpen)

      const check = createMockCheckRun({
        name: 'Test Check',
        html_url: 'https://github.com/test/check'
      })

      render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      const checkButton = screen.getByText('Test Check').closest('button')
      if (checkButton) {
        fireEvent.click(checkButton)
      }

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/test/check', '_blank')
    })
  })

  describe('different conclusions', () => {
    it.each([
      ['success', 'success'],
      ['failure', 'failure'],
      ['cancelled', 'cancelled'],
      ['skipped', 'skipped'],
      ['neutral', 'neutral']
    ])('should display %s conclusion correctly', (conclusion, expectedText) => {
      const check = createMockCheckRun({
        status: 'completed',
        conclusion: conclusion as 'success' | 'failure' | 'cancelled' | 'skipped' | 'neutral'
      })

      render(<CheckItem check={check} owner="test-org" repo="test-repo" />)

      expect(screen.getByText(expectedText)).toBeInTheDocument()
    })
  })
})
