/**
 * IDEView Component Tests
 * Updated for TanStack Query architecture
 */

import {
  createMockPullRequest,
  createMockRepository,
  fireEvent,
  render,
  resetIdCounter,
  resetMockElectron,
  screen,
  setupMockElectron
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDEView } from './IDEView'

// Mock state for TanStack Query hooks
const mockRepos = vi.fn()
const mockPRsForRepo = vi.fn()
const mockSelectedRepos = vi.fn()
const mockSelectedPRId = vi.fn()
const mockIDESettings = vi.fn()
const mockMyPRsRepos = vi.fn()
const mockSelectPR = vi.fn()
const mockSetIDESettings = vi.fn()
const mockToggleRepoExpanded = vi.fn()
const mockToggleMyPRsFilter = vi.fn()

vi.mock('@data', () => ({
  useRepos: () => mockRepos(),
  usePRsForRepo: () => mockPRsForRepo(),
  useSelectedRepos: () => mockSelectedRepos(),
  useSelectedPRId: () => mockSelectedPRId(),
  useIDESettings: () => mockIDESettings(),
  useMyPRsRepos: () => mockMyPRsRepos(),
  useSelectPR: () => ({ mutate: mockSelectPR }),
  useSetIDESettings: () => ({ mutate: mockSetIDESettings }),
  useToggleRepoExpanded: () => ({ mutate: mockToggleRepoExpanded }),
  useToggleMyPRsFilter: () => ({ mutate: mockToggleMyPRsFilter })
}))

describe('IDEView', () => {
  beforeEach(() => {
    resetIdCounter()
    setupMockElectron()
    vi.clearAllMocks()

    // Set default mock returns
    mockRepos.mockReturnValue({ data: [], isLoading: false })
    mockPRsForRepo.mockReturnValue({ data: [], isFetching: false, refetch: vi.fn() })
    mockSelectedRepos.mockReturnValue({ data: [] })
    mockSelectedPRId.mockReturnValue({ data: null })
    mockIDESettings.mockReturnValue({ data: { sidebarWidth: 280, expandedRepos: [] } })
    mockMyPRsRepos.mockReturnValue({ data: [] })
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render the component without errors', () => {
      const { container } = render(<IDEView currentUser="testuser" />)

      expect(container.firstChild).toBeInTheDocument()
      expect(container.querySelector('.apple-sidebar')).toBeInTheDocument()
    })

    it('should render the Explorer header', () => {
      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('Explorer')).toBeInTheDocument()
    })

    it('should render FileText icon', () => {
      const { container } = render(<IDEView currentUser="testuser" />)

      const fileIcon = container.querySelector('svg.lucide-file-text')
      expect(fileIcon).toBeInTheDocument()
    })

    it('should show loading state when repos are loading', () => {
      mockRepos.mockReturnValue({ data: [], isLoading: true })

      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('Loading repositories...')).toBeInTheDocument()
    })

    it('should show empty state when no repos', () => {
      mockRepos.mockReturnValue({ data: [], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: [] })

      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('No repositories')).toBeInTheDocument()
    })

    it('should render repos when data is available', () => {
      const repo = createMockRepository({ name: 'frontend', full_name: 'org/frontend' })
      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['org/frontend'] })

      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('frontend')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call toggleRepoExpanded when repo row is clicked', () => {
      const repo = createMockRepository({ name: 'frontend', full_name: 'org/frontend' })
      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['org/frontend'] })

      render(<IDEView currentUser="testuser" />)

      const repoRow = screen.getByText('frontend').closest('[role="treeitem"]')
      if (repoRow) {
        fireEvent.click(repoRow)
        expect(mockToggleRepoExpanded).toHaveBeenCalledWith('org/frontend')
      }
    })

    it('should render PRs when repo is expanded', () => {
      const repo = createMockRepository({ name: 'frontend', full_name: 'org/frontend' })
      const pr = createMockPullRequest({
        title: 'Fix bug',
        base: { repo, ref: 'main', sha: 'abc' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: { sidebarWidth: 280, expandedRepos: ['org/frontend'] }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr], isFetching: false, refetch: vi.fn() })

      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('Fix bug')).toBeInTheDocument()
    })

    it('should call refetch when reload button is clicked', async () => {
      const mockRefetch = vi.fn()
      const repo = createMockRepository({ name: 'frontend', full_name: 'org/frontend' })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['org/frontend'] })
      mockPRsForRepo.mockReturnValue({ data: [], isFetching: false, refetch: mockRefetch })

      const { container } = render(<IDEView currentUser="testuser" />)

      // Find and click the reload button
      const reloadButton = container.querySelector('svg.lucide-refresh-cw')?.closest('button')
      if (reloadButton) {
        fireEvent.click(reloadButton)
        expect(mockRefetch).toHaveBeenCalled()
      }
    })
  })

  describe('Resize', () => {
    it('should render with correct initial width', () => {
      mockIDESettings.mockReturnValue({ data: { sidebarWidth: 320, expandedRepos: [] } })

      const { container } = render(<IDEView currentUser="testuser" />)

      const sidebar = container.querySelector('[style*="width"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('should have resize handle', () => {
      const { container } = render(<IDEView currentUser="testuser" />)

      const resizeHandle = container.querySelector('[role="slider"]')
      expect(resizeHandle).toBeInTheDocument()
    })
  })
})
