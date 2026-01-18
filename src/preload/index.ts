import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  // Token management
  getToken: () => Promise<string | null>
  setToken: (token: string) => Promise<{ success: boolean; user?: unknown; error?: string }>
  clearToken: () => Promise<{ success: boolean }>
  validateToken: () => Promise<{ valid: boolean; user?: unknown }>

  // GitHub API (GraphQL - one query gets everything!)
  fetchPRs: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  fetchAllPRsForRepos: (repoFullNames: string[]) => Promise<{
    success: boolean
    data?: unknown[]
    currentUser?: string
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }
    error?: string
  }>
  fetchPREvents: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  fetchPRChecks: (
    owner: string,
    repo: string,
    ref: string
  ) => Promise<{ success: boolean; data?: unknown; error?: string }>
  fetchContributedRepos: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>

  // Settings
  getSettings: () => Promise<{ notifications: boolean; pollInterval: number; theme: string }>
  setSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>

  // Notifications
  showNotification: (title: string, body: string) => Promise<{ success: boolean }>

  // Repo order
  getRepoOrder: () => Promise<string[]>
  setRepoOrder: (order: string[]) => Promise<{ success: boolean }>

  // Rate limit
  getRateLimit: () => Promise<{
    success: boolean
    data?: { limit: number; remaining: number; used: number; resetAt: string; percentage: number }
    error?: string
  }>

  // Card layouts (free-form positioning and sizing in pixels)
  getCardLayouts: () => Promise<Array<{ i: string; x: number; y: number; w: number; h: number }>>
  setCardLayouts: (
    layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ) => Promise<{ success: boolean }>

  // Selected repos (which repos to display)
  getSelectedRepos: () => Promise<string[]>
  setSelectedRepos: (repos: string[]) => Promise<{ success: boolean }>

  // PR Detail panel settings
  getPRDetailPanel: () => Promise<{ isOpen: boolean; width: number }>
  setPRDetailPanel: (settings: {
    isOpen?: boolean
    width?: number
  }) => Promise<{ success: boolean }>

  // AI Panel settings
  getAIPanel: () => Promise<{ isOpen: boolean; width: number }>
  setAIPanel: (settings: { isOpen?: boolean; width?: number }) => Promise<{ success: boolean }>

  // Repo colors
  getRepoColors: () => Promise<Record<string, string>>
  setRepoColor: (repoFullName: string, color: string | null) => Promise<{ success: boolean }>

  // View mode
  getViewMode: () => Promise<'canvas' | 'ide'>
  setViewMode: (mode: 'canvas' | 'ide') => Promise<{ success: boolean }>

  // IDE view settings
  getIDEViewSettings: () => Promise<{
    sidebarWidth: number
    expandedRepos: string[]
  }>
  setIDEViewSettings: (settings: {
    sidebarWidth?: number
    expandedRepos?: string[]
  }) => Promise<{ success: boolean }>

  // My PRs filter (shared across all views)
  getMyPRsRepos: () => Promise<string[]>
  setMyPRsRepos: (repos: string[]) => Promise<{ success: boolean }>

  // Logging
  getLogs: () => Promise<
    Array<{
      id: string
      timestamp: string
      level: string
      category: string
      message: string
      details?: unknown
    }>
  >
  clearLogs: () => Promise<{ success: boolean }>
  exportLogs: () => Promise<string>
  getLogsSummary: () => Promise<{
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
  }>
  logFromRenderer: (
    level: 'info' | 'warn' | 'error' | 'debug',
    category: string,
    message: string,
    data?: Record<string, unknown>
  ) => Promise<{ success: boolean }>

  // AI Chat
  getClaudeApiKey: () => Promise<string | null>
  setClaudeApiKey: (key: string | null) => Promise<{ success: boolean; error?: string }>
  fetchClaudeModels: () => Promise<{
    success: boolean
    models?: Array<{ id: string; display_name: string; created_at: string }>
    error?: string
  }>
  getSelectedModel: () => Promise<string>
  setSelectedModel: (model: string) => Promise<{ success: boolean }>
  getDefaultModel: () => Promise<string>
  getEnableThinking: () => Promise<boolean>
  setEnableThinking: (enabled: boolean) => Promise<{ success: boolean }>
  getChatHistory: () => Promise<
    Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
  >
  sendChatMessage: (message: string) => Promise<{
    success: boolean
    message?: {
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }
    error?: string
  }>
  sendChatMessageStreaming: (
    message: string
  ) => Promise<{ success: boolean; streamId?: string; error?: string }>
  onChatStreamChunk: (
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      content?: string
      thinking?: string
      error?: string
    }) => void
  ) => () => void
  clearChatHistory: () => Promise<{ success: boolean }>

  // AI-powered actions
  extractPreviewUrl: (context: {
    title: string
    body: string | null
    comments: Array<{ author: string; body: string }>
  }) => Promise<{ success: boolean; url?: string; message?: string }>

  analyzePRStatus: (context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }) => Promise<{ success: boolean; analysis?: string; message?: string }>

  // Streaming PR analysis with extended thinking
  analyzePRStatusStreaming: (context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }) => Promise<{ success: boolean; streamId?: string; error?: string }>

  onPRAnalysisStreamChunk: (
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      thinking?: string
      content?: string
      error?: string
      fullResponse?: {
        analysis: string
        thinking?: string
      }
    }) => void
  ) => () => void

  getPRAnalysis: (prId: string) => Promise<{
    prId: string
    analysis: string
    generatedAt: number
  } | null>

  deletePRAnalysis: (prId: string) => Promise<{ success: boolean }>

  // PR Analysis Panel State (per PR)
  getPRAnalysisPanelOpen: (prId: string) => Promise<boolean>
  setPRAnalysisPanelOpen: (prId: string, isOpen: boolean) => Promise<{ success: boolean }>

  // Window state
  isFullscreen: () => Promise<boolean>
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void
}

