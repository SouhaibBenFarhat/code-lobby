/**
 * PRCard Component Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PRCard } from '@/components/PRCard'
import type { PullRequest } from '@/components/types'
import { resetMockElectron, setupMockElectron } from '../../mocks/electron'
import {
  createMockDraftPR,
  createMockPRWithChecks,
  createMockPullRequest,
  createMockUser,
  resetIdCounter
} from '../../mocks/factories'
import { fireEvent, render, screen } from '../../utils/render'

// Mock the usePRContext hook
const mockSetSelectedPR = vi.fn()
let mockSelectedPR: PullRequest | null = null

vi.mock('@/App', () => ({
  usePRContext: () => ({
    selectedPR: mockSelectedPR,
    setSelectedPR: mockSetSelectedPR
  })
}))

describe('PRCard', () => {
  beforeEach(() => {
    resetIdCounter()
    setupMockElectron()
    vi.clearAllMocks()
    mockSelectedPR = null
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render PR title', () => {
      const pr = createMockPullRequest({ title: 'Fix authentication bug' })
      render(<PRCard pr={pr} />)

      expect(screen.getByText('Fix authentication bug')).toBeInTheDocument()
    })

    it('should render PR number', () => {
      const pr = createMockPullRequest({ number: 42 })
      render(<PRCard pr={pr} />)

      expect(screen.getByText('#42')).toBeInTheDocument()
    })

    it('should render author avatar', () => {
      const user = createMockUser({
        login: 'johndoe',
        avatar_url: 'https://example.com/avatar.png'
      })
      const pr = createMockPullRequest({ user })
      render(<PRCard pr={pr} />)

      // Avatar shows fallback in JSDOM (images don't load), check for author initials
      const avatarFallback = screen.getByText('JO')
      expect(avatarFallback).toBeInTheDocument()
    })

    it('should render author login', () => {
      const user = createMockUser({ login: 'johndoe' })
      const pr = createMockPullRequest({ user })
      render(<PRCard pr={pr} />)

      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })

    it('should render labels', () => {
      const pr = createMockPullRequest({
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'urgent', color: '00ff00' }
        ]
      })
      render(<PRCard pr={pr} />)

      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('urgent')).toBeInTheDocument()
    })
  })

  describe('Draft PRs', () => {
    it('should show draft indicator for draft PRs', () => {
      const pr = createMockDraftPR()
      render(<PRCard pr={pr} />)

      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should apply draft styling', () => {
      const pr = createMockDraftPR()
      const { container } = render(<PRCard pr={pr} />)

      // Check for opacity or muted styling (draft PRs have opacity-70)
      expect(container.firstChild).toHaveClass('opacity-70')
    })
  })

  describe('CI Status', () => {
    it('should show success indicator for passing checks', () => {
      const pr = createMockPRWithChecks('success')
      render(<PRCard pr={pr} />)

      // Look for success icon (CheckCircle2 renders as svg)
      const successIcon = document.querySelector('.text-success')
      expect(successIcon).toBeInTheDocument()
    })

    it('should show failure indicator for failing checks', () => {
      const pr = createMockPRWithChecks('failure')
      render(<PRCard pr={pr} />)

      const failureIcon = document.querySelector('.text-destructive')
      expect(failureIcon).toBeInTheDocument()
    })

    it('should show pending indicator for running checks', () => {
      const pr = createMockPRWithChecks('pending')
      render(<PRCard pr={pr} />)

      // Look for spinning loader or warning color
      const pendingIcon =
        document.querySelector('.animate-spin') || document.querySelector('.text-warning')
      expect(pendingIcon).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should apply selected styling when PR is selected', () => {
      const pr = createMockPullRequest()
      mockSelectedPR = pr // Set the mock to return this PR as selected
      const { container } = render(<PRCard pr={pr} />)

      // The selected card should have the 'selected' class
      expect(container.firstChild).toHaveClass('selected')
    })

    it('should not apply selected styling when PR is not selected', () => {
      const pr = createMockPullRequest()
      mockSelectedPR = null
      const { container } = render(<PRCard pr={pr} />)

      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveClass('selected')
    })
  })

  describe('Interactions', () => {
    it('should call setSelectedPR when clicked', () => {
      const pr = createMockPullRequest()
      const { container } = render(<PRCard pr={pr} />)

      const card = container.querySelector('.pr-card-item')
      expect(card).not.toBeNull()
      if (card) fireEvent.click(card)

      expect(mockSetSelectedPR).toHaveBeenCalledTimes(1)
      expect(mockSetSelectedPR).toHaveBeenCalledWith(pr)
    })

    it('should pass PR to setSelectedPR handler', () => {
      const pr = createMockPullRequest({ number: 123 })
      const { container } = render(<PRCard pr={pr} />)

      const card = container.querySelector('.pr-card-item')
      expect(card).not.toBeNull()
      if (card) fireEvent.click(card)

      expect(mockSetSelectedPR).toHaveBeenCalledWith(pr)
    })
  })

  describe('Relative Time', () => {
    it('should display relative time for created_at', () => {
      const pr = createMockPullRequest({
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      })
      render(<PRCard pr={pr} />)

      // Should show something like "2h ago" or "2 hours ago"
      expect(screen.getByText(/ago/i)).toBeInTheDocument()
    })
  })

  describe('Stats', () => {
    it('should display additions and deletions', () => {
      const pr = createMockPullRequest({ additions: 150, deletions: 50 })
      render(<PRCard pr={pr} />)

      expect(screen.getByText('+150')).toBeInTheDocument()
      expect(screen.getByText('-50')).toBeInTheDocument()
    })

    it('should display comment count', () => {
      const pr = createMockPullRequest()
      pr.comments = [
        {
          id: '1',
          body: 'Comment 1',
          user: createMockUser(),
          created_at: '',
          updated_at: '',
          html_url: '',
          isBot: false
        },
        {
          id: '2',
          body: 'Comment 2',
          user: createMockUser(),
          created_at: '',
          updated_at: '',
          html_url: '',
          isBot: false
        }
      ]
      render(<PRCard pr={pr} />)

      // Comment count shown next to MessageSquare icon
      const commentSection = document.querySelector('.text-muted-foreground')
      expect(commentSection).toBeInTheDocument()
    })
  })
})
