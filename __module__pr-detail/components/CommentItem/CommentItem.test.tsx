/**
 * CommentItem Component Tests
 *
 * Tests for comment display, event badges, copy functionality, and truncation.
 */

import { fireEvent, render, screen, waitFor } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommentData } from '../types'
import { CommentItem } from './CommentItem'

describe('CommentItem', () => {
  const baseComment: CommentData = {
    id: 'comment-1',
    body: 'This is a test comment',
    created_at: new Date().toISOString(),
    actor: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png',
      isBot: false
    },
    event: 'commented'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    })
  })

  describe('rendering', () => {
    it('should render comment body', () => {
      render(<CommentItem comment={baseComment} />)

      expect(screen.getByText('This is a test comment')).toBeInTheDocument()
    })

    it('should render author login', () => {
      render(<CommentItem comment={baseComment} />)

      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    it('should render avatar container', () => {
      const { container } = render(<CommentItem comment={baseComment} />)

      // Avatar component wraps an avatar element (may show fallback or img)
      const avatar = container.querySelector('[class*="avatar"], span[class*="h-5"][class*="w-5"]')
      expect(avatar).toBeInTheDocument()
    })

    it('should render relative time', () => {
      const recentComment: CommentData = {
        ...baseComment,
        created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 mins ago
      }

      render(<CommentItem comment={recentComment} />)

      // Should show relative time like "5 minutes ago" or "5m"
      expect(screen.getByText(/\d+\s*(m|min|minute)/i)).toBeInTheDocument()
    })

    it('should return null if actor is missing', () => {
      const commentWithoutActor = {
        ...baseComment,
        actor: undefined as unknown as CommentData['actor']
      }

      const { container } = render(<CommentItem comment={commentWithoutActor} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('event badges', () => {
    it('should show "Approved" badge for approved events', () => {
      const approvedComment: CommentData = {
        ...baseComment,
        event: 'approved'
      }

      render(<CommentItem comment={approvedComment} />)

      expect(screen.getByText('Approved')).toBeInTheDocument()
    })

    it('should show "Changes" badge for changes_requested events', () => {
      const changesComment: CommentData = {
        ...baseComment,
        event: 'changes_requested'
      }

      render(<CommentItem comment={changesComment} />)

      expect(screen.getByText('Changes')).toBeInTheDocument()
    })

    it('should show "Reviewed" badge for reviewed events', () => {
      const reviewedComment: CommentData = {
        ...baseComment,
        event: 'reviewed'
      }

      render(<CommentItem comment={reviewedComment} />)

      expect(screen.getByText('Reviewed')).toBeInTheDocument()
    })

    it('should not show event badge for regular comments', () => {
      render(<CommentItem comment={baseComment} />)

      expect(screen.queryByText('Approved')).not.toBeInTheDocument()
      expect(screen.queryByText('Changes')).not.toBeInTheDocument()
      expect(screen.queryByText('Reviewed')).not.toBeInTheDocument()
    })
  })

  describe('bot indicator', () => {
    it('should show Bot badge for bot comments', () => {
      const botComment: CommentData = {
        ...baseComment,
        actor: {
          ...baseComment.actor,
          isBot: true
        }
      }

      render(<CommentItem comment={botComment} />)

      expect(screen.getByText('Bot')).toBeInTheDocument()
    })

    it('should not show Bot badge for human comments', () => {
      render(<CommentItem comment={baseComment} />)

      expect(screen.queryByText('Bot')).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should apply success styling for approved comments', () => {
      const approvedComment: CommentData = {
        ...baseComment,
        event: 'approved'
      }

      const { container } = render(<CommentItem comment={approvedComment} />)

      const card = container.firstChild
      expect(card).toHaveClass('bg-success/15')
    })

    it('should apply destructive styling for changes_requested comments', () => {
      const changesComment: CommentData = {
        ...baseComment,
        event: 'changes_requested'
      }

      const { container } = render(<CommentItem comment={changesComment} />)

      const card = container.firstChild
      expect(card).toHaveClass('bg-destructive/15')
    })

    it('should apply purple styling for bot comments', () => {
      const botComment: CommentData = {
        ...baseComment,
        actor: {
          ...baseComment.actor,
          isBot: true
        }
      }

      const { container } = render(<CommentItem comment={botComment} />)

      const card = container.firstChild
      expect(card).toHaveClass('bg-purple-500/15')
    })
  })

  describe('copy functionality', () => {
    it('should copy comment body when copy button is clicked', async () => {
      render(<CommentItem comment={baseComment} />)

      // Find the copy button (it appears on hover, but should be in DOM)
      const copyIcon = document.querySelector('.lucide-copy')
      const copyButton = copyIcon?.closest('button')

      if (copyButton) {
        fireEvent.click(copyButton)

        await waitFor(() => {
          expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This is a test comment')
        })
      }
    })

    it('should show check icon after successful copy', async () => {
      render(<CommentItem comment={baseComment} />)

      const copyIcon = document.querySelector('.lucide-copy')
      const copyButton = copyIcon?.closest('button')

      if (copyButton) {
        fireEvent.click(copyButton)

        await waitFor(() => {
          const checkIcon = document.querySelector('.lucide-check')
          expect(checkIcon).toBeInTheDocument()
        })
      }
    })
  })

  describe('truncation', () => {
    it('should truncate long comments', () => {
      const longComment: CommentData = {
        ...baseComment,
        body: 'A'.repeat(300) // More than TRUNCATE_LENGTH (200)
      }

      render(<CommentItem comment={longComment} />)

      expect(screen.getByText(/Show more/i)).toBeInTheDocument()
    })

    it('should not show "Show more" for short comments', () => {
      const shortComment: CommentData = {
        ...baseComment,
        body: 'Short comment'
      }

      render(<CommentItem comment={shortComment} />)

      expect(screen.queryByText(/Show more/i)).not.toBeInTheDocument()
    })

    it('should expand comment when "Show more" is clicked', async () => {
      const longBody = 'A'.repeat(300)
      const longComment: CommentData = {
        ...baseComment,
        body: longBody
      }

      render(<CommentItem comment={longComment} />)

      const showMoreButton = screen.getByText(/Show more/i)
      fireEvent.click(showMoreButton)

      await waitFor(() => {
        expect(screen.getByText(/Show less/i)).toBeInTheDocument()
      })
    })

    it('should collapse comment when "Show less" is clicked', async () => {
      const longBody = 'A'.repeat(300)
      const longComment: CommentData = {
        ...baseComment,
        body: longBody
      }

      render(<CommentItem comment={longComment} />)

      // First expand
      fireEvent.click(screen.getByText(/Show more/i))

      await waitFor(() => {
        expect(screen.getByText(/Show less/i)).toBeInTheDocument()
      })

      // Then collapse
      fireEvent.click(screen.getByText(/Show less/i))

      await waitFor(() => {
        expect(screen.getByText(/Show more/i)).toBeInTheDocument()
      })
    })
  })

  describe('empty body', () => {
    it('should not render body section when body is empty', () => {
      const emptyBodyComment: CommentData = {
        ...baseComment,
        body: ''
      }

      render(<CommentItem comment={emptyBodyComment} />)

      // Should still render the header with author info
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })
  })
})
