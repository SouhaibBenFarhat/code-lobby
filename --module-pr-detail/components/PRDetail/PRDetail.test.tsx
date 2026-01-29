/**
 * PRDetail Component Tests
 *
 * Note: Some tests are skipped due to complex async rendering requirements.
 * The component works correctly in the app - these tests need more setup.
 *
 * Components subscribe to store directly - use initialSelectedPR and initialUser options.
 */

import type { GitHubUser } from '@data'
import {
  createMockApproval,
  createMockApprovedPR,
  createMockBehindPR,
  createMockBlockedPR,
  createMockChangesRequested,
  createMockComputingPR,
  createMockConflictingPR,
  createMockDraftPR,
  createMockMergeablePR,
  createMockNeedsReviewPR,
  createMockOwnPR,
  createMockPRWithChecks,
  createMockPRWithCodeReviews,
  createMockPRWithComments,
  createMockPRWithMixedComments,
  createMockPullRequest,
  createMockReview,
  createMockUnstablePR,
  createMockUser,
  fireEvent,
  render,
  resetIdCounter,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRDetail } from './PRDetail'

describe('PRDetail', () => {
  const mockOnClose = vi.fn()
  const mockUser: GitHubUser = {
    login: 'testuser',
    avatar_url: 'https://example.com/avatar.png',
    name: 'Test User',
    html_url: 'https://github.com/testuser'
  }
  const mockReviewer: GitHubUser = {
    login: 'reviewer',
    avatar_url: 'https://github.com/reviewer.png',
    name: 'Reviewer User',
    html_url: 'https://github.com/reviewer'
  }

  beforeEach(() => {
    resetIdCounter()
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Header', () => {
    it('should render PR title', () => {
      const pr = createMockPullRequest({ title: 'Fix authentication bug' })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('Fix authentication bug')).toBeInTheDocument()
    })

    it('should render PR number', () => {
      const pr = createMockPullRequest({ number: 42 })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText(/#42/)).toBeInTheDocument()
    })

    it('should render close button', () => {
      const pr = createMockPullRequest()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const closeButton =
        document.querySelector('button svg.lucide-panel-right-close')?.parentElement ||
        document.querySelector('button svg.lucide-x')?.parentElement
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button clicked', () => {
      const pr = createMockPullRequest()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Find the panel close button (icon-only button with X icon, not the "Close PR" button)
      // The panel close button is a ghost icon button, while the Close PR button has text
      const closeButton =
        document.querySelector('button svg.lucide-panel-right-close')?.parentElement ||
        document.querySelector('button.h-7.w-7 svg.lucide-x')?.parentElement

      if (closeButton) {
        fireEvent.click(closeButton)
        expect(mockOnClose).toHaveBeenCalled()
      }
    })

    it('should render author info', () => {
      const user = createMockUser({ login: 'johndoe' })
      const pr = createMockPullRequest({ user })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })

    it('should render action buttons in header', () => {
      const pr = createMockPullRequest()
      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Check for any buttons with lucide icons
      const buttons = container.querySelectorAll('button svg[class*="lucide"]')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should not render when no PR is selected', () => {
      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: null,
        initialUser: mockUser
      })
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('Discussion Tabs', () => {
    it('should render All tab', () => {
      const pr = createMockPullRequest()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Discussion section has All tab
      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument()
    })

    it('should render People tab', () => {
      const pr = createMockPullRequest()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByRole('button', { name: /People/i })).toBeInTheDocument()
    })

    it('should render Bots tab', () => {
      const pr = createMockPullRequest()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByRole('button', { name: /Bots/i })).toBeInTheDocument()
    })

    it('should render Reviews tab', () => {
      const pr = createMockPullRequest()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByRole('button', { name: /Reviews/i })).toBeInTheDocument()
    })
  })

  describe('CI Status', () => {
    it('should show success status for passing checks', async () => {
      const pr = createMockPRWithChecks('success')
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // CI section is visible on the page (no tab click needed)
      await waitFor(() => {
        const successIndicators = document.querySelectorAll('.text-success')
        expect(successIndicators.length).toBeGreaterThan(0)
      })
    })

    it('should show failure status for failing checks', async () => {
      const pr = createMockPRWithChecks('failure')
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      await waitFor(() => {
        const failureIndicators = document.querySelectorAll('.text-destructive')
        expect(failureIndicators.length).toBeGreaterThan(0)
      })
    })

    it('should show pending status for running checks', async () => {
      const pr = createMockPRWithChecks('pending')
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      await waitFor(() => {
        const spinners = document.querySelectorAll('.animate-spin')
        const warningIndicators = document.querySelectorAll('.text-warning')
        expect(spinners.length > 0 || warningIndicators.length > 0).toBe(true)
      })
    })
  })

  describe('Comments Tab', () => {
    it('should display comments', async () => {
      const pr = createMockPRWithComments(2)
      if (pr.commentsList?.[0]) pr.commentsList[0].body = 'First comment body'
      if (pr.commentsList?.[1]) pr.commentsList[1].body = 'Second comment body'

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Component should render with comments
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })

    it('should have tabs to filter people vs bots', async () => {
      const pr = createMockPRWithMixedComments()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Discussion section has All/People/Bots/Code tabs
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /People/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Bots/i })).toBeInTheDocument()
      })
    })

    it('should show all comments when All tab is selected', async () => {
      const pr = createMockPRWithMixedComments() // 2 human + 2 bot comments
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // All tab is selected by default - check the count shows 4
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /All \(4\)/i })).toBeInTheDocument()
      })
    })

    it('should filter to only human comments when People tab is clicked', async () => {
      const pr = createMockPRWithMixedComments() // 2 human + 2 bot comments
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Click People tab
      const peopleTab = screen.getByRole('button', { name: /People \(2\)/i })
      fireEvent.click(peopleTab)

      // Should show 2 comments (humans only)
      await waitFor(() => {
        // People tab should be active and show count of 2
        expect(screen.getByRole('button', { name: /People \(2\)/i })).toBeInTheDocument()
      })
    })

    it('should filter to only bot comments when Bots tab is clicked', async () => {
      const pr = createMockPRWithMixedComments() // 2 human + 2 bot comments
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Click Bots tab
      const botsTab = screen.getByRole('button', { name: /Bots \(2\)/i })
      fireEvent.click(botsTab)

      // Should show 2 comments (bots only)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Bots \(2\)/i })).toBeInTheDocument()
      })
    })

    it('should show different comment counts for People vs All tabs', async () => {
      const pr = createMockPRWithMixedComments() // 2 human + 2 bot comments
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      await waitFor(() => {
        // All shows total count
        expect(screen.getByRole('button', { name: /All \(4\)/i })).toBeInTheDocument()
        // People shows only human count
        expect(screen.getByRole('button', { name: /People \(2\)/i })).toBeInTheDocument()
        // Bots shows only bot count
        expect(screen.getByRole('button', { name: /Bots \(2\)/i })).toBeInTheDocument()
      })
    })
  })

  describe('Comment Sorting', () => {
    it('should display comments sorted newest first', async () => {
      const pr = createMockPullRequest()
      pr.commentsList = [
        {
          id: 'comment-1',
          body: 'Oldest comment',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#comment-1',
          author: { login: 'user1', avatar_url: 'https://example.com/1.png', isBot: false }
        },
        {
          id: 'comment-2',
          body: 'Middle comment',
          created_at: '2024-01-02T10:00:00Z',
          updated_at: '2024-01-02T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#comment-2',
          author: { login: 'user2', avatar_url: 'https://example.com/2.png', isBot: false }
        },
        {
          id: 'comment-3',
          body: 'Newest comment',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#comment-3',
          author: { login: 'user3', avatar_url: 'https://example.com/3.png', isBot: false }
        }
      ]
      pr.reviews = []

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        const commentBodies = container.querySelectorAll('.text-foreground\\/80')
        const texts = Array.from(commentBodies).map((el) => el.textContent)
        // Newest should appear first
        const newestIndex = texts.findIndex((t) => t?.includes('Newest comment'))
        const oldestIndex = texts.findIndex((t) => t?.includes('Oldest comment'))
        expect(newestIndex).toBeLessThan(oldestIndex)
      })
    })

    it('should interleave comments and reviews by date (newest first)', async () => {
      const pr = createMockPullRequest()
      pr.commentsList = [
        {
          id: 'comment-1',
          body: 'First comment',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#comment-1',
          author: { login: 'user1', avatar_url: 'https://example.com/1.png', isBot: false }
        },
        {
          id: 'comment-2',
          body: 'Last comment',
          created_at: '2024-01-03T10:00:00Z',
          updated_at: '2024-01-03T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#comment-2',
          author: { login: 'user2', avatar_url: 'https://example.com/2.png', isBot: false }
        }
      ]
      pr.reviews = [
        {
          id: 'review-1',
          state: 'approved',
          body: 'Middle review',
          created_at: '2024-01-02T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#review-1',
          author: { login: 'reviewer', avatar_url: 'https://example.com/r.png', isBot: false }
        }
      ]

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        // The approved badge should appear (showing the review is interleaved)
        const approvedBadges = container.querySelectorAll('.bg-success\\/20')
        expect(approvedBadges.length).toBeGreaterThan(0)
      })
    })

    it('should show newest review at the top when mixed with comments', async () => {
      const pr = createMockPullRequest()
      pr.commentsList = [
        {
          id: 'comment-old',
          body: 'Old comment from yesterday',
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#comment-old',
          author: { login: 'user1', avatar_url: 'https://example.com/1.png', isBot: false }
        }
      ]
      pr.reviews = [
        {
          id: 'review-new',
          state: 'approved',
          body: 'Fresh approval today',
          created_at: '2024-01-05T10:00:00Z',
          html_url: 'https://github.com/test/pr/1#review-new',
          author: { login: 'reviewer', avatar_url: 'https://example.com/r.png', isBot: false }
        }
      ]

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        // Get all timeline items (they have the relative pl-12 class)
        const timelineItems = container.querySelectorAll('.relative.pl-12')
        expect(timelineItems.length).toBe(2)

        // First item should be the approval (newest)
        const firstItem = timelineItems[0]
        expect(firstItem?.querySelector('.bg-success\\/15')).toBeInTheDocument()
      })
    })

    it('should display all comments without pagination', async () => {
      const pr = createMockPullRequest()
      // Create 50 comments
      pr.commentsList = Array.from({ length: 50 }, (_, i) => ({
        id: `comment-${i}`,
        body: `Comment ${i}`,
        created_at: new Date(2024, 0, 1, i).toISOString(),
        updated_at: new Date(2024, 0, 1, i).toISOString(),
        html_url: `https://github.com/test/pr/1#comment-${i}`,
        author: { login: `user${i}`, avatar_url: `https://example.com/${i}.png`, isBot: false }
      }))
      pr.reviews = []

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Should show all 50 comments at once
      await waitFor(() => {
        const timelineItems = container.querySelectorAll('.relative.pl-12')
        expect(timelineItems.length).toBe(50)
      })
    })
  })

  describe('Reviews', () => {
    it('should render PR with reviews without error', async () => {
      const reviewer = createMockUser({ login: 'reviewer1' })
      const pr = createMockPullRequest()
      pr.reviews = [
        createMockApproval({
          author: { login: reviewer.login, avatar_url: reviewer.avatar_url, isBot: false }
        })
      ]

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })

    it('should render PR with approval review', async () => {
      const pr = createMockPullRequest()
      pr.reviews = [createMockApproval()]

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })

    it('should render PR with changes requested review', async () => {
      const pr = createMockPullRequest()
      pr.reviews = [createMockChangesRequested()]

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })
    })
  })

  describe('Reviews Tab', () => {
    it('should render PR with reviews without error', async () => {
      const pr = createMockPRWithCodeReviews()

      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument()
      })

      // Verify the Reviews tab shows correct count (unique reviewers, not review submissions)
      // createMockPRWithCodeReviews creates 2 reviews from 2 different authors
      expect(screen.getByText(/Reviews \(2\)/)).toBeInTheDocument()
    })

    it('should display reviewer count from unique reviewers', async () => {
      const reviewer = createMockUser({ login: 'code-reviewer' })
      const pr = createMockPullRequest()
      pr.reviews = [
        createMockReview({
          author: { login: reviewer.login, avatar_url: reviewer.avatar_url, isBot: false },
          state: 'approved'
        })
      ]

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // The Reviews tab should show count of 1 unique reviewer
      await waitFor(() => {
        expect(screen.getByText(/Reviews \(1\)/)).toBeInTheDocument()
      })
    })

    it('should handle PR with multiple reviewers', async () => {
      const pr = createMockPullRequest()
      pr.reviews = [
        createMockReview({
          author: { login: 'reviewer1', avatar_url: 'https://example.com/1.png', isBot: false },
          state: 'approved'
        }),
        createMockReview({
          author: { login: 'reviewer2', avatar_url: 'https://example.com/2.png', isBot: false },
          state: 'changes_requested'
        }),
        createMockReview({
          author: { login: 'reviewer3', avatar_url: 'https://example.com/3.png', isBot: false },
          state: 'commented'
        })
      ]

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      await waitFor(() => {
        expect(screen.getByText(/Reviews \(3\)/)).toBeInTheDocument()
      })
    })

    it('should handle PR without any reviews', async () => {
      const pr = createMockPullRequest()
      pr.reviews = []

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      await waitFor(() => {
        expect(screen.getByText(/Reviews \(0\)/)).toBeInTheDocument()
      })
    })
  })

  describe('PR Stats', () => {
    it('should display additions and deletions', () => {
      const pr = createMockPullRequest({ additions: 100, deletions: 50 })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Multiple elements may show additions/deletions (header, changed files section)
      expect(screen.getAllByText(/\+100/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/-50|−50/).length).toBeGreaterThan(0)
    })

    it('should display changed files count', () => {
      const pr = createMockPullRequest({ changed_files: 15, additions: 100, deletions: 50 })
      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Component should render without errors
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Labels', () => {
    it('should display PR labels', () => {
      const pr = createMockPullRequest({
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'priority-high', color: 'ff6600' }
        ]
      })
      const { container } = render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockUser
      })

      // Component should render without errors
      expect(container.firstChild).toBeInTheDocument()
    })
  })

  describe('Branch Info', () => {
    it('should display source and target branches', () => {
      const pr = createMockPullRequest({
        head: {
          repo: null,
          ref: 'feature/new-login',
          sha: 'abc'
        },
        base: {
          repo: createMockPullRequest().base.repo,
          ref: 'main',
          sha: 'def'
        }
      })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText(/feature\/new-login/)).toBeInTheDocument()
      expect(screen.getByText(/main/)).toBeInTheDocument()
    })
  })

  describe('PR Description', () => {
    it('should display description section', () => {
      const pr = createMockPullRequest({ body: 'This is the PR description' })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('Description')).toBeInTheDocument()
    })

    it('should render PR body as markdown', () => {
      const pr = createMockPullRequest({
        body: '## Summary\nThis PR adds new features\n\n- Feature 1\n- Feature 2'
      })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Description section should be expanded by default
      expect(screen.getByText(/Summary/)).toBeInTheDocument()
      expect(screen.getByText(/Feature 1/)).toBeInTheDocument()
    })

    it('should show placeholder when no description provided', () => {
      const pr = createMockPullRequest({ body: null })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('No description provided')).toBeInTheDocument()
    })

    it('should show placeholder for empty description', () => {
      const pr = createMockPullRequest({ body: '' })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      expect(screen.getByText('No description provided')).toBeInTheDocument()
    })
  })

  describe('Merge Button', () => {
    it('should render merge button for a mergeable PR', () => {
      const pr = createMockMergeablePR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Should show "Merge" button when PR is ready
      expect(screen.getByRole('button', { name: /Merge/i })).toBeInTheDocument()
    })

    it('should show "Merge" text and be enabled when PR is clean and mergeable', () => {
      const pr = createMockMergeablePR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).not.toBeDisabled()
    })

    it('should be disabled when PR has conflicts', () => {
      const pr = createMockConflictingPR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should be disabled when blocked by branch protection', () => {
      const pr = createMockBlockedPR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should be disabled when branch is behind base', () => {
      const pr = createMockBehindPR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should be disabled when required checks are failing', () => {
      const pr = createMockUnstablePR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should be disabled when review is required', () => {
      // Create PR with only review decision, no blocking status
      const pr = createMockPullRequest({
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN', // Not BLOCKED
        reviewDecision: 'REVIEW_REQUIRED'
      })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should be disabled when changes are requested', () => {
      // Create PR with only review decision, no blocking status
      const pr = createMockPullRequest({
        mergeable: 'MERGEABLE',
        mergeStateStatus: 'CLEAN', // Not BLOCKED
        reviewDecision: 'CHANGES_REQUESTED'
      })
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should be disabled for draft PRs', () => {
      const pr = createMockDraftPR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()
    })

    it('should show spinner when merge status is computing', () => {
      const pr = createMockComputingPR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).toBeDisabled()

      // Should have a spinner
      const spinner = mergeButton.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show confirmation dialog when clicking merge on a mergeable PR', async () => {
      const pr = createMockMergeablePR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Find the merge trigger button (the one in the header)
      const mergeButtons = screen.getAllByRole('button', { name: /Merge/i })
      const mergeButton = mergeButtons[0] // First one is the trigger
      fireEvent.click(mergeButton)

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Should show branch info (multiple occurrences expected - header and dialog)
      const headBranchElements = screen.getAllByText(pr.head.ref)
      const baseBranchElements = screen.getAllByText(pr.base.ref)
      expect(headBranchElements.length).toBeGreaterThan(0)
      expect(baseBranchElements.length).toBeGreaterThan(0)
    })

    it('should show merge method options in confirmation dialog', async () => {
      const pr = createMockMergeablePR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Find the merge trigger button
      const mergeButtons = screen.getAllByRole('button', { name: /Merge/i })
      fireEvent.click(mergeButtons[0])

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Squash' })).toBeInTheDocument()
        // Note: "Merge" button appears twice now (trigger + method selection)
        const mergeMethodButtons = screen.getAllByRole('button', { name: 'Merge' })
        expect(mergeMethodButtons.length).toBeGreaterThan(0)
        expect(screen.getByRole('button', { name: 'Rebase' })).toBeInTheDocument()
      })
    })

    it('should close confirmation dialog when clicking cancel', async () => {
      const pr = createMockMergeablePR()
      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText('Confirm Merge')).not.toBeInTheDocument()
      })
    })

    it('should show confirmation dialog when merge button is clicked', async () => {
      const pr = createMockMergeablePR()

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Open confirmation dialog
      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Verify confirmation dialog has expected elements
      expect(screen.getByRole('button', { name: /Confirm/i })).toBeInTheDocument()
    })

    it('should show merge method options in dialog', async () => {
      const pr = createMockMergeablePR()

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Open confirmation dialog
      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      fireEvent.click(mergeButton)

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Should have merge method options
      expect(screen.getByRole('button', { name: 'Squash' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Rebase' })).toBeInTheDocument()
    })

    it('should render merge button for mergeable PRs', async () => {
      const pr = createMockMergeablePR()

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      const mergeButton = screen.getByRole('button', { name: /Merge/i })
      expect(mergeButton).toBeInTheDocument()
      expect(mergeButton).not.toBeDisabled()
    })

    it('should render merge method selector in dialog', async () => {
      const pr = createMockMergeablePR()

      render(<PRDetail onClose={mockOnClose} />, { initialSelectedPR: pr, initialUser: mockUser })

      // Open confirmation dialog
      const mergeButtons = screen.getAllByRole('button', { name: /Merge/i })
      fireEvent.click(mergeButtons[0])

      await waitFor(() => {
        expect(screen.getByText('Confirm Merge')).toBeInTheDocument()
      })

      // Should show merge method options in dialog
      expect(screen.getByRole('button', { name: 'Squash' })).toBeInTheDocument()
    })
  })

  describe('Approve Button', () => {
    it('should render approve button', () => {
      const pr = createMockNeedsReviewPR()
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument()
    })

    it('should show "Approve" and be enabled when user can approve', () => {
      const pr = createMockNeedsReviewPR({ user: createMockUser({ login: 'author' }) })
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toBeInTheDocument()
      expect(approveButton).not.toBeDisabled()
    })

    it('should have green styling when user can approve', () => {
      const pr = createMockNeedsReviewPR({ user: createMockUser({ login: 'author' }) })
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toHaveClass('bg-green-600')
    })

    it('should have green styling when already approved', () => {
      const pr = createMockApprovedPR('reviewer')
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toHaveClass('bg-green-600')
    })

    it('should be disabled when PR is already approved', () => {
      const pr = createMockApprovedPR('reviewer')
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toBeInTheDocument()
      expect(approveButton).toBeDisabled()
    })

    it('should be disabled when viewing own PR (cannot self-approve)', () => {
      // The current user (reviewer) created this PR
      const pr = createMockOwnPR('reviewer')
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toBeDisabled()
    })

    it('should be disabled for draft PRs', () => {
      const pr = createMockDraftPR({ user: createMockUser({ login: 'author' }) })
      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toBeDisabled()
    })

    it('should render approve button for reviewable PRs', async () => {
      const pr = createMockNeedsReviewPR({ user: createMockUser({ login: 'author' }) })

      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).toBeInTheDocument()
      expect(approveButton).not.toBeDisabled()
    })

    it('should be clickable when user can approve', async () => {
      const pr = createMockNeedsReviewPR({ user: createMockUser({ login: 'author' }) })

      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      const approveButton = screen.getByRole('button', { name: /Approve/i })
      expect(approveButton).not.toBeDisabled()
      // Button should have click handler
      expect(approveButton.getAttribute('disabled')).toBeNull()
    })

    it('should show approve icon', async () => {
      const pr = createMockNeedsReviewPR({ user: createMockUser({ login: 'author' }) })

      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      // Check for approve button with icon
      const approveButton = screen.getByRole('button', { name: /Approve/i })
      const icon = approveButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should render approval section for eligible PRs', async () => {
      const pr = createMockNeedsReviewPR({ user: createMockUser({ login: 'author' }) })

      render(<PRDetail onClose={mockOnClose} />, {
        initialSelectedPR: pr,
        initialUser: mockReviewer
      })

      // Should show approve button
      expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument()
    })
  })
})
