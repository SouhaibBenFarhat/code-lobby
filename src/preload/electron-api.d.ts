// Auto-extracted ElectronAPI interface for web TypeScript compilation
export interface ElectronAPI {
  // Token management
  getToken: () => Promise<string | null>
  setToken: (token: string) => Promise<{ success: boolean; user?: unknown; error?: string }>
  clearToken: () => Promise<{ success: boolean }>
  clearAllData: () => Promise<{ success: boolean }>
  factoryReset: () => Promise<{ success: boolean }>

  // TanStack Query cache persistence
  getQueryCache: () => Promise<string | null>
  setQueryCache: (cache: string) => Promise<{ success: boolean }>
  clearQueryCache: () => Promise<{ success: boolean }>

  // Custom quick prompts
  getCustomPrompts: () => Promise<
    Array<{
      id: string
      label: string
      prompt: string
      createdAt: string
    }>
  >
  addCustomPrompt: (
    label: string,
    prompt: string
  ) => Promise<{
    success: boolean
    prompt?: {
      id: string
      label: string
      prompt: string
      createdAt: string
    }
    error?: string
  }>
  deleteCustomPrompt: (id: string) => Promise<{ success: boolean; error?: string }>

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
      cost?: number
    }
    error?: string
  }>
  refreshRepoPRs: (repoFullName: string) => Promise<{
    success: boolean
    data?: unknown[]
    currentUser?: string
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
      cost?: number
    }
    error?: string
  }>
  /** Refresh a single PR (much more efficient - ~1 point vs 5-10 for bulk) */
  refreshSinglePR: (
    repoFullName: string,
    prNumber: number
  ) => Promise<{
    success: boolean
    data?: unknown
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
      cost?: number
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
  fetchPRFiles: (
    owner: string,
    repo: string,
    prNumber: number
  ) => Promise<{
    success: boolean
    data?: Array<{
      path: string
      additions: number
      deletions: number
      changeType: 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAMED' | 'COPIED'
      patch: string | null
    }>
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }
    error?: string
  }>

  // Post PR review comment
  postPRComment: (
    owner: string,
    repo: string,
    prNumber: number,
    commitId: string,
    path: string,
    line: number,
    body: string
  ) => Promise<{
    success: boolean
    commentUrl?: string
    error?: string
  }>

  // Merge PR
  mergePR: (
    prNodeId: string,
    mergeMethod?: 'MERGE' | 'SQUASH' | 'REBASE',
    commitHeadline?: string,
    commitBody?: string
  ) => Promise<{
    success: boolean
    mergedAt?: string
    sha?: string
    error?: string
  }>

  // Close PR (without merging, optionally with a closing comment)
  closePR: (
    prNodeId: string,
    comment?: string
  ) => Promise<{
    success: boolean
    closedAt?: string
    error?: string
  }>

  // Add comment to PR
  addPRComment: (
    prNodeId: string,
    body: string
  ) => Promise<{
    success: boolean
    commentId?: string
    error?: string
  }>

  // Reopen PR
  reopenPR: (prNodeId: string) => Promise<{
    success: boolean
    error?: string
  }>

  // Mark PR Ready for Review
  markPRReady: (prNodeId: string) => Promise<{
    success: boolean
    error?: string
  }>

  // Convert PR to Draft
  convertPRToDraft: (prNodeId: string) => Promise<{
    success: boolean
    error?: string
  }>

  // Submit PR Review (approve, request changes, or comment)
  submitPRReview: (
    prNodeId: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body?: string
  ) => Promise<{
    success: boolean
    reviewId?: string
    state?: string
    error?: string
  }>

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
  onRateLimitUpdate: (
    callback: (rateLimit: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }) => void
  ) => () => void

  // Network request tracking (for Network Panel - tracks ACTUAL API calls)
  onNetworkRequest: (
    callback: (event: {
      id: string
      method: string
      status: 'pending' | 'success' | 'error'
      startTime: number
      endTime?: number
      durationMs?: number
      httpMethod?: string
      url?: string
      statusCode?: number
      cost?: number
      rateLimit?: {
        limit: number
        remaining: number
        used: number
        resetAt: string
      }
      error?: string
      requestBody?: string
      responseBody?: string
    }) => void
  ) => () => void

  // Card layouts (free-form positioning and sizing in pixels)
  getCardLayouts: () => Promise<Array<{ i: string; x: number; y: number; w: number; h: number }>>
  setCardLayouts: (
    layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ) => Promise<{ success: boolean }>

  // Selected repos (which repos to display)
  getSelectedRepos: () => Promise<string[] | null>
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

  // Minimized repos
  getMinimizedRepos: () => Promise<string[]>
  setRepoMinimized: (repoFullName: string, isMinimized: boolean) => Promise<{ success: boolean }>

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
  getEnableWebFetch: () => Promise<boolean>
  setEnableWebFetch: (enabled: boolean) => Promise<{ success: boolean }>
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
    message: string,
    systemContext?: string
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

  extractJiraTicket: (context: {
    title: string
    body: string | null
    branchName: string
    comments: Array<{ author: string; body: string }>
  }) => Promise<{ success: boolean; ticketKey?: string; ticketUrl?: string; message?: string }>

  analyzeCIFailure: (params: {
    owner: string
    repo: string
    checkRunId: string
    checkName: string
  }) => Promise<{
    success: boolean
    summary?: string
    failureReason?: string
    suggestedFix?: string
    thinking?: string
    error?: string
  }>

  // Streaming CI failure analysis (with real-time thinking)
  streamCIFailureAnalysis: (params: {
    owner: string
    repo: string
    checkRunId: string
    checkName: string
  }) => Promise<{ success: boolean; streamId?: string; error?: string }>

  onCIAnalysisStreamChunk: (
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      thinking?: string
      content?: string
      error?: string
      fullResponse?: {
        summary: string
        failureReason?: string
        suggestedFix?: string
        thinking?: string
      }
    }) => void
  ) => () => void

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

  // PR Chat (AI chat linked to specific PRs)
  getPRChats: () => Promise<
    Array<{
      prId: string
      prNumber: number
      prTitle: string
      repoFullName: string
      messages: Array<{
        id: string
        role: 'user' | 'assistant'
        content: string
        thinking?: string
        timestamp: string
      }>
      createdAt: string
      updatedAt: string
      systemContext?: string
    }>
  >
  getPRChat: (prId: string) => Promise<{
    prId: string
    prNumber: number
    prTitle: string
    repoFullName: string
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
    createdAt: string
    updatedAt: string
    systemContext?: string
  } | null>
  createPRChat: (
    prId: string,
    prNumber: number,
    prTitle: string,
    repoFullName: string,
    systemContext?: string
  ) => Promise<{
    prId: string
    prNumber: number
    prTitle: string
    repoFullName: string
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
    systemContext?: string
    createdAt: string
    updatedAt: string
  }>
  addMessageToPRChat: (
    prId: string,
    message: {
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }
  ) => Promise<{ success: boolean }>
  getPRChatMessages: (prId: string) => Promise<
    Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
  >
  clearPRChatMessages: (prId: string) => Promise<{ success: boolean }>
  deletePRChat: (prId: string) => Promise<{ success: boolean }>
  getActivePRChatId: () => Promise<string | null>
  setActivePRChatId: (prId: string | null) => Promise<{ success: boolean }>

  // AI Usage tracking
  getAIUsage: () => Promise<{
    totalInputTokens: number
    totalOutputTokens: number
    totalCostUsd: number
    sessionStartedAt: string
    lastUpdatedAt: string
  }>
  resetAIUsage: () => Promise<{ success: boolean; error?: string }>
  getAIPricing: () => Promise<
    Array<{
      modelPrefix: string
      inputPerMillion: number
      outputPerMillion: number
      displayName: string
    }>
  >

  // Window state
  isFullscreen: () => Promise<boolean>
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void
  toggleFullscreen: () => Promise<boolean>

  // Shell operations
  shell: {
    openExternal: (url: string) => Promise<void>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
