// Auto-extracted ElectronAPI interface for web TypeScript compilation
export interface ElectronAPI {
  // Token management
  getToken: () => Promise<string | null>
  setToken: (token: string) => Promise<{ success: boolean; user?: unknown; error?: string }>
  clearToken: () => Promise<{ success: boolean }>
  clearAllData: () => Promise<{ success: boolean }>
  factoryReset: () => Promise<{ success: boolean }>
  clearWebviewData: () => Promise<{ success: boolean; error?: string }>

  // GitHub OAuth (device flow sign-in)
  startGitHubAuth: () => Promise<{
    success: boolean
    userCode?: string
    verificationUri?: string
    verificationUriComplete?: string
    expiresIn?: number
    error?: string
  }>
  cancelGitHubAuth: () => Promise<{ success: boolean }>
  onGitHubAuthDone: (callback: (data: { token: string }) => void) => () => void
  onGitHubAuthError: (callback: (data: { error: string }) => void) => () => void

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

  // Generate Daily Speech from user events (streaming with Claude Code)
  generateDailySpeechStreaming: (options: {
    sessionId: string
    username: string
    date: string
    events: Array<{
      type: string
      description: string
      repoName?: string
      prNumber?: number
      prTitle?: string
      prDescription?: string
      branchName?: string
      prUrl?: string
      commentCount?: number
      reviewState?: string
      timestamp: string
    }>
    githubToken: string
  }) => Promise<{ success: boolean; sessionId?: string; error?: string }>

  stopDailySpeech: (sessionId: string) => Promise<boolean>

  onDailySpeechChunk: (
    callback: (data: {
      sessionId: string
      event: {
        type: 'text' | 'thinking' | 'tool_use' | 'result'
        content?: string
        thinking?: string
        tool_name?: string
        input?: Record<string, unknown>
        result?: string
        cost_usd?: number
        duration_ms?: number
      }
    }) => void
  ) => () => void

  onDailySpeechDone: (
    callback: (data: {
      sessionId: string
      success: boolean
      content?: string
      thinking?: string | null
      metadata?: {
        eventCount: number
        analyzedRepos: string[]
        analyzedPRs: string[]
        toolsUsed: string[]
        generationDurationMs: number
      }
    }) => void
  ) => () => void

  onDailySpeechError: (callback: (data: { sessionId: string; error: string }) => void) => () => void

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
  getCliSubscriptionUsage: () => Promise<{
    today: { messages: number; sessions: number; toolCalls: number }
    modelUsage: Record<
      string,
      {
        inputTokens: number
        outputTokens: number
        cacheReadInputTokens: number
        cacheCreationInputTokens: number
      }
    >
    totalSessions: number
    totalMessages: number
    fetchedAt: string
  } | null>
  getAIPricing: () => Promise<
    Array<{
      modelPrefix: string
      inputPerMillion: number
      outputPerMillion: number
      displayName: string
    }>
  >

  // Memory usage
  getMemoryUsage: () => Promise<{
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
    arrayBuffers: number
  }>

  // Window state
  isFullscreen: () => Promise<boolean>
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void
  toggleFullscreen: () => Promise<boolean>

  // Native menu: opened from the "About CodeLobby" menu item
  onOpenAbout: (callback: () => void) => () => void

  // Native menu: opened from the "Database Viewer" menu item (View menu)
  onOpenDatabaseViewer: (callback: () => void) => () => void

  // Shell operations
  shell: {
    openExternal: (url: string) => Promise<void>
  }

