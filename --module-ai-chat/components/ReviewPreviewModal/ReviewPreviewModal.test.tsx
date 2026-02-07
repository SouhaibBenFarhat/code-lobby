/**
 * ReviewPreviewModal Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ReviewData } from '../../types'
import { ReviewPreviewModal } from './ReviewPreviewModal'

// Mock @ui-kit components
vi.mock('@ui-kit', async () => {
  const actual = await vi.importActual<typeof import('@ui-kit')>('@ui-kit')
  return {
    ...actual,
    // Mock MarkdownEditor to avoid complex DOM interactions
    MarkdownEditor: ({
      value,
      onChange,
      placeholder,
      'data-testid': testId
    }: {
      value: string
      onChange: (value: string) => void
      placeholder?: string
      'data-testid'?: string
    }) => (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        data-testid={testId}
      />
    ),
    // Mock DiffViewer since it has complex DOM
    DiffViewer: ({
      patch,
      fileName,
      comments,
      renderComment
    }: {
      patch: string
      fileName: string
      comments: Array<{ id: string; line: number; content: string }>
      renderComment?: (comment: { id: string; line: number; content: string }) => React.ReactNode
    }) => (
      <div data-testid="mock-diff-viewer" data-filename={fileName} data-has-patch={!!patch}>
        {comments.map((c) =>
          renderComment ? (
            <div key={c.id}>{renderComment(c)}</div>
          ) : (
            <div key={c.id} data-testid={`comment-${c.id}`}>
              Line {c.line}: {c.content}
            </div>
          )
        )}
      </div>
    ),
    // Mock ScrollArea
    ScrollArea: ({ children, className }: { children: React.ReactNode; className?: string }) => (
      <div className={className} data-testid="scroll-area">
        {children}
      </div>
    )
  }
})

// Helper to create mock review data
const createMockReview = (overrides?: Partial<ReviewData>): ReviewData => ({
  summary: 'This is a test review summary',
  verdict: 'approve',
  comments: [
    { id: 'c1', file: 'src/utils.ts', line: 10, body: 'Consider using const here' },
    { id: 'c2', file: 'src/api.ts', line: 25, body: 'Add error handling' }
  ],
  ...overrides
})

// Mock PR files
const mockPRFiles = [
  {
    path: 'src/utils.ts',
    patch: '@@ -1,5 +1,6 @@\n+const foo = bar;',
    additions: 1,
    deletions: 0,
    changeType: 'MODIFIED' as const
  },
  {
    path: 'src/api.ts',
    patch: '@@ -20,5 +20,6 @@\n+return data;',
    additions: 1,
    deletions: 0,
    changeType: 'MODIFIED' as const
  }
]

describe('ReviewPreviewModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    review: createMockReview(),
    prFiles: mockPRFiles,
    prTitle: 'Fix authentication bug',
    repoFullName: 'owner/repo',
    onSubmit: vi.fn().mockResolvedValue({ success: true }),
    isSubmitting: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render the modal when open', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      expect(screen.getByText('Review Preview')).toBeInTheDocument()
    })

    it('should not render when review is null', () => {
      render(<ReviewPreviewModal {...defaultProps} review={null} />)
      expect(screen.queryByText('Review Preview')).not.toBeInTheDocument()
    })

    it('should display PR title and repo name', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // The text is in format "owner/repo · Fix authentication bug"
      expect(screen.getByText(/owner\/repo/)).toBeInTheDocument()
      expect(screen.getByText(/Fix authentication bug/)).toBeInTheDocument()
    })

    it('should display the review summary in markdown editor', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      const summaryEditor = screen.getByTestId('review-summary-editor')
      expect(summaryEditor).toHaveValue('This is a test review summary')
    })

    it('should display comment count', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      expect(screen.getByText('Review Comments (2)')).toBeInTheDocument()
    })
  })

  describe('sidebar navigation', () => {
    it('should show file navigation sidebar when there are comments', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      expect(screen.getByText('Files (2)')).toBeInTheDocument()
    })

    it('should show file names in sidebar', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // File names appear in both sidebar and file headers
      expect(screen.getAllByText('utils.ts').length).toBeGreaterThan(0)
      expect(screen.getAllByText('api.ts').length).toBeGreaterThan(0)
    })

    it('should show comment count badges in sidebar', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // Each file has 1 comment, shown as badge
      const badges = screen.getAllByText('1')
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('verdict selection', () => {
    it('should show all three verdict options', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // Use getAllByText since verdict text appears in buttons and footer
      const approveElements = screen.getAllByText('Approve')
      const requestChangesElements = screen.getAllByText('Request Changes')
      const commentElements = screen.getAllByText('Comment')

      expect(approveElements.length).toBeGreaterThanOrEqual(1)
      expect(requestChangesElements.length).toBeGreaterThanOrEqual(1)
      expect(commentElements.length).toBeGreaterThanOrEqual(1)
    })

    it('should have approve selected by default when verdict is approve', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // Find the verdict selection section by looking for buttons with verdict text
      const approveButtons = screen.getAllByRole('button', { name: /approve/i })
      // The first one should be the verdict button (in the selection area)
      const approveButton = approveButtons[0]
      expect(approveButton).toHaveClass('border-success-border')
    })

    it('should change verdict when clicking a different option', async () => {
      const user = userEvent.setup()
      render(<ReviewPreviewModal {...defaultProps} />)

      // Find the request changes button
      const requestChangesButtons = screen.getAllByRole('button', { name: /request changes/i })
      const requestChangesButton = requestChangesButtons[0]

      await user.click(requestChangesButton)

      expect(requestChangesButton).toHaveClass('border-warning-border')
    })

    it('should display request_changes verdict correctly', () => {
      render(
        <ReviewPreviewModal
          {...defaultProps}
          review={createMockReview({ verdict: 'request_changes' })}
        />
      )
      const requestChangesButtons = screen.getAllByRole('button', { name: /request changes/i })
      const requestChangesButton = requestChangesButtons[0]
      expect(requestChangesButton).toHaveClass('border-warning-border')
    })

    it('should display comment verdict correctly', () => {
      render(
        <ReviewPreviewModal {...defaultProps} review={createMockReview({ verdict: 'comment' })} />
      )
      // Find the Comment verdict button - it has an icon followed by "Comment" text
      const allButtons = screen.getAllByRole('button')
      const commentButton = allButtons.find(
        (btn) =>
          btn.textContent?.includes('Comment') && btn.classList.contains('border-info-border')
      )
      expect(commentButton).toBeTruthy()
    })
  })

  describe('summary editing', () => {
    it('should allow editing the summary', async () => {
      const user = userEvent.setup()
      render(<ReviewPreviewModal {...defaultProps} />)

      const summaryEditor = screen.getByTestId('review-summary-editor')
      await user.clear(summaryEditor)
      await user.type(summaryEditor, 'Updated summary')

      expect(summaryEditor).toHaveValue('Updated summary')
    })
  })

  describe('file tree', () => {
    it('should display files with comments', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // FileHeader shows filename separately from directory
      // Files appear both in sidebar and file headers
      expect(screen.getAllByText('utils.ts').length).toBeGreaterThan(0)
      expect(screen.getAllByText('api.ts').length).toBeGreaterThan(0)
    })

    it('should show comment count per file', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // Each file has 1 comment
      expect(screen.getAllByText('1 comment')).toHaveLength(2)
    })

    it('should expand files with comments by default', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // DiffViewer should be rendered for expanded files
      expect(screen.getAllByTestId('mock-diff-viewer')).toHaveLength(2)
    })

    it('should collapse file when clicking header', async () => {
      const user = userEvent.setup()
      render(<ReviewPreviewModal {...defaultProps} />)

      // Click on the first file header to collapse (the button containing file name)
      const fileButton = screen.getByRole('button', { name: /src\/api\.ts/i })
      await user.click(fileButton)

      // Now only one diff viewer should be visible
      expect(screen.getAllByTestId('mock-diff-viewer')).toHaveLength(1)
    })
  })

  describe('comment deletion', () => {
    it('should show delete buttons for comments', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      // Find delete buttons (Trash2 icons with title)
      const deleteButtons = screen.getAllByTitle('Remove this comment')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('should remove comment when delete button is clicked', async () => {
      const user = userEvent.setup()
      render(<ReviewPreviewModal {...defaultProps} />)

      const deleteButtons = screen.getAllByTitle('Remove this comment')
      await user.click(deleteButtons[0])

      // Comment count should decrease
      expect(screen.getByText('Review Comments (1)')).toBeInTheDocument()
    })
  })

  describe('comment editing', () => {
    it('should show editors for all comments by default', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      const editors = screen.getAllByTestId('edit-comment-editor')
      expect(editors.length).toBe(2) // One for each comment
    })

    it('should allow direct editing of comments', async () => {
      const user = userEvent.setup()
      render(<ReviewPreviewModal {...defaultProps} />)

      const editors = screen.getAllByTestId('edit-comment-editor')
      await user.clear(editors[0])
      await user.type(editors[0], 'Updated comment body')

      expect(editors[0]).toHaveValue('Updated comment body')
    })
  })

  describe('submission', () => {
    it('should call onSubmit with correct data when Submit Review is clicked', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue({ success: true })
      render(<ReviewPreviewModal {...defaultProps} onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button', { name: /submit review/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'This is a test review summary',
          'approve',
          expect.arrayContaining([
            expect.objectContaining({ path: 'src/utils.ts', line: 10 }),
            expect.objectContaining({ path: 'src/api.ts', line: 25 })
          ])
        )
      })
    })

    it('should close modal on successful submission', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const onSubmit = vi.fn().mockResolvedValue({ success: true })
      render(<ReviewPreviewModal {...defaultProps} onClose={onClose} onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button', { name: /submit review/i }))

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled()
      })
    })

    it('should show error message on failed submission', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue({ success: false })
      render(<ReviewPreviewModal {...defaultProps} onSubmit={onSubmit} />)

      await user.click(screen.getByRole('button', { name: /submit review/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to submit review. Please try again.')).toBeInTheDocument()
      })
    })

    it('should show loading state while submitting', () => {
      render(<ReviewPreviewModal {...defaultProps} isSubmitting={true} />)
      expect(screen.getByText('Submitting...')).toBeInTheDocument()
    })

    it('should disable submit button when summary is empty', async () => {
      const user = userEvent.setup()
      render(<ReviewPreviewModal {...defaultProps} />)

      const summaryEditor = screen.getByTestId('review-summary-editor')
      await user.clear(summaryEditor)

      const submitButton = screen.getByRole('button', { name: /submit review/i })
      expect(submitButton).toBeDisabled()
    })

    it('should disable buttons while submitting', () => {
      render(<ReviewPreviewModal {...defaultProps} isSubmitting={true} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled()
    })

    it('should submit with edited comment', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn().mockResolvedValue({ success: true })
      render(<ReviewPreviewModal {...defaultProps} onSubmit={onSubmit} />)

      // Edit first comment directly in the editor
      const editors = screen.getAllByTestId('edit-comment-editor')
      await user.clear(editors[0])
      await user.type(editors[0], 'Edited comment body')

      // Submit
      await user.click(screen.getByRole('button', { name: /submit review/i }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          'This is a test review summary',
          'approve',
          expect.arrayContaining([expect.objectContaining({ body: 'Edited comment body' })])
        )
      })
    })
  })

  describe('cancel', () => {
    it('should call onClose when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      render(<ReviewPreviewModal {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('empty comments', () => {
    it('should show message when no comments', () => {
      render(<ReviewPreviewModal {...defaultProps} review={createMockReview({ comments: [] })} />)
      expect(screen.getByText('No inline comments to display')).toBeInTheDocument()
    })

    it('should show helper text when no inline comments', () => {
      render(<ReviewPreviewModal {...defaultProps} review={createMockReview({ comments: [] })} />)
      expect(
        screen.getByText('No inline comments - only summary will be posted')
      ).toBeInTheDocument()
    })

    it('should not show sidebar when no comments', () => {
      render(<ReviewPreviewModal {...defaultProps} review={createMockReview({ comments: [] })} />)
      expect(screen.queryByText('Files (0)')).not.toBeInTheDocument()
    })
  })

  describe('footer information', () => {
    it('should display comment count in footer when there are comments', () => {
      render(<ReviewPreviewModal {...defaultProps} />)
      expect(screen.getByText(/with 2 inline comments/)).toBeInTheDocument()
    })

    it('should not display comment count when there are no comments', () => {
      render(<ReviewPreviewModal {...defaultProps} review={createMockReview({ comments: [] })} />)
      expect(screen.queryByText(/with \d+ inline comment/)).not.toBeInTheDocument()
    })
  })

  describe('reset on reopen', () => {
    it('should reset state when modal reopens with new review', () => {
      const { rerender } = render(<ReviewPreviewModal {...defaultProps} isOpen={false} />)

      // Open with initial review
      rerender(<ReviewPreviewModal {...defaultProps} isOpen={true} />)
      expect(screen.getByTestId('review-summary-editor')).toHaveValue(
        'This is a test review summary'
      )

      // Close and reopen with new review
      rerender(<ReviewPreviewModal {...defaultProps} isOpen={false} />)
      rerender(
        <ReviewPreviewModal
          {...defaultProps}
          isOpen={true}
          review={createMockReview({ summary: 'New summary' })}
        />
      )

      expect(screen.getByTestId('review-summary-editor')).toHaveValue('New summary')
    })

    it('should reset comments when modal reopens with new review', () => {
      const { rerender } = render(<ReviewPreviewModal {...defaultProps} />)

      // Check initial comments
      expect(screen.getAllByTestId('edit-comment-editor')).toHaveLength(2)

      // Close and reopen with different review
      rerender(<ReviewPreviewModal {...defaultProps} isOpen={false} />)
      rerender(
        <ReviewPreviewModal
          {...defaultProps}
          isOpen={true}
          review={createMockReview({
            comments: [{ id: 'c3', file: 'new.ts', line: 1, body: 'New comment' }]
          })}
        />
      )

      // Should show only the new comment
      expect(screen.getAllByTestId('edit-comment-editor')).toHaveLength(1)
    })
  })
})
