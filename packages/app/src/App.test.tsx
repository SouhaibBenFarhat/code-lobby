/**
 * App Component Tests
 * Tests basic rendering with TanStack Query
 */

import {
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@codelobby/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

describe('App', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Component Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<App />)
      expect(container.firstChild).toBeInTheDocument()
    })

    it('should render the root div with correct classes', () => {
      const { container } = render(<App />)
      expect(container.querySelector('.h-screen.bg-background')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated State', () => {
    it('should show TokenInput when not authenticated', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/Monitor your pull requests/i)).toBeInTheDocument()
      })
    })

    it('should show token input field', async () => {
      render(<App />)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/ghp_/i) || screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
      })
    })

    it('should render CodeLobby logo', async () => {
      const { container } = render(<App />)

      await waitFor(() => {
        const logo = container.querySelector('[aria-label="CodeLobby Logo"]')
        expect(logo).toBeInTheDocument()
      })
    })
  })
})
