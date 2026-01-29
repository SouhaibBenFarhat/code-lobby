/**
 * ContributionsModal Component Tests
 */

import { act, createMockUser, fireEvent, render, screen, waitFor } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ContributionsModal } from './ContributionsModal'

// Mock the contributions data
const mockContributionsData = {
  totalContributions: 1250,
  weeks: [
    {
      contributionDays: [
        { date: '2026-01-01', contributionCount: 5, weekday: 3 },
        { date: '2026-01-02', contributionCount: 8, weekday: 4 },
        { date: '2026-01-03', contributionCount: 0, weekday: 5 },
        { date: '2026-01-04', contributionCount: 12, weekday: 6 },
        { date: '2026-01-05', contributionCount: 3, weekday: 0 }
      ]
    }
  ],
  totalCommitContributions: 800,
  totalPullRequestContributions: 200,
  totalPullRequestReviewContributions: 150,
  totalIssueContributions: 100,
  currentStreak: 15,
  longestStreak: 45,
  averagePerDay: 3.4,
  mostActiveDay: '2026-01-04',
  mostActiveDayCount: 12
}

const mockRefreshContributions = vi.fn()

// Mock @data module
vi.mock('@data', () => ({
  useContributions: vi.fn(),
  useRefreshContributions: vi.fn(() => mockRefreshContributions)
}))

// Get the mocked function
import { useContributions } from '@data'

const mockUseContributions = vi.mocked(useContributions)

describe('ContributionsModal', () => {
  const mockUser = createMockUser({ login: 'testuser', name: 'Test User' })

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock: data not loaded yet
    mockUseContributions.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      error: null
    } as ReturnType<typeof useContributions>)
  })

  describe('Trigger Button', () => {
    it('should render user avatar and login as trigger', () => {
      render(<ContributionsModal user={mockUser} />)

      expect(screen.getByText(mockUser.login)).toBeInTheDocument()
      // Avatar shows initials as fallback when image not loaded
      expect(screen.getByText('TE')).toBeInTheDocument()
    })

    it('should open modal when clicking the avatar', async () => {
      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })
  })

  describe('Modal Content', () => {
    it('should show loading state when fetching contributions', async () => {
      mockUseContributions.mockReturnValue({
        data: null,
        isLoading: true,
        isFetching: true,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      // Open modal
      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        expect(screen.getByText('Loading contributions...')).toBeInTheDocument()
      })
    })

    it('should show error state when fetch fails', async () => {
      mockUseContributions.mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: new Error('Failed to fetch')
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        expect(screen.getByText('Failed to load contributions')).toBeInTheDocument()
        expect(screen.getByText('Try Again')).toBeInTheDocument()
      })
    })

    it('should display contribution stats when data is loaded', async () => {
      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: false,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        // Check total contributions
        expect(screen.getByText('1,250')).toBeInTheDocument()
        expect(screen.getByText('Total Contributions')).toBeInTheDocument()

        // Check streak labels
        expect(screen.getByText('Current Streak')).toBeInTheDocument()
        expect(screen.getByText('Longest Streak')).toBeInTheDocument()
        expect(screen.getByText('Daily Average')).toBeInTheDocument()
      })
    })

    it('should display contribution breakdown', async () => {
      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: false,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        expect(screen.getByText('Contribution Breakdown')).toBeInTheDocument()
        expect(screen.getByText('Commits (64%)')).toBeInTheDocument()
        expect(screen.getByText('Pull Requests (16%)')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Functionality', () => {
    it('should have a refresh button', async () => {
      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: false,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        const refreshButton = document
          .querySelector('button svg.lucide-refresh-cw')
          ?.closest('button')
        expect(refreshButton).toBeInTheDocument()
      })
    })

    it('should call refresh when refresh button is clicked', async () => {
      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: false,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(async () => {
        const refreshButton = document
          .querySelector('button svg.lucide-refresh-cw')
          ?.closest('button')
        expect(refreshButton).toBeInTheDocument()

        if (refreshButton) {
          await act(async () => {
            fireEvent.click(refreshButton)
          })
          expect(mockRefreshContributions).toHaveBeenCalled()
        }
      })
    })

    it('should show spinning icon when fetching', async () => {
      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: true,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        const refreshIcon = document.querySelector('svg.lucide-refresh-cw.animate-spin')
        expect(refreshIcon).toBeInTheDocument()
      })
    })
  })

  describe('Lazy Loading', () => {
    it('should only fetch contributions when modal opens', async () => {
      mockUseContributions.mockReturnValue({
        data: null,
        isLoading: false,
        isFetching: false,
        error: null
      } as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      // Initially, useContributions should be called with enabled=false
      expect(mockUseContributions).toHaveBeenCalledWith(false)

      // Open modal
      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      // After opening, should be called with enabled=true
      await waitFor(() => {
        expect(mockUseContributions).toHaveBeenCalledWith(true)
      })
    })
  })

  describe('User Display', () => {
    it('should show user name in modal header', async () => {
      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: false,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={mockUser} />)

      const trigger = screen.getByText(mockUser.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        // Should show user's display name
        expect(screen.getByText(mockUser.name as string)).toBeInTheDocument()
        // Should show @username
        expect(screen.getByText(`@${mockUser.login}`)).toBeInTheDocument()
      })
    })

    it('should fallback to login if name is null', async () => {
      const userWithoutName = { ...mockUser, name: null }

      mockUseContributions.mockReturnValue({
        data: mockContributionsData,
        isLoading: false,
        isFetching: false,
        error: null
      } as unknown as ReturnType<typeof useContributions>)

      render(<ContributionsModal user={userWithoutName} />)

      const trigger = screen.getByText(userWithoutName.login)
      await act(async () => {
        fireEvent.click(trigger)
      })

      await waitFor(() => {
        // Should use login as fallback for the title (h2 is the DialogTitle)
        const headings = screen.getAllByRole('heading')
        const dialogTitle = headings.find((h) => h.tagName === 'H2')
        expect(dialogTitle).toHaveTextContent(userWithoutName.login)
      })
    })
  })
})
