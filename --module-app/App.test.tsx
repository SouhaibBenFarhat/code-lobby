/**
 * App Component Tests
 * Tests basic rendering with TanStack Query
 */

import type { GitHubUser } from '@data'
import { render, resetMockElectron, screen, setupMockElectron, waitFor } from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

// Mock values for panel tests
const mockAuthStatus: {
  isAuthenticated: boolean
  isLoading: boolean
  user: GitHubUser | null
  token: string | null
} = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  token: null
}

// Mock for panel states
let mockAIPanelOpen = false
let mockNetworkPanelOpen = false

vi.mock('@data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@data')>()
  return {
    ...actual,
    useIsAuthenticated: () => mockAuthStatus,
    useAIPanel: () => ({ data: { isOpen: mockAIPanelOpen, width: 400 } }),
    useNetworkPanel: () => ({ data: mockNetworkPanelOpen })
  }
})

describe('App', () => {
  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
    localStorage.clear()
    // Reset mock values
    mockAuthStatus.isAuthenticated = false
    mockAuthStatus.isLoading = false
    mockAuthStatus.user = null
    mockAuthStatus.token = null
    mockAIPanelOpen = false
    mockNetworkPanelOpen = false
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

  describe('Panel Independence', () => {
    const mockUser = {
      login: 'testuser',
      avatar_url: 'https://example.com/avatar.png',
      name: 'Test User',
      html_url: ''
    }

    beforeEach(() => {
      // Set up authenticated state for panel tests
      mockAuthStatus.isAuthenticated = true
      mockAuthStatus.user = mockUser
      mockAuthStatus.token = 'test-token'
    })

    it('should show AI panel when only AI panel is open', async () => {
      mockAIPanelOpen = true
      mockNetworkPanelOpen = false

      const { container } = render(<App />)

      await waitFor(() => {
        const sidebar = container.querySelector('.apple-panel')
        expect(sidebar).toBeInTheDocument()
      })
    })

    it('should show Network panel when only Network panel is open', async () => {
      mockAIPanelOpen = false
      mockNetworkPanelOpen = true

      const { container } = render(<App />)

      await waitFor(() => {
        const sidebar = container.querySelector('.apple-panel')
        expect(sidebar).toBeInTheDocument()
      })
    })

    it('should show both panels with resize handle when both are open', async () => {
      mockAIPanelOpen = true
      mockNetworkPanelOpen = true

      const { container } = render(<App />)

      await waitFor(() => {
        const sidebar = container.querySelector('.apple-panel')
        expect(sidebar).toBeInTheDocument()
      })

      // Should have resize handle between panels
      const resizeHandle = container.querySelector('[aria-label="Resize network panel"]')
      expect(resizeHandle).toBeInTheDocument()
    })

    it('should not show resize handle when only AI panel is open', async () => {
      mockAIPanelOpen = true
      mockNetworkPanelOpen = false

      const { container } = render(<App />)

      await waitFor(() => {
        const sidebar = container.querySelector('.apple-panel')
        expect(sidebar).toBeInTheDocument()
      })

      // Resize handle between panels should not exist
      const resizeHandle = container.querySelector('[aria-label="Resize network panel"]')
      expect(resizeHandle).not.toBeInTheDocument()
    })

    it('should not show resize handle when only Network panel is open', async () => {
      mockAIPanelOpen = false
      mockNetworkPanelOpen = true

      const { container } = render(<App />)

      await waitFor(() => {
        const sidebar = container.querySelector('.apple-panel')
        expect(sidebar).toBeInTheDocument()
      })

      // Resize handle between panels should not exist (only shows when both are open)
      const resizeHandle = container.querySelector('[aria-label="Resize network panel"]')
      expect(resizeHandle).not.toBeInTheDocument()
    })

    it('should not show sidebar when both panels are closed', async () => {
      mockAIPanelOpen = false
      mockNetworkPanelOpen = false

      const { container } = render(<App />)

      await waitFor(() => {
        expect(container.querySelector('.h-screen')).toBeInTheDocument()
      })

      // Sidebar should not exist
      const sidebar = container.querySelector('.apple-panel')
      expect(sidebar).not.toBeInTheDocument()
    })
  })
})
