/**
 * Electron API Mock
 *
 * Provides a complete mock of the window.electron API for renderer tests.
 * All methods are vi.fn() for easy assertion and customization.
 */

import { vi } from 'vitest'
import {
  createMockIDEViewSettings,
  createMockPanelSettings,
  createMockPullRequest,
  createMockRateLimit,
  createMockRepository,
  createMockSettings,
  createMockUser,
  type MockPullRequest,
  type MockRepository,
  type MockUser
} from './factories'

// ============================================================================
// Types for Mock Return Values
// ============================================================================

interface MockElectronAPI {
  // Token management
  getToken: ReturnType<typeof vi.fn>
  setToken: ReturnType<typeof vi.fn>
  clearToken: ReturnType<typeof vi.fn>
  clearAllData: ReturnType<typeof vi.fn>
  factoryReset: ReturnType<typeof vi.fn>
  validateToken: ReturnType<typeof vi.fn>

  // TanStack Query cache persistence
  getQueryCache: ReturnType<typeof vi.fn>
  setQueryCache: ReturnType<typeof vi.fn>
  clearQueryCache: ReturnType<typeof vi.fn>

  // GitHub API
  fetchAllPRsForRepos: ReturnType<typeof vi.fn>
  refreshRepoPRs: ReturnType<typeof vi.fn>
  fetchPREvents: ReturnType<typeof vi.fn>
  fetchPRChecks: ReturnType<typeof vi.fn>
  fetchContributedRepos: ReturnType<typeof vi.fn>

  // Settings
  getSettings: ReturnType<typeof vi.fn>
  setSettings: ReturnType<typeof vi.fn>

  // Notifications
  showNotification: ReturnType<typeof vi.fn>

  // Repo order
  getRepoOrder: ReturnType<typeof vi.fn>
  setRepoOrder: ReturnType<typeof vi.fn>

  // Rate limit
  getRateLimit: ReturnType<typeof vi.fn>
  onRateLimitUpdate: ReturnType<typeof vi.fn>

  // Card layouts
  getCardLayouts: ReturnType<typeof vi.fn>
  setCardLayouts: ReturnType<typeof vi.fn>

  // Selected repos
  getSelectedRepos: ReturnType<typeof vi.fn>
  setSelectedRepos: ReturnType<typeof vi.fn>

  // My PRs filter (shared across views)
  getMyPRsRepos: ReturnType<typeof vi.fn>
  setMyPRsRepos: ReturnType<typeof vi.fn>

  // PR Detail panel
  getPRDetailPanel: ReturnType<typeof vi.fn>
  setPRDetailPanel: ReturnType<typeof vi.fn>

  // Repo colors
  getRepoColors: ReturnType<typeof vi.fn>
  setRepoColor: ReturnType<typeof vi.fn>

  // Minimized repos
  getMinimizedRepos: ReturnType<typeof vi.fn>
  setRepoMinimized: ReturnType<typeof vi.fn>

  // View mode
  getViewMode: ReturnType<typeof vi.fn>
  setViewMode: ReturnType<typeof vi.fn>

  // IDE view settings
  getIDEViewSettings: ReturnType<typeof vi.fn>
  setIDEViewSettings: ReturnType<typeof vi.fn>

  // Logging
  getLogs: ReturnType<typeof vi.fn>
  clearLogs: ReturnType<typeof vi.fn>
  exportLogs: ReturnType<typeof vi.fn>
  getLogsSummary: ReturnType<typeof vi.fn>
  logFromRenderer: ReturnType<typeof vi.fn>

  // AI Chat
  getClaudeApiKey: ReturnType<typeof vi.fn>
  setClaudeApiKey: ReturnType<typeof vi.fn>
  getChatHistory: ReturnType<typeof vi.fn>
  clearChatHistory: ReturnType<typeof vi.fn>
  sendChatMessage: ReturnType<typeof vi.fn>
  sendChatMessageStreaming: ReturnType<typeof vi.fn>
  onChatStreamChunk: ReturnType<typeof vi.fn>
  fetchClaudeModels: ReturnType<typeof vi.fn>
  getSelectedModel: ReturnType<typeof vi.fn>
  setSelectedModel: ReturnType<typeof vi.fn>
  getEnableThinking: ReturnType<typeof vi.fn>
  setEnableThinking: ReturnType<typeof vi.fn>

