import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatSettings } from './ChatSettings'

describe('ChatSettings', () => {
  const defaultProps = {
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
    selectedModel: 'claude-3-5-sonnet-20241022',
    enableThinking: false,
    isLoadingModels: false,
    onModelChange: vi.fn(),
    onThinkingChange: vi.fn(),
    onLoadModels: vi.fn(),
    onRemoveApiKey: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('model selector', () => {
    it('renders model selector with selected model', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument()
    })

    it('shows refresh models button', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByTitle('Refresh models')).toBeInTheDocument()
    })

    it('calls onLoadModels when refresh button clicked', async () => {
      render(<ChatSettings {...defaultProps} />)

      const refreshButton = screen.getByTitle('Refresh models')
      await userEvent.click(refreshButton)

      expect(defaultProps.onLoadModels).toHaveBeenCalled()
    })

    it('disables refresh button when loading models', () => {
      render(<ChatSettings {...defaultProps} isLoadingModels={true} />)

      const refreshButton = screen.getByTitle('Refresh models')
      expect(refreshButton).toBeDisabled()
    })

    it('shows loading state when no models and loading', () => {
      render(<ChatSettings {...defaultProps} models={[]} isLoadingModels={true} />)

      expect(screen.getByText('Loading models...')).toBeInTheDocument()
    })

    it('shows model code and load button when no models and not loading', () => {
      render(<ChatSettings {...defaultProps} models={[]} isLoadingModels={false} />)

      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument()
      expect(screen.getByText('Load models')).toBeInTheDocument()
    })

    // Note: Radix UI Select doesn't work well with jsdom in tests
    // The select dropdown can't be properly tested without a real browser environment
    it('renders select trigger with correct model', () => {
      render(<ChatSettings {...defaultProps} />)

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      // The selected model name is shown
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    })
  })

  describe('extended thinking toggle', () => {
    it('renders thinking toggle', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Extended Thinking')).toBeInTheDocument()
    })

    it('shows toggle in off state by default', () => {
      render(<ChatSettings {...defaultProps} enableThinking={false} />)

      // Toggle should be in off state (translate-x-1)
      const toggle = screen.getByRole('button', { name: '' })
      expect(toggle).toHaveClass('bg-muted')
    })

    it('shows toggle in on state when enabled', () => {
      render(<ChatSettings {...defaultProps} enableThinking={true} />)

      const toggle = screen.getByRole('button', { name: '' })
      expect(toggle).toHaveClass('bg-primary')
    })

    it('calls onThinkingChange when toggle clicked', async () => {
      render(<ChatSettings {...defaultProps} enableThinking={false} />)

      const toggle = screen.getByRole('button', { name: '' })
      await userEvent.click(toggle)

      expect(defaultProps.onThinkingChange).toHaveBeenCalledWith(true)
    })

    it('shows description text when thinking is enabled', () => {
      render(<ChatSettings {...defaultProps} enableThinking={true} />)

      expect(screen.getByText(/Shows Claude's reasoning process/)).toBeInTheDocument()
    })

    it('hides description text when thinking is disabled', () => {
      render(<ChatSettings {...defaultProps} enableThinking={false} />)

      expect(screen.queryByText(/Shows Claude's reasoning process/)).not.toBeInTheDocument()
    })
  })

  describe('API key management', () => {
    it('shows API key configured message', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('API Key configured')).toBeInTheDocument()
    })

    it('shows remove key button', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remove key/i })).toBeInTheDocument()
    })

    it('calls onRemoveApiKey when remove button clicked', async () => {
      render(<ChatSettings {...defaultProps} />)

      const removeButton = screen.getByRole('button', { name: /remove key/i })
      await userEvent.click(removeButton)

      expect(defaultProps.onRemoveApiKey).toHaveBeenCalled()
    })
  })
})
