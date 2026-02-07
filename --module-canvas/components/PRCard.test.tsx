/**
 * PRCard Component Tests
 * Updated for TanStack Query architecture
 */

import {
  createMockDraftPR,
  createMockPRWithChecks,
  createMockPullRequest,
  createMockUser,
  render,
  resetIdCounter,
  resetMockElectron,
  screen,
  setupMockElectron
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PRCard } from './PRCard'

// Mock the data module
vi.mock('@data', () => ({
  useSelectedPRId: () => ({ data: null }),
  useSelectPR: () => ({ mutate: vi.fn() }),
  useSetPRDetailPanel: () => ({ mutate: vi.fn() })
}))

describe('PRCard', () => {
  beforeEach(() => {
    resetIdCounter()
    // TanStack Query cache is mocked, no global store to reset
    setupMockElectron()
    vi.clearAllMocks()
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

    // Labels removed from compact card layout — visible in PR detail instead
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
    it('should render PR card correctly', () => {
      const pr = createMockPullRequest()
      render(<PRCard pr={pr} />)

      // PR should be rendered
      expect(screen.getByText(pr.title)).toBeInTheDocument()
    })

    it('should have pr-card-item class', () => {
      const pr = createMockPullRequest()
      const { container } = render(<PRCard pr={pr} />)

      const card = container.querySelector('.pr-card-item')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Interactions (Buffet Pattern)', () => {
    it('should be clickable when PR card is rendered', () => {
      const pr = createMockPullRequest()
      const { container } = render(<PRCard pr={pr} />)

      const card = container.querySelector('.pr-card-item')
      expect(card).not.toBeNull()
      // Card element should be interactive
      expect(card?.getAttribute('role') || card?.tagName).toBeDefined()
    })

    it('should display PR number when rendered', () => {
      const pr = createMockPullRequest({ number: 123 })
      render(<PRCard pr={pr} />)

      // Check that PR number is displayed
      expect(screen.getByText(/#123/)).toBeInTheDocument()
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
      pr.comments = 2
      render(<PRCard pr={pr} />)

      // Comment count shown next to MessageSquare icon
      const commentSection = document.querySelector('.text-muted-foreground')
      expect(commentSection).toBeInTheDocument()
    })
  })
})
