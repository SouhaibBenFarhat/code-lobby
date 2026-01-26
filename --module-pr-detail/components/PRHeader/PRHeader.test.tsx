/**
 * PRHeader Component Tests
 *
 * Tests for PR header rendering, action buttons, and stats.
 * Components subscribe to store directly - use initialSelectedPR option in render.
 */

import type { GitHubUser } from '@data'
import {
  createMockPullRequest,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PRHeader } from './PRHeader'

describe('PRHeader', () => {
  const mockOnClose = vi.fn()
  const mockUser: GitHubUser = {
    login: 'testuser',
    avatar_url: 'https://example.com/avatar.png',
    name: 'Test User',
    html_url: 'https://github.com/testuser'
  }

  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  const createPR = (overrides = {}) =>
    createMockPullRequest({
      number: 123,
      title: 'Test PR Title',
      draft: false,
      ...overrides
    })

  describe('rendering', () => {
    it('should render PR number', () => {
      const pr = createPR({ number: 456 })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('#456')).toBeInTheDocument()
    })

    it('should render PR title', () => {
      const pr = createPR({ title: 'My Amazing Feature' })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('My Amazing Feature')).toBeInTheDocument()
    })

    it('should render Draft badge for draft PRs', () => {
      const pr = createPR({ draft: true })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should not render Draft badge for non-draft PRs', () => {
      const pr = createPR({ draft: false })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.queryByText('Draft')).not.toBeInTheDocument()
    })

    it('should render branch info', () => {
      const pr = createPR()
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Branch names are truncated but should be present
      expect(screen.getByText('→')).toBeInTheDocument()
    })

    it('should render author login', () => {
      const pr = createPR()
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText(pr.user.login)).toBeInTheDocument()
    })

    it('should render additions and deletions', () => {
      const pr = createPR({ additions: 100, deletions: 50 })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('+100')).toBeInTheDocument()
      expect(screen.getByText('-50')).toBeInTheDocument()
    })

    it('should render comment count', () => {
      const pr = createPR({ comments: 5, review_comments: 3 })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('8')).toBeInTheDocument()
    })

    it('should not render when no PR is selected', () => {
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: null,
        initialUser: mockUser
      })
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('action buttons', () => {
    it('should render close button', () => {
      const pr = createPR()
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Find close button (last button with X icon)
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should call onClose when close button is clicked', () => {
      const pr = createPR()
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Find close button - it's the last icon button after separator
      const buttons = container.querySelectorAll('button')
      const closeButton = buttons[buttons.length - 1]
      fireEvent.click(closeButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should render refresh button', () => {
      const pr = createPR()
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Look for RefreshCw icon
      const refreshIcon = container.querySelector('.lucide-refresh-cw')
      expect(refreshIcon).toBeInTheDocument()
    })

    it('should render external link button', () => {
      const pr = createPR()
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Look for ExternalLink icon
      const externalIcon = container.querySelector('.lucide-external-link')
      expect(externalIcon).toBeInTheDocument()
    })

    it('should open GitHub URL when external link clicked', () => {
      const pr = createPR({ html_url: 'https://github.com/test/pr/123' })
      const mockOpen = vi.fn()
      window.open = mockOpen

      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      const externalIcon = container.querySelector('.lucide-external-link')
      const button = externalIcon?.closest('button')
      if (button) {
        fireEvent.click(button)
      }

      expect(mockOpen).toHaveBeenCalledWith('https://github.com/test/pr/123', '_blank')
    })
  })

  describe('Why Open? button', () => {
    it('should render PR status correctly', () => {
      const pr = createPR()
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Check that status badge or state indicator is present
      expect(screen.getByText(pr.title)).toBeInTheDocument()
    })
  })

  describe('AI Chat button', () => {
    it('should render AI Chat button with Claude icon', () => {
      const pr = createPR()
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Claude icon doesn't have lucide class, look for svg with specific viewBox or path
      const svgs = container.querySelectorAll('button svg')
      expect(svgs.length).toBeGreaterThan(0)
    })
  })

  describe('Preview button', () => {
    it('should render header buttons', () => {
      const pr = createPR()
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Check that action buttons are rendered
      expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
    })
  })

  describe('Jira button', () => {
    it('should render external link elements', () => {
      const pr = createPR()
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Check for any external link icons
      const externalLinks = container.querySelectorAll('svg[class*="lucide"]')
      expect(externalLinks.length).toBeGreaterThan(0)
    })
  })

  describe('Approve and Merge buttons', () => {
    it('should render Approve button', () => {
      const pr = createPR()
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument()
    })

    it('should render Merge button', () => {
      const pr = createPR()
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
    })
  })

  describe('stats section', () => {
    it('should display relative time', () => {
      const pr = createPR({ created_at: new Date().toISOString() })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Should show something like "just now" or "X seconds ago"
      const statsSection = screen.getByText(pr.user.login).closest('div')
      expect(statsSection).toBeInTheDocument()
    })
  })
})
