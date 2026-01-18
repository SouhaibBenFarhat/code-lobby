/**
 * IDEView Component Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDEView } from '@/components/IDEView'
import { resetMockElectron, setupAuthenticatedScenario } from '../../mocks/electron'
import {
  createMockPullRequest,
  createMockRepository,
  createMockUser,
  resetIdCounter
} from '../../mocks/factories'
import { fireEvent, render, screen, waitFor } from '../../utils/render'

// Mock the PRContext and MyPRsFilterContext
const mockSetSelectedPR = vi.fn()
const mockSelectedPR = null
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

describe('IDEView', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
    mockMyPRsRepos.clear() // Reset filter state
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render Explorer header', async () => {
      const repos = [createMockRepository({ name: 'frontend' })]
      const prs = [createMockPullRequest({ base: { repo: repos[0], ref: 'main', sha: 'abc' } })]

      setupAuthenticatedScenario({ repos, prs, selectedRepos: repos.map((r) => r.full_name) })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('Explorer')).toBeInTheDocument()
      })
    })

    it('should render repo folders', async () => {
      const repos = [
        createMockRepository({ name: 'frontend', owner: { login: 'myorg', avatar_url: '' } }),
        createMockRepository({ name: 'backend', owner: { login: 'myorg', avatar_url: '' } })
      ]

      setupAuthenticatedScenario({ repos, selectedRepos: repos.map((r) => r.full_name) })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
        expect(screen.getByText('backend')).toBeInTheDocument()
      })
    })

    it('should show PR count badge for repos', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const prs = [
        createMockPullRequest({ base: { repo, ref: 'main', sha: 'abc' } }),
        createMockPullRequest({ base: { repo, ref: 'main', sha: 'def' } })
      ]

      setupAuthenticatedScenario({ repos: [repo], prs, selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        // Should show count badge
        expect(screen.getByText('2')).toBeInTheDocument()
      })
    })

    it('should display "No repositories" when no repos selected', async () => {
      setupAuthenticatedScenario({ repos: [], prs: [], selectedRepos: [] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText(/No repositories/i)).toBeInTheDocument()
      })
    })
  })

  describe('Folder Expansion', () => {
    it('should expand folder when clicked', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const pr = createMockPullRequest({
        title: 'Fix auth bug',
        base: { repo, ref: 'main', sha: 'abc' }
      })

      setupAuthenticatedScenario({ repos: [repo], prs: [pr], selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
      })

      // Click on folder to expand
      const folder = screen.getByText('frontend')
      fireEvent.click(folder)

      await waitFor(() => {
        expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      })
    })

    it('should collapse folder when clicked again', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const pr = createMockPullRequest({
        title: 'Fix auth bug',
        base: { repo, ref: 'main', sha: 'abc' }
      })

      setupAuthenticatedScenario({ repos: [repo], prs: [pr], selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
      })

      const folder = screen.getByText('frontend')

      // Expand
      fireEvent.click(folder)
      await waitFor(() => {
        expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      })

      // Collapse
      fireEvent.click(folder)
      await waitFor(() => {
        expect(screen.queryByText('Fix auth bug')).not.toBeInTheDocument()
      })
    })
  })

  describe('PR Selection', () => {
    it('should call setSelectedPR when PR is clicked', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const pr = createMockPullRequest({
        title: 'Fix auth bug',
        number: 42,
        base: { repo, ref: 'main', sha: 'abc' }
      })

      setupAuthenticatedScenario({ repos: [repo], prs: [pr], selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
      })

      // Expand folder first
      fireEvent.click(screen.getByText('frontend'))

      await waitFor(() => {
        expect(screen.getByText('Fix auth bug')).toBeInTheDocument()
      })

      // Click on PR
      fireEvent.click(screen.getByText('Fix auth bug'))

      expect(mockSetSelectedPR).toHaveBeenCalledWith(pr)
    })
  })

  describe('My PRs Filter', () => {
    it('should call toggle function when filter button is clicked', async () => {
      const currentUser = createMockUser({ login: 'testuser' })
      const otherUser = createMockUser({ login: 'otheruser' })
      const repo = createMockRepository({ name: 'frontend' })

      const myPR = createMockPullRequest({
        title: 'My PR',
        user: currentUser,
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const otherPR = createMockPullRequest({
        title: 'Other PR',
        user: otherUser,
        base: { repo, ref: 'main', sha: 'def' }
      })

      setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo],
        prs: [myPR, otherPR],
        selectedRepos: [repo.full_name]
      })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
      })

      // Expand folder
      fireEvent.click(screen.getByText('frontend'))

      await waitFor(() => {
        // Both PRs should be visible initially (filter not enabled)
        expect(screen.getByText('My PR')).toBeInTheDocument()
        expect(screen.getByText('Other PR')).toBeInTheDocument()
      })

      // Find and click the My PRs toggle (hover first)
      const folderRow = screen.getByText('frontend').closest('div')
      if (folderRow) {
        fireEvent.mouseEnter(folderRow)

        // Find the toggle button
        const toggleButton = folderRow.querySelector('button')
        if (toggleButton) {
          fireEvent.click(toggleButton)

          // Verify toggle function was called with repo name
          expect(mockToggleMyPRsFilter).toHaveBeenCalledWith(repo.full_name)
        }
      }
    })
  })

  describe('Empty State', () => {
    it('should show placeholder when no PR is selected', async () => {
      const repo = createMockRepository({ name: 'frontend' })

      setupAuthenticatedScenario({ repos: [repo], prs: [], selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText(/Select a Pull Request/i)).toBeInTheDocument()
      })
    })
  })

  describe('Sidebar Resize', () => {
    it('should render resize handle', async () => {
      const repo = createMockRepository({ name: 'frontend' })

      setupAuthenticatedScenario({ repos: [repo], selectedRepos: [repo.full_name] })

      const { container } = render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        // Look for the resize handle with cursor-col-resize class
        const resizeHandle = container.querySelector('.cursor-col-resize')
        expect(resizeHandle).toBeInTheDocument()
      })
    })
  })

  describe('My PRs Filter (Shared Context)', () => {
    it('should use filter state from mocked context', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const currentUser = createMockUser({ login: 'testuser' })
      const otherUser = createMockUser({ login: 'otheruser' })
      const myPR = createMockPullRequest({
        title: 'My PR',
        user: currentUser,
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const otherPR = createMockPullRequest({
        title: 'Other PR',
        user: otherUser,
        base: { repo, ref: 'main', sha: 'def' }
      })

      const mockElectron = setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo],
        prs: [myPR, otherPR],
        selectedRepos: [repo.full_name]
      })

      // Expand the repo by default
      mockElectron.getIDEViewSettings.mockResolvedValue({
        sidebarWidth: 280,
        expandedRepos: [repo.full_name]
      })

      // Enable filter via the mock
      mockMyPRsRepos.add(repo.full_name)

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        // With filter enabled via mocked context, only "My PR" should be visible
        expect(screen.getByText('My PR')).toBeInTheDocument()
        expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
      })
    })

    it('should call context toggle when filter button is clicked', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const currentUser = createMockUser({ login: 'testuser' })
      const otherUser = createMockUser({ login: 'otheruser' })
      const myPR = createMockPullRequest({
        title: 'My PR',
        user: currentUser,
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const otherPR = createMockPullRequest({
        title: 'Other PR',
        user: otherUser,
        base: { repo, ref: 'main', sha: 'def' }
      })

      setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo],
        prs: [myPR, otherPR],
        selectedRepos: [repo.full_name]
      })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
      })

      // Expand folder
      fireEvent.click(screen.getByText('frontend'))

      await waitFor(() => {
        expect(screen.getByText('My PR')).toBeInTheDocument()
        expect(screen.getByText('Other PR')).toBeInTheDocument()
      })

      // Find and click the My PRs toggle
      const folderRow = screen.getByText('frontend').closest('div')
      expect(folderRow).toBeTruthy()

      if (folderRow) {
        fireEvent.mouseEnter(folderRow)
        const toggleButton = folderRow.querySelector('button')
        expect(toggleButton).toBeTruthy()

        if (toggleButton) {
          fireEvent.click(toggleButton)

          // Mocked toggle should be called
          expect(mockToggleMyPRsFilter).toHaveBeenCalledWith(repo.full_name)
        }
      }
    })

    it('should show filtered count when filter is active', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const currentUser = createMockUser({ login: 'testuser' })
      const otherUser = createMockUser({ login: 'otheruser' })
      const myPR = createMockPullRequest({
        title: 'My PR',
        user: currentUser,
        base: { repo, ref: 'main', sha: 'abc' }
      })
      const otherPR = createMockPullRequest({
        title: 'Other PR',
        user: otherUser,
        base: { repo, ref: 'main', sha: 'def' }
      })

      const mockElectron = setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo],
        prs: [myPR, otherPR],
        selectedRepos: [repo.full_name]
      })

      mockElectron.getIDEViewSettings.mockResolvedValue({
        sidebarWidth: 280,
        expandedRepos: [repo.full_name]
      })

      // Enable filter via mock
      mockMyPRsRepos.add(repo.full_name)

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        // Should show "1/2" indicating 1 of 2 PRs shown
        expect(screen.getByText('1/2')).toBeInTheDocument()
      })
    })

    it('should work independently per repo via mocked context', async () => {
      const repo1 = createMockRepository({
        name: 'frontend',
        owner: { login: 'myorg', avatar_url: '' }
      })
      const repo2 = createMockRepository({
        name: 'backend',
        owner: { login: 'myorg', avatar_url: '' }
      })
      const currentUser = createMockUser({ login: 'testuser' })
      const otherUser = createMockUser({ login: 'otheruser' })
      const myPR1 = createMockPullRequest({
        title: 'My Frontend PR',
        user: currentUser,
        base: { repo: repo1, ref: 'main', sha: 'abc' }
      })
      const otherPR1 = createMockPullRequest({
        title: 'Other Frontend PR',
        user: otherUser,
        base: { repo: repo1, ref: 'main', sha: 'ghi' }
      })
      const myPR2 = createMockPullRequest({
        title: 'My Backend PR',
        user: currentUser,
        base: { repo: repo2, ref: 'main', sha: 'def' }
      })
      const otherPR2 = createMockPullRequest({
        title: 'Other Backend PR',
        user: otherUser,
        base: { repo: repo2, ref: 'main', sha: 'jkl' }
      })

      const mockElectron = setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo1, repo2],
        prs: [myPR1, otherPR1, myPR2, otherPR2],
        selectedRepos: [repo1.full_name, repo2.full_name]
      })

      mockElectron.getIDEViewSettings.mockResolvedValue({
        sidebarWidth: 280,
        expandedRepos: [repo1.full_name, repo2.full_name]
      })

      // Filter enabled only for frontend via mock
      mockMyPRsRepos.add(repo1.full_name)

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        // Frontend should show filtered (only my PR)
        expect(screen.getByText('My Frontend PR')).toBeInTheDocument()
        expect(screen.queryByText('Other Frontend PR')).not.toBeInTheDocument()

        // Backend should show all PRs (filter not enabled for it)
        expect(screen.getByText('My Backend PR')).toBeInTheDocument()
        expect(screen.getByText('Other Backend PR')).toBeInTheDocument()
      })
    })
  })

  describe('PR Count Display', () => {
    it('should display total PR count in header', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const prs = [
        createMockPullRequest({ base: { repo, ref: 'main', sha: 'abc' } }),
        createMockPullRequest({ base: { repo, ref: 'main', sha: 'def' } }),
        createMockPullRequest({ base: { repo, ref: 'main', sha: 'ghi' } })
      ]

      setupAuthenticatedScenario({ repos: [repo], prs, selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('3 PRs')).toBeInTheDocument()
      })
    })

    it('should use singular "PR" for count of 1', async () => {
      const repo = createMockRepository({ name: 'frontend' })
      const prs = [createMockPullRequest({ base: { repo, ref: 'main', sha: 'abc' } })]

      setupAuthenticatedScenario({ repos: [repo], prs, selectedRepos: [repo.full_name] })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('1 PR')).toBeInTheDocument()
      })
    })
  })
})
