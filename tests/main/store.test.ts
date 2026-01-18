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
            ideViewSettings: { sidebarWidth: 280, expandedRepos: [] },
            dataCache: { prData: null, allRepos: null },
            prAnalyses: [],
            prAnalysisPanelStates: {},
            prChats: [],
            activePRChatId: null
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
  addMessageToPRChat,
  CACHE_TTL_ALL_REPOS,
  CACHE_TTL_PR_DATA,
  clearAllPRChats,
  clearDataCache,
  clearPRAnalyses,
  clearPRAnalysisPanelStates,
  clearPRChatMessages,
  clearToken,
  createPRChat,
  deletePRAnalysis,
  deletePRChat,
  getActivePRChatId,
  getAllReposCache,
  getCardLayouts,
  getIDEViewSettings,
  getPRAnalyses,
  getPRAnalysis,
  getPRAnalysisPanelOpen,
  getPRAnalysisPanelStates,
  getPRChat,
  getPRChatMessages,
  getPRChats,
  getPRDataCache,
  getPRDetailPanel,
  getRepoColors,
  getRepoOrder,
  getSelectedRepos,
  getSettings,
  getToken,
  getUser,
  getViewMode,
  isCacheValid,
  setActivePRChatId,
  setAllReposCache,
  setCardLayouts,
  setIDEViewSettings,
  setPRAnalysis,
  setPRAnalysisPanelOpen,
  setPRDataCache,
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

  describe('Data Cache (Persistent)', () => {
    describe('Cache TTL Constants', () => {
      it('should have 30 minute TTL for PR data', () => {
        expect(CACHE_TTL_PR_DATA).toBe(30 * 60 * 1000) // 30 minutes in ms
      })

      it('should have 30 minute TTL for all repos', () => {
        expect(CACHE_TTL_ALL_REPOS).toBe(30 * 60 * 1000) // 30 minutes in ms
      })
    })

    describe('isCacheValid', () => {
      it('should return false for undefined lastFetch', () => {
        expect(isCacheValid(undefined, CACHE_TTL_PR_DATA)).toBe(false)
      })

      it('should return true for fresh cache', () => {
        const recentTime = Date.now() - 5 * 60 * 1000 // 5 minutes ago
        expect(isCacheValid(recentTime, CACHE_TTL_PR_DATA)).toBe(true)
      })

      it('should return false for expired cache', () => {
        const oldTime = Date.now() - 35 * 60 * 1000 // 35 minutes ago
        expect(isCacheValid(oldTime, CACHE_TTL_PR_DATA)).toBe(false)
      })

      it('should return true for cache at exactly 29 minutes', () => {
        const time = Date.now() - 29 * 60 * 1000 // 29 minutes ago
        expect(isCacheValid(time, CACHE_TTL_PR_DATA)).toBe(true)
      })

      it('should return false for cache at exactly 31 minutes', () => {
        const time = Date.now() - 31 * 60 * 1000 // 31 minutes ago
        expect(isCacheValid(time, CACHE_TTL_PR_DATA)).toBe(false)
      })
    })

    describe('PR Data Cache', () => {
      it('should return null for unset PR data cache', () => {
        expect(getPRDataCache()).toBeNull()
      })

      it('should set and get PR data cache', () => {
        const mockData = {
          pullRequests: [{ id: 1, title: 'Test PR' }],
          currentUser: 'testuser',
          rateLimit: { limit: 5000, remaining: 4999 }
        }
        const repos = ['org/repo1', 'org/repo2']

        setPRDataCache(mockData, repos)
        const cache = getPRDataCache()

        expect(cache).not.toBeNull()
        expect(cache?.data).toEqual(mockData)
        expect(cache?.selectedRepos).toEqual(repos)
        expect(cache?.lastFetch).toBeGreaterThan(0)
      })

      it('should store lastFetch timestamp', () => {
        const before = Date.now()
        setPRDataCache({ test: true }, ['org/repo'])
        const after = Date.now()

        const cache = getPRDataCache()
        expect(cache?.lastFetch).toBeGreaterThanOrEqual(before)
        expect(cache?.lastFetch).toBeLessThanOrEqual(after)
      })
    })

    describe('All Repos Cache', () => {
      it('should return null for unset repos cache', () => {
        expect(getAllReposCache()).toBeNull()
      })

      it('should set and get all repos cache', () => {
        const mockRepos = [
          { full_name: 'org/repo1', name: 'repo1' },
          { full_name: 'org/repo2', name: 'repo2' }
        ]

        setAllReposCache(mockRepos)
        const cache = getAllReposCache()

        expect(cache).not.toBeNull()
        expect(cache?.data).toEqual(mockRepos)
        expect(cache?.lastFetch).toBeGreaterThan(0)
      })
    })

    describe('clearDataCache', () => {
      it('should clear all cached data', () => {
        // Set some cache data
        setPRDataCache({ test: true }, ['org/repo'])
        setAllReposCache([{ name: 'test' }])

        // Verify it's set
        expect(getPRDataCache()).not.toBeNull()
        expect(getAllReposCache()).not.toBeNull()

        // Clear cache
        clearDataCache()

        // Verify it's cleared
        expect(getPRDataCache()).toBeNull()
        expect(getAllReposCache()).toBeNull()
      })
    })

    describe('Cache Persistence Across Sessions', () => {
      it('should persist PR data cache with selectedRepos for validation', () => {
        const repos = ['org/frontend', 'org/backend']
        const data = { prs: [1, 2, 3] }

        setPRDataCache(data, repos)
        const cache = getPRDataCache()

        // Verify the cache includes selectedRepos for cache key validation
        expect(cache?.selectedRepos).toEqual(repos)
      })

      it('should allow different cache entries for different repo selections', () => {
        // First set of repos
        setPRDataCache({ set: 1 }, ['org/repo1'])
        const cache1 = getPRDataCache()
        expect(cache1?.selectedRepos).toEqual(['org/repo1'])

        // Different set of repos (would overwrite)
        setPRDataCache({ set: 2 }, ['org/repo2', 'org/repo3'])
        const cache2 = getPRDataCache()
        expect(cache2?.selectedRepos).toEqual(['org/repo2', 'org/repo3'])
        expect(cache2?.data).toEqual({ set: 2 })
      })
    })
  })

  describe('PR Analysis Persistence', () => {
    describe('getPRAnalyses', () => {
      it('should return empty array by default', () => {
        expect(getPRAnalyses()).toEqual([])
      })
    })

    describe('setPRAnalysis', () => {
      it('should save a new PR analysis', () => {
        setPRAnalysis('org/repo#1', 'This PR is waiting for code review.')

        const analysis = getPRAnalysis('org/repo#1')
        expect(analysis).not.toBeNull()
        expect(analysis?.analysis).toBe('This PR is waiting for code review.')
        expect(analysis?.generatedAt).toBeGreaterThan(0)
      })

      it('should update existing PR analysis', () => {
        setPRAnalysis('org/repo#1', 'Original analysis')
        setPRAnalysis('org/repo#1', 'Updated analysis')

        const analysis = getPRAnalysis('org/repo#1')
        expect(analysis?.analysis).toBe('Updated analysis')
      })

      it('should store multiple analyses for different PRs', () => {
        setPRAnalysis('org/repo#1', 'Analysis for PR 1')
        setPRAnalysis('org/repo#2', 'Analysis for PR 2')
        setPRAnalysis('other/repo#5', 'Analysis for PR 5')

        expect(getPRAnalysis('org/repo#1')?.analysis).toBe('Analysis for PR 1')
        expect(getPRAnalysis('org/repo#2')?.analysis).toBe('Analysis for PR 2')
        expect(getPRAnalysis('other/repo#5')?.analysis).toBe('Analysis for PR 5')
      })
    })

    describe('getPRAnalysis', () => {
      it('should return null for non-existent analysis', () => {
        expect(getPRAnalysis('nonexistent/repo#999')).toBeNull()
      })

      it('should return specific analysis by prId', () => {
        setPRAnalysis('org/repo#1', 'First analysis')
        setPRAnalysis('org/repo#2', 'Second analysis')

        const analysis = getPRAnalysis('org/repo#2')
        expect(analysis?.prId).toBe('org/repo#2')
        expect(analysis?.analysis).toBe('Second analysis')
      })
    })

    describe('deletePRAnalysis', () => {
      it('should remove specific analysis', () => {
        setPRAnalysis('org/repo#1', 'Analysis 1')
        setPRAnalysis('org/repo#2', 'Analysis 2')

        deletePRAnalysis('org/repo#1')

        expect(getPRAnalysis('org/repo#1')).toBeNull()
        expect(getPRAnalysis('org/repo#2')).not.toBeNull()
      })

      it('should not throw when deleting non-existent analysis', () => {
        expect(() => deletePRAnalysis('nonexistent/repo#999')).not.toThrow()
      })
    })

    describe('clearPRAnalyses', () => {
      it('should remove all analyses', () => {
        setPRAnalysis('org/repo#1', 'Analysis 1')
        setPRAnalysis('org/repo#2', 'Analysis 2')
        setPRAnalysis('org/repo#3', 'Analysis 3')

        clearPRAnalyses()

        expect(getPRAnalyses()).toEqual([])
        expect(getPRAnalysis('org/repo#1')).toBeNull()
        expect(getPRAnalysis('org/repo#2')).toBeNull()
        expect(getPRAnalysis('org/repo#3')).toBeNull()
      })
    })

    describe('Analysis Limit', () => {
      it('should keep only the last 100 analyses', () => {
        // Add 110 analyses
        for (let i = 0; i < 110; i++) {
          setPRAnalysis(`org/repo#${i}`, `Analysis ${i}`)
        }

        const analyses = getPRAnalyses()
        expect(analyses.length).toBeLessThanOrEqual(100)

        // Oldest analyses should be removed
        expect(getPRAnalysis('org/repo#0')).toBeNull()
        expect(getPRAnalysis('org/repo#9')).toBeNull()

        // Newest analyses should be kept
        expect(getPRAnalysis('org/repo#109')).not.toBeNull()
        expect(getPRAnalysis('org/repo#100')).not.toBeNull()
      })
    })
  })

  describe('PR Analysis Panel State Persistence', () => {
    describe('getPRAnalysisPanelStates', () => {
      it('should return empty object by default', () => {
        expect(getPRAnalysisPanelStates()).toEqual({})
      })
    })

    describe('getPRAnalysisPanelOpen', () => {
      it('should return false by default for unknown PR', () => {
        expect(getPRAnalysisPanelOpen('unknown/repo#999')).toBe(false)
      })

      it('should return saved state for known PR', () => {
        setPRAnalysisPanelOpen('org/repo#1', true)
        expect(getPRAnalysisPanelOpen('org/repo#1')).toBe(true)

        setPRAnalysisPanelOpen('org/repo#2', false)
        expect(getPRAnalysisPanelOpen('org/repo#2')).toBe(false)
      })
    })

    describe('setPRAnalysisPanelOpen', () => {
      it('should save panel open state', () => {
        setPRAnalysisPanelOpen('org/repo#1', true)
        expect(getPRAnalysisPanelOpen('org/repo#1')).toBe(true)
      })

      it('should save panel closed state', () => {
        setPRAnalysisPanelOpen('org/repo#1', true)
        setPRAnalysisPanelOpen('org/repo#1', false)
        expect(getPRAnalysisPanelOpen('org/repo#1')).toBe(false)
      })

      it('should maintain independent state per PR', () => {
        setPRAnalysisPanelOpen('org/repo#1', true)
        setPRAnalysisPanelOpen('org/repo#2', false)
        setPRAnalysisPanelOpen('org/repo#3', true)

        expect(getPRAnalysisPanelOpen('org/repo#1')).toBe(true)
        expect(getPRAnalysisPanelOpen('org/repo#2')).toBe(false)
        expect(getPRAnalysisPanelOpen('org/repo#3')).toBe(true)
      })
    })

    describe('clearPRAnalysisPanelStates', () => {
      it('should clear all panel states', () => {
        setPRAnalysisPanelOpen('org/repo#1', true)
        setPRAnalysisPanelOpen('org/repo#2', true)

        clearPRAnalysisPanelStates()

        expect(getPRAnalysisPanelStates()).toEqual({})
        expect(getPRAnalysisPanelOpen('org/repo#1')).toBe(false)
        expect(getPRAnalysisPanelOpen('org/repo#2')).toBe(false)
      })
    })

    describe('Panel State Limit', () => {
      it('should keep only the last 200 panel states', () => {
        // Add 210 panel states
        for (let i = 0; i < 210; i++) {
          setPRAnalysisPanelOpen(`org/repo#${i}`, true)
        }

        const states = getPRAnalysisPanelStates()
        expect(Object.keys(states).length).toBeLessThanOrEqual(200)

        // Oldest states should be removed
        expect(getPRAnalysisPanelOpen('org/repo#0')).toBe(false)
        expect(getPRAnalysisPanelOpen('org/repo#9')).toBe(false)

        // Newest states should be kept
        expect(getPRAnalysisPanelOpen('org/repo#209')).toBe(true)
        expect(getPRAnalysisPanelOpen('org/repo#200')).toBe(true)
      })
    })
  })

  describe('PR Chat Persistence', () => {
    beforeEach(() => {
      clearAllPRChats()
    })

    describe('createPRChat', () => {
      it('should create a new PR chat', () => {
        const chat = createPRChat('org/repo#1', 1, 'Test PR', 'org/repo')

        expect(chat.prId).toBe('org/repo#1')
        expect(chat.prNumber).toBe(1)
        expect(chat.prTitle).toBe('Test PR')
        expect(chat.repoFullName).toBe('org/repo')
        expect(chat.messages).toEqual([])
        expect(chat.createdAt).toBeDefined()
        expect(chat.updatedAt).toBeDefined()
      })

      it('should return existing chat if already exists', () => {
        const chat1 = createPRChat('org/repo#1', 1, 'Test PR', 'org/repo')
        const chat2 = createPRChat('org/repo#1', 1, 'Different Title', 'org/repo')

        // Should return the same chat, not create a new one
        expect(chat1.prId).toBe(chat2.prId)
        expect(chat1.createdAt).toBe(chat2.createdAt)
      })

      it('should limit to 50 chats', () => {
        // Create 55 chats
        for (let i = 0; i < 55; i++) {
          createPRChat(`org/repo#${i}`, i, `PR ${i}`, 'org/repo')
        }

        const chats = getPRChats()
        expect(chats.length).toBeLessThanOrEqual(50)
      })
    })

    describe('getPRChat', () => {
      it('should return null for non-existent chat', () => {
        const chat = getPRChat('non-existent')
        expect(chat).toBeNull()
      })

      it('should return existing chat', () => {
        createPRChat('org/repo#1', 1, 'Test PR', 'org/repo')
        const chat = getPRChat('org/repo#1')

        expect(chat).not.toBeNull()
        expect(chat?.prId).toBe('org/repo#1')
      })
    })

    describe('getPRChats', () => {
      it('should return empty array initially', () => {
        expect(getPRChats()).toEqual([])
      })

      it('should return all chats', () => {
        createPRChat('org/repo#1', 1, 'PR 1', 'org/repo')
        createPRChat('org/repo#2', 2, 'PR 2', 'org/repo')

        const chats = getPRChats()
        expect(chats.length).toBe(2)
      })
    })

    describe('addMessageToPRChat', () => {
      it('should add message to existing chat', () => {
        createPRChat('org/repo#1', 1, 'Test PR', 'org/repo')

        const message = {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date().toISOString()
        }

        addMessageToPRChat('org/repo#1', message)

        const messages = getPRChatMessages('org/repo#1')
        expect(messages.length).toBe(1)
        expect(messages[0].content).toBe('Hello')
      })

      it('should not add message to non-existent chat', () => {
        const message = {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date().toISOString()
        }

        addMessageToPRChat('non-existent', message)

        const messages = getPRChatMessages('non-existent')
        expect(messages).toEqual([])
      })
    })

    describe('clearPRChatMessages', () => {
      it('should clear messages from chat', () => {
        createPRChat('org/repo#1', 1, 'Test PR', 'org/repo')

        const message = {
          id: 'msg-1',
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date().toISOString()
        }

        addMessageToPRChat('org/repo#1', message)
        expect(getPRChatMessages('org/repo#1').length).toBe(1)

        clearPRChatMessages('org/repo#1')
        expect(getPRChatMessages('org/repo#1')).toEqual([])
      })
    })

    describe('deletePRChat', () => {
      it('should delete a chat', () => {
        createPRChat('org/repo#1', 1, 'Test PR', 'org/repo')
        expect(getPRChat('org/repo#1')).not.toBeNull()

        deletePRChat('org/repo#1')
        expect(getPRChat('org/repo#1')).toBeNull()
      })
    })

    describe('clearAllPRChats', () => {
      it('should clear all chats', () => {
        createPRChat('org/repo#1', 1, 'PR 1', 'org/repo')
        createPRChat('org/repo#2', 2, 'PR 2', 'org/repo')

        clearAllPRChats()

        expect(getPRChats()).toEqual([])
      })
    })

    describe('Active PR Chat', () => {
      it('should return null initially', () => {
        expect(getActivePRChatId()).toBeNull()
      })

      it('should set and get active PR chat ID', () => {
        setActivePRChatId('org/repo#1')
        expect(getActivePRChatId()).toBe('org/repo#1')
      })

      it('should clear active PR chat ID', () => {
        setActivePRChatId('org/repo#1')
        setActivePRChatId(null)
        expect(getActivePRChatId()).toBeNull()
      })
    })
  })
})
