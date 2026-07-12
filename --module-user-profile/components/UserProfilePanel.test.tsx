/**
 * UserProfilePanel tests
 *
 * The panel is presentational: it reads contribution stats + the current user
 * from @data (mocked here) and renders a stats-only body with a header that has
 * refresh / collapse / close controls.
 */

import type { ContributionsData } from '@data'
import { render, screen } from '@test-utils'
import { fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UserProfilePanel } from './UserProfilePanel'

let mockContributions: {
  data: ContributionsData | null
  isLoading: boolean
  isFetching: boolean
  error: Error | null
}
let mockUser: { login: string; avatar_url: string } | null
const mockRefresh = vi.fn()

vi.mock('@data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@data')>()
  return {
    ...actual,
    useContributions: () => mockContributions,
    useCurrentUser: () => ({ data: mockUser }),
    useRefreshContributions: () => mockRefresh
  }
})

const sampleData: ContributionsData = {
  totalContributions: 1234,
  totalCommitContributions: 800,
  totalPullRequestContributions: 200,
  totalPullRequestReviewContributions: 150,
  totalIssueContributions: 84,
  currentStreak: 12,
  longestStreak: 40,
  averagePerDay: 3,
  mostActiveDay: '2026-01-06',
  mostActiveDayCount: 10,
  // Counts chosen to exercise every getHeatmapColor branch (0 / <.25 / .25-.5 / .5-.75 / >.75).
  weeks: [
    {
      contributionDays: [
        { date: '2026-01-01', contributionCount: 0, weekday: 0 },
        { date: '2026-01-02', contributionCount: 2, weekday: 1 },
        { date: '2026-01-03', contributionCount: 3, weekday: 2 },
        { date: '2026-01-04', contributionCount: 6, weekday: 3 },
        { date: '2026-01-05', contributionCount: 8, weekday: 4 },
        { date: '2026-01-06', contributionCount: 10, weekday: 5 },
        { date: '2026-02-01', contributionCount: 5, weekday: 6 }
      ]
    }
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUser = { login: 'octocat', avatar_url: 'https://example.com/a.png' }
  mockContributions = { data: sampleData, isLoading: false, isFetching: false, error: null }
})

describe('UserProfilePanel', () => {
  it('renders the user login in the header', () => {
    render(<UserProfilePanel />)
    expect(screen.getByText('octocat')).toBeInTheDocument()
  })

  it('falls back to "Stats" when there is no user', () => {
    mockUser = null
    render(<UserProfilePanel />)
    expect(screen.getByText('Stats')).toBeInTheDocument()
  })

  it('renders the contribution stats, heatmap and breakdown', () => {
    render(<UserProfilePanel />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Streak')).toBeInTheDocument()
    expect(screen.getByText('Best')).toBeInTheDocument()
    expect(screen.getByText('Avg/Day')).toBeInTheDocument()
    expect(screen.getByText('Activity (Last Year)')).toBeInTheDocument()
    expect(screen.getByText('Breakdown')).toBeInTheDocument()
    // A heatmap day cell (crosses several getHeatmapColor branches).
    expect(screen.getByLabelText('2026-01-06: 10 contributions')).toBeInTheDocument()
  })

  it('shows a loading spinner while contributions load with no data', () => {
    mockContributions = { data: null, isLoading: true, isFetching: true, error: null }
    render(<UserProfilePanel />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('shows an error state and retries via the mutation', () => {
    mockContributions = {
      data: null,
      isLoading: false,
      isFetching: false,
      error: new Error('boom')
    }
    render(<UserProfilePanel />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('refreshes contributions from the header button', () => {
    render(<UserProfilePanel />)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh stats' }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('disables the refresh button while fetching', () => {
    mockContributions = { data: sampleData, isLoading: false, isFetching: true, error: null }
    render(<UserProfilePanel />)
    expect(screen.getByRole('button', { name: 'Refresh stats' })).toBeDisabled()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<UserProfilePanel onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close profile panel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles collapse and hides the body when collapsed', () => {
    const onToggleCollapse = vi.fn()
    const { rerender } = render(
      <UserProfilePanel isCollapsed={false} onToggleCollapse={onToggleCollapse} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Collapse profile panel' }))
    expect(onToggleCollapse).toHaveBeenCalledTimes(1)

    rerender(<UserProfilePanel isCollapsed onToggleCollapse={onToggleCollapse} />)
    // Body (stats) is not rendered while collapsed; the expand control shows instead.
    expect(screen.queryByText('Total')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand profile panel' })).toBeInTheDocument()
  })

  it('renders a generic user glyph when no avatar/user is present', () => {
    mockUser = null
    const { container } = render(<UserProfilePanel />)
    // No avatar image is rendered without a user.
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })
})
