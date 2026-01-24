import {
  fireEvent,
  customRender as render,
  resetMockElectron,
  screen,
  setupMockElectron
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CheckRun } from '../types'
import { CIChecksSection } from './CIChecksSection'

// Helper to create mock check runs
function createMockCheckRun(overrides: Partial<CheckRun> = {}): CheckRun {
  return {
    id: Math.random(),
    name: 'Test Check',
    status: 'completed',
    conclusion: 'success',
    html_url: 'https://github.com/test/check/1',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  }
}

describe('CIChecksSection', () => {
  beforeEach(() => {
    setupMockElectron()
  })

  afterEach(() => {
    resetMockElectron()
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render CI Checks heading', () => {
      render(
        <CIChecksSection
          checks={{ check_runs: [] }}
          checksLoading={false}
          owner="test-org"
          repo="test-repo"
        />
      )

      expect(screen.getByText('CI Checks')).toBeInTheDocument()
    })

    it('should show loading spinner when checksLoading is true', () => {
      const { container } = render(
        <CIChecksSection checks={null} checksLoading={true} owner="test-org" repo="test-repo" />
      )

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show "No CI checks configured" when no checks exist', () => {
      render(
        <CIChecksSection
          checks={{ check_runs: [] }}
          checksLoading={false}
          owner="test-org"
          repo="test-repo"
        />
      )

      expect(screen.getByText('No CI checks configured')).toBeInTheDocument()
    })
  })

  describe('check counts', () => {
    it('should display passed check count', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ conclusion: 'success' }),
          createMockCheckRun({ conclusion: 'success' })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should display failed check count', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ conclusion: 'failure' }),
          createMockCheckRun({ conclusion: 'failure' }),
          createMockCheckRun({ conclusion: 'failure' })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should display running check count', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ status: 'in_progress', conclusion: null }),
          createMockCheckRun({ status: 'queued', conclusion: null })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('grouped view', () => {
    it('should show group headers when there are checks', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ name: 'Build', conclusion: 'success' }),
          createMockCheckRun({ name: 'Test', conclusion: 'failure' }),
          createMockCheckRun({ name: 'Lint', status: 'in_progress', conclusion: null })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByText(/Running \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Failed \(1\)/)).toBeInTheDocument()
      expect(screen.getByText(/Passed \(1\)/)).toBeInTheDocument()
    })

    it('should expand failed group by default', () => {
      const checks = {
        check_runs: [createMockCheckRun({ name: 'Failed Test', conclusion: 'failure' })]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      // Failed group is expanded by default, so check name should be visible
      expect(screen.getByText('Failed Test')).toBeInTheDocument()
    })

    it('should collapse success group by default', () => {
      const checks = {
        check_runs: [createMockCheckRun({ name: 'Passing Check', conclusion: 'success' })]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      // Success group is collapsed by default
      expect(screen.queryByText('Passing Check')).not.toBeInTheDocument()
    })

    it('should toggle group expansion when clicked', () => {
      const checks = {
        check_runs: [createMockCheckRun({ name: 'Passing Check', conclusion: 'success' })]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      // Initially collapsed
      expect(screen.queryByText('Passing Check')).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(screen.getByText(/Passed \(1\)/))

      // Now visible
      expect(screen.getByText('Passing Check')).toBeInTheDocument()

      // Click to collapse again
      fireEvent.click(screen.getByText(/Passed \(1\)/))

      // Hidden again
      expect(screen.queryByText('Passing Check')).not.toBeInTheDocument()
    })
  })

  describe('flat list view', () => {
    it('should toggle to flat list view when group toggle button is clicked', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ name: 'Check 1', conclusion: 'success' }),
          createMockCheckRun({ name: 'Check 2', conclusion: 'failure' })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      // Click the group toggle button (layers icon button)
      const groupToggle = screen.getByTitle('Show flat list')
      fireEvent.click(groupToggle)

      // In flat view, both checks should be visible without group headers
      expect(screen.getByText('Check 1')).toBeInTheDocument()
      expect(screen.getByText('Check 2')).toBeInTheDocument()

      // Group headers should not be present
      expect(screen.queryByText(/Passed \(\d+\)/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Failed \(\d+\)/)).not.toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    it('should render search input when checks exist', () => {
      const checks = {
        check_runs: [createMockCheckRun()]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByPlaceholderText('Search jobs...')).toBeInTheDocument()
    })

    it('should filter checks by name', async () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ name: 'Build', conclusion: 'failure' }),
          createMockCheckRun({ name: 'Test', conclusion: 'failure' }),
          createMockCheckRun({ name: 'Lint', conclusion: 'failure' })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      const searchInput = screen.getByPlaceholderText('Search jobs...')
      fireEvent.change(searchInput, { target: { value: 'Build' } })

      // Build should be visible
      expect(screen.getByText('Build')).toBeInTheDocument()

      // Test and Lint should not be visible
      expect(screen.queryByText('Test')).not.toBeInTheDocument()
      expect(screen.queryByText('Lint')).not.toBeInTheDocument()
    })

    it('should show "No jobs matching" message when search has no results', () => {
      const checks = {
        check_runs: [createMockCheckRun({ name: 'Build', conclusion: 'failure' })]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      const searchInput = screen.getByPlaceholderText('Search jobs...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

      expect(screen.getByText(/No jobs matching "nonexistent"/)).toBeInTheDocument()
    })

    it('should show filtered count when searching', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ name: 'Build 1', conclusion: 'failure' }),
          createMockCheckRun({ name: 'Build 2', conclusion: 'failure' }),
          createMockCheckRun({ name: 'Test', conclusion: 'failure' })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      const searchInput = screen.getByPlaceholderText('Search jobs...')
      fireEvent.change(searchInput, { target: { value: 'Build' } })

      expect(screen.getByText(/Showing 2 of 3 jobs/)).toBeInTheDocument()
    })

    it('should clear search when X button is clicked', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ name: 'Build', conclusion: 'failure' }),
          createMockCheckRun({ name: 'Test', conclusion: 'failure' })
        ]
      }

      const { container } = render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      const searchInput = screen.getByPlaceholderText('Search jobs...')
      fireEvent.change(searchInput, { target: { value: 'Build' } })

      // Only Build visible
      expect(screen.queryByText('Test')).not.toBeInTheDocument()

      // Click clear button - it's in the search input area
      const searchContainer = container.querySelector('.relative')
      const clearButton = searchContainer?.querySelector('button')
      expect(clearButton).toBeInTheDocument()
      if (clearButton) {
        fireEvent.click(clearButton)
      }

      // Both visible now
      expect(screen.getByText('Build')).toBeInTheDocument()
      expect(screen.getByText('Test')).toBeInTheDocument()
    })
  })

  describe('check grouping logic', () => {
    it('should group queued checks with running', () => {
      const checks = {
        check_runs: [
          createMockCheckRun({ name: 'Queued Check', status: 'queued', conclusion: null })
        ]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByText(/Running \(1\)/)).toBeInTheDocument()
    })

    it('should show "Other" group for skipped/cancelled checks', () => {
      const checks = {
        check_runs: [createMockCheckRun({ name: 'Skipped Check', conclusion: 'skipped' })]
      }

      render(
        <CIChecksSection checks={checks} checksLoading={false} owner="test-org" repo="test-repo" />
      )

      expect(screen.getByText(/Other \(1\)/)).toBeInTheDocument()
    })
  })
})
