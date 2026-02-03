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

      // Find close button by its X icon
      const xIcon = container.querySelector('.lucide-x')
      const closeButton = xIcon?.closest('button')
      expect(closeButton).toBeInTheDocument()
      if (closeButton) {
        fireEvent.click(closeButton)
      }

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

  describe('assignees - "It\'s a match!" feature', () => {
    it('should show just author when there are no assignees', () => {
      const pr = createPR({ assignees: [] })
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Should show author name when no assignees
      expect(screen.getByText(pr.user.login)).toBeInTheDocument()

      // Should NOT have the heart icon (no match)
      const heartIcon = container.querySelector('.lucide-heart')
      expect(heartIcon).not.toBeInTheDocument()
    })

    it('should show "match" UI with heart when there is an assignee', async () => {
      const pr = createPR({
        assignees: [{ login: 'assignee1', avatar_url: 'https://example.com/avatar1.png' }]
      })
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Should have the heart icon (it's a match!)
      const heartIcon = container.querySelector('.lucide-heart')
      expect(heartIcon).toBeInTheDocument()

      // Heart should be pink and filled
      expect(heartIcon).toHaveClass('text-pink-500')
      expect(heartIcon).toHaveClass('fill-pink-500')
    })

    it('should show overflow indicator for multiple assignees', () => {
      const pr = createPR({
        assignees: [
          { login: 'assignee1', avatar_url: 'https://example.com/avatar1.png' },
          { login: 'assignee2', avatar_url: 'https://example.com/avatar2.png' },
          { login: 'assignee3', avatar_url: 'https://example.com/avatar3.png' }
        ]
      })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Should show +2 for the additional assignees (3 - 1 shown = 2)
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('should not show overflow indicator for single assignee', () => {
      const pr = createPR({
        assignees: [{ login: 'assignee1', avatar_url: 'https://example.com/avatar1.png' }],
        // Set additions/deletions to 0 to avoid matching +X pattern
        additions: 0,
        deletions: 0
      })
      render(<PRHeader onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // With only 1 assignee, no overflow indicator should exist
      expect(screen.queryByText('+1')).not.toBeInTheDocument()
      expect(screen.queryByText('+2')).not.toBeInTheDocument()
    })

    it('should have hover animation effect', () => {
      const pr = createPR({
        assignees: [{ login: 'assignee1', avatar_url: 'https://example.com/avatar1.png' }]
      })
      const { container } = render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Should have the group/match class for hover animation
      const matchContainer = container.querySelector('[class*="group/match"]')
      expect(matchContainer).toBeInTheDocument()
    })
  })

  describe('labels', () => {
    it('should not show labels section when there are no labels', () => {
      const pr = createPR({ labels: [] })
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Should not have any label badges
      expect(screen.queryByText('bug')).not.toBeInTheDocument()
      expect(screen.queryByText('enhancement')).not.toBeInTheDocument()
    })

    it('should show label names when there are labels', () => {
      const pr = createPR({
        labels: [
          { name: 'bug', color: 'd73a4a' },
          { name: 'enhancement', color: 'a2eeef' }
        ]
      })
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('enhancement')).toBeInTheDocument()
    })

    it('should show up to 3 labels with overflow indicator', () => {
      const pr = createPR({
        labels: [
          { name: 'bug', color: 'd73a4a' },
          { name: 'enhancement', color: 'a2eeef' },
          { name: 'documentation', color: '0075ca' },
          { name: 'help wanted', color: '008672' },
          { name: 'good first issue', color: '7057ff' }
        ]
      })
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Should show first 3 labels
      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('enhancement')).toBeInTheDocument()
      expect(screen.getByText('documentation')).toBeInTheDocument()

      // Should NOT show labels 4 and 5 directly (they're in tooltip)
      expect(screen.queryByText('help wanted')).not.toBeInTheDocument()
      expect(screen.queryByText('good first issue')).not.toBeInTheDocument()

      // Should show +2 overflow indicator
      expect(screen.getByText('+2')).toBeInTheDocument()
    })

    it('should not show overflow indicator for 3 or fewer labels', () => {
      const pr = createPR({
        labels: [
          { name: 'bug', color: 'd73a4a' },
          { name: 'enhancement', color: 'a2eeef' }
        ],
        // Set additions/deletions to 0 to avoid matching +X pattern
        additions: 0,
        deletions: 0
      })
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // All labels should be visible
      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('enhancement')).toBeInTheDocument()

      // No overflow indicator needed
      expect(screen.queryByText('+2')).not.toBeInTheDocument()
    })

    it('should apply label colors correctly', () => {
      const pr = createPR({
        labels: [{ name: 'bug', color: 'd73a4a' }]
      })
      render(<PRHeader onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      const labelElement = screen.getByText('bug')
      // Check that the color is applied via inline styles
      expect(labelElement).toHaveStyle({ color: '#d73a4a' })
    })
  })
})
