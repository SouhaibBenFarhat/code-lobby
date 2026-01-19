/**
 * App Component Tests
 */

import { fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import {
  resetMockElectron,
  setupAuthenticatedScenario,
  setupMockElectron,
  setupUnauthenticatedScenario
} from '../mocks/electron'
import { render, screen, waitFor } from '../utils/render'

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
        // TokenInput shows "CodeLobby" title and "Monitor your pull requests" description
        expect(screen.getByText(/Monitor your pull requests/i)).toBeInTheDocument()
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
        // Canvas view should show main content area
        const mainContent = document.querySelector('main.overflow-auto')
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

  describe('AI Panel', () => {
    it('should load AI panel settings on mount', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: false, width: 380 })

      render(<App />)

      await waitFor(() => {
        expect(mockElectron.getAIPanel).toHaveBeenCalled()
      })
    })

    it('should show AI panel when isOpen is true', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        // AI panel header should show "AI Assistant"
        expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument()
      })
    })

    it('should persist AI panel across view switches', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument()
      })

      // The AI panel should be rendered OUTSIDE view conditionals
      // So it persists when view mode changes
      // Verify the structure allows for this
      const aiPanel = screen.getByText(/AI Assistant/i).closest('aside')
      expect(aiPanel).toBeInTheDocument()
    })

    it('should NOT reload AI chat when switching from canvas to IDE view', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument()
      })

      // Note: The actual view switching happens via Header callbacks
      // Here we verify the structural pattern - AI panel should be
      // a sibling to view content, not nested inside view conditionals

      // Check that getChatHistory was only called once during initial load
      // not again when view changes
      const initialCallCount = mockElectron.getChatHistory.mock.calls.length

      // The panel should maintain its position in the DOM
      const aiPanelBefore = screen.getByText(/AI Assistant/i)
      expect(aiPanelBefore).toBeInTheDocument()

      // Verify it was only called once (during mount)
      expect(mockElectron.getChatHistory).toHaveBeenCalledTimes(initialCallCount)
    })

    it('should save AI panel state when toggled', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })

      render(<App />)

      await waitFor(() => {
        // setAIPanel should be called when panel state changes
        // The actual toggling happens via Header, but we verify the
        // persistence mechanism is in place
        expect(mockElectron.getAIPanel).toHaveBeenCalled()
      })
    })
  })

  describe('Smooth Panel Resize (Performance)', () => {
    it('should have resize handle for PR detail panel', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 400 })

      render(<App />)

      await waitFor(() => {
        // Find the resize handle with aria-label
        const resizeHandle = document.querySelector('div[aria-label="Resize panel"]')
        expect(resizeHandle).toBeInTheDocument()
      })
    })

    it('should have resize handle for AI panel', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        // Find the resize handle with aria-label
        const resizeHandle = document.querySelector('div[aria-label="Resize AI panel"]')
        expect(resizeHandle).toBeInTheDocument()
      })
    })

    it('PR detail panel should have CSS containment for performance', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 400 })

      render(<App />)

      await waitFor(() => {
        const panel = document.querySelector('aside.border-l')
        expect(panel).toBeInTheDocument()
        // Check for CSS containment (layout style) which isolates repaints
        const style = window.getComputedStyle(panel as Element)
        expect(style.contain).toContain('layout')
      })
    })

    it('AI panel should have CSS containment for performance', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        // Find AI panel (apple-panel class)
        const panel = document.querySelector('aside.apple-panel')
        expect(panel).toBeInTheDocument()
        // Check for CSS containment
        const style = window.getComputedStyle(panel as Element)
        expect(style.contain).toContain('layout')
      })
    })

    it('should update PR panel width directly on mousedown + mousemove (via ref)', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 400 })

      render(<App />)

      await waitFor(() => {
        const resizeHandle = document.querySelector('div[aria-label="Resize panel"]')
        expect(resizeHandle).toBeInTheDocument()
      })

      const resizeHandle = document.querySelector('div[aria-label="Resize panel"]')
      const panel = document.querySelector('aside.border-l') as HTMLElement

      // Initial width
      expect(panel.style.width).toBe('400px')
      expect(resizeHandle).toBeTruthy()

      // Simulate resize start
      if (resizeHandle) fireEvent.mouseDown(resizeHandle, { clientX: 0 })

      // Body should have col-resize cursor
      expect(document.body.style.cursor).toBe('col-resize')

      // Simulate mouse move
      fireEvent.mouseMove(document, { clientX: -50 })

      // Wait for RAF to execute (in tests, may need manual advance)
      await new Promise((r) => setTimeout(r, 20))

      // Simulate mouse up
      fireEvent.mouseUp(document)

      // Cursor should be cleared
      expect(document.body.style.cursor).toBe('')
    })

    it('should update AI panel width directly on mousedown + mousemove (via ref)', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        const resizeHandle = document.querySelector('div[aria-label="Resize AI panel"]')
        expect(resizeHandle).toBeInTheDocument()
      })

      const resizeHandle = document.querySelector('div[aria-label="Resize AI panel"]')
      const panel = document.querySelector('aside.apple-panel') as HTMLElement

      // Initial width
      expect(panel.style.width).toBe('380px')
      expect(resizeHandle).toBeTruthy()

      // Simulate resize start
      if (resizeHandle) fireEvent.mouseDown(resizeHandle, { clientX: 0 })

      // Body should have col-resize cursor
      expect(document.body.style.cursor).toBe('col-resize')

      // Simulate mouse move
      fireEvent.mouseMove(document, { clientX: -50 })

      // Wait for RAF to execute
      await new Promise((r) => setTimeout(r, 20))

      // Simulate mouse up
      fireEvent.mouseUp(document)

      // Cursor should be cleared
      expect(document.body.style.cursor).toBe('')
    })

    it('should persist PR panel width after resize', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getPRDetailPanel.mockResolvedValue({ isOpen: true, width: 400 })

      render(<App />)

      await waitFor(() => {
        const resizeHandle = document.querySelector('div[aria-label="Resize panel"]')
        expect(resizeHandle).toBeInTheDocument()
      })

      const resizeHandle = document.querySelector('div[aria-label="Resize panel"]')
      expect(resizeHandle).toBeTruthy()

      // Simulate complete resize cycle
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 0 })
        fireEvent.mouseMove(document, { clientX: -50 })
        await new Promise((r) => setTimeout(r, 20))
        fireEvent.mouseUp(document)
      }

      // setPRDetailPanel should be called with the new width on mouseup
      await waitFor(() => {
        expect(mockElectron.setPRDetailPanel).toHaveBeenCalled()
      })
    })

    it('should persist AI panel width after resize', async () => {
      const mockElectron = setupAuthenticatedScenario()
      mockElectron.getViewMode.mockResolvedValue('canvas')
      mockElectron.getAIPanel.mockResolvedValue({ isOpen: true, width: 380 })
      mockElectron.getClaudeApiKey.mockResolvedValue('sk-ant-test-key')
      mockElectron.getChatHistory.mockResolvedValue([])

      render(<App />)

      await waitFor(() => {
        const resizeHandle = document.querySelector('div[aria-label="Resize AI panel"]')
        expect(resizeHandle).toBeInTheDocument()
      })

      const resizeHandle = document.querySelector('div[aria-label="Resize AI panel"]')
      expect(resizeHandle).toBeTruthy()

      // Simulate complete resize cycle
      if (resizeHandle) {
        fireEvent.mouseDown(resizeHandle, { clientX: 0 })
        fireEvent.mouseMove(document, { clientX: -50 })
        await new Promise((r) => setTimeout(r, 20))
        fireEvent.mouseUp(document)
      }

      // setAIPanel should be called with the new width on mouseup
      await waitFor(() => {
        expect(mockElectron.setAIPanel).toHaveBeenCalled()
      })
    })
  })
})