  // Claude Code CLI
  checkClaudeCodeInstalled: () => Promise<{
    installed: boolean
    version: string | null
    path?: string
  }>

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
  }) => Promise<void>

  stopClaudeSession: (sessionId: string) => Promise<boolean>

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
  ) => () => void

  onClaudeDone: (
    callback: (data: {
      sessionId: string
      success: boolean
      error?: string
      usage?: { inputTokens: number; outputTokens: number }
    }) => void
  ) => () => void

  onClaudeError: (callback: (data: { sessionId: string; error: string }) => void) => () => void

  // Reviewer Suggestion (agentic git-blame analysis)
  startReviewerSuggestion: (request: {
    repoFullName: string
    prNumber: number
    branch: string
    baseBranch: string
    changedFiles: string[]
    prAuthor: string
    githubToken: string
  }) => Promise<{ success: boolean; error?: string }>

  onReviewerSuggestDone: (
    callback: (data: {
      reviewers: Array<{
        login: string | null
        name: string
        email: string
        linesOwned: number
        filesOwned: number
        recencyScore: number
        totalScore: number
      }>
      analyzedFiles: number
      timestamp: string
    }) => void
  ) => () => void

  onReviewerSuggestError: (callback: (data: { error: string }) => void) => () => void

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
  ) => () => void

  // ==========================================================================
  // SQLite Database (Persistence Module)
  // ==========================================================================

  db: {
    // Conversations
    conversations: {
      list: () => Promise<{
        success: boolean
        data?: Array<{
          id: string
          sessionType: 'pr' | 'general'
          repoFullName: string | null
          prNumber: number | null
          prTitle: string | null
          createdAt: number
          updatedAt: number
        }>
        error?: string
      }>
      get: (id: string) => Promise<{
        success: boolean
        data?: {
          id: string
          sessionType: 'pr' | 'general'
          repoFullName: string | null
          prNumber: number | null
          prTitle: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      getWithMessages: (id: string) => Promise<{
        success: boolean
        data?: {
          conversation: {
            id: string
            sessionType: 'pr' | 'general'
            repoFullName: string | null
            prNumber: number | null
            prTitle: string | null
            createdAt: number
            updatedAt: number
          }
          messages: Array<{
            id: string
            conversationId: string
            role: 'user' | 'assistant'
            content: string
            thinking: string | null
            displayLabel: string | null
            metadata: unknown
            createdAt: number
          }>
        }
        error?: string
      }>
      create: (data: {
        id: string
        sessionType: 'pr' | 'general'
        repoFullName?: string | null
        prNumber?: number | null
        prTitle?: string | null
      }) => Promise<{
        success: boolean
        data?: {
          id: string
          sessionType: 'pr' | 'general'
          repoFullName: string | null
          prNumber: number | null
          prTitle: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      getOrCreate: (data: {
        id: string
        sessionType: 'pr' | 'general'
        repoFullName?: string | null
        prNumber?: number | null
        prTitle?: string | null
      }) => Promise<{
        success: boolean
        data?: {
          id: string
          sessionType: 'pr' | 'general'
          repoFullName: string | null
          prNumber: number | null
          prTitle: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      update: (
        id: string,
        data: {
          sessionType?: 'pr' | 'general'
          repoFullName?: string | null
          prNumber?: number | null
          prTitle?: string | null
        }
      ) => Promise<{
        success: boolean
        data?: {
          id: string
          sessionType: 'pr' | 'general'
          repoFullName: string | null
          prNumber: number | null
          prTitle: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      delete: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
      deleteAll: () => Promise<{ success: boolean; data?: number; error?: string }>
    }

    // Messages
    messages: {
      list: () => Promise<{
        success: boolean
        data?: Array<{
          id: string
          conversationId: string
          role: 'user' | 'assistant'
          content: string
          thinking: string | null
          displayLabel: string | null
          metadata: unknown
          createdAt: number
        }>
        error?: string
      }>
      listForConversation: (conversationId: string) => Promise<{
        success: boolean
        data?: Array<{
          id: string
          conversationId: string
          role: 'user' | 'assistant'
          content: string
          thinking: string | null
          displayLabel: string | null
          metadata: unknown
          createdAt: number
        }>
        error?: string
      }>
      add: (data: {
        id: string
        conversationId: string
        role: 'user' | 'assistant'
        content: string
        thinking?: string | null
        displayLabel?: string | null
        metadata?: unknown
      }) => Promise<{
        success: boolean
        data?: {
          id: string
          conversationId: string
          role: 'user' | 'assistant'
          content: string
          thinking: string | null
          displayLabel: string | null
          metadata: unknown
          createdAt: number
        }
        error?: string
      }>
      addMany: (
        messages: Array<{
          id: string
          conversationId: string
          role: 'user' | 'assistant'
          content: string
          thinking?: string | null
          displayLabel?: string | null
          metadata?: unknown
        }>
      ) => Promise<{ success: boolean; error?: string }>
      update: (
        id: string,
        data: {
          role?: 'user' | 'assistant'
          content?: string
          thinking?: string | null
          displayLabel?: string | null
          metadata?: unknown
        }
      ) => Promise<{
        success: boolean
        data?: {
          id: string
          conversationId: string
          role: 'user' | 'assistant'
          content: string
          thinking: string | null
          displayLabel: string | null
          metadata: unknown
          createdAt: number
        }
        error?: string
      }>
      delete: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
      clearForConversation: (conversationId: string) => Promise<{
        success: boolean
        data?: number
        error?: string
      }>
    }

    // Custom Prompts
    customPrompts: {
      list: () => Promise<{
        success: boolean
        data?: Array<{
          id: string
          label: string
          prompt: string
          createdAt: number
        }>
        error?: string
      }>
      create: (data: { id: string; label: string; prompt: string }) => Promise<{
        success: boolean
        data?: {
          id: string
          label: string
          prompt: string
          createdAt: number
        }
        error?: string
      }>
      update: (
        id: string,
        data: { label?: string; prompt?: string }
      ) => Promise<{
        success: boolean
        data?: {
          id: string
          label: string
          prompt: string
          createdAt: number
        }
        error?: string
      }>
      delete: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    }

    // AI Usage
    aiUsage: {
      add: (data: {
        model: string
        inputTokens: number
        outputTokens: number
        inputCostUsd: number
        outputCostUsd: number
      }) => Promise<{
        success: boolean
        data?: {
          id: number
          model: string
          inputTokens: number
          outputTokens: number
          inputCostUsd: number
          outputCostUsd: number
          createdAt: number
        }
        error?: string
      }>
      listRecent: (limit?: number) => Promise<{
        success: boolean
        data?: Array<{
          id: number
          model: string
          inputTokens: number
          outputTokens: number
          inputCostUsd: number
          outputCostUsd: number
          createdAt: number
        }>
        error?: string
      }>
      getStats: (sinceTimestamp?: number) => Promise<{
        success: boolean
        data?: {
          totalInputTokens: number
          totalOutputTokens: number
          totalInputCostUsd: number
          totalOutputCostUsd: number
          totalCostUsd: number
          recordCount: number
        }
        error?: string
      }>
      clear: () => Promise<{ success: boolean; data?: number; error?: string }>
    }

    // Daily Reports
    dailyReports: {
      list: () => Promise<{
        success: boolean
        data?: Array<{
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }>
        error?: string
      }>
      get: (id: string) => Promise<{
        success: boolean
        data?: {
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      getByDate: (date: string) => Promise<{
        success: boolean
        data?: {
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      create: (data: {
        id: string
        date: string
        content: string
        summary?: string | null
        eventCount: number
        analyzedRepos?: string | null
        analyzedPRs?: string | null
        generationDurationMs?: number | null
        toolsUsed?: string | null
        thinking?: string | null
      }) => Promise<{
        success: boolean
        data?: {
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      upsert: (data: {
        id: string
        date: string
        content: string
        summary?: string | null
        eventCount: number
        analyzedRepos?: string | null
        analyzedPRs?: string | null
        generationDurationMs?: number | null
        toolsUsed?: string | null
        thinking?: string | null
      }) => Promise<{
        success: boolean
        data?: {
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      update: (
        id: string,
        data: {
          content?: string
          summary?: string | null
          analyzedRepos?: string | null
          analyzedPRs?: string | null
          generationDurationMs?: number | null
          toolsUsed?: string | null
          thinking?: string | null
        }
      ) => Promise<{
        success: boolean
        data?: {
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }
        error?: string
      }>
      delete: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
      listRecent: (limit?: number) => Promise<{
        success: boolean
        data?: Array<{
          id: string
          date: string
          content: string
          summary: string | null
          eventCount: number
          analyzedRepos: string | null
          analyzedPRs: string | null
          generationDurationMs: number | null
          toolsUsed: string | null
          thinking: string | null
          createdAt: number
          updatedAt: number
        }>
        error?: string
      }>
    }

    // Dynamic table access (for Database Viewer)
    tables: {
      list: () => Promise<{ success: boolean; data?: string[]; error?: string }>
      query: (
        tableName: string,
        limit?: number
      ) => Promise<{ success: boolean; data?: Record<string, unknown>[]; error?: string }>
      count: (tableName: string) => Promise<{ success: boolean; data?: number; error?: string }>
    }
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
  }
}
