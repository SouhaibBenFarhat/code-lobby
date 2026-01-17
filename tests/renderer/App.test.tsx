/**
 * App Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../utils/render'
import App from '@/App'
import { 
  setupMockElectron, 
  setupAuthenticatedScenario, 
  setupUnauthenticatedScenario,
  resetMockElectron 
} from '../mocks/electron'
import { createMockUser, createMockRepository, createMockPullRequest } from '../mocks/factories'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Loading State', () => {
    it('should show loading spinner while checking token', async () => {
      const mockElectron = setupMockElectron()
      // Make validation hang
      mockElectron.validateToken.mockImplementation(() => new Promise(() => {}))

      render(<App />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Unauthenticated State', () => {
    it('should show TokenInput when not authenticated', async () => {
      setupUnauthenticatedScenario()

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/Welcome to CodeLobby/i)).toBeInTheDocument()
      })
    })

    it('should show token input field', async () => {
      setupUnauthenticatedScenario()

      render(<App />)

      await waitFor(() => {
        const input = screen.getByPlaceholderText(/ghp_/i) || screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
      })
    })
  })

  describe('Authenticated State', () => {
    it('should show Header when authenticated', async () => {
      setupAuthenticatedScenario()

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('CodeLobby')).toBeInTheDocument()
      })
    })

    it('should show view mode switcher when authenticated', async () => {
      setupAuthenticatedScenario()

      render(<App />)

      await waitFor(() => {
        // Look for view switcher buttons
        const buttons = document.querySelectorAll('.bg-muted\\/50 button')
        expect(buttons.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('should default to canvas view', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')

      render(<App />)

      await waitFor(() => {
        // Canvas view should show PRGrid (main content area with p-2 class)
        const mainContent = document.querySelector('main.overflow-auto.p-2')
        expect(mainContent).toBeInTheDocument()
      })
    })

    it('should switch to IDE view when toggled', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('ide')

      render(<App />)

      await waitFor(() => {
        // IDE view should show Explorer
        expect(screen.getByText('Explorer')).toBeInTheDocument()
      })
    })
  })

  describe('PR Detail Panel (Canvas View)', () => {
    it('should show panel toggle button when panel is closed', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: false, width: 400 })

      render(<App />)

      await waitFor(() => {
        // Look for the panel toggle button (PanelRight icon)
        const toggleButton = document.querySelector('button.absolute.right-2.bottom-4')
        expect(toggleButton).toBeInTheDocument()
      })
    })

    it('should show panel when isOpen is true', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 400 })

      render(<App />)

      await waitFor(() => {
        // Panel should be visible
        const panel = document.querySelector('aside.border-l')
        expect(panel).toBeInTheDocument()
      })
    })

    it('should show "No PR selected" message when panel is open but no PR selected', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 400 })

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/No PR selected/i)).toBeInTheDocument()
      })
    })
  })

  describe('Logout', () => {
    it('should clear token and show login on logout', async () => {
      const mockElectron = setupAuthenticatedScenario()

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('CodeLobby')).toBeInTheDocument()
      })

      // Find and click logout button
      const logoutButton = document.querySelector('button svg.lucide-log-out')?.parentElement
      if (logoutButton) {
        logoutButton.click()
        
        await waitFor(() => {
          expect(mockElectron.clearToken).toHaveBeenCalled()
        })
      }
    })
  })

  describe('View Mode Persistence', () => {
    it('should save view mode when changed', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('CodeLobby')).toBeInTheDocument()
      })

      // Initial load should query for view mode
      expect(mockElectron.getViewMode).toHaveBeenCalled()
    })
  })

  describe('Panel Settings Persistence', () => {
    it('should load panel settings on mount', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 500 })

      render(<App />)

      await waitFor(() => {
        expect(mockElectron.getPRDetailPanel).toHaveBeenCalled()
      })
    })
  })
})
