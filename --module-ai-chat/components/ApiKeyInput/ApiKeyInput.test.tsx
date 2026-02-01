import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { ApiKeyInput } from './ApiKeyInput'

// Mock the useSetClaudeApiKey hook
const mockMutate = vi.fn()
vi.mock('@data', async () => {
  const actual = await vi.importActual('@data')
  return {
    ...actual,
    useSetClaudeApiKey: () => ({
      mutate: mockMutate,
      isPending: false,
      isError: false
    })
  }
})

describe('ApiKeyInput', () => {
  beforeEach(() => {
    mockMutate.mockClear()
  })

  describe('rendering', () => {
    it('should render the title', () => {
      render(<ApiKeyInput />)
      expect(screen.getByText('Claude API Key Required')).toBeInTheDocument()
    })

    it('should render the description', () => {
      render(<ApiKeyInput />)
      expect(
        screen.getByText(/Enter your Anthropic API key to enable AI-powered features/)
      ).toBeInTheDocument()
    })

    it('should render the input field', () => {
      render(<ApiKeyInput />)
      expect(screen.getByPlaceholderText('sk-ant-api03-...')).toBeInTheDocument()
    })

    it('should render the submit button', () => {
      render(<ApiKeyInput />)
      expect(screen.getByRole('button', { name: /Save API Key/i })).toBeInTheDocument()
    })

    it('should render the external link', () => {
      render(<ApiKeyInput />)
      expect(screen.getByText(/Get an API key from Anthropic Console/)).toBeInTheDocument()
    })

    it('should render input as password type', () => {
      render(<ApiKeyInput />)
      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should have autofocus on input', () => {
      render(<ApiKeyInput />)
      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      expect(input).toHaveFocus()
    })
  })

  describe('form submission', () => {
    it('should submit when button clicked with valid key', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      await user.type(input, 'sk-ant-api03-test-key')

      await user.click(screen.getByRole('button', { name: /Save API Key/i }))

      expect(mockMutate).toHaveBeenCalledWith('sk-ant-api03-test-key')
    })

    it('should submit when Enter key pressed', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      await user.type(input, 'sk-ant-api03-test-key{Enter}')

      expect(mockMutate).toHaveBeenCalledWith('sk-ant-api03-test-key')
    })

    it('should not submit when key is empty', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      await user.click(screen.getByRole('button', { name: /Save API Key/i }))

      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('should not submit when key is only whitespace', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      await user.type(input, '   ')

      await user.click(screen.getByRole('button', { name: /Save API Key/i }))

      expect(mockMutate).not.toHaveBeenCalled()
    })

    it('should trim whitespace from key', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      await user.type(input, '  sk-ant-api03-key  ')

      await user.click(screen.getByRole('button', { name: /Save API Key/i }))

      expect(mockMutate).toHaveBeenCalledWith('sk-ant-api03-key')
    })
  })

  describe('button state', () => {
    it('should be disabled when input is empty', () => {
      render(<ApiKeyInput />)
      expect(screen.getByRole('button', { name: /Save API Key/i })).toBeDisabled()
    })

    it('should be enabled when input has value', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      const input = screen.getByPlaceholderText('sk-ant-api03-...')
      await user.type(input, 'test-key')

      expect(screen.getByRole('button', { name: /Save API Key/i })).not.toBeDisabled()
    })
  })

  describe('external link', () => {
    it('should call onOpenExternal when link clicked', async () => {
      const user = userEvent.setup()
      const mockOpenExternal = vi.fn()
      render(<ApiKeyInput onOpenExternal={mockOpenExternal} />)

      await user.click(screen.getByText(/Get an API key from Anthropic Console/))

      expect(mockOpenExternal).toHaveBeenCalledWith('https://console.anthropic.com/settings/keys')
    })

    it('should not crash when onOpenExternal is not provided', async () => {
      const user = userEvent.setup()
      render(<ApiKeyInput />)

      // Should not throw
      await user.click(screen.getByText(/Get an API key from Anthropic Console/))
    })
  })
})
