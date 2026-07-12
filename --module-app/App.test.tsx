/**
 * App Component Tests
 * Tests basic rendering with TanStack Query
 */

import type { GitHubUser } from '@data'
import { render, resetMockElectron, screen, setupMockElectron, waitFor } from '@test-utils'
import { act, fireEvent } from '@testing-library/react'
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
let mockViewMode: 'canvas' | 'ide' = 'canvas'
let mockPRDetailOpen = false
let mockSelectedPRId: { repoFullName: string; prNumber: number } | null = null
let mockUserProfileOpen = false

vi.mock('@data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@data')>()
  return {
    ...actual,
    useIsAuthenticated: () => mockAuthStatus,
    useAIPanel: () => ({ data: { isOpen: mockAIPanelOpen, width: 400 } }),
    useNetworkPanel: () => ({ data: mockNetworkPanelOpen }),
    useViewMode: () => ({ data: mockViewMode }),
    usePRDetailPanel: () => ({ data: { isOpen: mockPRDetailOpen, width: 400 } }),
    useSelectedPRId: () => ({ data: mockSelectedPRId }),
    useUserProfilePanel: () => ({ data: { isOpen: mockUserProfileOpen, height: 250 } })
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
    mockViewMode = 'canvas'
    mockPRDetailOpen = false
    mockSelectedPRId = null
    mockUserProfileOpen = false
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

    it('should show the Sign in with GitHub button', async () => {
      render(<App />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument()
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
      const resizeHandle = container.querySelector('[aria-label="Resize panel height"]')
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

    it('should collapse the sidebar to an empty zero-width panel when both panels are closed', async () => {
      mockAIPanelOpen = false
      mockNetworkPanelOpen = false

      const { container } = render(<App />)

      await waitFor(() => {
        expect(container.querySelector('.h-screen')).toBeInTheDocument()
      })

      // The sidebar stays mounted so its width can animate open/closed, but it
      // collapses to zero width and renders no content when both panels close.
      const sidebar = container.querySelector<HTMLElement>('.apple-panel')
      expect(sidebar).toBeInTheDocument()
      expect(sidebar?.childElementCount).toBe(0)
      expect(sidebar?.style.width).toBe('0px')
    })

    it('renders the explorer sidebar and user profile panel in IDE mode', () => {
      mockViewMode = 'ide'
      mockUserProfileOpen = true

      const { container } = render(<App />)

      expect(container.querySelector('.apple-sidebar')).toBeInTheDocument()
    })

    it('renders the PR detail panel with a selected PR in canvas mode', () => {
      mockViewMode = 'canvas'
      mockPRDetailOpen = true
      mockSelectedPRId = { repoFullName: 'org/repo', prNumber: 1 }

      const { container } = render(<App />)

      expect(container.firstChild).toBeInTheDocument()
    })

    it('shows the "No PR selected" empty state when PR detail is open with no PR', async () => {
      mockViewMode = 'canvas'
      mockPRDetailOpen = true
      mockSelectedPRId = null

      render(<App />)

      await waitFor(() => {
        expect(screen.getByText('No PR selected')).toBeInTheDocument()
      })
    })
  })

  // Regression: dragging a panel handle must commit the final width synchronously
  // on release. The @data width hooks are mocked to a CONSTANT, so a width that
  // reflects the drag proves the width came from local state committed on mouse-up
  // — not read back a frame later from the unchanged store (the width flash).
  describe('Panel resize (commits final width on drag end)', () => {
    const mockUser = {
      login: 'testuser',
      avatar_url: 'https://example.com/avatar.png',
      name: 'Test User',
      html_url: ''
    }
    const realRAF = globalThis.requestAnimationFrame
    const realCAF = globalThis.cancelAnimationFrame

    beforeEach(() => {
      mockAuthStatus.isAuthenticated = true
      mockAuthStatus.user = mockUser
      mockAuthStatus.token = 'test-token'
      // Run the drag's rAF synchronously so the live width lands before release.
      globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        cb(0)
        return 0
      }) as typeof globalThis.requestAnimationFrame
      globalThis.cancelAnimationFrame = (() => {}) as typeof globalThis.cancelAnimationFrame
    })

    afterEach(() => {
      globalThis.requestAnimationFrame = realRAF
      globalThis.cancelAnimationFrame = realCAF
    })

    // Press the handle, drag horizontally, release.
    async function dragWidth(handle: Element, startX: number, endX: number): Promise<void> {
      await act(async () => {
        fireEvent.mouseDown(handle, { clientX: startX })
      })
      await act(async () => {
        fireEvent.mouseMove(document, { clientX: endX })
      })
      await act(async () => {
        fireEvent.mouseUp(document)
      })
    }

    it('commits the AI panel width on release', async () => {
      mockViewMode = 'canvas'
      mockAIPanelOpen = true
      const { container } = render(<App />)
      const handle = await screen.findByLabelText('Resize panel width')
      const panel = container.querySelector<HTMLElement>('.apple-panel')
      const before = Number.parseInt(panel?.style.width ?? '0', 10)

      // AI panel is on the right — dragging its handle left by 60px widens it.
      await dragWidth(handle, 800, 740)

      expect(Number.parseInt(panel?.style.width ?? '0', 10)).toBe(before + 60)
    })

    it('commits the explorer sidebar width on release', async () => {
      mockViewMode = 'ide'
      const { container } = render(<App />)
      const handle = await screen.findByLabelText('Resize panel width')
      const sidebar = container.querySelector<HTMLElement>('.apple-sidebar')
      const before = Number.parseInt(sidebar?.style.width ?? '0', 10)

      // Explorer is on the left — dragging its handle right by 50px widens it.
      await dragWidth(handle, 100, 150)

      expect(Number.parseInt(sidebar?.style.width ?? '0', 10)).toBe(before + 50)
    })

    it('commits the PR-detail panel width on release', async () => {
      mockViewMode = 'canvas'
      mockPRDetailOpen = true
      mockSelectedPRId = null
      render(<App />)
      const handle = await screen.findByLabelText('Resize panel width')
      const panel = (await screen.findByText('PR Details')).closest('aside') as HTMLElement
      const before = Number.parseInt(panel.style.width || '0', 10)

      // PR-detail is on the right — dragging its handle left by 60px widens it.
      await dragWidth(handle, 800, 740)

      expect(Number.parseInt(panel.style.width || '0', 10)).toBe(before + 60)
    })
  })
})
