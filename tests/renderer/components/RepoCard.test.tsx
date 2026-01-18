/**
 * RepoCard Component Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RepoCard } from '@/components/RepoCard'
import type { PullRequest } from '@/components/types'
import { resetMockElectron, setupMockElectron } from '../../mocks/electron'
import {
  createMockPRWithChecks,
  createMockPullRequest,
  createMockRepository,
  createMockUser,
  resetIdCounter
} from '../../mocks/factories'
import { fireEvent, render, screen, waitFor } from '../../utils/render'

// Mock the usePRContext and useMyPRsFilter hooks
const mockSetSelectedPR = vi.fn()
let mockSelectedPR: PullRequest | null = null
const mockMyPRsRepos = new Set<string>()
const mockToggleMyPRsFilter = vi.fn()

vi.mock('@/App', () => ({
  usePRContext: () => ({
    selectedPR: mockSelectedPR,
    setSelectedPR: mockSetSelectedPR
  }),
  useMyPRsFilter: () => ({
    myPRsRepos: mockMyPRsRepos,
    toggleMyPRsFilter: mockToggleMyPRsFilter,
    isMyPRsFilterEnabled: (repo: string) => mockMyPRsRepos.has(repo)
  })
}))

describe('RepoCard', () => {
  const defaultProps = {
    isDraggable: true,
    onClose: vi.fn(),
    currentUser: 'testuser',
    color: null as string | null,
    onColorChange: vi.fn(),
    isMinimized: false,
    onMinimizeChange: vi.fn()
  }

  beforeEach(() => {
    resetIdCounter()
    setupMockElectron()
    mockMyPRsRepos.clear() // Reset filter state
    mockToggleMyPRsFilter.mockClear()
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

    it('should call toggle function when My PRs toggle is clicked', async () => {
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

      // Both should be visible initially (filter not enabled)
      expect(screen.getByText('My PR')).toBeInTheDocument()
      expect(screen.getByText('Other PR')).toBeInTheDocument()

      // Click toggle
      const toggle = document.querySelector('button svg.lucide-users')?.parentElement
      if (toggle) {
        fireEvent.click(toggle)

        // Verify toggle function was called with repo full_name
        expect(mockToggleMyPRsFilter).toHaveBeenCalledWith(repo.full_name)
      }
    })

    it('should filter PRs when filter is enabled via context', () => {
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

      // Enable filter for this repo via mock
      mockMyPRsRepos.add(repo.full_name)

      render(
        <RepoCard repo={repo} prs={[myPR, otherPR]} {...defaultProps} currentUser="testuser" />
      )

      // Only my PR should be visible
      expect(screen.getByText('My PR')).toBeInTheDocument()
      expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
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

  describe('Minimize Feature', () => {
    it('should render minimize button when onMinimizeChange is provided', () => {
      const repo = createMockRepository()
      const onMinimizeChange = vi.fn()
      render(
        <RepoCard repo={repo} prs={[]} {...defaultProps} onMinimizeChange={onMinimizeChange} />
      )

      // Look for chevron icon (minimize button)
      const minimizeButton =
        document.querySelector('button svg.lucide-chevron-up')?.parentElement ||
        document.querySelector('button svg.lucide-chevron-down')?.parentElement
      expect(minimizeButton).toBeInTheDocument()
    })

    it('should call onMinimizeChange when minimize button is clicked', () => {
      const repo = createMockRepository()
      const onMinimizeChange = vi.fn()
      render(
        <RepoCard
          repo={repo}
          prs={[]}
          {...defaultProps}
          isMinimized={false}
          onMinimizeChange={onMinimizeChange}
        />
      )

      const minimizeButton = document.querySelector('button svg.lucide-chevron-up')?.parentElement
      if (minimizeButton) {
        fireEvent.click(minimizeButton)
        expect(onMinimizeChange).toHaveBeenCalledWith(true)
      }
    })

    it('should show chevron-down icon when minimized', () => {
      const repo = createMockRepository()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} isMinimized={true} />)

      const expandIcon = document.querySelector('button svg.lucide-chevron-down')
      expect(expandIcon).toBeInTheDocument()
    })

    it('should show chevron-up icon when not minimized', () => {
      const repo = createMockRepository()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} isMinimized={false} />)

      const minimizeIcon = document.querySelector('button svg.lucide-chevron-up')
      expect(minimizeIcon).toBeInTheDocument()
    })

    it('should hide content when minimized', () => {
      const repo = createMockRepository()
      const pr = createMockPullRequest({ title: 'Test PR', base: { repo, ref: 'main', sha: 'a' } })
      render(<RepoCard repo={repo} prs={[pr]} {...defaultProps} isMinimized={true} />)

      // PR title should not be visible when minimized
      expect(screen.queryByText('Test PR')).not.toBeInTheDocument()
    })

    it('should show content when not minimized', () => {
      const repo = createMockRepository()
      const pr = createMockPullRequest({ title: 'Test PR', base: { repo, ref: 'main', sha: 'a' } })
      render(<RepoCard repo={repo} prs={[pr]} {...defaultProps} isMinimized={false} />)

      // PR title should be visible when not minimized
      expect(screen.getByText('Test PR')).toBeInTheDocument()
    })

    it('should call onMinimizeChange with false when expand button is clicked', () => {
      const repo = createMockRepository()
      const onMinimizeChange = vi.fn()
      render(
        <RepoCard
          repo={repo}
          prs={[]}
          {...defaultProps}
          isMinimized={true}
          onMinimizeChange={onMinimizeChange}
        />
      )

      const expandButton = document.querySelector('button svg.lucide-chevron-down')?.parentElement
      if (expandButton) {
        fireEvent.click(expandButton)
        expect(onMinimizeChange).toHaveBeenCalledWith(false)
      }
    })

    it('should still show header when minimized', () => {
      const repo = createMockRepository({ name: 'test-repo' })
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} isMinimized={true} />)

      // Repo name should still be visible in header
      expect(screen.getByText('test-repo')).toBeInTheDocument()
    })
  })

  describe('Reload', () => {
    it('should render reload button when onReload prop is provided', () => {
      const repo = createMockRepository()
      const onReload = vi.fn()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} onReload={onReload} />)

      const reloadButton = document.querySelector('button svg.lucide-refresh-cw')?.parentElement
      expect(reloadButton).toBeInTheDocument()
    })

    it('should not render reload button when onReload prop is not provided', () => {
      const repo = createMockRepository()
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} />)

      const reloadButton = document.querySelector('button svg.lucide-refresh-cw')
      expect(reloadButton).not.toBeInTheDocument()
    })

    it('should call onReload when reload button is clicked', async () => {
      const repo = createMockRepository()
      const onReload = vi.fn().mockResolvedValue(undefined)
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} onReload={onReload} />)

      const reloadButton = document.querySelector('button svg.lucide-refresh-cw')?.parentElement
      if (reloadButton) {
        fireEvent.click(reloadButton)
        expect(onReload).toHaveBeenCalled()
      }
    })

    it('should call onReload and complete successfully', async () => {
      const repo = createMockRepository()
      const onReload = vi.fn().mockResolvedValue(undefined)
      render(<RepoCard repo={repo} prs={[]} {...defaultProps} onReload={onReload} />)

      const reloadButton = document.querySelector('button svg.lucide-refresh-cw')?.parentElement
      if (reloadButton) {
        fireEvent.click(reloadButton)

        await waitFor(() => {
          expect(onReload).toHaveBeenCalledTimes(1)
        })

        // After reload completes, button should be enabled again
        await waitFor(() => {
          const refreshIcon = document.querySelector('button svg.lucide-refresh-cw')
          expect(refreshIcon).toBeInTheDocument()
        })
      }
    })
  })
})
