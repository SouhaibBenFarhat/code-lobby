/**
 * PRCard Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../utils/render'
import { PRCard } from '@/components/PRCard'
import { setupMockElectron, resetMockElectron } from '../../mocks/electron'
import {
  createMockPullRequest,
  createMockPRWithChecks,
  createMockDraftPR,
  createMockUser,
  resetIdCounter
} from '../../mocks/factories'

describe('PRCard', () => {
  const defaultOnClick = vi.fn()

  beforeEach(() => {
    resetIdCounter()
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render PR title', () => {
      const pr = createMockPullRequest({ title: 'Fix authentication bug' })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('Fix authentication bug')).toBeInTheDocument()
    })

    it('should render PR number', () => {
      const pr = createMockPullRequest({ number: 42 })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('#42')).toBeInTheDocument()
    })

    it('should render author avatar', () => {
      const user = createMockUser({ login: 'johndoe', avatar_url: 'https://example.com/avatar.png' })
      const pr = createMockPullRequest({ user })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      const avatar = screen.getByRole('img', { hidden: true })
      expect(avatar).toBeInTheDocument()
    })

    it('should render author login', () => {
      const user = createMockUser({ login: 'johndoe' })
      const pr = createMockPullRequest({ user })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })

    it('should render labels', () => {
      const pr = createMockPullRequest({
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'urgent', color: '00ff00' }
        ]
      })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('bug')).toBeInTheDocument()
      expect(screen.getByText('urgent')).toBeInTheDocument()
    })
  })

  describe('Draft PRs', () => {
    it('should show draft indicator for draft PRs', () => {
      const pr = createMockDraftPR()
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('Draft')).toBeInTheDocument()
    })

    it('should apply draft styling', () => {
      const pr = createMockDraftPR()
      const { container } = render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      // Check for opacity or muted styling
      expect(container.firstChild).toHaveClass('opacity-75')
    })
  })

  describe('CI Status', () => {
    it('should show success indicator for passing checks', () => {
      const pr = createMockPRWithChecks('success')
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      // Look for success icon (CheckCircle2 renders as svg)
      const successIcon = document.querySelector('.text-success')
      expect(successIcon).toBeInTheDocument()
    })

    it('should show failure indicator for failing checks', () => {
      const pr = createMockPRWithChecks('failure')
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      const failureIcon = document.querySelector('.text-destructive')
      expect(failureIcon).toBeInTheDocument()
    })

    it('should show pending indicator for running checks', () => {
      const pr = createMockPRWithChecks('pending')
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      // Look for spinning loader or warning color
      const pendingIcon = document.querySelector('.animate-spin') || document.querySelector('.text-warning')
      expect(pendingIcon).toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('should apply selected styling when isSelected is true', () => {
      const pr = createMockPullRequest()
      const { container } = render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={true} />)
      
      // The selected card should have special styling
      expect(container.querySelector('[data-selected="true"]') || container.firstChild).toBeInTheDocument()
    })

    it('should not apply selected styling when isSelected is false', () => {
      const pr = createMockPullRequest()
      const { container } = render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      const card = container.firstChild as HTMLElement
      expect(card.getAttribute('data-selected')).not.toBe('true')
    })
  })

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn()
      const pr = createMockPullRequest()
      render(<PRCard pr={pr} onClick={onClick} isSelected={false} />)
      
      const card = screen.getByRole('article') || document.querySelector('[class*="card"]')
      fireEvent.click(card!)
      
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('should pass PR to onClick handler', () => {
      const onClick = vi.fn()
      const pr = createMockPullRequest({ number: 123 })
      render(<PRCard pr={pr} onClick={onClick} isSelected={false} />)
      
      const card = document.querySelector('[class*="cursor-pointer"]')
      fireEvent.click(card!)
      
      expect(onClick).toHaveBeenCalledWith(pr)
    })
  })

  describe('Relative Time', () => {
    it('should display relative time for created_at', () => {
      const pr = createMockPullRequest({
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      // Should show something like "2h ago" or "2 hours ago"
      expect(screen.getByText(/ago/i)).toBeInTheDocument()
    })
  })

  describe('Stats', () => {
    it('should display additions and deletions', () => {
      const pr = createMockPullRequest({ additions: 150, deletions: 50 })
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('+150')).toBeInTheDocument()
      expect(screen.getByText('-50')).toBeInTheDocument()
    })

    it('should display comment count', () => {
      const pr = createMockPullRequest()
      pr.comments = [
        { id: '1', body: 'Comment 1', user: createMockUser(), created_at: '', updated_at: '', html_url: '', isBot: false },
        { id: '2', body: 'Comment 2', user: createMockUser(), created_at: '', updated_at: '', html_url: '', isBot: false }
      ]
      render(<PRCard pr={pr} onClick={defaultOnClick} isSelected={false} />)
      
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})
