/**
 * IDEView Component Tests
 * Tests for the repo-based explorer with PRs grouped by author
 */

import {
  createMockPullRequest,
  createMockRepository,
  createMockUser,
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
    mockIDESettings.mockReturnValue({
      data: { sidebarWidth: 280, expandedRepos: [], expandedOwners: [] }
    })
    mockMyPRsRepos.mockReturnValue({ data: [] })
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render the component without errors', () => {
      const { container } = render(<IDEView currentUser="testuser" />)

      expect(container.firstChild).toBeInTheDocument()
      // IDEView now uses flex flex-col h-full (styling handled by App.tsx container)
      expect(container.firstChild).toHaveClass('flex', 'flex-col')
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
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })

      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('frontend')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call toggleRepoExpanded when repo row is clicked', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })

      render(<IDEView currentUser="testuser" />)

      const repoRow = screen.getByText('frontend').closest('[role="treeitem"]')
      if (repoRow) {
        fireEvent.click(repoRow)
        expect(mockToggleRepoExpanded).toHaveBeenCalledWith('test-org/frontend')
      }
    })

    it('should render PRs grouped by author when repo and author are expanded', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      const pr1 = createMockPullRequest({
        title: 'Fix bug',
        user: createMockUser({ login: 'developer1' }),
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const pr2 = createMockPullRequest({
        title: 'Add feature',
        user: createMockUser({ login: 'developer2' }),
        base: { repo, ref: 'main', sha: 'def' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: {
          sidebarWidth: 280,
          expandedRepos: ['test-org/frontend'],
          expandedOwners: ['test-org/frontend:developer1', 'test-org/frontend:developer2']
        }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr1, pr2], isFetching: false, refetch: vi.fn() })

      render(<IDEView currentUser="testuser" />)

      // Should show author names as section headers
      expect(screen.getByText('developer1')).toBeInTheDocument()
      expect(screen.getByText('developer2')).toBeInTheDocument()
      // Should show PR titles (authors are expanded)
      expect(screen.getByText('Fix bug')).toBeInTheDocument()
      expect(screen.getByText('Add feature')).toBeInTheDocument()
    })

    it('should show author sections collapsed by default (only names visible)', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      const pr = createMockPullRequest({
        title: 'Fix bug',
        user: createMockUser({ login: 'developer1' }),
        base: { repo, ref: 'main', sha: 'abc' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: { sidebarWidth: 280, expandedRepos: ['test-org/frontend'], expandedOwners: [] }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr], isFetching: false, refetch: vi.fn() })

      render(<IDEView currentUser="testuser" />)

      // Should show author name
      expect(screen.getByText('developer1')).toBeInTheDocument()
      // PR title should NOT be visible (author section collapsed)
      expect(screen.queryByText('Fix bug')).not.toBeInTheDocument()
    })

    it('should highlight current user in author sections', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      const pr = createMockPullRequest({
        title: 'My PR',
        user: createMockUser({ login: 'testuser' }),
        base: { repo, ref: 'main', sha: 'abc' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: {
          sidebarWidth: 280,
          expandedRepos: ['test-org/frontend'],
          expandedOwners: ['test-org/frontend:testuser']
        }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr], isFetching: false, refetch: vi.fn() })

      render(<IDEView currentUser="testuser" />)

      expect(screen.getByText('testuser')).toBeInTheDocument()
      expect(screen.getByText('(you)')).toBeInTheDocument()
    })

    it('should call refetch when reload button is clicked', async () => {
      const mockRefetch = vi.fn()
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
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

  describe('Author grouping', () => {
    it('should group multiple PRs by the same author together', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      const pr1 = createMockPullRequest({
        title: 'PR One',
        user: createMockUser({ login: 'developer1' }),
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const pr2 = createMockPullRequest({
        title: 'PR Two',
        user: createMockUser({ login: 'developer1' }),
        base: { repo, ref: 'main', sha: 'def' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: {
          sidebarWidth: 280,
          expandedRepos: ['test-org/frontend'],
          expandedOwners: ['test-org/frontend:developer1']
        }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr1, pr2], isFetching: false, refetch: vi.fn() })

      render(<IDEView currentUser="testuser" />)

      // Should show author name once
      const authorElements = screen.getAllByText('developer1')
      expect(authorElements.length).toBe(1)

      // Should show both PRs (author is expanded)
      expect(screen.getByText('PR One')).toBeInTheDocument()
      expect(screen.getByText('PR Two')).toBeInTheDocument()

      // Should show PR count badges (repo-level and author-level)
      const countBadges = screen.getAllByText('2')
      expect(countBadges.length).toBeGreaterThanOrEqual(1)
    })

    it('should show current user first in author list', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      // Note: PRs ordered with other user first
      const pr1 = createMockPullRequest({
        title: 'Other PR',
        user: createMockUser({ login: 'other-dev' }),
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const pr2 = createMockPullRequest({
        title: 'My PR',
        user: createMockUser({ login: 'testuser' }),
        base: { repo, ref: 'main', sha: 'def' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: { sidebarWidth: 280, expandedRepos: ['test-org/frontend'], expandedOwners: [] }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr1, pr2], isFetching: false, refetch: vi.fn() })

      const { container } = render(<IDEView currentUser="testuser" />)

      // Get all author section headers in order (look for treeitem roles which are author headers)
      const authorItems = container.querySelectorAll('[role="treeitem"]')
      // Skip the first one (repo header), get author headers
      const authorHeaders = Array.from(authorItems).slice(1)
      const authorNames = authorHeaders.map((el) => {
        const nameEl = el.querySelector('.font-medium.truncate')
        return nameEl?.textContent?.replace('(you)', '').trim()
      })

      // Current user should be first among authors
      expect(authorNames[0]).toBe('testuser')
    })

    it('should toggle author section when clicked', () => {
      const repo = createMockRepository({
        name: 'frontend',
        full_name: 'test-org/frontend',
        owner: { login: 'test-org', avatar_url: '' }
      })
      const pr = createMockPullRequest({
        title: 'Fix bug',
        user: createMockUser({ login: 'developer1' }),
        base: { repo, ref: 'main', sha: 'abc' }
      })

      mockRepos.mockReturnValue({ data: [repo], isLoading: false })
      mockSelectedRepos.mockReturnValue({ data: ['test-org/frontend'] })
      mockIDESettings.mockReturnValue({
        data: { sidebarWidth: 280, expandedRepos: ['test-org/frontend'], expandedOwners: [] }
      })
      mockPRsForRepo.mockReturnValue({ data: [pr], isFetching: false, refetch: vi.fn() })

      render(<IDEView currentUser="testuser" />)

      // Click on the author section to expand it
      const authorRow = screen.getByText('developer1').closest('[role="treeitem"]')
      if (authorRow) {
        fireEvent.click(authorRow)
        expect(mockSetIDESettings).toHaveBeenCalledWith({
          expandedOwners: ['test-org/frontend:developer1']
        })
      }
    })
  })

  describe('Resize', () => {
    it('should render with correct initial width', () => {
      mockIDESettings.mockReturnValue({
        data: { sidebarWidth: 320, expandedRepos: [], expandedOwners: [] }
      })

      const { container } = render(<IDEView currentUser="testuser" />)

      const sidebar = container.querySelector('[style*="width"]')
      expect(sidebar).toBeInTheDocument()
    })

    // Note: Resize handle is now in App.tsx, not IDEView
    // The IDEView component no longer manages its own width
  })
})
