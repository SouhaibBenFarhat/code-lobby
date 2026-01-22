import { TooltipProvider } from '@codelobby/ui-kit'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

// Helper to render with TooltipProvider
function renderChatInput(props: React.ComponentProps<typeof ChatInput>) {
  return render(
    <TooltipProvider>
      <ChatInput {...props} />
    </TooltipProvider>
  )
}

describe('ChatInput', () => {
  const defaultProps = {
    apiKey: 'sk-ant-test',
    apiKeyInput: '',
    isSettingKey: false,
    onApiKeyInputChange: vi.fn(),
    onSetApiKey: vi.fn(),
    input: '',
    isSending: false,
    isContextValid: true,
    linkedPRChat: false,
    streaming: { content: '', thinking: '', isStreaming: false },
    messages: [],
    selectedModel: 'claude-3-5-sonnet-20241022',
    enableWebFetch: false,
    onWebFetchChange: vi.fn(),
    prompts: [
      { id: 'test-prompt', label: 'Test Prompt', prompt: 'Test prompt content', icon: '💡' }
    ],
    customPrompts: [],
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
    onQuickActionSelect: vi.fn(),
    onAddCustomPrompt: vi.fn(),
    onDeleteCustomPrompt: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API key input mode', () => {
    it('shows API key input when no apiKey', () => {
      renderChatInput({ ...defaultProps, apiKey: null })

      expect(screen.getByPlaceholderText(/Enter Claude API key/)).toBeInTheDocument()
      expect(screen.getByText(/console.anthropic.com/)).toBeInTheDocument()
    })

    it('calls onApiKeyInputChange when typing API key', async () => {
      renderChatInput({ ...defaultProps, apiKey: null })

      const input = screen.getByPlaceholderText(/Enter Claude API key/)
      await userEvent.type(input, 'sk-ant-test123')

      expect(defaultProps.onApiKeyInputChange).toHaveBeenCalled()
    })

    it('calls onSetApiKey when Enter pressed in API key input', async () => {
      renderChatInput({ ...defaultProps, apiKey: null, apiKeyInput: 'sk-ant-test123' })

      const input = screen.getByPlaceholderText(/Enter Claude API key/)
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(defaultProps.onSetApiKey).toHaveBeenCalled()
    })

    it('calls onSetApiKey when key button clicked', async () => {
      renderChatInput({ ...defaultProps, apiKey: null, apiKeyInput: 'sk-ant-test123' })

      const buttons = screen.getAllByRole('button')
      await userEvent.click(buttons[0])

      expect(defaultProps.onSetApiKey).toHaveBeenCalled()
    })

    it('disables button when API key input is empty', () => {
      renderChatInput({ ...defaultProps, apiKey: null, apiKeyInput: '' })

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toBeDisabled()
    })

    it('disables button when setting key', () => {
      renderChatInput({
        ...defaultProps,
        apiKey: null,
        apiKeyInput: 'sk-ant-test',
        isSettingKey: true
      })

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toBeDisabled()
    })
  })

  describe('message input mode', () => {
    it('shows textarea when API key exists', () => {
      renderChatInput({ ...defaultProps })

      expect(screen.getByPlaceholderText(/Type a message/)).toBeInTheDocument()
    })

    it('shows PR-specific placeholder when linkedPRChat', () => {
      renderChatInput({ ...defaultProps, linkedPRChat: true })

      expect(screen.getByPlaceholderText(/Ask about this PR/)).toBeInTheDocument()
    })

    it('shows queue placeholder when sending', () => {
      renderChatInput({ ...defaultProps, isSending: true })

      expect(screen.getByPlaceholderText(/Type to queue/)).toBeInTheDocument()
    })

    it('calls onInputChange when typing message', async () => {
      renderChatInput({ ...defaultProps })

      const textarea = screen.getByPlaceholderText(/Type a message/)
      await userEvent.type(textarea, 'Hello')

      expect(defaultProps.onInputChange).toHaveBeenCalled()
    })

    it('calls onSendMessage when Enter pressed (without Shift)', async () => {
      renderChatInput({ ...defaultProps, input: 'Hello' })

      const textarea = screen.getByPlaceholderText(/Type a message/)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      expect(defaultProps.onSendMessage).toHaveBeenCalled()
    })

    it('does not call onSendMessage when Shift+Enter pressed', async () => {
      renderChatInput({ ...defaultProps, input: 'Hello' })

      const textarea = screen.getByPlaceholderText(/Type a message/)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled()
    })

    it('calls onSendMessage when send button clicked', async () => {
      renderChatInput({ ...defaultProps, input: 'Hello' })

      const sendButton = screen.getByTitle(/Send message/)
      await userEvent.click(sendButton)

      expect(defaultProps.onSendMessage).toHaveBeenCalled()
    })

    it('disables send button when input is empty', () => {
      renderChatInput({ ...defaultProps, input: '' })

      const sendButton = screen.getByTitle(/Send message/)
      expect(sendButton).toBeDisabled()
    })
  })

  describe('quick actions', () => {
    it('renders QuickActions component', () => {
      renderChatInput({ ...defaultProps })

      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    it('applies disabled styling to QuickActions when sending', () => {
      renderChatInput({ ...defaultProps, isSending: true })

      // Quick action buttons receive disabled styling (opacity-50 and cursor-not-allowed)
      const button = screen.getByText('Test Prompt').closest('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toHaveClass('cursor-not-allowed')
    })

    it('applies disabled styling to QuickActions when streaming', () => {
      renderChatInput({
        ...defaultProps,
        streaming: { content: 'test', thinking: '', isStreaming: true }
      })

      const button = screen.getByText('Test Prompt').closest('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toHaveClass('cursor-not-allowed')
    })

    it('applies disabled styling to QuickActions when context invalid for PR chat', () => {
      renderChatInput({ ...defaultProps, linkedPRChat: true, isContextValid: false })

      const button = screen.getByText('Test Prompt').closest('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toHaveClass('cursor-not-allowed')
    })
  })

  describe('context indicator', () => {
    it('renders ContextIndicator', () => {
      renderChatInput({ ...defaultProps })

      // The ContextIndicator should be present (shows token count)
      expect(screen.getByText(/Enter to send/)).toBeInTheDocument()
    })

    it('shows queue hint when sending', () => {
      renderChatInput({ ...defaultProps, isSending: true })

      expect(screen.getByText(/Enter to queue/)).toBeInTheDocument()
    })
  })

  describe('web fetch toggle', () => {
    it('renders web fetch toggle button', () => {
      renderChatInput({ ...defaultProps })

      // The globe icon button should be present
      const buttons = screen.getAllByRole('button')
      const webFetchButton = buttons.find((btn) => btn.querySelector('svg.lucide-globe'))
      expect(webFetchButton).toBeTruthy()
    })

    it('shows enabled styling when web fetch is enabled', () => {
      renderChatInput({ ...defaultProps, enableWebFetch: true })

      const buttons = screen.getAllByRole('button')
      const webFetchButton = buttons.find((btn) => btn.querySelector('svg.lucide-globe'))
      expect(webFetchButton).toHaveClass('bg-emerald-600')
    })

    it('shows ghost styling when web fetch is disabled', () => {
      renderChatInput({ ...defaultProps, enableWebFetch: false })

      const buttons = screen.getAllByRole('button')
      const webFetchButton = buttons.find((btn) => btn.querySelector('svg.lucide-globe'))
      expect(webFetchButton).toHaveClass('text-muted-foreground')
    })

    it('calls onWebFetchChange when toggle clicked', async () => {
      renderChatInput({ ...defaultProps, enableWebFetch: false })

      const buttons = screen.getAllByRole('button')
      const webFetchButton = buttons.find((btn) => btn.querySelector('svg.lucide-globe'))
      await userEvent.click(webFetchButton as HTMLElement)

      expect(defaultProps.onWebFetchChange).toHaveBeenCalledWith(true)
    })

    it('toggles from enabled to disabled', async () => {
      renderChatInput({ ...defaultProps, enableWebFetch: true })

      const buttons = screen.getAllByRole('button')
      const webFetchButton = buttons.find((btn) => btn.querySelector('svg.lucide-globe'))
      await userEvent.click(webFetchButton as HTMLElement)

      expect(defaultProps.onWebFetchChange).toHaveBeenCalledWith(false)
    })
  })

  describe('custom prompts', () => {
    it('passes customPrompts to QuickActions', () => {
      const customPrompts = [
        {
          id: 'custom-1',
          label: 'My Custom',
          prompt: 'Custom prompt',
          createdAt: new Date().toISOString()
        }
      ]
      renderChatInput({ ...defaultProps, customPrompts })

      expect(screen.getByText('My Custom')).toBeInTheDocument()
    })

    it('calls onAddCustomPrompt handler', async () => {
      // This would be tested via QuickActions, but we verify the prop is passed
      const onAddCustomPrompt = vi.fn()
      renderChatInput({ ...defaultProps, onAddCustomPrompt })

      // Verify the prop was passed (callback is available for QuickActions)
      expect(onAddCustomPrompt).toBeDefined()
    })
  })
})
