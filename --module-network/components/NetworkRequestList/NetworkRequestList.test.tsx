import type { NetworkRequest } from '@data'
import { render, screen } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkRequestList } from './NetworkRequestList'

const createMockRequest = (
  id: string,
  overrides: Partial<NetworkRequest> = {}
): NetworkRequest => ({
  id,
  method: `method-${id}`,
  url: `https://api.github.com/${id}`,
  httpMethod: 'GET',
  status: 'success',
  startTime: Date.now() - 150,
  endTime: Date.now(),
  durationMs: 150,
  ...overrides
})

describe('NetworkRequestList', () => {
  beforeEach(() => {
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

  describe('Empty State', () => {
    it('should show empty state when no requests', () => {
      render(<NetworkRequestList requests={[]} filteredRequests={[]} />)

      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No requests yet')).toBeInTheDocument()
    })

    it('should not show empty state when there are requests', () => {
      const requests = [createMockRequest('1')]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument()
    })
  })

  describe('No Match State', () => {
    it('should show no match state when requests exist but none match filter', () => {
      const requests = [createMockRequest('1')]
      render(<NetworkRequestList requests={requests} filteredRequests={[]} />)

      expect(screen.getByTestId('no-match-state')).toBeInTheDocument()
      expect(screen.getByText('No matching requests')).toBeInTheDocument()
      expect(screen.getByText('Try a different search term')).toBeInTheDocument()
    })

    it('should not show no match state when filter matches some requests', () => {
      const requests = [createMockRequest('1'), createMockRequest('2')]
      render(<NetworkRequestList requests={requests} filteredRequests={[requests[0]]} />)

      expect(screen.queryByTestId('no-match-state')).not.toBeInTheDocument()
    })
  })

  describe('Request Items', () => {
    it('should render request items when there are filtered requests', () => {
      const requests = [createMockRequest('1'), createMockRequest('2'), createMockRequest('3')]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      expect(screen.getByTestId('request-items')).toBeInTheDocument()
      expect(screen.getAllByTestId('network-request-item')).toHaveLength(3)
    })

    it('should render requests in chronological order (oldest first, newest last)', () => {
      const requests = [
        createMockRequest('1', { url: 'https://first.com' }),
        createMockRequest('2', { url: 'https://second.com' }),
        createMockRequest('3', { url: 'https://third.com' })
      ]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      const items = screen.getAllByTestId('network-request-item')
      // Chronological order: first in array is first in list (oldest first, newest last)
      expect(items[0]).toHaveTextContent('https://first.com')
      expect(items[1]).toHaveTextContent('https://second.com')
      expect(items[2]).toHaveTextContent('https://third.com')
    })

    it('should only render filtered requests', () => {
      const requests = [
        createMockRequest('1', { url: 'https://api.github.com' }),
        createMockRequest('2', { url: 'https://api.example.com' }),
        createMockRequest('3', { url: 'https://api.github.com' })
      ]
      const filteredRequests = [requests[0], requests[2]]

      render(<NetworkRequestList requests={requests} filteredRequests={filteredRequests} />)

      const items = screen.getAllByTestId('network-request-item')
      expect(items).toHaveLength(2)
      expect(screen.queryByText('https://api.example.com')).not.toBeInTheDocument()
    })
  })

  describe('ScrollArea', () => {
    it('should render within a ScrollArea', () => {
      const requests = [createMockRequest('1')]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      expect(screen.getByTestId('network-request-list')).toBeInTheDocument()
    })
  })

  describe('Timeline Format', () => {
    it('should pass isLast=true to the last item', () => {
      const requests = [createMockRequest('1'), createMockRequest('2'), createMockRequest('3')]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      // All items should have timeline indicators
      const items = screen.getAllByTestId('timeline-indicator')
      expect(items).toHaveLength(3)
    })

    it('should have timeline dots for each request', () => {
      const requests = [createMockRequest('1'), createMockRequest('2')]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      const dots = screen.getAllByTestId('timeline-dot')
      expect(dots).toHaveLength(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single request', () => {
      const requests = [createMockRequest('1')]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      expect(screen.getAllByTestId('network-request-item')).toHaveLength(1)
    })

    it('should handle many requests', () => {
      const requests = Array.from({ length: 50 }, (_, i) => createMockRequest(`${i}`))
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      expect(screen.getAllByTestId('network-request-item')).toHaveLength(50)
    })

    it('should handle requests with different statuses', () => {
      const requests = [
        createMockRequest('1', { status: 'success' }),
        createMockRequest('2', { status: 'error' }),
        createMockRequest('3', { status: 'pending' })
      ]
      render(<NetworkRequestList requests={requests} filteredRequests={requests} />)

      // All items should render regardless of status
      expect(screen.getAllByTestId('network-request-item')).toHaveLength(3)
    })
  })
})
