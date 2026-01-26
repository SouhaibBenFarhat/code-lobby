import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ChatLoadingSkeleton,
  ContextSyncBanner,
  ErrorBanner,
  NoPRSelectedState,
  PRContextBanner,
  PREmptyState
} from './ChatEmptyStates'

describe('ChatEmptyStates', () => {
  describe('ChatLoadingSkeleton', () => {
    it('renders loading skeleton with animated elements', () => {
      render(<ChatLoadingSkeleton />)
      expect(screen.getByText('Loading conversation...')).toBeInTheDocument()
    })

    it('renders multiple skeleton items', () => {
      const { container } = render(<ChatLoadingSkeleton />)
      const animatedElements = container.querySelectorAll('.animate-pulse')
      expect(animatedElements.length).toBeGreaterThan(0)
    })
  })

  describe('PREmptyState', () => {
    const mockPR = {
      id: 'PR_kwDOJ2abc123',
      number: 42,
      title: 'Test PR Title',
      base: {
        repo: {
          full_name: 'owner/repo',
          name: 'repo',
          owner: { login: 'owner' }
        }
      },
      head: { sha: 'abc123' },
      user: { login: 'author', avatar_url: 'https://example.com/avatar.png' },
      state: 'OPEN' as const,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
      draft: false,
      comments: 0,
      additions: 10,
      deletions: 5,
      changed_files: 2
    }
    const mockOnStartPRChat = vi.fn()

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('renders PR information', () => {
      render(<PREmptyState selectedPR={mockPR} apiKey="sk-ant-test" />)

      expect(screen.getByText('#42 Test PR Title')).toBeInTheDocument()
      expect(screen.getByText('owner/repo')).toBeInTheDocument()
      expect(screen.getByText('No conversation yet for this PR')).toBeInTheDocument()
    })

    it('truncates long PR titles', () => {
      const longTitlePR = {
        ...mockPR,
        title: 'This is a very long PR title that should be truncated after 50 characters'
      }
      render(<PREmptyState selectedPR={longTitlePR} apiKey="sk-ant-test" />)

      // The title is truncated with slice(0, 50) + '...'
      const truncatedTitle = 'This is a very long PR title that should be trunca'
      expect(screen.getByText(`#42 ${truncatedTitle}...`)).toBeInTheDocument()
    })

    it('shows start chat button when apiKey and onStartPRChat are provided', () => {
      render(
        <PREmptyState selectedPR={mockPR} apiKey="sk-ant-test" onStartPRChat={mockOnStartPRChat} />
      )

      expect(screen.getByRole('button', { name: /start chatting/i })).toBeInTheDocument()
    })

    it('calls onStartPRChat when button is clicked', async () => {
      render(
        <PREmptyState selectedPR={mockPR} apiKey="sk-ant-test" onStartPRChat={mockOnStartPRChat} />
      )

      await userEvent.click(screen.getByRole('button', { name: /start chatting/i }))
      expect(mockOnStartPRChat).toHaveBeenCalledWith(mockPR)
    })

    it('shows API key message when no API key', () => {
      render(<PREmptyState selectedPR={mockPR} apiKey={null} />)

      expect(screen.getByText(/enter your api key/i)).toBeInTheDocument()
    })

    it('hides start button when no API key', () => {
      render(<PREmptyState selectedPR={mockPR} apiKey={null} onStartPRChat={mockOnStartPRChat} />)

      expect(screen.queryByRole('button', { name: /start chatting/i })).not.toBeInTheDocument()
    })
  })

  describe('NoPRSelectedState', () => {
    it('shows No PR Selected title', () => {
      render(<NoPRSelectedState apiKey="sk-ant-test" />)
      expect(screen.getByText('No PR Selected')).toBeInTheDocument()
    })

    it('shows select PR message when API key exists', () => {
      render(<NoPRSelectedState apiKey="sk-ant-test" />)
      expect(
        screen.getByText(/select a pull request from the list to start chatting/i)
      ).toBeInTheDocument()
    })

    it('shows API key message when no API key', () => {
      render(<NoPRSelectedState apiKey={null} />)
      expect(screen.getByText(/enter your api key/i)).toBeInTheDocument()
    })
  })

  describe('PRContextBanner', () => {
    it('renders PR context information', () => {
      render(<PRContextBanner prNumber={123} prTitle="My PR Title" repoFullName="owner/repo" />)

      expect(screen.getByText('#123 My PR Title')).toBeInTheDocument()
      expect(screen.getByText('owner/repo')).toBeInTheDocument()
    })
  })

  describe('ContextSyncBanner', () => {
    it('renders sync message when visible', () => {
      render(<ContextSyncBanner isVisible={true} />)
      expect(screen.getByText('Syncing PR context...')).toBeInTheDocument()
    })

    it('returns null when not visible', () => {
      const { container } = render(<ContextSyncBanner isVisible={false} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('ErrorBanner', () => {
    it('renders error message when error exists', () => {
      render(<ErrorBanner error="Something went wrong" />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('returns null when no error', () => {
      const { container } = render(<ErrorBanner error={null} />)
      expect(container.firstChild).toBeNull()
    })
  })
})
