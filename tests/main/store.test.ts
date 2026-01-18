/**
 * Store Tests
 *
 * Tests for electron-store persistence layer
 */

import { describe, expect, it, vi } from 'vitest'

// Mock electron-store before importing the module
vi.mock('electron-store', () => {
  const mockStore = new Map<string, unknown>()

  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn((key: string) => {
        if (!mockStore.has(key)) {
          // Return defaults
          const defaults: Record<string, unknown> = {
            token: null,
            user: null,
            settings: { notifications: true, pollInterval: 30000, theme: 'dark' },
            repoOrder: [],
            cardLayouts: [],
            selectedRepos: [],
            prDetailPanel: { isOpen: false, width: 400 },
            repoColors: {},
            viewMode: 'canvas',
            ideViewSettings: { sidebarWidth: 280, expandedRepos: [] }
          }
          return defaults[key]
        }
        return mockStore.get(key)
      }),
      set: vi.fn((key: string, value: unknown) => {
        mockStore.set(key, value)
      }),
      delete: vi.fn((key: string) => {
        mockStore.delete(key)
      }),
      clear: vi.fn(() => {
        mockStore.clear()
      }),
      _mockStore: mockStore // Expose for testing
    }))
  }
})

// Import after mocking
import {
  clearToken,
  getCardLayouts,
  getIDEViewSettings,
  getPRDetailPanel,
  getRepoColors,
  getRepoOrder,
  getSelectedRepos,
  getSettings,
  getToken,
  getUser,
  getViewMode,
  setCardLayouts,
  setIDEViewSettings,
  setPRDetailPanel,
  setRepoColor,
  setRepoOrder,
  setSelectedRepos,
  setSettings,
  setToken,
  setUser,
  setViewMode
} from '@main/store'

describe('Store', () => {
  describe('Token Management', () => {
    it('should return null for unset token', () => {
      expect(getToken()).toBeNull()
    })

    it('should set and get token', () => {
      setToken('ghp_test123')
      expect(getToken()).toBe('ghp_test123')
    })

    it('should clear token and user', () => {
      setToken('ghp_test123')
      setUser({ login: 'test', avatar_url: '', name: 'Test', html_url: '' })
      clearToken()
      expect(getToken()).toBeNull()
    })
  })

  describe('User Management', () => {
    it('should return null for unset user', () => {
      expect(getUser()).toBeNull()
    })

    it('should set and get user', () => {
      const user = {
        login: 'testuser',
        avatar_url: 'https://example.com/avatar.png',
        name: 'Test User',
        html_url: 'https://github.com/testuser'
      }
      setUser(user)
      expect(getUser()).toEqual(user)
    })
  })

  describe('Settings', () => {
    it('should return default settings', () => {
      const settings = getSettings()
      expect(settings).toEqual({
        notifications: true,
        pollInterval: 30000,
        theme: 'dark'
      })
    })

    it('should update partial settings', () => {
      setSettings({ theme: 'light' })
      const settings = getSettings()
      expect(settings.theme).toBe('light')
      expect(settings.notifications).toBe(true) // Unchanged
    })

    it('should update multiple settings', () => {
      setSettings({ notifications: false, pollInterval: 60000 })
      const settings = getSettings()
      expect(settings.notifications).toBe(false)
      expect(settings.pollInterval).toBe(60000)
    })
  })

  describe('Repo Order', () => {
    it('should return empty array by default', () => {
      expect(getRepoOrder()).toEqual([])
    })

    it('should set and get repo order', () => {
      const order = ['org/repo1', 'org/repo2', 'org/repo3']
      setRepoOrder(order)
      expect(getRepoOrder()).toEqual(order)
    })
  })

  describe('Card Layouts', () => {
    it('should return empty array by default', () => {
      expect(getCardLayouts()).toEqual([])
    })

    it('should set and get card layouts', () => {
      const layouts = [
        { i: 'org/repo1', x: 0, y: 0, w: 350, h: 400 },
        { i: 'org/repo2', x: 360, y: 0, w: 350, h: 400 }
      ]
      setCardLayouts(layouts)
      expect(getCardLayouts()).toEqual(layouts)
    })
  })

  describe('Selected Repos', () => {
    it('should return empty array by default', () => {
      expect(getSelectedRepos()).toEqual([])
    })

    it('should set and get selected repos', () => {
      const repos = ['org/frontend', 'org/backend']
      setSelectedRepos(repos)
      expect(getSelectedRepos()).toEqual(repos)
    })
  })

  describe('PR Detail Panel', () => {
    it('should return default panel settings', () => {
      const settings = getPRDetailPanel()
      expect(settings).toEqual({ isOpen: false, width: 400 })
    })

    it('should update panel open state', () => {
      setPRDetailPanel({ isOpen: true })
      expect(getPRDetailPanel().isOpen).toBe(true)
    })

    it('should update panel width', () => {
      setPRDetailPanel({ width: 500 })
      expect(getPRDetailPanel().width).toBe(500)
    })

    it('should update both settings', () => {
      setPRDetailPanel({ isOpen: true, width: 600 })
      const settings = getPRDetailPanel()
      expect(settings.isOpen).toBe(true)
      expect(settings.width).toBe(600)
    })
  })

  describe('Repo Colors', () => {
    it('should return empty object by default', () => {
      expect(getRepoColors()).toEqual({})
    })

    it('should set a repo color', () => {
      setRepoColor('org/repo1', '#ff0000')
      const colors = getRepoColors()
      expect(colors['org/repo1']).toBe('#ff0000')
    })

    it('should remove a repo color when set to null', () => {
      setRepoColor('org/repo1', '#ff0000')
      setRepoColor('org/repo1', null)
      const colors = getRepoColors()
      expect(colors['org/repo1']).toBeUndefined()
    })

    it('should handle multiple repo colors', () => {
      setRepoColor('org/repo1', '#ff0000')
      setRepoColor('org/repo2', '#00ff00')
      const colors = getRepoColors()
      expect(colors['org/repo1']).toBe('#ff0000')
      expect(colors['org/repo2']).toBe('#00ff00')
    })
  })

  describe('View Mode', () => {
    it('should return canvas by default', () => {
      expect(getViewMode()).toBe('canvas')
    })

    it('should set and get view mode', () => {
      setViewMode('ide')
      expect(getViewMode()).toBe('ide')
    })

    it('should switch back to canvas', () => {
      setViewMode('ide')
      setViewMode('canvas')
      expect(getViewMode()).toBe('canvas')
    })
  })

  describe('IDE View Settings', () => {
    it('should return default IDE settings', () => {
      const settings = getIDEViewSettings()
      expect(settings).toEqual({ sidebarWidth: 280, expandedRepos: [] })
    })

    it('should update sidebar width', () => {
      setIDEViewSettings({ sidebarWidth: 350 })
      expect(getIDEViewSettings().sidebarWidth).toBe(350)
    })

    it('should update expanded repos', () => {
      const expanded = ['org/repo1', 'org/repo2']
      setIDEViewSettings({ expandedRepos: expanded })
      expect(getIDEViewSettings().expandedRepos).toEqual(expanded)
    })

    it('should update both settings', () => {
      setIDEViewSettings({ sidebarWidth: 400, expandedRepos: ['org/repo1'] })
      const settings = getIDEViewSettings()
      expect(settings.sidebarWidth).toBe(400)
      expect(settings.expandedRepos).toEqual(['org/repo1'])
    })
  })
})
