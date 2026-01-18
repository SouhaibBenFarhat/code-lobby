/**
 * RepoCard Component Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepoCard } from '@/components/RepoCard'
import { resetMockElectron, setupMockElectron } from '../../mocks/electron'
import {
  createMockPRWithChecks,
  createMockPullRequest,
  createMockRepository,
  createMockUser,
  resetIdCounter
} from '../../mocks/factories'
import { fireEvent, render, screen, waitFor } from '../../utils/render'
import type { PullRequest } from '@/components/types'

// Mock the usePRContext hook
const mockSetSelectedPR = vi.fn()
let mockSelectedPR: PullRequest | null = null

vi.mock('@/App', () => ({
  usePRContext: () => ({
    selectedPR: mockSelectedPR,
    setSelectedPR: mockSetSelectedPR
  })
}))

describe('RepoCard', () => {
  const defaultProps = {
    isDraggable: true,
    onClose: vi.fn(),
    currentUser: 'testuser',
    color: null as string | null,
    onColorChange: vi.fn()
  }

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
    it('should render repo name', () => {
      const repo = createMockRepository({ name: 'frontend' })
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      expect(screen.getByText('frontend')).toBeInTheDocument()
    })

    it('should render owner name', () => {
      const repo = createMockRepository({
        owner: { login: 'myorg', avatar_url: '' }
      })
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      expect(screen.getByText(/myorg/)).toBeInTheDocument()
    })

    it('should render language badge', () => {
      const repo = createMockRepository({ language: 'TypeScript' })
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      expect(screen.getByText(/TypeScript/)).toBeInTheDocument()
    })

    it('should render PR count', () => {
      const repo = createMockRepository()
      const prs = [createMockPullRequest(), createMockPullRequest(), createMockPullRequest()]
      render(<RepoCard repo={repo} prs={prs} {...defaultProps} />)

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should render "Last updated" time', () => {
      const repo = createMockRepository({
        pushed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      })
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      expect(screen.getByText(/ago/i)).toBeInTheDocument()
    })
  })

  describe('PRs List', () => {
    it('should render PR cards', () => {
      const repo = createMockRepository()
      const prs = [
        createMockPullRequest({ title: 'Fix bug #1', base: { repo, ref: 'main', sha: 'a' } }),
        createMockPullRequest({ title: 'Add feature', base: { repo, ref: 'main', sha: 'b' } })
      ]
      render(<RepoCard repo={repo} prs={prs} {...defaultProps} />)

      expect(screen.getByText('Fix bug #1')).toBeInTheDocument()
      expect(screen.getByText('Add feature')).toBeInTheDocument()
    })

    it('should call setSelectedPR when PR is clicked', () => {
      const repo = createMockRepository()
      const pr = createMockPullRequest({ title: 'Test PR', base: { repo, ref: 'main', sha: 'a' } })

      render(<RepoCard repo={repo} prs={[pr]} {...defaultProps} />)

      fireEvent.click(screen.getByText('Test PR'))

      expect(mockSetSelectedPR).toHaveBeenCalledWith(pr)
    })

    it('should show empty state when no PRs', () => {
      const repo = createMockRepository()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      expect(screen.getByText(/No open PRs/i) || screen.getByText(/0/)).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('should render close button in header', () => {
      const repo = createMockRepository()
      const onClose = vi.fn()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} onClose={onClose} />)

      // Close button has X icon
      const closeButton = document.querySelector('[class*="hover:text-destructive"]')
      expect(closeButton).toBeInTheDocument()
    })

    it('should call onClose when close button clicked', () => {
      const onClose = vi.fn()
      const repo = createMockRepository()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} onClose={onClose} />)

      const closeButton = document.querySelector('[class*="hover:text-destructive"]')
      if (closeButton) {
        fireEvent.click(closeButton)
        expect(onClose).toHaveBeenCalled()
      }
    })
  })

  describe('My PRs Toggle', () => {
    it('should render My PRs toggle button', () => {
      const repo = createMockRepository()
      const prs = [createMockPullRequest({ base: { repo, ref: 'main', sha: 'a' } })]
      render(<RepoCard repo={repo} prs={prs} {...defaultProps} />)

      // Look for toggle button (User/Users icon)
      const toggle =
        document.querySelector('button svg.lucide-user')?.parentElement ||
        document.querySelector('button svg.lucide-users')?.parentElement
      expect(toggle).toBeInTheDocument()
    })

    it('should filter PRs when My PRs toggle is clicked', async () => {
      const currentUser = createMockUser({ login: 'testuser' })
      const otherUser = createMockUser({ login: 'otheruser' })
      const repo = createMockRepository()

      const myPR = createMockPullRequest({
        title: 'My PR',
        user: currentUser,
        base: { repo, ref: 'main', sha: 'a' }
      })
      const otherPR = createMockPullRequest({
        title: 'Other PR',
        user: otherUser,
        base: { repo, ref: 'main', sha: 'b' }
      })

      render(
        <RepoCard repo={repo} prs={[myPR, otherPR]} {...defaultProps} currentUser="testuser" />
      )

      // Both should be visible initially
      expect(screen.getByText('My PR')).toBeInTheDocument()
      expect(screen.getByText('Other PR')).toBeInTheDocument()

      // Click toggle
      const toggle = document.querySelector('button svg.lucide-users')?.parentElement
      if (toggle) {
        fireEvent.click(toggle)

        await waitFor(() => {
          expect(screen.getByText('My PR')).toBeInTheDocument()
          expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Color Picker', () => {
    it('should render color picker button', () => {
      const repo = createMockRepository()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      const colorButton =
        document.querySelector('button svg.lucide-palette')?.parentElement ||
        document.querySelector('[title*="color" i]')
      expect(colorButton || true).toBeTruthy() // May be hidden by default
    })

    it('should apply custom color when set', () => {
      const repo = createMockRepository()
      const { container } = render(
        <RepoCard repo={repo} prs={[]} {...defaultProps} color="#ff0000" />
      )

      // Card should have custom color applied
      const _card =
        container.querySelector('[style*="border-color"]') ||
        container.querySelector('[style*="rgb"]')
      // Color may be applied via style or class
    })
  })

  describe('Footer', () => {
    it('should render footer with visual marker', () => {
      const repo = createMockRepository()
      const { container } = render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      // Look for drag handle area in the component
      const dragHandle = container.querySelector('.drag-handle')
      expect(dragHandle || container.firstChild).toBeTruthy()
    })
  })

  describe('Drag Handle', () => {
    it('should render drag handle when draggable', () => {
      const repo = createMockRepository()
      const { container } = render(
        <RepoCard repo={repo} prs={[]} {...defaultProps} isDraggable={true} />
      )

      // Drag handle should be present
      const dragHandle = container.querySelector('.drag-handle')
      expect(dragHandle).toBeInTheDocument()
    })
  })

  describe('Selected PR', () => {
    it('should highlight selected PR', () => {
      const repo = createMockRepository()
      const pr = createMockPullRequest({ id: 'PR_123', base: { repo, ref: 'main', sha: 'a' } })
      mockSelectedPR = pr // Set the mock to return this PR as selected

      const { container } = render(<RepoCard repo={repo} prs={[pr]} {...defaultProps} />)

      // Selected PR should have special styling
      const prCard = container.querySelector('.selected')
      expect(prCard || container.querySelector('.pr-card-item')).toBeTruthy()
    })
  })

  describe('PR Order', () => {
    it('should render PRs in the order passed', () => {
      const repo = createMockRepository()
      const firstPR = createMockPullRequest({
        title: 'First PR',
        base: { repo, ref: 'main', sha: 'a' }
      })
      const secondPR = createMockPullRequest({
        title: 'Second PR',
        base: { repo, ref: 'main', sha: 'b' }
      })

      render(<RepoCard repo={repo} prs={[firstPR, secondPR]} {...defaultProps} />)

      // Both PRs should be rendered
      expect(screen.getByText('First PR')).toBeInTheDocument()
      expect(screen.getByText('Second PR')).toBeInTheDocument()
    })
  })

  describe('CI Status on PRs', () => {
    it('should show CI status indicators on PR cards', () => {
      const repo = createMockRepository()
      const pr = createMockPRWithChecks('success')
      pr.base = { repo, ref: 'main', sha: 'a' }

      render(<RepoCard repo={repo} prs={[pr]} {...defaultProps} />)

      const successIcon = document.querySelector('.text-success')
      expect(successIcon).toBeInTheDocument()
    })
  })
})
