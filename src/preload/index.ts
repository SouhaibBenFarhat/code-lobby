import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from './electron-api.d'

export type { ElectronAPI }

// The interface is defined in ./electron-api.d.ts to allow web TypeScript compilation
// Here we just re-export it for backward compatibility

const electronAPI: ElectronAPI = {
  // Token management
  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token: string) => ipcRenderer.invoke('set-token', token),
  clearToken: () => ipcRenderer.invoke('clear-token'),
  clearAllData: () => ipcRenderer.invoke('clear-all-data'),
  factoryReset: () => ipcRenderer.invoke('factory-reset'),

  // TanStack Query cache persistence
  getQueryCache: () => ipcRenderer.invoke('get-query-cache'),
  setQueryCache: (cache: string) => ipcRenderer.invoke('set-query-cache', cache),
  clearQueryCache: () => ipcRenderer.invoke('clear-query-cache'),

  // Custom quick prompts
  getCustomPrompts: () => ipcRenderer.invoke('get-custom-prompts'),
  addCustomPrompt: (label: string, prompt: string) =>
    ipcRenderer.invoke('add-custom-prompt', label, prompt),
  deleteCustomPrompt: (id: string) => ipcRenderer.invoke('delete-custom-prompt', id),

  validateToken: () => ipcRenderer.invoke('validate-token'),

  // GitHub API (GraphQL - one query gets everything!)
  fetchPRs: () => ipcRenderer.invoke('fetch-prs'),
  fetchAllPRsForRepos: (repoFullNames: string[]) =>
    ipcRenderer.invoke('fetch-all-prs-for-repos', repoFullNames),
  refreshRepoPRs: (repoFullName: string) => ipcRenderer.invoke('refresh-repo-prs', repoFullName),
  refreshSinglePR: (repoFullName: string, prNumber: number) =>
    ipcRenderer.invoke('refresh-single-pr', repoFullName, prNumber),
  fetchPREvents: () => ipcRenderer.invoke('fetch-pr-events'),
  fetchPRChecks: (owner: string, repo: string, ref: string) =>
    ipcRenderer.invoke('fetch-pr-checks', owner, repo, ref),
  fetchContributedRepos: () => ipcRenderer.invoke('fetch-contributed-repos'),
  fetchPRFiles: (owner: string, repo: string, prNumber: number) =>
    ipcRenderer.invoke('fetch-pr-files', owner, repo, prNumber),

  // Post PR review comment
  postPRComment: (
    owner: string,
    repo: string,
    prNumber: number,
    commitId: string,
    path: string,
    line: number,
    body: string
  ) => ipcRenderer.invoke('post-pr-comment', owner, repo, prNumber, commitId, path, line, body),

  // Merge PR
  mergePR: (
    prNodeId: string,
    mergeMethod?: 'MERGE' | 'SQUASH' | 'REBASE',
    commitHeadline?: string,
    commitBody?: string
  ) => ipcRenderer.invoke('merge-pr', prNodeId, mergeMethod, commitHeadline, commitBody),

  // Close PR (without merging, optionally with a closing comment)
  closePR: (prNodeId: string, comment?: string) =>
    ipcRenderer.invoke('close-pr', prNodeId, comment),

  // Add comment to PR
  addPRComment: (prNodeId: string, body: string) =>
    ipcRenderer.invoke('add-pr-comment', prNodeId, body),

  // Reopen PR
  reopenPR: (prNodeId: string) => ipcRenderer.invoke('reopen-pr', prNodeId),

  // Mark PR Ready for Review
  markPRReady: (prNodeId: string) => ipcRenderer.invoke('mark-pr-ready', prNodeId),

  // Convert PR to Draft
  convertPRToDraft: (prNodeId: string) => ipcRenderer.invoke('convert-pr-to-draft', prNodeId),

  // Submit PR Review (approve, request changes, or comment)
  submitPRReview: (
    prNodeId: string,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body?: string
  ) => ipcRenderer.invoke('submit-pr-review', prNodeId, event, body),

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
  onRateLimitUpdate: (
    callback: (rateLimit: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      rateLimit: {
        limit: number
        remaining: number
        used: number
        resetAt: string
        percentage: number
      }
    ) => {
      callback(rateLimit)
    }
    ipcRenderer.on('rate-limit-update', handler)
    return () => {
      ipcRenderer.removeListener('rate-limit-update', handler)
    }
  },

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
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      networkEvent: {
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
      }
    ) => {
      callback(networkEvent)
    }
    ipcRenderer.on('network-request', handler)
    return () => {
      ipcRenderer.removeListener('network-request', handler)
    }
  },

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

  // Minimized repos
  getMinimizedRepos: () => ipcRenderer.invoke('get-minimized-repos'),
  setRepoMinimized: (repoFullName: string, isMinimized: boolean) =>
    ipcRenderer.invoke('set-repo-minimized', repoFullName, isMinimized),

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
  getEnableWebFetch: () => ipcRenderer.invoke('get-enable-web-fetch'),
  setEnableWebFetch: (enabled: boolean) => ipcRenderer.invoke('set-enable-web-fetch', enabled),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  sendChatMessage: (message: string) => ipcRenderer.invoke('send-chat-message', message),
  sendChatMessageStreaming: (message: string, systemContext?: string) =>
    ipcRenderer.invoke('send-chat-message-streaming', message, systemContext),
  onChatStreamChunk: (
    callback: (chunk: {
      streamId: string
      type: 'error' | 'thinking' | 'text' | 'done'
      content?: string
      thinking?: string
      error?: string
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      chunk: {
        streamId: string
        type: 'error' | 'thinking' | 'text' | 'done'
        content?: string
        thinking?: string
        error?: string
      }
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

  extractJiraTicket: (context: {
    title: string
    body: string | null
    branchName: string
    comments: Array<{ author: string; body: string }>
  }) => ipcRenderer.invoke('extract-jira-ticket', context),

  analyzeCIFailure: (params: {
    owner: string
    repo: string
    checkRunId: string
    checkName: string
  }) => ipcRenderer.invoke('analyze-ci-failure', params),

  // Streaming CI failure analysis (with real-time thinking)
  streamCIFailureAnalysis: (params: {
    owner: string
    repo: string
    checkRunId: string
    checkName: string
  }) => ipcRenderer.invoke('stream-ci-failure-analysis', params),

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
          summary: string
          failureReason?: string
          suggestedFix?: string
          thinking?: string
        }
      }
    ) => callback(chunk)
    ipcRenderer.on('ci-analysis-stream-chunk', handler)
    return () => {
      ipcRenderer.removeListener('ci-analysis-stream-chunk', handler)
    }
  },

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

  // Generate Daily Speech from user events
  generateDailySpeech: (context: {
    username: string
    date: string
    events: Array<{
      type: string
      description: string
      repoName?: string
      prNumber?: number
      prTitle?: string
      prDescription?: string
      timestamp: string
    }>
  }) => ipcRenderer.invoke('generate-daily-speech', context),

  // PR Chat (AI chat linked to specific PRs)
  getPRChats: () => ipcRenderer.invoke('get-pr-chats'),
  getPRChat: (prId: string) => ipcRenderer.invoke('get-pr-chat', prId),
  createPRChat: (
    prId: string,
    prNumber: number,
    prTitle: string,
    repoFullName: string,
    systemContext?: string
  ) => ipcRenderer.invoke('create-pr-chat', prId, prNumber, prTitle, repoFullName, systemContext),
  addMessageToPRChat: (
    prId: string,
    message: {
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }
  ) => ipcRenderer.invoke('add-message-to-pr-chat', prId, message),
  getPRChatMessages: (prId: string) => ipcRenderer.invoke('get-pr-chat-messages', prId),
  clearPRChatMessages: (prId: string) => ipcRenderer.invoke('clear-pr-chat-messages', prId),
  deletePRChat: (prId: string) => ipcRenderer.invoke('delete-pr-chat', prId),
  getActivePRChatId: () => ipcRenderer.invoke('get-active-pr-chat-id'),
  setActivePRChatId: (prId: string | null) => ipcRenderer.invoke('set-active-pr-chat-id', prId),

  // AI Usage tracking
  getAIUsage: () => ipcRenderer.invoke('get-ai-usage'),
  resetAIUsage: () => ipcRenderer.invoke('reset-ai-usage'),
  getAIPricing: () => ipcRenderer.invoke('get-ai-pricing'),

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
  },
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),

  // Shell operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell-open-external', url)
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)
