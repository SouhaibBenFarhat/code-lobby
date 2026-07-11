/**
 * GitHubStatusMenuItem Component Tests
 */

import { fireEvent, render, screen } from '@test-utils'
import { ListMenu } from '@ui-kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GitHubStatusMenuItem } from './GitHubStatusMenuItem'

const mockOpenExternal = vi.fn()

vi.mock('@data', () => ({
  useGitHubStatus: vi.fn(),
  useOpenExternal: vi.fn(() => ({ mutate: mockOpenExternal }))
}))

import { useGitHubStatus } from '@data'

const mockUseGitHubStatus = vi.mocked(useGitHubStatus)

function mockStatus(
  indicator: 'none' | 'minor' | 'major' | 'critical',
  componentStatuses: string[]
) {
  mockUseGitHubStatus.mockReturnValue({
    data: {
      status: { indicator, description: '' },
      components: componentStatuses.map((status, i) => ({
        id: `c${i}`,
        name: `Component ${i}`,
        status
      })),
      incidents: []
    },
    isLoading: false,
    isError: false
  } as unknown as ReturnType<typeof useGitHubStatus>)
}

function renderItem() {
  return render(
    <ListMenu>
      <GitHubStatusMenuItem />
    </ListMenu>
  )
}

describe('GitHubStatusMenuItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing while there is no data yet', () => {
    mockUseGitHubStatus.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false
    } as unknown as ReturnType<typeof useGitHubStatus>)

    renderItem()

    expect(screen.queryByText('GitHub Status')).not.toBeInTheDocument()
  })

  it('renders nothing on error', () => {
    mockUseGitHubStatus.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true
    } as unknown as ReturnType<typeof useGitHubStatus>)

    renderItem()

    expect(screen.queryByText('GitHub Status')).not.toBeInTheDocument()
  })

  it('shows the operational label when everything is healthy', () => {
    mockStatus('none', ['operational', 'operational'])

    renderItem()

    expect(screen.getByText('GitHub Status')).toBeInTheDocument()
    expect(screen.getByText('All Systems Operational')).toBeInTheDocument()
  })

  it('summarizes affected services and opens the status page on click', () => {
    mockStatus('minor', ['operational', 'degraded_performance', 'partial_outage'])

    renderItem()

    expect(screen.getByText('2 services affected')).toBeInTheDocument()

    fireEvent.click(screen.getByText('GitHub Status'))
    expect(mockOpenExternal).toHaveBeenCalledWith('https://www.githubstatus.com')
  })

  it('uses singular wording for a single affected service', () => {
    mockStatus('minor', ['operational', 'major_outage'])

    renderItem()

    expect(screen.getByText('1 service affected')).toBeInTheDocument()
  })
})
