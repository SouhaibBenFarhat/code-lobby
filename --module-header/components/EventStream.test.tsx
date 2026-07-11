/**
 * EventStream Component Tests
 */

import { fireEvent, render, screen } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EventStream } from './EventStream'

// Mock @data — EventStream's only runtime dependency on it is useWatchedRepoEvents
vi.mock('@data', () => ({
  useWatchedRepoEvents: vi.fn()
}))

import { useWatchedRepoEvents } from '@data'

const mockUseWatchedRepoEvents = vi.mocked(useWatchedRepoEvents)
const mockRefetch = vi.fn()

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    type: 'Review',
    repoName: 'org/repo',
    title: 'Approved PR #7',
    description: 'Looks good',
    timestamp: new Date().toISOString(),
    icon: 'review' as const,
    actor: { login: 'alice', avatar_url: 'https://example.com/a.png' },
    ...overrides
  }
}

describe('EventStream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseWatchedRepoEvents.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch
    })
  })

  it('renders the Activity Stream header', () => {
    render(<EventStream />)
    expect(screen.getByText('Activity Stream')).toBeInTheDocument()
  })

  it('shows the background-refetch spinner when fetching but not on first load', () => {
    mockUseWatchedRepoEvents.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: true,
      refetch: mockRefetch
    })
    const { container } = render(<EventStream />)
    expect(container.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows the loading state while first load is in flight', () => {
    mockUseWatchedRepoEvents.mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
      refetch: mockRefetch
    })
    render(<EventStream />)
    expect(screen.getByText('Loading events...')).toBeInTheDocument()
  })

  it('shows the empty state when there are no events', () => {
    render(<EventStream />)
    expect(screen.getByText('No recent activity')).toBeInTheDocument()
  })

  it('renders real events with actor, title, description and repo', () => {
    mockUseWatchedRepoEvents.mockReturnValue({
      data: [
        makeEvent(),
        makeEvent({
          id: 'evt-2',
          type: 'Push',
          title: 'Pushed 2 commits',
          description: '',
          icon: 'commit',
          actor: { login: 'bob', avatar_url: '' }
        })
      ],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch
    })
    render(<EventStream />)

    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('Approved PR #7')).toBeInTheDocument()
    expect(screen.getByText('Looks good')).toBeInTheDocument()
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('Pushed 2 commits')).toBeInTheDocument()
    // Short repo name is shown for each event
    expect(screen.getAllByText('repo').length).toBe(2)
  })

  it('refetches when the refresh button is clicked', () => {
    render(<EventStream />)
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[buttons.length - 1])
    expect(mockRefetch).toHaveBeenCalledTimes(1)
  })

  it('renders an icon for every event type', () => {
    const icons = ['commit', 'pr', 'review', 'comment', 'issue', 'branch', 'other'] as const
    mockUseWatchedRepoEvents.mockReturnValue({
      data: icons.map((icon, i) =>
        makeEvent({ id: `e${i}`, icon, title: `event ${icon}`, description: '' })
      ),
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch
    })
    render(<EventStream />)

    for (const icon of icons) {
      expect(screen.getByText(`event ${icon}`)).toBeInTheDocument()
    }
  })

  it('falls back to a generic actor + icon when the event has no actor', () => {
    mockUseWatchedRepoEvents.mockReturnValue({
      data: [makeEvent({ id: 'na', actor: undefined, icon: 'branch', title: 'branch created' })],
      isLoading: false,
      isFetching: false,
      refetch: mockRefetch
    })
    render(<EventStream />)

    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('branch created')).toBeInTheDocument()
  })
})
