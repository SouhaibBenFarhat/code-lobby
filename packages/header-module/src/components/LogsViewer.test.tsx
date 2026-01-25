import { TooltipProvider } from '@codelobby/ui-kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogsViewer } from './LogsViewer'

// Mock navigator.clipboard
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText
  }
})

const mockLogs = [
  {
    id: '1',
    timestamp: '2026-01-21T10:00:00.000Z',
    level: 'info' as const,
    category: 'API',
    message: 'Fetching data',
    details: { endpoint: '/api/test' }
  },
  {
    id: '2',
    timestamp: '2026-01-21T10:00:01.000Z',
    level: 'error' as const,
    category: 'GraphQL',
    message: 'Request failed',
    details: { error: 'Network error' }
  },
  {
    id: '3',
    timestamp: '2026-01-21T10:00:02.000Z',
    level: 'warn' as const,
    category: 'CACHE',
    message: 'Cache miss'
  }
]

const mockSummary = {
  total: 3,
  byLevel: {
    info: 1,
    error: 1,
    warn: 1,
    debug: 0
  },
  byCategory: {
    API: 1,
    GraphQL: 1,
    CACHE: 1
  }
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    )
  }
}

describe('LogsViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockResolvedValue(undefined)

    // Configure the existing window.electron mock
    vi.mocked(window.electron.getLogs).mockResolvedValue(mockLogs)
    vi.mocked(window.electron.getLogsSummary).mockResolvedValue(mockSummary)
    vi.mocked(window.electron.exportLogs).mockResolvedValue(JSON.stringify(mockLogs, null, 2))
    vi.mocked(window.electron.clearLogs).mockResolvedValue({ success: true })
  })

  it('should render the logs button', () => {
    render(<LogsViewer />, { wrapper: createWrapper() })
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should open dialog when button is clicked', async () => {
    render(<LogsViewer />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Application Logs')).toBeInTheDocument()
    })
  })

  it('should display logs when dialog is open', async () => {
    render(<LogsViewer />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('Fetching data')).toBeInTheDocument()
      expect(screen.getByText('Request failed')).toBeInTheDocument()
      expect(screen.getByText('Cache miss')).toBeInTheDocument()
    })
  })

  it('should display log summary badges', async () => {
    render(<LogsViewer />, { wrapper: createWrapper() })

    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => {
      expect(screen.getByText('3 total')).toBeInTheDocument()
      expect(screen.getByText('1 errors')).toBeInTheDocument()
      expect(screen.getByText('1 warnings')).toBeInTheDocument()
    })
  })

  describe('Copy All Logs', () => {
    it('should copy all logs to clipboard when Copy All is clicked', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Application Logs')).toBeInTheDocument()
      })

      // Find and click the Copy dropdown trigger
      const copyDropdownTrigger = screen.getByRole('button', { name: /^copy$/i })
      fireEvent.click(copyDropdownTrigger)

      // Wait for popover to open and click "Copy all" button
      await waitFor(() => {
        expect(screen.getByText(/copy all/i)).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText(/copy all/i))

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled()
        // Should contain formatted logs (logs are sorted by timestamp desc, so "Cache miss" is first)
        const copiedText = mockWriteText.mock.calls[0][0]
        expect(copiedText).toContain('Cache miss')
        expect(copiedText).toContain('Request failed')
        expect(copiedText).toContain('Fetching data')
      })
    })

    it('should show "Copied!" feedback after copying all logs', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Application Logs')).toBeInTheDocument()
      })

      // Find and click the Copy dropdown trigger
      const copyDropdownTrigger = screen.getByRole('button', { name: /^copy$/i })
      fireEvent.click(copyDropdownTrigger)

      // Wait for popover to open and click "Copy all" button
      await waitFor(() => {
        expect(screen.getByText(/copy all/i)).toBeInTheDocument()
      })
      fireEvent.click(screen.getByText(/copy all/i))

      await waitFor(() => {
        expect(screen.getByText('Copied!')).toBeInTheDocument()
      })
    })
  })

  describe('Copy Individual Log', () => {
    it('should have a copy button on each log row', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Fetching data')).toBeInTheDocument()
      })

      // Each log row should have a copy button
      const copyLogButtons = screen.getAllByRole('button', { name: /copy log/i })
      expect(copyLogButtons.length).toBe(3) // We have 3 mock logs
    })

    it('should copy individual log to clipboard when row copy button is clicked', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Fetching data')).toBeInTheDocument()
      })

      // Logs are sorted by timestamp descending (newest first)
      // Index 0 = "Cache miss" (newest), Index 2 = "Fetching data" (oldest)
      const copyLogButtons = screen.getAllByRole('button', { name: /copy log/i })
      fireEvent.click(copyLogButtons[2]) // Click the "Fetching data" log's copy button

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled()
        // Should contain the log message
        expect(mockWriteText.mock.calls[0][0]).toContain('Fetching data')
        // Should contain the category
        expect(mockWriteText.mock.calls[0][0]).toContain('API')
        // Should contain the level
        expect(mockWriteText.mock.calls[0][0]).toContain('INFO')
      })
    })

    it('should include log details when copying a log with details', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Fetching data')).toBeInTheDocument()
      })

      // Logs are sorted by timestamp descending (newest first)
      // "Fetching data" (with details) is at index 2 (oldest)
      const copyLogButtons = screen.getAllByRole('button', { name: /copy log/i })
      fireEvent.click(copyLogButtons[2])

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled()
        // Should contain the details
        expect(mockWriteText.mock.calls[0][0]).toContain('endpoint')
        expect(mockWriteText.mock.calls[0][0]).toContain('/api/test')
      })
    })

    it('should show checkmark feedback after copying individual log', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Fetching data')).toBeInTheDocument()
      })

      // Find the copy button for the first log
      const copyLogButtons = screen.getAllByRole('button', { name: /copy log/i })
      fireEvent.click(copyLogButtons[0])

      await waitFor(() => {
        // Should show "Copied log" aria-label (checkmark state)
        expect(screen.getByRole('button', { name: /copied log/i })).toBeInTheDocument()
      })
    })

    it('should not expand log when clicking copy button', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      // Open the dialog
      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Fetching data')).toBeInTheDocument()
      })

      // Find the copy button for the first log (has details)
      const copyLogButtons = screen.getAllByRole('button', { name: /copy log/i })
      fireEvent.click(copyLogButtons[0])

      // The details should NOT be visible (copy button has stopPropagation)
      await waitFor(() => {
        expect(screen.queryByText('"endpoint"')).not.toBeInTheDocument()
      })
    })
  })

  describe('Export Logs', () => {
    it('should have Export button in toolbar', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Logs', () => {
    it('should have Refresh button in toolbar', async () => {
      render(<LogsViewer />, { wrapper: createWrapper() })

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
      })
    })
  })
})
