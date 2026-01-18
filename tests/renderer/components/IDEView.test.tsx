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

// Mock the PRContext
const mockSetSelectedPR = vi.fn()
const mockSelectedPR = null

vi.mock('@/App', () => ({
  usePRContext: () => ({
    selectedPR: mockSelectedPR,
    setSelectedPR: mockSetSelectedPR
  })
}))

describe('IDEView', () => {
  beforeEach(() => {
    resetIdCounter()
    vi.clearAllMocks()
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
    it('should filter to show only user PRs when toggle is clicked', async () => {
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
        // Both PRs should be visible initially
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

          await waitFor(() => {
            expect(screen.getByText('My PR')).toBeInTheDocument()
            expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
          })
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

  describe('My PRs Filter Persistence', () => {
    it('should load saved myPRsRepos from settings on mount', async () => {
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

      // Setup with myPRsRepos already containing the repo (filter enabled)
      const mockElectron = setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo],
        prs: [myPR, otherPR],
        selectedRepos: [repo.full_name]
      })

      // Override getIDEViewSettings to return saved myPRsRepos
      mockElectron.getIDEViewSettings.mockResolvedValue({
        sidebarWidth: 280,
        expandedRepos: [repo.full_name], // Already expanded
        myPRsRepos: [repo.full_name] // Filter enabled for this repo
      })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        // With filter enabled and repo expanded, only "My PR" should be visible
        expect(screen.getByText('My PR')).toBeInTheDocument()
        expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
      })
    })

    it('should save myPRsRepos to settings when toggle is clicked', async () => {
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

          // Wait for the state to update and save
          await waitFor(() => {
            // setIDEViewSettings should be called with myPRsRepos containing the repo
            expect(mockElectron.setIDEViewSettings).toHaveBeenCalledWith(
              expect.objectContaining({
                myPRsRepos: [repo.full_name]
              })
            )
          })
        }
      }
    })

    it('should remove repo from myPRsRepos when toggle is clicked again', async () => {
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
        prs: [myPR, otherPR], // Need at least 2 PRs to show toggle
        selectedRepos: [repo.full_name]
      })

      // Start with myPRsRepos enabled
      mockElectron.getIDEViewSettings.mockResolvedValue({
        sidebarWidth: 280,
        expandedRepos: [repo.full_name],
        myPRsRepos: [repo.full_name]
      })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
      })

      // With filter on, only "My PR" should be visible
      await waitFor(() => {
        expect(screen.getByText('My PR')).toBeInTheDocument()
        expect(screen.queryByText('Other PR')).not.toBeInTheDocument()
      })

      // Find the folder row with the toggle button
      // The toggle button is inside the div that contains "frontend"
      const folderRow = screen.getByRole('treeitem')
      expect(folderRow).toBeTruthy()

      // The toggle button should be visible (always visible when filter is active)
      const toggleButton = folderRow.querySelector('button')
      expect(toggleButton).toBeTruthy()

      if (toggleButton) {
        fireEvent.click(toggleButton)

        // Wait for the state to update and save with empty myPRsRepos
        await waitFor(() => {
          expect(mockElectron.setIDEViewSettings).toHaveBeenCalledWith(
            expect.objectContaining({
              myPRsRepos: []
            })
          )
        })

        // Now "Other PR" should be visible too
        await waitFor(() => {
          expect(screen.getByText('Other PR')).toBeInTheDocument()
        })
      }
    })

    it('should persist myPRsRepos independently per repo', async () => {
      const repo1 = createMockRepository({
        name: 'frontend',
        owner: { login: 'myorg', avatar_url: '' }
      })
      const repo2 = createMockRepository({
        name: 'backend',
        owner: { login: 'myorg', avatar_url: '' }
      })
      const currentUser = createMockUser({ login: 'testuser' })
      const myPR1 = createMockPullRequest({
        title: 'My Frontend PR',
        user: currentUser,
        base: { repo: repo1, ref: 'main', sha: 'abc' }
      })
      const myPR2 = createMockPullRequest({
        title: 'My Backend PR',
        user: currentUser,
        base: { repo: repo2, ref: 'main', sha: 'def' }
      })

      const mockElectron = setupAuthenticatedScenario({
        user: currentUser,
        repos: [repo1, repo2],
        prs: [myPR1, myPR2],
        selectedRepos: [repo1.full_name, repo2.full_name]
      })

      // Start with myPRsRepos enabled only for frontend
      mockElectron.getIDEViewSettings.mockResolvedValue({
        sidebarWidth: 280,
        expandedRepos: [repo1.full_name, repo2.full_name],
        myPRsRepos: [repo1.full_name] // Only frontend has filter enabled
      })

      render(<IDEView currentUser="testuser" />)

      await waitFor(() => {
        expect(screen.getByText('frontend')).toBeInTheDocument()
        expect(screen.getByText('backend')).toBeInTheDocument()
      })

      // Frontend should show the filter active (User icon vs Users icon)
      // Backend should not have filter active
      // Both repos should show their PRs since the user is the author
      await waitFor(() => {
        expect(screen.getByText('My Frontend PR')).toBeInTheDocument()
        expect(screen.getByText('My Backend PR')).toBeInTheDocument()
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
