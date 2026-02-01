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
    isLoadingModels: false,
    onModelChange: vi.fn(),
    onRemoveApiKey: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('model selector', () => {
    it('renders model selector with selected model', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    })

    it('shows loading state when no models and loading', () => {
      render(<ChatSettings {...defaultProps} models={[]} isLoadingModels={true} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('shows model code when no models and not loading', () => {
      render(<ChatSettings {...defaultProps} models={[]} isLoadingModels={false} />)

      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument()
    })

    it('renders select trigger with correct model', () => {
      render(<ChatSettings {...defaultProps} />)

      const triggers = screen.getAllByRole('combobox')
      expect(triggers.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    })
  })

  describe('API key management', () => {
    it('shows API Key label', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('API Key')).toBeInTheDocument()
    })

    it('shows remove button', () => {
      render(<ChatSettings {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
    })

    it('calls onRemoveApiKey when remove button clicked', async () => {
      render(<ChatSettings {...defaultProps} />)

      const removeButton = screen.getByRole('button', { name: /remove/i })
      await userEvent.click(removeButton)

      expect(defaultProps.onRemoveApiKey).toHaveBeenCalled()
    })
  })
})