  // AI Panel
  getAIPanel: ReturnType<typeof vi.fn>
  setAIPanel: ReturnType<typeof vi.fn>

  // AI-powered actions
  extractPreviewUrl: ReturnType<typeof vi.fn>
  extractJiraTicket: ReturnType<typeof vi.fn>
  analyzePRStatus: ReturnType<typeof vi.fn>
  analyzePRStatusStreaming: ReturnType<typeof vi.fn>
  onPRAnalysisStreamChunk: ReturnType<typeof vi.fn>
  getPRAnalysis: ReturnType<typeof vi.fn>
  deletePRAnalysis: ReturnType<typeof vi.fn>
  getPRAnalysisPanelOpen: ReturnType<typeof vi.fn>
  setPRAnalysisPanelOpen: ReturnType<typeof vi.fn>

  // PR Chat
  getPRChats: ReturnType<typeof vi.fn>
  getPRChat: ReturnType<typeof vi.fn>
  createPRChat: ReturnType<typeof vi.fn>
  addMessageToPRChat: ReturnType<typeof vi.fn>
  getPRChatMessages: ReturnType<typeof vi.fn>
  clearPRChatMessages: ReturnType<typeof vi.fn>
  deletePRChat: ReturnType<typeof vi.fn>
  getActivePRChatId: ReturnType<typeof vi.fn>
  setActivePRChatId: ReturnType<typeof vi.fn>

  // Post PR comments
  postPRComment: ReturnType<typeof vi.fn>

  // Merge PR
  mergePR: ReturnType<typeof vi.fn>

  // Close PR
  closePR: ReturnType<typeof vi.fn>

  // Reopen PR
  reopenPR: ReturnType<typeof vi.fn>

  // Submit PR Review (approve, request changes, comment)
  submitPRReview: ReturnType<typeof vi.fn>

  // Fullscreen
  isFullscreen: ReturnType<typeof vi.fn>
  onFullscreenChange: ReturnType<typeof vi.fn>

  // Native menu
  onOpenAbout: ReturnType<typeof vi.fn>
  onOpenDatabaseViewer: ReturnType<typeof vi.fn>

  // GitHub OAuth (device flow)
  startGitHubAuth: ReturnType<typeof vi.fn>
  cancelGitHubAuth: ReturnType<typeof vi.fn>
  onGitHubAuthDone: ReturnType<typeof vi.fn>
  onGitHubAuthError: ReturnType<typeof vi.fn>

  // Claude Code CLI
  checkClaudeCodeInstalled: ReturnType<typeof vi.fn>
  startClaudeSession: ReturnType<typeof vi.fn>
  stopClaudeSession: ReturnType<typeof vi.fn>
  onClaudeChunk: ReturnType<typeof vi.fn>
  onClaudeDone: ReturnType<typeof vi.fn>
  onClaudeError: ReturnType<typeof vi.fn>

  // Memory usage
  getMemoryUsage: ReturnType<typeof vi.fn>

  // Network request tracking
  onNetworkRequest: ReturnType<typeof vi.fn>

  // Shell
  shell: {
    openExternal: ReturnType<typeof vi.fn>
  }

  // SQLite Database (Persistence Module)
  db: {
    conversations: {
      list: ReturnType<typeof vi.fn>
      get: ReturnType<typeof vi.fn>
      getWithMessages: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      getOrCreate: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
      deleteAll: ReturnType<typeof vi.fn>
    }
    messages: {
      listForConversation: ReturnType<typeof vi.fn>
      add: ReturnType<typeof vi.fn>
      addMany: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
      clearForConversation: ReturnType<typeof vi.fn>
    }
    customPrompts: {
      list: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      delete: ReturnType<typeof vi.fn>
    }
    aiUsage: {
      add: ReturnType<typeof vi.fn>
      listRecent: ReturnType<typeof vi.fn>
      getStats: ReturnType<typeof vi.fn>
      clear: ReturnType<typeof vi.fn>
    }
  }
}

// ============================================================================
// Default Mock Implementations
// ============================================================================

