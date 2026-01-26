import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatHeader } from './ChatHeader'

describe('ChatHeader', () => {
  const defaultProps = {
    apiKey: 'sk-ant-test',
    selectedModel: 'claude-3-5-sonnet-20241022',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        display_name: 'Claude 3.5 Sonnet',
        created_at: '2024-10-22T00:00:00Z'
      },
      {
        id: 'claude-3-opus-20240229',
        display_name: 'Claude 3 Opus',
        created_at: '2024-02-29T00:00:00Z'
      }
    ],
    showSettings: false,
    onShowSettingsChange: vi.fn(),
    onClearHistory: vi.fn(),
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('title display', () => {
    it('shows AI Chat title', () => {
      render(<ChatHeader {...defaultProps} />)
      expect(screen.getByText('AI Chat')).toBeInTheDocument()
    })

    it('shows model name when API key exists', () => {
      render(<ChatHeader {...defaultProps} />)
      expect(screen.getByText(/Claude 3.5 Sonnet/)).toBeInTheDocument()
    })

    it('does not show model name when no API key', () => {
      render(<ChatHeader {...defaultProps} apiKey={null} />)
      expect(screen.queryByText(/Claude 3.5 Sonnet/)).not.toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('renders close button', () => {
      render(<ChatHeader {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('calls onClose when close button clicked', async () => {
      render(<ChatHeader {...defaultProps} />)
      // Find the last button which should be close
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons[buttons.length - 1]
      await userEvent.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('calls onShowSettingsChange when settings button clicked', async () => {
      render(<ChatHeader {...defaultProps} />)
      // Find the settings button by its aria-label or title
      const buttons = screen.getAllByRole('button')
      // Settings button should be the first one (before trash and close)
      const settingsButton = buttons[0]
      await userEvent.click(settingsButton)
      expect(defaultProps.onShowSettingsChange).toHaveBeenCalledWith(true)
    })

    it('calls onClearHistory when clear button clicked', async () => {
      render(<ChatHeader {...defaultProps} />)
      // Find the clear/trash button (second button)
      const buttons = screen.getAllByRole('button')
      const clearButton = buttons[1]
      await userEvent.click(clearButton)
      expect(defaultProps.onClearHistory).toHaveBeenCalled()
    })

    it('hides settings and clear buttons when no API key', () => {
      render(<ChatHeader {...defaultProps} apiKey={null} />)
      // Only close button should be present
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(1)
    })
  })

  describe('styling', () => {
    it('has elevation effect classes', () => {
      const { container } = render(<ChatHeader {...defaultProps} />)
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]')
    })

    it('has consistent background styling', () => {
      const { container } = render(<ChatHeader {...defaultProps} />)
      const header = container.firstChild as HTMLElement
      expect(header).toHaveClass('bg-card/80', 'backdrop-blur-sm')
    })
  })
})
