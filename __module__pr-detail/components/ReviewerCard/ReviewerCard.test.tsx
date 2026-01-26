/**
 * ReviewerCard Component Tests
 *
 * Tests for reviewer feedback display, inline comments, and actions.
 */

import { fireEvent, render, screen, waitFor } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReviewerFeedback } from '../types'
import { ReviewerCard } from './ReviewerCard'

describe('ReviewerCard', () => {
  const baseReviewer: ReviewerFeedback = {
    login: 'reviewer1',
    avatar_url: 'https://github.com/reviewer1.png',
    isBot: false,
    reviewState: 'approved',
    reviewBody: 'Looks good to me!',
    reviewDate: new Date().toISOString(),
    inlineComments: []
  }

  const prUrl = 'https://github.com/test-org/repo/pull/1'

  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  describe('rendering', () => {
    it('should render reviewer login', () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      expect(screen.getByText('reviewer1')).toBeInTheDocument()
    })

    it('should render avatar container', () => {
      const { container } = render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      // Avatar component wraps an avatar element (may show fallback or img)
      const avatar = container.querySelector('[class*="avatar"], span[class*="h-6"][class*="w-6"]')
      expect(avatar).toBeInTheDocument()
    })

    it('should render review body when expanded', () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      expect(screen.getByText('Looks good to me!')).toBeInTheDocument()
    })

    it('should render relative time', () => {
      const reviewer: ReviewerFeedback = {
        ...baseReviewer,
        reviewDate: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      }

      render(<ReviewerCard reviewer={reviewer} prUrl={prUrl} />)

      // formatRelativeTime returns strings like "1h", "1 hour ago", etc.
      // The text should contain time-related content
      const timeElement = screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && /\d+\s*(h|hour|min|m|sec|s|d|day)/i.test(content)
      })
      expect(timeElement).toBeInTheDocument()
    })
  })

  describe('review state badges', () => {
    it('should show "Approved" badge for approved state', () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('should show "Changes requested" badge for changes_requested state', () => {
      const reviewer: ReviewerFeedback = {
        ...baseReviewer,
        reviewState: 'changes_requested'
      }

      render(<ReviewerCard reviewer={reviewer} prUrl={prUrl} />)

      expect(screen.getByText('Changes requested')).toBeInTheDocument()
    })

    it('should show "Commented" badge for commented state', () => {
      const reviewer: ReviewerFeedback = {
        ...baseReviewer,
        reviewState: 'commented'
      }

      render(<ReviewerCard reviewer={reviewer} prUrl={prUrl} />)

      expect(screen.getByText('Commented')).toBeInTheDocument()
    })

    it('should not show badge when reviewState is null', () => {
      const reviewer: ReviewerFeedback = {
        ...baseReviewer,
        reviewState: null
      }

      render(<ReviewerCard reviewer={reviewer} prUrl={prUrl} />)

      expect(screen.queryByText('Approved')).not.toBeInTheDocument()
      expect(screen.queryByText('Changes requested')).not.toBeInTheDocument()
      expect(screen.queryByText('Commented')).not.toBeInTheDocument()
    })
  })

  describe('bot indicator', () => {
    it('should show Bot badge for bot reviewers', () => {
      const botReviewer: ReviewerFeedback = {
        ...baseReviewer,
        isBot: true
      }

      render(<ReviewerCard reviewer={botReviewer} prUrl={prUrl} />)

      expect(screen.getByText('Bot')).toBeInTheDocument()
    })

    it('should not show Bot badge for human reviewers', () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      expect(screen.queryByText('Bot')).not.toBeInTheDocument()
    })
  })

  describe('collapse/expand', () => {
    it('should be expanded by default', () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      expect(screen.getByText('Looks good to me!')).toBeInTheDocument()
    })

    it('should collapse when header is clicked', async () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      const header = screen.getByText('reviewer1').closest('button')
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.queryByText('Looks good to me!')).not.toBeInTheDocument()
      })
    })

    it('should expand when header is clicked again', async () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      const header = screen.getByText('reviewer1').closest('button')

      // Collapse
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.queryByText('Looks good to me!')).not.toBeInTheDocument()
      })

      // Expand
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.getByText('Looks good to me!')).toBeInTheDocument()
      })
    })
  })

  describe('inline comments', () => {
    const reviewerWithComments: ReviewerFeedback = {
      ...baseReviewer,
      inlineComments: [
        {
          id: 'comment-1',
          body: 'Consider using a more descriptive name',
          created_at: new Date().toISOString(),
          path: 'src/components/Button.tsx',
          line: 10,
          isResolved: false
        },
        {
          id: 'comment-2',
          body: 'This looks good now',
          created_at: new Date().toISOString(),
          path: 'src/utils/helper.ts',
          line: 25,
          diffHunk: '@@ -20,5 +20,6 @@\n-old line\n+new line',
          isResolved: true
        }
      ]
    }

    it('should show inline comments count', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('Inline Comments (2)')).toBeInTheDocument()
    })

    it('should show open/unresolved count', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('1 open')).toBeInTheDocument()
    })

    it('should show resolved count', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('1 resolved')).toBeInTheDocument()
    })

    it('should show comment file names', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('Button.tsx')).toBeInTheDocument()
      expect(screen.getByText('helper.ts')).toBeInTheDocument()
    })

    it('should show comment line numbers', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('L10')).toBeInTheDocument()
      expect(screen.getByText('L25')).toBeInTheDocument()
    })

    it('should show comment body', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('Consider using a more descriptive name')).toBeInTheDocument()
      expect(screen.getByText('This looks good now')).toBeInTheDocument()
    })

    it('should show "Resolved" badge for resolved comments', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })

    it('should show diff hunk preview when available', () => {
      render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      expect(screen.getByText(/new line/)).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should apply success border for approved reviews', () => {
      const { container } = render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      const card = container.firstChild
      expect(card).toHaveClass('border-success/30')
    })

    it('should apply destructive border for changes_requested reviews', () => {
      const reviewer: ReviewerFeedback = {
        ...baseReviewer,
        reviewState: 'changes_requested'
      }

      const { container } = render(<ReviewerCard reviewer={reviewer} prUrl={prUrl} />)

      const card = container.firstChild
      expect(card).toHaveClass('border-destructive/30')
    })
  })

  describe('actions', () => {
    it('should open GitHub files page when "View in GitHub" is clicked', () => {
      const mockOpen = vi.fn()
      vi.spyOn(window, 'open').mockImplementation(mockOpen)

      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      const viewButton = screen.getByRole('button', { name: /View in GitHub/i })
      fireEvent.click(viewButton)

      expect(mockOpen).toHaveBeenCalledWith(`${prUrl}/files`, '_blank')
    })

    it('should copy review content when "Copy" is clicked', async () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      const copyButton = screen.getByRole('button', { name: /Copy/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalled()
        const writtenText = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock
          .calls[0][0]
        expect(writtenText).toContain('Review by reviewer1')
        expect(writtenText).toContain('Status: approved')
        expect(writtenText).toContain('Looks good to me!')
      })
    })

    it('should show check icon after successful copy', async () => {
      render(<ReviewerCard reviewer={baseReviewer} prUrl={prUrl} />)

      const copyButton = screen.getByRole('button', { name: /Copy/i })
      fireEvent.click(copyButton)

      await waitFor(() => {
        const checkIcon = document.querySelector('.lucide-check')
        expect(checkIcon).toBeInTheDocument()
      })
    })
  })

  describe('no review body', () => {
    it('should not show review summary when reviewBody is null', () => {
      const reviewer: ReviewerFeedback = {
        ...baseReviewer,
        reviewBody: null
      }

      render(<ReviewerCard reviewer={reviewer} prUrl={prUrl} />)

      expect(screen.queryByText('Review Summary')).not.toBeInTheDocument()
    })
  })

  describe('inline comments count in header', () => {
    it('should show inline comments count icon in header', () => {
      const reviewerWithComments: ReviewerFeedback = {
        ...baseReviewer,
        inlineComments: [
          {
            id: 'comment-1',
            body: 'Test',
            created_at: new Date().toISOString(),
            path: 'test.ts',
            line: 1,
            isResolved: false
          }
        ]
      }

      const { container } = render(<ReviewerCard reviewer={reviewerWithComments} prUrl={prUrl} />)

      const fileCodeIcon = container.querySelector('.lucide-file-code')
      expect(fileCodeIcon).toBeInTheDocument()
    })
  })
})
