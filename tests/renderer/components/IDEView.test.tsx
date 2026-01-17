/**
 * IDEView Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils/render'
import { IDEView } from '@/components/IDEView'
import { setupAuthenticatedScenario, resetMockElectron } from '../../mocks/electron'
import {
  createMockRepository,
  createMockPullRequest,
  createMockUser,
  resetIdCounter
} from '../../mocks/factories'
import React from 'react'

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
      
      setupAuthenticatedScenario({ repos, prs, selectedRepos: repos.map(r => r.full_name) })
      
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
      
      setupAuthenticatedScenario({ repos, selectedRepos: repos.map(r => r.full_name) })
      
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
      const prs = [
        createMockPullRequest({ base: { repo, ref: 'main', sha: 'abc' } })
      ]
      
      setupAuthenticatedScenario({ repos: [repo], prs, selectedRepos: [repo.full_name] })
      
      render(<IDEView currentUser="testuser" />)
      
      await waitFor(() => {
        expect(screen.getByText('1 PR')).toBeInTheDocument()
      })
    })
  })
})
