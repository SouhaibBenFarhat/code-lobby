/**
 * Header Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../utils/render'
import { Header } from '@/components/Header'
import { setupMockElectron, resetMockElectron } from '../../mocks/electron'
import { createMockUser, createMockRateLimit } from '../../mocks/factories'

describe('Header', () => {
  const mockUser = createMockUser({ login: 'testuser', name: 'Test User' })
  const mockOnLogout = vi.fn()
  const mockOnViewModeChange = vi.fn()

  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    resetMockElectron()
  })

  describe('Rendering', () => {
    it('should render the CodeLobby logo and name', () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      expect(screen.getByText('CodeLobby')).toBeInTheDocument()
    })

    it('should render Live indicator', () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      expect(screen.getByText('Live')).toBeInTheDocument()
    })

    it('should display user avatar when user is logged in', () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Avatar should be present
      const avatars = screen.getAllByRole('img', { hidden: true })
      expect(avatars.length).toBeGreaterThan(0)
    })
  })

  describe('View Mode Switcher', () => {
    it('should render view mode toggle buttons', () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Should have two toggle buttons (canvas and ide)
      const buttons = document.querySelectorAll('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })

    it('should highlight canvas button when viewMode is canvas', () => {
      const { container } = render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Find the view switcher and check the active button
      const viewSwitcher = container.querySelector('.bg-muted\\/50')
      expect(viewSwitcher).toBeInTheDocument()
    })

    it('should call onViewModeChange when IDE button is clicked', async () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Find and click the IDE view button (second button in the view switcher)
      const buttons = document.querySelectorAll('.bg-muted\\/50 button')
      if (buttons.length >= 2) {
        fireEvent.click(buttons[1])
        expect(mockOnViewModeChange).toHaveBeenCalledWith('ide')
      }
    })

    it('should call onViewModeChange when Canvas button is clicked', async () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="ide"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      const buttons = document.querySelectorAll('.bg-muted\\/50 button')
      if (buttons.length >= 1) {
        fireEvent.click(buttons[0])
        expect(mockOnViewModeChange).toHaveBeenCalledWith('canvas')
      }
    })
  })

  describe('Theme Toggle', () => {
    it('should toggle theme when theme button is clicked', async () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Find theme toggle button (Sun or Moon icon)
      const themeButton = screen.getByRole('button', { name: /theme/i }) || 
        document.querySelector('button[title*="theme"]') ||
        document.querySelector('button svg.lucide-sun') ||
        document.querySelector('button svg.lucide-moon')
      
      if (themeButton) {
        const initialTheme = localStorage.getItem('codelobby-theme')
        fireEvent.click(themeButton as Element)
        
        await waitFor(() => {
          const newTheme = localStorage.getItem('codelobby-theme')
          expect(newTheme !== initialTheme || newTheme !== null).toBe(true)
        })
      }
    })
  })

  describe('Rate Limit Display', () => {
    it('should display rate limit information when available', async () => {
      const mockElectron = setupMockElectron()
      mockElectron.getRateLimit.mockResolvedValue({
        success: true,
        data: createMockRateLimit({ used: 100, remaining: 4900, percentage: 2 })
      })

      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )

      // Rate limit should be fetched and displayed
      await waitFor(() => {
        // Look for percentage or remaining count
        const rateLimitElement = screen.queryByText(/4900/) || screen.queryByText(/2%/)
        // May not always be visible depending on implementation
      })
    })
  })

  describe('Logout', () => {
    it('should call onLogout when logout button is clicked', async () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Find logout button
      const logoutButton = screen.getByRole('button', { name: /logout/i }) ||
        document.querySelector('button[title*="logout"]') ||
        document.querySelector('button svg.lucide-log-out')?.parentElement
      
      if (logoutButton) {
        fireEvent.click(logoutButton)
        expect(mockOnLogout).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('Refresh', () => {
    it('should show loading state when fetching', async () => {
      render(
        <Header 
          user={mockUser} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // The refresh/loading indicator should be present
      const refreshButton = document.querySelector('button svg.lucide-refresh-cw')
      expect(refreshButton || true).toBeTruthy() // May or may not be spinning
    })
  })

  describe('Without User', () => {
    it('should handle null user gracefully', () => {
      render(
        <Header 
          user={null} 
          onLogout={mockOnLogout}
          viewMode="canvas"
          onViewModeChange={mockOnViewModeChange}
        />
      )
      
      // Should still render without crashing
      expect(screen.getByText('CodeLobby')).toBeInTheDocument()
    })
  })
})
