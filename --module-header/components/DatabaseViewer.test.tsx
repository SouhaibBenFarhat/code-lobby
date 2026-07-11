/**
 * DatabaseViewer Tests
 *
 * Tests for the Database Viewer component that displays SQLite tables.
 */

import { render, screen, waitFor } from '@test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DatabaseViewer } from './DatabaseViewer'

// Mock window.electron
const mockElectron = {
  db: {
    tables: {
      list: vi.fn(),
      query: vi.fn(),
      count: vi.fn()
    }
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error - mocking window.electron
  window.electron = mockElectron
})

describe('DatabaseViewer', () => {
  it('renders the database icon button', () => {
    render(<DatabaseViewer />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('fetches and displays tables when dialog opens', async () => {
    // Mock successful table list response
    mockElectron.db.tables.list.mockResolvedValue({
      success: true,
      data: ['conversations', 'messages', 'ai_usage']
    })

    // Mock count and query for each table
    mockElectron.db.tables.count.mockResolvedValue({ success: true, data: 5 })
    mockElectron.db.tables.query.mockResolvedValue({
      success: true,
      data: [{ id: '1', content: 'test' }]
    })

    render(<DatabaseViewer />)

    // Click to open dialog
    const button = screen.getByRole('button')
    button.click()

    // Wait for tables to load
    await waitFor(() => {
      expect(mockElectron.db.tables.list).toHaveBeenCalled()
    })

    // Check that table names appear
    await waitFor(() => {
      expect(screen.getByText('conversations')).toBeInTheDocument()
      expect(screen.getByText('messages')).toBeInTheDocument()
      expect(screen.getByText('ai_usage')).toBeInTheDocument()
    })
  })

  it('handles empty table list', async () => {
    mockElectron.db.tables.list.mockResolvedValue({
      success: true,
      data: []
    })

    render(<DatabaseViewer />)

    const button = screen.getByRole('button')
    button.click()

    await waitFor(() => {
      expect(mockElectron.db.tables.list).toHaveBeenCalled()
    })

    // Should show "Select a table" message when no tables
    await waitFor(() => {
      expect(screen.getByText('Select a table to view data')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    mockElectron.db.tables.list.mockResolvedValue({
      success: false,
      error: 'Database connection failed'
    })

    render(<DatabaseViewer />)

    const button = screen.getByRole('button')
    button.click()

    await waitFor(() => {
      expect(mockElectron.db.tables.list).toHaveBeenCalled()
    })

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Database connection failed')).toBeInTheDocument()
    })
  })

  it('displays table row count in badges', async () => {
    mockElectron.db.tables.list.mockResolvedValue({
      success: true,
      data: ['conversations']
    })
    mockElectron.db.tables.count.mockResolvedValue({ success: true, data: 42 })
    mockElectron.db.tables.query.mockResolvedValue({ success: true, data: [] })

    render(<DatabaseViewer />)

    const button = screen.getByRole('button')
    button.click()

    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument()
    })
  })

  it('shows table data when table is selected', async () => {
    mockElectron.db.tables.list.mockResolvedValue({
      success: true,
      data: ['conversations']
    })
    mockElectron.db.tables.count.mockResolvedValue({ success: true, data: 1 })
    mockElectron.db.tables.query.mockResolvedValue({
      success: true,
      data: [{ id: 'conv-1', sessionType: 'general', createdAt: 1234567890 }]
    })

    render(<DatabaseViewer />)

    const button = screen.getByRole('button')
    button.click()

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('conversations')).toBeInTheDocument()
    })

    // Table headers should appear
    await waitFor(() => {
      expect(screen.getByText('id')).toBeInTheDocument()
      expect(screen.getByText('sessionType')).toBeInTheDocument()
    })
  })
})

describe('DatabaseViewer (controlled mode)', () => {
  it('opens directly from the open prop, with no trigger button', async () => {
    mockElectron.db.tables.list.mockResolvedValue({
      success: true,
      data: ['conversations']
    })
    mockElectron.db.tables.count.mockResolvedValue({ success: true, data: 1 })
    mockElectron.db.tables.query.mockResolvedValue({ success: true, data: [] })

    render(<DatabaseViewer open onOpenChange={vi.fn()} />)

    // Content is shown without clicking a trigger (menu-driven open)
    expect(screen.getByText('SQLite Database Viewer')).toBeInTheDocument()
    await waitFor(() => expect(mockElectron.db.tables.list).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText('conversations')).toBeInTheDocument())
  })

  it('renders nothing (no trigger button) when controlled closed', () => {
    render(<DatabaseViewer open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByText('SQLite Database Viewer')).not.toBeInTheDocument()
    // Controlled mode must not render the standalone Database trigger button
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(mockElectron.db.tables.list).not.toHaveBeenCalled()
  })
})