const electronAPI: ElectronAPI = {
  // Token management
  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token: string) => ipcRenderer.invoke('set-token', token),
  clearToken: () => ipcRenderer.invoke('clear-token'),
  validateToken: () => ipcRenderer.invoke('validate-token'),

  // GitHub API (GraphQL - one query gets everything!)
  fetchPRs: () => ipcRenderer.invoke('fetch-prs'),
  fetchAllPRsForRepos: (repoFullNames: string[]) =>
    ipcRenderer.invoke('fetch-all-prs-for-repos', repoFullNames),
  fetchPREvents: () => ipcRenderer.invoke('fetch-pr-events'),
  fetchPRChecks: (owner: string, repo: string, ref: string) =>
    ipcRenderer.invoke('fetch-pr-checks', owner, repo, ref),
  fetchContributedRepos: () => ipcRenderer.invoke('fetch-contributed-repos'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('set-settings', settings),

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('show-notification', title, body),

  // Repo order
  getRepoOrder: () => ipcRenderer.invoke('get-repo-order'),
  setRepoOrder: (order: string[]) => ipcRenderer.invoke('set-repo-order', order),

  // Rate limit
  getRateLimit: () => ipcRenderer.invoke('get-rate-limit'),

  // Card layouts (free-form positioning and sizing)
  getCardLayouts: () => ipcRenderer.invoke('get-card-layouts'),
  setCardLayouts: (
    layouts: Array<{
      i: string
      x: number
      y: number
      w: number
      h: number
      minW?: number
      minH?: number
    }>
  ) => ipcRenderer.invoke('set-card-layouts', layouts),

  // Selected repos (which repos to display)
  getSelectedRepos: () => ipcRenderer.invoke('get-selected-repos'),
  setSelectedRepos: (repos: string[]) => ipcRenderer.invoke('set-selected-repos', repos),

  // PR Detail panel settings
  getPRDetailPanel: () => ipcRenderer.invoke('get-pr-detail-panel'),
  setPRDetailPanel: (settings: { isOpen?: boolean; width?: number }) =>
    ipcRenderer.invoke('set-pr-detail-panel', settings),

  // AI Panel settings
  getAIPanel: () => ipcRenderer.invoke('get-ai-panel'),
  setAIPanel: (settings: { isOpen?: boolean; width?: number }) =>
    ipcRenderer.invoke('set-ai-panel', settings),

  // Repo colors
  getRepoColors: () => ipcRenderer.invoke('get-repo-colors'),
  setRepoColor: (repoFullName: string, color: string | null) =>
    ipcRenderer.invoke('set-repo-color', repoFullName, color),

  // View mode
  getViewMode: () => ipcRenderer.invoke('get-view-mode'),
  setViewMode: (mode: 'canvas' | 'ide') => ipcRenderer.invoke('set-view-mode', mode),

  // IDE view settings
  getIDEViewSettings: () => ipcRenderer.invoke('get-ide-view-settings'),
  setIDEViewSettings: (settings: { sidebarWidth?: number; expandedRepos?: string[] }) =>
    ipcRenderer.invoke('set-ide-view-settings', settings),

  // My PRs filter (shared across all views)
  getMyPRsRepos: () => ipcRenderer.invoke('get-my-prs-repos'),
  setMyPRsRepos: (repos: string[]) => ipcRenderer.invoke('set-my-prs-repos', repos),

  // Logging
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  exportLogs: () => ipcRenderer.invoke('export-logs'),
  getLogsSummary: () => ipcRenderer.invoke('get-logs-summary'),
  logFromRenderer: (
    level: string,
    category: string,
    message: string,
    data?: Record<string, unknown>
  ) => ipcRenderer.invoke('log-from-renderer', level, category, message, data),

  // AI Chat
  getClaudeApiKey: () => ipcRenderer.invoke('get-claude-api-key'),
  setClaudeApiKey: (key: string | null) => ipcRenderer.invoke('set-claude-api-key', key),
  fetchClaudeModels: () => ipcRenderer.invoke('fetch-claude-models'),
  getSelectedModel: () => ipcRenderer.invoke('get-selected-model'),
  setSelectedModel: (model: string) => ipcRenderer.invoke('set-selected-model', model),
  getDefaultModel: () => ipcRenderer.invoke('get-default-model'),
  getEnableThinking: () => ipcRenderer.invoke('get-enable-thinking'),
  setEnableThinking: (enabled: boolean) => ipcRenderer.invoke('set-enable-thinking', enabled),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  sendChatMessage: (message: string) => ipcRenderer.invoke('send-chat-message', message),
  sendChatMessageStreaming: (message: string) =>
    ipcRenderer.invoke('send-chat-message-streaming', message),
  onChatStreamChunk: (
    callback: (chunk: {
      streamId: string
      type: string
      content?: string
      thinking?: string
      error?: string
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      chunk: { streamId: string; type: string; content?: string; thinking?: string; error?: string }
    ) => {
      callback(chunk)
    }
    ipcRenderer.on('chat-stream-chunk', handler)
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('chat-stream-chunk', handler)
    }
  },
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history'),

  // AI-powered actions
  extractPreviewUrl: (context: {
    title: string
    body: string | null
    comments: Array<{ author: string; body: string }>
  }) => ipcRenderer.invoke('extract-preview-url', context),

  analyzePRStatus: (context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }) => ipcRenderer.invoke('analyze-pr-status', context),

  // Streaming PR analysis with extended thinking
  analyzePRStatusStreaming: (context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }) => ipcRenderer.invoke('analyze-pr-status-streaming', context),

  onPRAnalysisStreamChunk: (
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      thinking?: string
      content?: string
      error?: string
      fullResponse?: {
        analysis: string
        thinking?: string
      }
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      chunk: {
        streamId: string
        type: 'thinking' | 'text' | 'done' | 'error'
        thinking?: string
        content?: string
        error?: string
        fullResponse?: {
          analysis: string
          thinking?: string
        }
      }
    ) => {
      callback(chunk)
    }
    ipcRenderer.on('pr-analysis-stream-chunk', handler)
    return () => {
      ipcRenderer.removeListener('pr-analysis-stream-chunk', handler)
    }
  },

  getPRAnalysis: (prId: string) => ipcRenderer.invoke('get-pr-analysis', prId),
  deletePRAnalysis: (prId: string) => ipcRenderer.invoke('delete-pr-analysis', prId),

  // PR Analysis Panel State (per PR)
  getPRAnalysisPanelOpen: (prId: string) => ipcRenderer.invoke('get-pr-analysis-panel-open', prId),
  setPRAnalysisPanelOpen: (prId: string, isOpen: boolean) =>
    ipcRenderer.invoke('set-pr-analysis-panel-open', prId, isOpen),

  // Window state
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isFullscreen: boolean) => {
      callback(isFullscreen)
    }
    ipcRenderer.on('fullscreen-change', handler)
    return () => {
      ipcRenderer.removeListener('fullscreen-change', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)
