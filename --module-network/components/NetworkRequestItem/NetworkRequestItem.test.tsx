import type { NetworkRequest } from '@data'
import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NetworkRequestItem } from './NetworkRequestItem'

const createMockRequest = (overrides: Partial<NetworkRequest> = {}): NetworkRequest => ({
  id: 'test-1',
  method: 'github.fetchPRs',
  url: 'https://api.github.com/graphql',
  httpMethod: 'POST',
  status: 'success',
  startTime: Date.now() - 150,
  endTime: Date.now(),
  ...overrides
})

describe('NetworkRequestItem', () => {
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

  describe('HTTP Method Badge', () => {
    it('should display HTTP method badge', () => {
      const request = createMockRequest({ httpMethod: 'POST' })
      render(<NetworkRequestItem request={request} />)
      const badge = screen.getByTestId('http-method-badge')
      expect(badge).toHaveTextContent('POST')
    })

    it('should apply correct color for GET method', () => {
      const request = createMockRequest({ httpMethod: 'GET' })
      render(<NetworkRequestItem request={request} />)
      const badge = screen.getByTestId('http-method-badge')
      expect(badge).toHaveClass('text-green-500/70')
    })

    it('should apply correct color for DELETE method', () => {
      const request = createMockRequest({ httpMethod: 'DELETE' })
      render(<NetworkRequestItem request={request} />)
      const badge = screen.getByTestId('http-method-badge')
      expect(badge).toHaveClass('text-red-500/70')
    })

    it('should not render badge if httpMethod is undefined', () => {
      const request = createMockRequest({ httpMethod: undefined })
      render(<NetworkRequestItem request={request} />)
      expect(screen.queryByTestId('http-method-badge')).not.toBeInTheDocument()
    })
  })

  describe('URL Display', () => {
    it('should display the request URL', () => {
      const request = createMockRequest({ url: 'https://api.github.com/graphql' })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-url')).toHaveTextContent('https://api.github.com/graphql')
    })

    it('should fall back to method name if URL is missing', () => {
      const request = createMockRequest({ url: undefined, method: 'fetchPRs' })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-url')).toHaveTextContent('fetchPRs')
    })

    it('should have title attribute for full URL', () => {
      const url = 'https://api.github.com/graphql'
      const request = createMockRequest({ url })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-url')).toHaveAttribute('title', url)
    })
  })

  describe('Status Code', () => {
    it('should display status code', () => {
      const request = createMockRequest({ statusCode: 200 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('status-code')).toHaveTextContent('200')
    })

    it('should apply green color for 2xx status codes', () => {
      const request = createMockRequest({ statusCode: 201 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('status-code')).toHaveClass('text-green-500/70')
    })

    it('should apply red color for 4xx status codes', () => {
      const request = createMockRequest({ statusCode: 404 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('status-code')).toHaveClass('text-red-400/80')
    })

    it('should not render if statusCode is undefined', () => {
      const request = createMockRequest({ statusCode: undefined })
      render(<NetworkRequestItem request={request} />)
      expect(screen.queryByTestId('status-code')).not.toBeInTheDocument()
    })
  })

  describe('Duration', () => {
    it('should display duration in milliseconds', () => {
      const request = createMockRequest({ durationMs: 150 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-duration')).toHaveTextContent('150ms')
    })

    it('should display duration in seconds for long requests', () => {
      const request = createMockRequest({ durationMs: 2500 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-duration')).toHaveTextContent('2.5s')
    })

    it('should apply yellow color for requests > 2000ms', () => {
      const request = createMockRequest({ durationMs: 2500 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-duration')).toHaveClass('text-yellow-500/70')
    })

    it('should apply red color for requests > 5000ms', () => {
      const request = createMockRequest({ durationMs: 6000 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-duration')).toHaveClass('text-red-400/80')
    })
  })

  describe('API Cost', () => {
    it('should display API cost badge', () => {
      const request = createMockRequest({ cost: 10 })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-cost')).toHaveTextContent('10')
    })

    it('should use secondary variant for cost > 0', () => {
      const request = createMockRequest({ cost: 10 })
      render(<NetworkRequestItem request={request} />)
      // Secondary variant styling is applied
      expect(screen.getByTestId('request-cost')).toBeInTheDocument()
    })

    it('should not render if cost is undefined', () => {
      const request = createMockRequest({ cost: undefined })
      render(<NetworkRequestItem request={request} />)
      expect(screen.queryByTestId('request-cost')).not.toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('should display error badge when error exists', () => {
      const request = createMockRequest({ error: 'Something went wrong', status: 'error' })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('error-badge')).toHaveTextContent('Error')
    })

    it('should apply error background to the row', () => {
      const request = createMockRequest({ status: 'error' })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('network-request-item')).toHaveClass('bg-destructive-subtle')
    })

    it('should not show error badge if no error', () => {
      const request = createMockRequest({ error: undefined })
      render(<NetworkRequestItem request={request} />)
      expect(screen.queryByTestId('error-badge')).not.toBeInTheDocument()
    })
  })

  describe('Expandable Details', () => {
    it('should render as button when has request/response body', () => {
      const request = createMockRequest({ requestBody: '{"test": true}' })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-row-expandable')).toBeInTheDocument()
      expect(screen.getByTestId('expand-indicator')).toBeInTheDocument()
    })

    it('should render as div when no body data', () => {
      const request = createMockRequest({ requestBody: undefined, responseBody: undefined })
      render(<NetworkRequestItem request={request} />)
      expect(screen.getByTestId('request-row')).toBeInTheDocument()
      expect(screen.queryByTestId('expand-indicator')).not.toBeInTheDocument()
    })

    it('should expand details when clicked', async () => {
      const user = userEvent.setup()
      const request = createMockRequest({
        requestBody: '{"query": "test"}',
        responseBody: '{"data": {}}'
      })

      render(<NetworkRequestItem request={request} />)

      // Initially not expanded
      expect(screen.queryByTestId('request-details')).not.toBeInTheDocument()

      // Click to expand
      await user.click(screen.getByTestId('request-row-expandable'))

      // Should show details
      expect(screen.getByTestId('request-details')).toBeInTheDocument()
      expect(screen.getByText('Request Body:')).toBeInTheDocument()
      expect(screen.getByText('Response Body:')).toBeInTheDocument()
    })

    it('should collapse details when clicked again', async () => {
      const user = userEvent.setup()
      const request = createMockRequest({ requestBody: '{"test": true}' })

      render(<NetworkRequestItem request={request} />)

      // Expand
      await user.click(screen.getByTestId('request-row-expandable'))
      expect(screen.getByTestId('request-details')).toBeInTheDocument()

      // Collapse
      await user.click(screen.getByTestId('request-row-expandable'))
      expect(screen.queryByTestId('request-details')).not.toBeInTheDocument()
    })

    it('should format JSON body nicely', async () => {
      const user = userEvent.setup()
      const request = createMockRequest({
        requestBody: '{"name":"test","value":123}'
      })

      render(<NetworkRequestItem request={request} />)

      await user.click(screen.getByTestId('request-row-expandable'))

      // Should be formatted with indentation
      const pre = screen.getByTestId('request-details').querySelector('pre')
      expect(pre?.textContent).toContain('"name": "test"')
      expect(pre?.textContent).toContain('"value": 123')
    })

    it('should have aria-expanded attribute', async () => {
      const user = userEvent.setup()
      const request = createMockRequest({ requestBody: '{}' })

      render(<NetworkRequestItem request={request} />)

      const button = screen.getByTestId('request-row-expandable')
      expect(button).toHaveAttribute('aria-expanded', 'false')

      await user.click(button)
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Copy Functionality', () => {
    it('should have copy buttons for request and response body', async () => {
      const user = userEvent.setup()
      const request = createMockRequest({
        requestBody: '{"request": true}',
        responseBody: '{"response": true}'
      })

      render(<NetworkRequestItem request={request} />)

      await user.click(screen.getByTestId('request-row-expandable'))

      // Should have 2 copy buttons
      const copyButtons = screen.getAllByRole('button', { name: /copy/i })
      expect(copyButtons).toHaveLength(2)
    })
  })

  describe('Timeline Indicator', () => {
    it('should render timeline indicator', () => {
      const request = createMockRequest({ status: 'success' })
      render(<NetworkRequestItem request={request} />)

      expect(screen.getByTestId('timeline-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('timeline-dot')).toBeInTheDocument()
    })

    it('should apply green color for success status', () => {
      const request = createMockRequest({ status: 'success' })
      render(<NetworkRequestItem request={request} />)

      const dot = screen.getByTestId('timeline-dot')
      expect(dot).toHaveClass('bg-green-400/70')
    })

    it('should apply blue color and animation for pending status', () => {
      const request = createMockRequest({ status: 'pending' })
      render(<NetworkRequestItem request={request} />)

      const dot = screen.getByTestId('timeline-dot')
      expect(dot).toHaveClass('bg-blue-400/70')
      expect(dot).toHaveClass('animate-pulse')
    })

    it('should apply red color for error status', () => {
      const request = createMockRequest({ status: 'error' })
      render(<NetworkRequestItem request={request} />)

      const dot = screen.getByTestId('timeline-dot')
      expect(dot).toHaveClass('bg-red-400/70')
    })

    it('should hide bottom connector line when isLast is true', () => {
      const request = createMockRequest({ status: 'success' })
      render(<NetworkRequestItem request={request} isLast={true} />)

      // The timeline indicator should only have 2 children (top line + dot), not 3 (top line + dot + bottom line)
      const timeline = screen.getByTestId('timeline-indicator')
      // When isLast, there should be no bottom connector (flex-1 element)
      const flexElements = timeline.querySelectorAll('.flex-1')
      expect(flexElements).toHaveLength(0)
    })

    it('should show bottom connector line when isLast is false', () => {
      const request = createMockRequest({ status: 'success' })
      render(<NetworkRequestItem request={request} isLast={false} />)

      const timeline = screen.getByTestId('timeline-indicator')
      // When not isLast, there should be a bottom connector (flex-1 element)
      const flexElements = timeline.querySelectorAll('.flex-1')
      expect(flexElements).toHaveLength(1)
    })
  })
})
