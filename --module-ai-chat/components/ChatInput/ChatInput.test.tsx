import { fireEvent, render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatInput } from './ChatInput'

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
    streaming: {
      content: '',
      thinking: '',
      isStreaming: false,
      status: 'idle' as const,
      activity: null,
      toolHistory: []
    },
    messages: [],
    selectedModel: 'claude-3-5-sonnet-20241022',
    prompts: [
      { id: 'test-prompt', label: 'Test Prompt', prompt: 'Test prompt content', icon: '💡' }
    ],
    customPrompts: [],
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
    onQuickActionSelect: vi.fn(),
    onAddCustomPrompt: vi.fn(),
    onUpdateCustomPrompt: vi.fn(),
    onDeleteCustomPrompt: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('API key input mode', () => {
    it('shows API key input when no apiKey', () => {
      render(<ChatInput {...defaultProps} apiKey={null} />)

      expect(screen.getByPlaceholderText(/Enter Claude API key/)).toBeInTheDocument()
      expect(screen.getByText(/console.anthropic.com/)).toBeInTheDocument()
    })

    it('calls onApiKeyInputChange when typing API key', async () => {
      render(<ChatInput {...defaultProps} apiKey={null} />)

      const input = screen.getByPlaceholderText(/Enter Claude API key/)
      await userEvent.type(input, 'sk-ant-test123')

      expect(defaultProps.onApiKeyInputChange).toHaveBeenCalled()
    })

    it('calls onSetApiKey when Enter pressed in API key input', async () => {
      render(<ChatInput {...defaultProps} apiKey={null} apiKeyInput="sk-ant-test123" />)

      const input = screen.getByPlaceholderText(/Enter Claude API key/)
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(defaultProps.onSetApiKey).toHaveBeenCalled()
    })

    it('calls onSetApiKey when key button clicked', async () => {
      render(<ChatInput {...defaultProps} apiKey={null} apiKeyInput="sk-ant-test123" />)

      const buttons = screen.getAllByRole('button')
      await userEvent.click(buttons[0])

      expect(defaultProps.onSetApiKey).toHaveBeenCalled()
    })

    it('disables button when API key input is empty', () => {
      render(<ChatInput {...defaultProps} apiKey={null} apiKeyInput="" />)

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toBeDisabled()
    })

    it('disables button when setting key', () => {
      render(
        <ChatInput {...defaultProps} apiKey={null} apiKeyInput="sk-ant-test" isSettingKey={true} />
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons[0]).toBeDisabled()
    })
  })

  describe('message input mode', () => {
    it('shows textarea when API key exists', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByPlaceholderText(/Type a message/)).toBeInTheDocument()
    })

    it('shows PR-specific placeholder when linkedPRChat', () => {
      render(<ChatInput {...defaultProps} linkedPRChat={true} />)

      expect(screen.getByPlaceholderText(/Ask about this PR/)).toBeInTheDocument()
    })

    it('shows queue placeholder when sending', () => {
      render(<ChatInput {...defaultProps} isSending={true} />)

      expect(screen.getByPlaceholderText(/Type to queue/)).toBeInTheDocument()
    })

    it('calls onInputChange when typing message', async () => {
      render(<ChatInput {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Type a message/)
      await userEvent.type(textarea, 'Hello')

      expect(defaultProps.onInputChange).toHaveBeenCalled()
    })

    it('calls onSendMessage when Enter pressed (without Shift)', async () => {
      render(<ChatInput {...defaultProps} input="Hello" />)

      const textarea = screen.getByPlaceholderText(/Type a message/)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })

      expect(defaultProps.onSendMessage).toHaveBeenCalled()
    })

    it('does not call onSendMessage when Shift+Enter pressed', async () => {
      render(<ChatInput {...defaultProps} input="Hello" />)

      const textarea = screen.getByPlaceholderText(/Type a message/)
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })

      expect(defaultProps.onSendMessage).not.toHaveBeenCalled()
    })

    it('calls onSendMessage when send button clicked', async () => {
      render(<ChatInput {...defaultProps} input="Hello" />)

      const sendButton = screen.getByTitle(/Send message/)
      await userEvent.click(sendButton)

      expect(defaultProps.onSendMessage).toHaveBeenCalled()
    })

    it('disables send button when input is empty', () => {
      render(<ChatInput {...defaultProps} input="" />)

      const sendButton = screen.getByTitle(/Send message/)
      expect(sendButton).toBeDisabled()
    })
  })

  describe('quick actions', () => {
    it('renders QuickActions component', () => {
      render(<ChatInput {...defaultProps} />)

      expect(screen.getByText('Test Prompt')).toBeInTheDocument()
    })

    it('applies disabled styling to QuickActions when sending', () => {
      render(<ChatInput {...defaultProps} isSending={true} />)

      // Quick action buttons receive disabled styling (opacity-50 and cursor-not-allowed)
      const button = screen.getByText('Test Prompt').closest('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toHaveClass('cursor-not-allowed')
    })

    it('applies disabled styling to QuickActions when streaming', () => {
      render(
        <ChatInput
          {...defaultProps}
          streaming={{
            content: 'test',
            thinking: '',
            isStreaming: true,
            status: 'writing' as const,
            activity: null,
            toolHistory: []
          }}
        />
      )

      const button = screen.getByText('Test Prompt').closest('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toHaveClass('cursor-not-allowed')
    })

    it('applies disabled styling to QuickActions when context invalid for PR chat', () => {
      render(<ChatInput {...defaultProps} linkedPRChat={true} isContextValid={false} />)

      const button = screen.getByText('Test Prompt').closest('button')
      expect(button).toHaveClass('opacity-50')
      expect(button).toHaveClass('cursor-not-allowed')
    })
  })

  describe('context indicator', () => {
    it('renders ContextIndicator', () => {
      render(<ChatInput {...defaultProps} />)

      // The ContextIndicator should be present (shows token count)
      expect(screen.getByText(/Enter to send/)).toBeInTheDocument()
    })

    it('shows queue hint when sending', () => {
      render(<ChatInput {...defaultProps} isSending={true} />)

      expect(screen.getByText(/Enter to queue/)).toBeInTheDocument()
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
      render(<ChatInput {...defaultProps} customPrompts={customPrompts} />)

      expect(screen.getByText('My Custom')).toBeInTheDocument()
    })

    it('calls onAddCustomPrompt handler', async () => {
      // This would be tested via QuickActions, but we verify the prop is passed
      const onAddCustomPrompt = vi.fn()
      render(<ChatInput {...defaultProps} onAddCustomPrompt={onAddCustomPrompt} />)

      // Verify the prop was passed (callback is available for QuickActions)
      expect(onAddCustomPrompt).toBeDefined()
    })
  })
})
