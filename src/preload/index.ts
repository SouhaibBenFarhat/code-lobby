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
  clearWebviewData: () => ipcRenderer.invoke('clear-webview-data'),

  // GitHub OAuth (device flow sign-in)
  startGitHubAuth: () => ipcRenderer.invoke('github-auth:start'),
  cancelGitHubAuth: () => ipcRenderer.invoke('github-auth:cancel'),
  onGitHubAuthDone: (callback: (data: { token: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { token: string }) => {
      callback(data)
    }
    ipcRenderer.on('github-auth:done', handler)
    return () => {
      ipcRenderer.removeListener('github-auth:done', handler)
    }
  },
  onGitHubAuthError: (callback: (data: { error: string }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: { error: string }) => {
      callback(data)
    }
    ipcRenderer.on('github-auth:error', handler)
    return () => {
      ipcRenderer.removeListener('github-auth:error', handler)
    }
  },

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
  getCliSubscriptionUsage: () => ipcRenderer.invoke('get-cli-subscription-usage'),

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

  // Opened from the native "About CodeLobby" menu item
  onOpenAbout: (callback: () => void) => {
    const handler = () => {
      callback()
    }
    ipcRenderer.on('menu:open-about', handler)
    return () => {
      ipcRenderer.removeListener('menu:open-about', handler)
    }
  },

  // Opened from the native "Database Viewer" menu item (View menu)
  onOpenDatabaseViewer: (callback: () => void) => {
    const handler = () => {
      callback()
    }
    ipcRenderer.on('menu:open-database-viewer', handler)
    return () => {
      ipcRenderer.removeListener('menu:open-database-viewer', handler)
    }
  },

  // Shell operations
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell-open-external', url)
  },

  // Claude Code CLI
  checkClaudeCodeInstalled: () => ipcRenderer.invoke('check-claude-code-installed'),

  // Claude Code Session Management
  startClaudeSession: (options: {
    sessionId: string
    prompt: string
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
    prContext?: {
      owner: string
      repo: string
      branch: string
      baseBranch?: string
      prNumber?: number
      prTitle?: string
      prDescription?: string
      changedFiles?: number
      labels?: string[]
      comments?: Array<{ author: string; body: string; createdAt: string }>
      reviewSummary?: string
      githubToken: string
    }
    config?: {
      model?: string
      enableExtendedThinking?: boolean
      maxThinkingTokens?: number
    }
  }) => ipcRenderer.invoke('claude:start', options),

  stopClaudeSession: (sessionId: string) => ipcRenderer.invoke('claude:stop', sessionId),

  onClaudeChunk: (
    callback: (data: {
      sessionId: string
      event: {
        type: string
        message?: { content: string }
        tool_name?: string
        input?: Record<string, unknown>
        content?: string
        thinking?: string
        result?: string
        error?: string
        usage?: { input_tokens?: number; output_tokens?: number }
      }
      raw?: string
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        sessionId: string
        event: {
          type: string
          message?: { content: string }
          tool_name?: string
          input?: Record<string, unknown>
          content?: string
          thinking?: string
          result?: string
          error?: string
          usage?: { input_tokens?: number; output_tokens?: number }
        }
        raw?: string
      }
    ) => {
      callback(data)
    }
    ipcRenderer.on('claude:chunk', handler)
    return () => {
      ipcRenderer.removeListener('claude:chunk', handler)
    }
  },

  onClaudeDone: (
    callback: (data: {
      sessionId: string
      success: boolean
      error?: string
      usage?: { inputTokens: number; outputTokens: number }
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        sessionId: string
        success: boolean
        error?: string
        usage?: { inputTokens: number; outputTokens: number }
      }
    ) => {
      callback(data)
    }
    ipcRenderer.on('claude:done', handler)
    return () => {
      ipcRenderer.removeListener('claude:done', handler)
    }
  },

  onClaudeError: (callback: (data: { sessionId: string; error: string }) => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: { sessionId: string; error: string }
    ) => {
      callback(data)
    }
    ipcRenderer.on('claude:error', handler)
    return () => {
      ipcRenderer.removeListener('claude:error', handler)
    }
  },

  // Claude review event - emitted when Claude generates a structured review
  onClaudeReview: (
    callback: (data: {
      sessionId: string
      review: {
        summary: string
        comments: Array<{ file: string; line: number; body: string }>
        verdict: 'approve' | 'request_changes' | 'comment'
      }
    }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        sessionId: string
        review: {
          summary: string
          comments: Array<{ file: string; line: number; body: string }>
          verdict: 'approve' | 'request_changes' | 'comment'
        }
      }
    ) => {
      callback(data)
    }
    ipcRenderer.on('claude:review', handler)
    return () => {
      ipcRenderer.removeListener('claude:review', handler)
    }
  },

  // ==========================================================================
  // SQLite Database (Persistence Module)
  // ==========================================================================

  db: {
    // Conversations
    conversations: {
      list: () => ipcRenderer.invoke('db:conversations:list'),
      get: (id: string) => ipcRenderer.invoke('db:conversations:get', id),
      getWithMessages: (id: string) => ipcRenderer.invoke('db:conversations:getWithMessages', id),
      create: (data: {
        id: string
        sessionType: 'pr' | 'general'
        repoFullName?: string | null
        prNumber?: number | null
        prTitle?: string | null
      }) => ipcRenderer.invoke('db:conversations:create', data),
      getOrCreate: (data: {
        id: string
        sessionType: 'pr' | 'general'
        repoFullName?: string | null
        prNumber?: number | null
        prTitle?: string | null
      }) => ipcRenderer.invoke('db:conversations:getOrCreate', data),
      update: (
        id: string,
        data: {
          sessionType?: 'pr' | 'general'
          repoFullName?: string | null
          prNumber?: number | null
          prTitle?: string | null
        }
      ) => ipcRenderer.invoke('db:conversations:update', id, data),
      delete: (id: string) => ipcRenderer.invoke('db:conversations:delete', id),
      deleteAll: () => ipcRenderer.invoke('db:conversations:deleteAll')
    },

    // Messages
    messages: {
      list: () => ipcRenderer.invoke('db:messages:list'),
      listForConversation: (conversationId: string) =>
        ipcRenderer.invoke('db:messages:listForConversation', conversationId),
      add: (data: {
        id: string
        conversationId: string
        role: 'user' | 'assistant'
        content: string
        thinking?: string | null
        displayLabel?: string | null
      }) => ipcRenderer.invoke('db:messages:add', data),
      addMany: (
        messages: Array<{
          id: string
          conversationId: string
          role: 'user' | 'assistant'
          content: string
          thinking?: string | null
          displayLabel?: string | null
        }>
      ) => ipcRenderer.invoke('db:messages:addMany', messages),
      update: (
        id: string,
        data: {
          role?: 'user' | 'assistant'
          content?: string
          thinking?: string | null
          displayLabel?: string | null
        }
      ) => ipcRenderer.invoke('db:messages:update', id, data),
      delete: (id: string) => ipcRenderer.invoke('db:messages:delete', id),
      clearForConversation: (conversationId: string) =>
        ipcRenderer.invoke('db:messages:clearForConversation', conversationId)
    },

    // Custom Prompts
    customPrompts: {
      list: () => ipcRenderer.invoke('db:customPrompts:list'),
      create: (data: { id: string; label: string; prompt: string }) =>
        ipcRenderer.invoke('db:customPrompts:create', data),
      update: (id: string, data: { label?: string; prompt?: string }) =>
        ipcRenderer.invoke('db:customPrompts:update', id, data),
      delete: (id: string) => ipcRenderer.invoke('db:customPrompts:delete', id)
    },

    // AI Usage
    aiUsage: {
      add: (data: {
        model: string
        inputTokens: number
        outputTokens: number
        inputCostUsd: number
        outputCostUsd: number
      }) => ipcRenderer.invoke('db:aiUsage:add', data),
      listRecent: (limit?: number) => ipcRenderer.invoke('db:aiUsage:listRecent', limit),
      getStats: (sinceTimestamp?: number) =>
        ipcRenderer.invoke('db:aiUsage:getStats', sinceTimestamp),
      clear: () => ipcRenderer.invoke('db:aiUsage:clear')
    },

    // Dynamic table access (for Database Viewer)
    tables: {
      list: () => ipcRenderer.invoke('db:tables:list'),
      query: (tableName: string, limit?: number) =>
        ipcRenderer.invoke('db:tables:query', tableName, limit),
      count: (tableName: string) => ipcRenderer.invoke('db:tables:count', tableName)
    }
  }
}

contextBridge.exposeInMainWorld('electron', electronAPI)
