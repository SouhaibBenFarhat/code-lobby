import { TooltipProvider } from '@codelobby/ui-kit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatSettings } from './ChatSettings'

// Helper to render with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

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
    enableWebSearch: false,
    hasTavilyKey: false,
    isLoadingModels: false,
    onModelChange: vi.fn(),
    onThinkingChange: vi.fn(),
    onWebSearchChange: vi.fn(),
    onTavilyKeySubmit: vi.fn().mockResolvedValue({ success: true }),
    onTavilyKeyRemove: vi.fn(),
    onLoadModels: vi.fn(),
    onRemoveApiKey: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('model selector', () => {
    it('renders model selector with selected model', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument()
    })

    it('shows refresh models button', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      expect(screen.getByTitle('Refresh models')).toBeInTheDocument()
    })

    it('calls onLoadModels when refresh button clicked', async () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      const refreshButton = screen.getByTitle('Refresh models')
      await userEvent.click(refreshButton)

      expect(defaultProps.onLoadModels).toHaveBeenCalled()
    })

    it('disables refresh button when loading models', () => {
      renderWithProviders(<ChatSettings {...defaultProps} isLoadingModels={true} />)

      const refreshButton = screen.getByTitle('Refresh models')
      expect(refreshButton).toBeDisabled()
    })

    it('shows loading state when no models and loading', () => {
      renderWithProviders(<ChatSettings {...defaultProps} models={[]} isLoadingModels={true} />)

      expect(screen.getByText('Loading models...')).toBeInTheDocument()
    })

    it('shows model code and load button when no models and not loading', () => {
      renderWithProviders(<ChatSettings {...defaultProps} models={[]} isLoadingModels={false} />)

      expect(screen.getByText('claude-3-5-sonnet-20241022')).toBeInTheDocument()
      expect(screen.getByText('Load models')).toBeInTheDocument()
    })

    // Note: Radix UI Select doesn't work well with jsdom in tests
    // The select dropdown can't be properly tested without a real browser environment
    it('renders select trigger with correct model', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      // The selected model name is shown
      expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument()
    })
  })

  describe('extended thinking toggle', () => {
    it('renders thinking toggle', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Extended Thinking')).toBeInTheDocument()
    })

    it('shows toggle in off state by default', () => {
      renderWithProviders(<ChatSettings {...defaultProps} enableThinking={false} />)

      // Toggle should be in off state (translate-x-1)
      const toggles = screen.getAllByRole('button', { name: '' })
      // First toggle is thinking toggle
      expect(toggles[0]).toHaveClass('bg-muted')
    })

    it('shows toggle in on state when enabled', () => {
      renderWithProviders(<ChatSettings {...defaultProps} enableThinking={true} />)

      const toggles = screen.getAllByRole('button', { name: '' })
      expect(toggles[0]).toHaveClass('bg-primary')
    })

    it('calls onThinkingChange when toggle clicked', async () => {
      renderWithProviders(<ChatSettings {...defaultProps} enableThinking={false} />)

      const toggles = screen.getAllByRole('button', { name: '' })
      await userEvent.click(toggles[0])

      expect(defaultProps.onThinkingChange).toHaveBeenCalledWith(true)
    })

    it('shows description text when thinking is enabled', () => {
      renderWithProviders(<ChatSettings {...defaultProps} enableThinking={true} />)

      expect(screen.getByText(/Shows Claude's reasoning process/)).toBeInTheDocument()
    })

    it('hides description text when thinking is disabled', () => {
      renderWithProviders(<ChatSettings {...defaultProps} enableThinking={false} />)

      expect(screen.queryByText(/Shows Claude's reasoning process/)).not.toBeInTheDocument()
    })
  })

  describe('API key management', () => {
    it('shows API key configured message', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Claude API Key configured')).toBeInTheDocument()
    })

    it('shows remove key button', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      expect(screen.getByRole('button', { name: /remove key/i })).toBeInTheDocument()
    })

    it('calls onRemoveApiKey when remove button clicked', async () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      const removeButton = screen.getByRole('button', { name: /remove key/i })
      await userEvent.click(removeButton)

      expect(defaultProps.onRemoveApiKey).toHaveBeenCalled()
    })
  })

  describe('web search toggle', () => {
    it('renders web search toggle', () => {
      renderWithProviders(<ChatSettings {...defaultProps} />)

      expect(screen.getByText('Web Search')).toBeInTheDocument()
    })

    it('shows needs API key message when no tavily key', () => {
      renderWithProviders(<ChatSettings {...defaultProps} hasTavilyKey={false} />)

      expect(screen.getByText('(needs API key)')).toBeInTheDocument()
    })

    it('toggle is disabled when no tavily key', () => {
      renderWithProviders(<ChatSettings {...defaultProps} hasTavilyKey={false} />)

      // Find the toggle buttons - there are multiple for thinking and web search
      const toggles = screen.getAllByRole('button', { name: '' })
      // Web search toggle is the second one
      const webSearchToggle = toggles[1]
      expect(webSearchToggle).toBeDisabled()
    })

    it('toggle is enabled when tavily key exists', async () => {
      const onWebSearchChange = vi.fn()
      renderWithProviders(
        <ChatSettings {...defaultProps} hasTavilyKey={true} onWebSearchChange={onWebSearchChange} />
      )

      const toggles = screen.getAllByRole('button', { name: '' })
      const webSearchToggle = toggles[1]
      expect(webSearchToggle).not.toBeDisabled()

      await userEvent.click(webSearchToggle)
      expect(onWebSearchChange).toHaveBeenCalledWith(true)
    })

    it('shows add tavily key button when no key', () => {
      renderWithProviders(<ChatSettings {...defaultProps} hasTavilyKey={false} />)

      expect(screen.getByText('Add Tavily API Key')).toBeInTheDocument()
    })

    it('shows tavily key configured when key exists', () => {
      renderWithProviders(<ChatSettings {...defaultProps} hasTavilyKey={true} />)

      expect(screen.getByText('Tavily API Key configured')).toBeInTheDocument()
    })

    it('shows description when web search is enabled', () => {
      renderWithProviders(
        <ChatSettings {...defaultProps} hasTavilyKey={true} enableWebSearch={true} />
      )

      expect(
        screen.getByText('Claude can search the web for current information.')
      ).toBeInTheDocument()
    })

    it('shows tavily key input when add button clicked', async () => {
      renderWithProviders(<ChatSettings {...defaultProps} hasTavilyKey={false} />)

      const addButton = screen.getByText('Add Tavily API Key')
      await userEvent.click(addButton)

      expect(screen.getByPlaceholderText('tvly-...')).toBeInTheDocument()
    })

    it('calls onTavilyKeyRemove when remove clicked', async () => {
      const onTavilyKeyRemove = vi.fn()
      renderWithProviders(
        <ChatSettings {...defaultProps} hasTavilyKey={true} onTavilyKeyRemove={onTavilyKeyRemove} />
      )

      const removeButton = screen.getByRole('button', { name: 'Remove' })
      await userEvent.click(removeButton)

      expect(onTavilyKeyRemove).toHaveBeenCalled()
    })
  })
})
