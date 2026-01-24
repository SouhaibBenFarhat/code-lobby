import type { NetworkRequest } from '@codelobby/shared-store'
import { Actions, Store } from '@codelobby/shared-store'
import { TooltipProvider } from '@codelobby/ui-kit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkPanel } from './NetworkPanel'

// Mock shared-store
vi.mock('@codelobby/shared-store', async () => {
  const actual = await vi.importActual('@codelobby/shared-store')
  return {
    ...actual,
    Actions: {
      clearNetworkRequests: vi.fn()
    },
    Store: {
      networkRequests: {
        value: [],
        subscribe: vi.fn(() => () => {}),
        getSnapshot: vi.fn(() => [])
      }
    },
    useSignal: vi.fn((signal) => signal.value)
  }
})

// Wrapper component to provide TooltipProvider context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

const createMockRequest = (
  id: string,
  overrides: Partial<NetworkRequest> = {}
): NetworkRequest => ({
  id,
  method: `method-${id}`,
  url: `https://api.github.com/${id}`,
  httpMethod: 'POST',
  status: 'success',
  startTime: Date.now() - 150,
  endTime: Date.now(),
  durationMs: 150,
  cost: 5,
  ...overrides
})

describe('NetworkPanel', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock store value
    Store.networkRequests.value = []
    // Mock clipboard API using defineProperty
    const mockClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined)
    }
    Object.defineProperty(navigator, 'clipboard', {
      value: mockClipboard,
      writable: true,
      configurable: true
    })
  })

  it('should render the panel', () => {
    render(
      <TestWrapper>
        <NetworkPanel onClose={mockOnClose} />
      </TestWrapper>
    )

    expect(screen.getByTestId('network-panel')).toBeInTheDocument()
  })

  it('should render all sub-components', () => {
    Store.networkRequests.value = [createMockRequest('1')]

    render(
      <TestWrapper>
        <NetworkPanel onClose={mockOnClose} />
      </TestWrapper>
    )

    // Header
    expect(screen.getByTestId('network-panel-header')).toBeInTheDocument()
    // Search
    expect(screen.getByTestId('network-search-container')).toBeInTheDocument()
    // Stats (when there are requests)
    expect(screen.getByTestId('network-stats')).toBeInTheDocument()
    // Request list
    expect(screen.getByTestId('network-request-list')).toBeInTheDocument()
  })

  describe('Close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('close-button'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Clear functionality', () => {
    it('should not show clear button when no requests', () => {
      Store.networkRequests.value = []

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument()
    })

    it('should show clear button when there are requests', () => {
      Store.networkRequests.value = [createMockRequest('1')]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('clear-button')).toBeInTheDocument()
    })

    it('should call clearNetworkRequests action when clear is clicked', async () => {
      const user = userEvent.setup()
      Store.networkRequests.value = [createMockRequest('1')]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('clear-button'))
      expect(Actions.clearNetworkRequests).toHaveBeenCalledTimes(1)
    })
  })

  describe('Search functionality', () => {
    it('should filter requests when typing in search', async () => {
      const user = userEvent.setup()
      Store.networkRequests.value = [
        createMockRequest('1', { url: 'https://api.github.com/graphql' }),
        createMockRequest('2', { url: 'https://api.example.com/users' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      // Initially shows all requests
      expect(screen.getAllByTestId('network-request-item')).toHaveLength(2)

      // Type to filter
      await user.type(screen.getByTestId('search-input'), 'github')

      // Should only show matching request
      await waitFor(() => {
        expect(screen.getAllByTestId('network-request-item')).toHaveLength(1)
        expect(screen.getByText('https://api.github.com/graphql')).toBeInTheDocument()
      })
    })

    it('should show filtered count in stats', async () => {
      const user = userEvent.setup()
      Store.networkRequests.value = [
        createMockRequest('1', { url: 'https://api.github.com' }),
        createMockRequest('2', { url: 'https://api.example.com' }),
        createMockRequest('3', { url: 'https://api.github.com/repos' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      await user.type(screen.getByTestId('search-input'), 'github')

      await waitFor(() => {
        expect(screen.getByTestId('request-count')).toHaveTextContent('2 of 3 requests')
      })
    })

    it('should show no match state when filter has no results', async () => {
      const user = userEvent.setup()
      Store.networkRequests.value = [createMockRequest('1', { url: 'https://api.github.com' })]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      await user.type(screen.getByTestId('search-input'), 'nonexistent')

      await waitFor(() => {
        expect(screen.getByTestId('no-match-state')).toBeInTheDocument()
      })
    })

    it('should clear filter when clear button is clicked', async () => {
      const user = userEvent.setup()
      Store.networkRequests.value = [
        createMockRequest('1', { url: 'https://api.github.com' }),
        createMockRequest('2', { url: 'https://api.example.com' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      // Type to filter
      await user.type(screen.getByTestId('search-input'), 'github')

      await waitFor(() => {
        expect(screen.getAllByTestId('network-request-item')).toHaveLength(1)
      })

      // Clear the search
      await user.click(screen.getByTestId('clear-search-button'))

      // Should show all requests again
      await waitFor(() => {
        expect(screen.getAllByTestId('network-request-item')).toHaveLength(2)
      })
    })
  })

  describe('Stats display', () => {
    it('should not show stats when no requests', () => {
      Store.networkRequests.value = []

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('network-stats')).not.toBeInTheDocument()
    })

    it('should show stats when there are requests', () => {
      Store.networkRequests.value = [createMockRequest('1')]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('network-stats')).toBeInTheDocument()
    })

    it('should show correct pending count', () => {
      Store.networkRequests.value = [
        createMockRequest('1', { status: 'pending' }),
        createMockRequest('2', { status: 'pending' }),
        createMockRequest('3', { status: 'success' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('pending-count')).toHaveTextContent('2')
    })

    it('should show correct error count', () => {
      Store.networkRequests.value = [
        createMockRequest('1', { status: 'error' }),
        createMockRequest('2', { status: 'success' }),
        createMockRequest('3', { status: 'error' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('error-count')).toHaveTextContent('2 failed')
    })
  })

  describe('Total cost display', () => {
    it('should show total cost in header when > 0', () => {
      Store.networkRequests.value = [
        createMockRequest('1', { cost: 10 }),
        createMockRequest('2', { cost: 15 })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('total-cost')).toHaveTextContent('25 pts')
    })

    it('should not show total cost when 0', () => {
      Store.networkRequests.value = [
        createMockRequest('1', { cost: 0 }),
        createMockRequest('2', { cost: undefined })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('total-cost')).not.toBeInTheDocument()
    })
  })

  describe('Empty state', () => {
    it('should show empty state when no requests', () => {
      Store.networkRequests.value = []

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No requests yet')).toBeInTheDocument()
    })
  })

  describe('Request list', () => {
    it('should display requests in reverse order (newest first)', () => {
      Store.networkRequests.value = [
        createMockRequest('1', { url: 'https://first.com' }),
        createMockRequest('2', { url: 'https://second.com' }),
        createMockRequest('3', { url: 'https://third.com' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      const items = screen.getAllByTestId('network-request-item')
      expect(items[0]).toHaveTextContent('https://third.com')
      expect(items[1]).toHaveTextContent('https://second.com')
      expect(items[2]).toHaveTextContent('https://first.com')
    })
  })

  describe('Panel footer', () => {
    it('should show footer when there are requests', () => {
      Store.networkRequests.value = [createMockRequest('1'), createMockRequest('2')]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.getByTestId('list-footer')).toBeInTheDocument()
      expect(screen.getByTestId('list-footer')).toHaveTextContent('2 requests')
    })

    it('should not show footer when no requests', () => {
      Store.networkRequests.value = []

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('list-footer')).not.toBeInTheDocument()
    })

    it('should show filtered count in footer', () => {
      Store.networkRequests.value = [
        createMockRequest('1', { url: 'https://api.github.com' }),
        createMockRequest('2', { url: 'https://api.example.com' }),
        createMockRequest('3', { url: 'https://api.github.com/repos' })
      ]

      render(
        <TestWrapper>
          <NetworkPanel onClose={mockOnClose} />
        </TestWrapper>
      )

      // Without filter, shows all 3
      expect(screen.getByTestId('list-footer')).toHaveTextContent('3 requests')
    })
  })
})
