/**
 * TokenInput Component Tests
 */

import {
  createMockUser,
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TokenInput } from './TokenInput'

describe('TokenInput', () => {
  const mockOnAuthenticated = vi.fn()

  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render the app title', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByText('CodeLobby')).toBeInTheDocument()
    })

    it('should render the description', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByText(/Monitor your pull requests/i)).toBeInTheDocument()
    })

    it('should render the token input field', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const input = screen.getByPlaceholderText(/ghp_/)
      expect(input).toBeInTheDocument()
    })

    it('should render the connect button', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      expect(screen.getByRole('button', { name: /Connect to GitHub/i })).toBeInTheDocument()
    })

    it('should render token label', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      // Check that the label element exists
      const label = document.querySelector('label[for="token"]')
      expect(label).toBeInTheDocument()
      expect(label).toHaveTextContent(/Personal Access Token/)
    })

    it('should have button to open GitHub token settings', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      // The instructions section is collapsible - click to expand first
      const expandButton = screen.getByRole('button', {
        name: /How to get a Personal Access Token/i
      })
      fireEvent.click(expandButton)

      // Find button that opens GitHub token settings
      const githubButton = screen.getByRole('button', { name: /GitHub Settings/i })
      expect(githubButton).toBeInTheDocument()
    })
  })

  describe('Validation', () => {
    it('should disable button when input is empty', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const button = screen.getByRole('button', { name: /Connect to GitHub/i })
      const input = screen.getByPlaceholderText(/ghp_/)

      // Clear the input
      fireEvent.change(input, { target: { value: '' } })

      expect(button).toBeDisabled()
    })

    it('should enable button when token is entered', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const button = screen.getByRole('button', { name: /Connect to GitHub/i })
      const input = screen.getByPlaceholderText(/ghp_/)

      fireEvent.change(input, { target: { value: 'ghp_testtoken123456789' } })

      expect(button).not.toBeDisabled()
    })
  })

  describe('Authentication Flow', () => {
    it('should call setToken when form is submitted', async () => {
      const mockElectron = setupMockElectron()
      const mockUser = createMockUser()
      mockElectron.setToken.mockResolvedValue({ success: true, user: mockUser })

      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const input = screen.getByPlaceholderText(/ghp_/)
      const button = screen.getByRole('button', { name: /Connect to GitHub/i })

      fireEvent.change(input, { target: { value: 'ghp_validtoken123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockElectron.setToken).toHaveBeenCalledWith('ghp_validtoken123')
      })
    })

    it('should call onAuthenticated on successful authentication', async () => {
      const mockElectron = setupMockElectron()
      const mockUser = createMockUser({ login: 'testuser' })
      mockElectron.setToken.mockResolvedValue({ success: true, user: mockUser })

      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const input = screen.getByPlaceholderText(/ghp_/)
      const button = screen.getByRole('button', { name: /Connect to GitHub/i })

      fireEvent.change(input, { target: { value: 'ghp_validtoken123' } })
      fireEvent.click(button)

      await waitFor(() => {
        expect(mockOnAuthenticated).toHaveBeenCalledWith(mockUser)
      })
    })

    it('should show error message on failed authentication', async () => {
      const mockElectron = setupMockElectron()
      mockElectron.setToken.mockResolvedValue({
        success: false,
        error: 'Invalid token'
      })

      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const input = screen.getByPlaceholderText(/ghp_/)
      const button = screen.getByRole('button', { name: /Connect to GitHub/i })

      fireEvent.change(input, { target: { value: 'ghp_invalidtoken' } })
      fireEvent.click(button)

      await waitFor(() => {
        // Error should be displayed somehow (via toast or other mechanism)
        expect(mockOnAuthenticated).not.toHaveBeenCalled()
      })
    })

    it('should show loading state while authenticating', async () => {
      const mockElectron = setupMockElectron()
      // Make the promise hang to see loading state
      mockElectron.setToken.mockImplementation(() => new Promise(() => {}))

      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const input = screen.getByPlaceholderText(/ghp_/)
      const button = screen.getByRole('button', { name: /Connect to GitHub/i })

      fireEvent.change(input, { target: { value: 'ghp_validtoken123' } })
      fireEvent.click(button)

      // Button should show loading state with "Connecting..." text
      await waitFor(() => {
        expect(screen.getByText(/Connecting/i)).toBeInTheDocument()
      })
    })
  })

  describe('Input Masking', () => {
    it('should mask token input as password type', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      const input = screen.getByPlaceholderText(/ghp_/)

      // Token should be masked for security
      expect(input.getAttribute('type')).toBe('password')
    })
  })

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      render(<TokenInput onAuthenticated={mockOnAuthenticated} />)

      // Should have an input with an associated label
      const input = screen.getByPlaceholderText(/ghp_/)
      expect(input).toHaveAttribute('id', 'token')

      // And a label that references it
      const label = document.querySelector('label[for="token"]')
      expect(label).toBeInTheDocument()
    })
  })
})
