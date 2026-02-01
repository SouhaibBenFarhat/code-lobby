import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { ClaudeCodeBanner } from './ClaudeCodeBanner'

describe('ClaudeCodeBanner', () => {
  describe('rendering', () => {
    it('should render the banner title', () => {
      render(<ClaudeCodeBanner />)
      expect(screen.getByText('Claude Code Required')).toBeInTheDocument()
    })

    it('should render the description', () => {
      render(<ClaudeCodeBanner />)
      expect(screen.getByText(/AI chat is powered by Claude Code CLI/)).toBeInTheDocument()
    })

    it('should render the install command', () => {
      render(<ClaudeCodeBanner />)
      expect(screen.getByText('npm install -g @anthropic-ai/claude-code')).toBeInTheDocument()
    })

    it('should render the terminal icon', () => {
      const { container } = render(<ClaudeCodeBanner />)
      // Terminal icon in the circular container
      expect(container.querySelector('.rounded-full')).toBeInTheDocument()
    })

    it('should render the documentation button', () => {
      render(<ClaudeCodeBanner />)
      expect(screen.getByText('View Documentation')).toBeInTheDocument()
    })

    it('should render the copy button', () => {
      render(<ClaudeCodeBanner />)
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })

    it('should show restart instruction', () => {
      render(<ClaudeCodeBanner />)
      expect(screen.getByText(/restart CodeLobby to enable AI features/)).toBeInTheDocument()
    })
  })

  describe('copy functionality', () => {
    it('should have a copy button that can be clicked', async () => {
      const user = userEvent.setup()
      render(<ClaudeCodeBanner />)

      const copyButton = screen.getByRole('button', { name: 'Copy' })
      expect(copyButton).toBeInTheDocument()

      // Click should not throw
      await user.click(copyButton)
    })
  })

  describe('external link functionality', () => {
    it('should call onOpenExternal with documentation URL when button clicked', async () => {
      const user = userEvent.setup()
      const mockOpenExternal = vi.fn()
      render(<ClaudeCodeBanner onOpenExternal={mockOpenExternal} />)

      await user.click(screen.getByText('View Documentation'))

      expect(mockOpenExternal).toHaveBeenCalledWith(
        'https://docs.anthropic.com/en/docs/claude-code'
      )
    })

    it('should not crash when onOpenExternal is not provided', async () => {
      const user = userEvent.setup()
      render(<ClaudeCodeBanner />)

      // Should not throw
      await user.click(screen.getByText('View Documentation'))
    })
  })
})