export function createMockElectronAPI(overrides: Partial<MockElectronAPI> = {}): MockElectronAPI {
  const defaultUser = createMockUser({ login: 'testuser' })
  const defaultSettings = createMockSettings()
  const defaultRateLimit = createMockRateLimit()
  const defaultPanelSettings = createMockPanelSettings()
  const defaultIDESettings = createMockIDEViewSettings()

  return {
    // Token management
    getToken: vi.fn().mockResolvedValue('ghp_mocktoken123'),
    setToken: vi.fn().mockResolvedValue({ success: true, user: defaultUser }),
    clearToken: vi.fn().mockResolvedValue({ success: true }),
    clearAllData: vi.fn().mockResolvedValue({ success: true }),
    factoryReset: vi.fn().mockResolvedValue({ success: true }),
    validateToken: vi.fn().mockResolvedValue({ valid: true, user: defaultUser }),

    // TanStack Query cache persistence
    getQueryCache: vi.fn().mockResolvedValue(null),
    setQueryCache: vi.fn().mockResolvedValue({ success: true }),
    clearQueryCache: vi.fn().mockResolvedValue({ success: true }),

    // GitHub API
    fetchAllPRsForRepos: vi.fn().mockResolvedValue({
      success: true,
      data: [],
      currentUser: 'testuser',
      rateLimit: defaultRateLimit
    }),
    refreshRepoPRs: vi.fn().mockResolvedValue({
      success: true,
      data: [],
      currentUser: 'testuser',
      rateLimit: defaultRateLimit
    }),
    fetchPREvents: vi.fn().mockResolvedValue({ success: true, data: [] }),
    fetchPRChecks: vi.fn().mockResolvedValue({ success: true, data: null }),
    fetchContributedRepos: vi.fn().mockResolvedValue({ success: true, data: [] }),

    // Settings
    getSettings: vi.fn().mockResolvedValue(defaultSettings),
    setSettings: vi.fn().mockResolvedValue({ success: true }),

    // Notifications
    showNotification: vi.fn().mockResolvedValue({ success: true }),

    // Repo order
    getRepoOrder: vi.fn().mockResolvedValue([]),
    setRepoOrder: vi.fn().mockResolvedValue({ success: true }),

    // Rate limit
    getRateLimit: vi.fn().mockResolvedValue({ success: true, data: defaultRateLimit }),
    onRateLimitUpdate: vi.fn().mockReturnValue(() => {}), // Returns cleanup function

    // Card layouts
    getCardLayouts: vi.fn().mockResolvedValue([]),
    setCardLayouts: vi.fn().mockResolvedValue({ success: true }),

    // Selected repos
    getSelectedRepos: vi.fn().mockResolvedValue(null), // null = show all (default)
    setSelectedRepos: vi.fn().mockResolvedValue({ success: true }),

    // My PRs filter (shared across views)
    getMyPRsRepos: vi.fn().mockResolvedValue([]),
    setMyPRsRepos: vi.fn().mockResolvedValue({ success: true }),

    // PR Detail panel
    getPRDetailPanel: vi.fn().mockResolvedValue(defaultPanelSettings),
    setPRDetailPanel: vi.fn().mockResolvedValue({ success: true }),

    // Repo colors
    getRepoColors: vi.fn().mockResolvedValue({}),
    setRepoColor: vi.fn().mockResolvedValue({ success: true }),

    // Minimized repos
    getMinimizedRepos: vi.fn().mockResolvedValue([]),
    setRepoMinimized: vi.fn().mockResolvedValue({ success: true }),

    // View mode
    getViewMode: vi.fn().mockResolvedValue('canvas'),
    setViewMode: vi.fn().mockResolvedValue({ success: true }),

    // IDE view settings
    getIDEViewSettings: vi.fn().mockResolvedValue(defaultIDESettings),
    setIDEViewSettings: vi.fn().mockResolvedValue({ success: true }),

    // Logging
    getLogs: vi.fn().mockResolvedValue([]),
    clearLogs: vi.fn().mockResolvedValue({ success: true }),
    exportLogs: vi.fn().mockResolvedValue('[]'),
    getLogsSummary: vi.fn().mockResolvedValue({
      total: 0,
      byLevel: {},
      byCategory: {}
    }),
    logFromRenderer: vi.fn().mockResolvedValue(undefined),

    // AI Chat
    getClaudeApiKey: vi.fn().mockResolvedValue(null),
    setClaudeApiKey: vi.fn().mockResolvedValue({ success: true }),
    getChatHistory: vi.fn().mockResolvedValue([]),
    clearChatHistory: vi.fn().mockResolvedValue({ success: true }),
    sendChatMessage: vi.fn().mockResolvedValue({
      success: true,
      message: { id: '1', role: 'assistant', content: 'Hello!' }
    }),
    sendChatMessageStreaming: vi.fn().mockResolvedValue({ success: true, streamId: 'stream-1' }),
    onChatStreamChunk: vi.fn().mockReturnValue(() => {}), // Returns cleanup function
    fetchClaudeModels: vi.fn().mockResolvedValue({
      success: true,
      models: [
        {
          id: 'claude-sonnet-4-20250514',
          display_name: 'Claude Sonnet 4',
          created_at: '2025-05-14'
        },
        {
          id: 'claude-haiku-4-5-20251001',
          display_name: 'Claude Haiku 4.5',
          created_at: '2025-10-01'
        }
      ]
    }),
    getSelectedModel: vi.fn().mockResolvedValue('claude-sonnet-4-20250514'),
    setSelectedModel: vi.fn().mockResolvedValue({ success: true }),
    getEnableThinking: vi.fn().mockResolvedValue(false),
    setEnableThinking: vi.fn().mockResolvedValue({ success: true }),

    // AI Panel
    getAIPanel: vi.fn().mockResolvedValue({ isOpen: false, width: 380 }),
    setAIPanel: vi.fn().mockResolvedValue({ success: true }),

    // AI-powered actions
    extractPreviewUrl: vi.fn().mockResolvedValue({
      success: false,
      message: 'No preview URL found in this PR'
    }),
    extractJiraTicket: vi.fn().mockResolvedValue({
      success: false,
      message: 'No Jira ticket found in this PR'
    }),
    analyzePRStatus: vi.fn().mockResolvedValue({
      success: true,
      analysis: 'This PR is waiting for code review.'
    }),
    analyzePRStatusStreaming: vi.fn().mockResolvedValue({
      success: true,
      streamId: 'test_stream_123'
    }),
    onPRAnalysisStreamChunk: vi.fn().mockImplementation((callback) => {
      // Simulate streaming by calling the callback with done immediately
      setTimeout(() => {
        callback({
          streamId: 'test_stream_123',
          type: 'done',
          fullResponse: {
            analysis: 'This PR is waiting for code review.',
            thinking: 'Let me analyze this PR...'
          }
        })
      }, 10)
      return () => {} // Return unsubscribe function
    }),
    getPRAnalysis: vi.fn().mockResolvedValue(null),
    deletePRAnalysis: vi.fn().mockResolvedValue({ success: true }),
    getPRAnalysisPanelOpen: vi.fn().mockResolvedValue(false),
    setPRAnalysisPanelOpen: vi.fn().mockResolvedValue({ success: true }),

    // PR Chat
    getPRChats: vi.fn().mockResolvedValue([]),
    getPRChat: vi.fn().mockResolvedValue(null),
    createPRChat: vi.fn().mockImplementation((prId, prNumber, prTitle, repoFullName) =>
      Promise.resolve({
        prId,
        prNumber,
        prTitle,
        repoFullName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    ),
    addMessageToPRChat: vi.fn().mockResolvedValue({ success: true }),
    getPRChatMessages: vi.fn().mockResolvedValue([]),
    clearPRChatMessages: vi.fn().mockResolvedValue({ success: true }),
    deletePRChat: vi.fn().mockResolvedValue({ success: true }),
    getActivePRChatId: vi.fn().mockResolvedValue(null),
    setActivePRChatId: vi.fn().mockResolvedValue({ success: true }),

    // Post PR comments
    postPRComment: vi.fn().mockResolvedValue({
      success: true,
      commentUrl: 'https://github.com/owner/repo/pull/1#discussion_r1234567890'
    }),

    // Merge PR
    mergePR: vi.fn().mockResolvedValue({
      success: true,
      mergedAt: new Date().toISOString(),
      sha: 'abc123def456'
    }),

    // Close PR
    closePR: vi.fn().mockResolvedValue({
      success: true,
      closedAt: new Date().toISOString()
    }),

    // Reopen PR
    reopenPR: vi.fn().mockResolvedValue({
      success: true
    }),

    // Submit PR Review (approve, request changes, comment)
    submitPRReview: vi.fn().mockResolvedValue({
      success: true,
      reviewId: 'PRR_123456',
      state: 'APPROVED'
    }),

    // Fullscreen
    isFullscreen: vi.fn().mockResolvedValue(false),
    onFullscreenChange: vi.fn().mockReturnValue(() => {}), // Returns cleanup function

    // Native menu
    onOpenAbout: vi.fn().mockReturnValue(() => {}), // Returns cleanup function
    onOpenDatabaseViewer: vi.fn().mockReturnValue(() => {}), // Returns cleanup function

    // GitHub OAuth (device flow)
    startGitHubAuth: vi.fn().mockResolvedValue({
      success: true,
      userCode: 'WXYZ-1234',
      verificationUri: 'https://github.com/login/device',
      verificationUriComplete: 'https://github.com/login/device?user_code=WXYZ-1234',
      expiresIn: 900
    }),
    cancelGitHubAuth: vi.fn().mockResolvedValue({ success: true }),
    onGitHubAuthDone: vi.fn().mockReturnValue(() => {}), // Returns cleanup function
    onGitHubAuthError: vi.fn().mockReturnValue(() => {}), // Returns cleanup function

    // Claude Code CLI
    checkClaudeCodeInstalled: vi.fn().mockResolvedValue({ installed: true }),
    startClaudeSession: vi.fn().mockResolvedValue(undefined),
    stopClaudeSession: vi.fn().mockResolvedValue(true),
    onClaudeChunk: vi.fn().mockReturnValue(() => {}), // Returns cleanup function
    onClaudeDone: vi.fn().mockReturnValue(() => {}), // Returns cleanup function
    onClaudeError: vi.fn().mockReturnValue(() => {}), // Returns cleanup function

    // Memory usage
    getMemoryUsage: vi.fn().mockResolvedValue({
      heapUsed: 50 * 1024 * 1024,
      heapTotal: 100 * 1024 * 1024,
      rss: 150 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024
    }),

    // Network request tracking
    onNetworkRequest: vi.fn().mockReturnValue(() => {}), // Returns cleanup function

    // Shell
    shell: {
      openExternal: vi.fn().mockResolvedValue({ success: true })
    },

    // SQLite Database (Persistence Module)
    db: {
      conversations: {
        list: vi.fn().mockResolvedValue({ success: true, data: [] }),
        get: vi.fn().mockResolvedValue({ success: true, data: undefined }),
        getWithMessages: vi.fn().mockResolvedValue({ success: true, data: undefined }),
        create: vi.fn().mockImplementation((data) =>
          Promise.resolve({
            success: true,
            data: { ...data, createdAt: Date.now(), updatedAt: Date.now() }
          })
        ),
        getOrCreate: vi.fn().mockImplementation((data) =>
          Promise.resolve({
            success: true,
            data: { ...data, createdAt: Date.now(), updatedAt: Date.now() }
          })
        ),
        update: vi.fn().mockResolvedValue({ success: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ success: true, data: true }),
        deleteAll: vi.fn().mockResolvedValue({ success: true, data: 0 })
      },
      messages: {
        listForConversation: vi.fn().mockResolvedValue({ success: true, data: [] }),
        add: vi.fn().mockImplementation((data) =>
          Promise.resolve({
            success: true,
            data: { ...data, createdAt: Date.now() }
          })
        ),
        addMany: vi.fn().mockResolvedValue({ success: true }),
        update: vi.fn().mockResolvedValue({ success: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ success: true, data: true }),
        clearForConversation: vi.fn().mockResolvedValue({ success: true, data: 0 })
      },
      customPrompts: {
        list: vi.fn().mockResolvedValue({ success: true, data: [] }),
        create: vi.fn().mockImplementation((data) =>
          Promise.resolve({
            success: true,
            data: { ...data, createdAt: Date.now() }
          })
        ),
        update: vi.fn().mockResolvedValue({ success: true, data: undefined }),
        delete: vi.fn().mockResolvedValue({ success: true, data: true })
      },
      aiUsage: {
        add: vi.fn().mockImplementation((data) =>
          Promise.resolve({
            success: true,
            data: { id: 1, ...data, createdAt: Date.now() }
          })
        ),
        listRecent: vi.fn().mockResolvedValue({ success: true, data: [] }),
        getStats: vi.fn().mockResolvedValue({
          success: true,
          data: {
            totalInputTokens: 0,
            totalOutputTokens: 0,
            totalInputCostUsd: 0,
            totalOutputCostUsd: 0,
            totalCostUsd: 0,
            recordCount: 0
          }
        }),
        clear: vi.fn().mockResolvedValue({ success: true, data: 0 })
      }
    },

    ...overrides
  }
}

// ============================================================================
// Window.electron Setup Helper
// ============================================================================

let mockElectronAPI: MockElectronAPI | null = null

export function setupMockElectron(overrides: Partial<MockElectronAPI> = {}): MockElectronAPI {
  mockElectronAPI = createMockElectronAPI(overrides)

  // @ts-expect-error - Mocking window.electron
  window.electron = mockElectronAPI

  return mockElectronAPI
}

export function getMockElectron(): MockElectronAPI {
  if (!mockElectronAPI) {
    throw new Error('Mock Electron API not initialized. Call setupMockElectron() first.')
  }
  return mockElectronAPI
}

export function resetMockElectron(): void {
  // Don't delete window.electron - just reset to fresh mock
  // This prevents crashes from async effects that run after cleanup
  mockElectronAPI = createMockElectronAPI()
  // @ts-expect-error - Setting mock
  window.electron = mockElectronAPI
}

// ============================================================================
// Scenario-based Mock Setups
// ============================================================================

/**
 * Setup for authenticated user with repos and PRs
 */
export function setupAuthenticatedScenario(
  options: {
    user?: MockUser
    repos?: MockRepository[]
    prs?: MockPullRequest[]
    selectedRepos?: string[]
  } = {}
): MockElectronAPI {
  const user = options.user || createMockUser({ login: 'testuser' })
  const repos = options.repos || [
    createMockRepository({ name: 'frontend', owner: { login: 'myorg', avatar_url: '' } }),
    createMockRepository({ name: 'backend', owner: { login: 'myorg', avatar_url: '' } })
  ]
  const prs = options.prs || [
    createMockPullRequest({ base: { repo: repos[0], ref: 'main', sha: 'abc' } }),
    createMockPullRequest({ base: { repo: repos[1], ref: 'main', sha: 'def' } })
  ]
  const selectedRepos = options.selectedRepos || repos.map((r) => r.full_name)

  return setupMockElectron({
    validateToken: vi.fn().mockResolvedValue({ valid: true, user }),
    getToken: vi.fn().mockResolvedValue('ghp_token'),
    fetchContributedRepos: vi.fn().mockResolvedValue({ success: true, data: repos }),
    fetchAllPRsForRepos: vi.fn().mockResolvedValue({
      success: true,
      data: prs,
      currentUser: user.login,
      rateLimit: createMockRateLimit()
    }),
    getSelectedRepos: vi.fn().mockResolvedValue(selectedRepos)
  })
}

/**
 * Setup for unauthenticated state
 */
export function setupUnauthenticatedScenario(): MockElectronAPI {
  return setupMockElectron({
    validateToken: vi.fn().mockResolvedValue({ valid: false }),
    getToken: vi.fn().mockResolvedValue(null)
  })
}

/**
 * Setup for error scenarios
 */
export function setupErrorScenario(errorMessage = 'API Error'): MockElectronAPI {
  return setupMockElectron({
    fetchContributedRepos: vi.fn().mockResolvedValue({ success: false, error: errorMessage }),
    fetchAllPRsForRepos: vi.fn().mockResolvedValue({ success: false, error: errorMessage })
  })
}

/**
 * Setup for rate limit exceeded scenario
 */
export function setupRateLimitExceededScenario(): MockElectronAPI {
  const rateLimit = createMockRateLimit({ used: 4999, remaining: 1, percentage: 100 })
  return setupMockElectron({
    getRateLimit: vi.fn().mockResolvedValue({ success: true, data: rateLimit }),
    fetchAllPRsForRepos: vi.fn().mockResolvedValue({
      success: true,
      data: [],
      rateLimit
    })
  })
}
