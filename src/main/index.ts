import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'

// Set app name immediately at module load (before app.whenReady)
// This is required for macOS dock tooltip to show correct name
if (process.platform === 'darwin') {
  app.setName('CodeLobby')
}

import { LogCategory, mainLogger as logger } from '@codelobby/logger/main'
import { getAllModelPricing } from './ai-pricing'
import {
  analyzeCIFailure,
  analyzeCIFailureStreaming,
  analyzePRStatus,
  analyzePRStatusStreaming,
  ClaudeMessage,
  extractJiraTicket,
  extractPreviewUrl,
  fetchModels as fetchClaudeModels,
  getDefaultModel,
  sendMessage as sendClaudeMessage,
  sendMessageStreaming as sendClaudeMessageStreaming,
  sendMessageStreamingWithTools as sendClaudeMessageStreamingWithTools
} from './claude-api'
import {
  fetchAllPRsForRepos,
  fetchAllRepositories,
  fetchCheckRunDetails,
  fetchCheckRunLogs,
  fetchRateLimitOnly,
  type MergeMethod,
  mergePullRequest,
  type ReviewEvent,
  setGraphQLRateLimitNotifier,
  submitPullRequestReview,
  validateToken
} from './github-graphql'
import {
  type NetworkRequestEvent as HttpNetworkRequestEvent,
  onNetworkRequest as onHttpNetworkRequest,
  onRateLimitUpdate,
  type RateLimitUpdate
} from './http-client'
import { GENERAL_CHAT_SYSTEM_PROMPT } from './prompts'
import {
  AIPanelSettings,
  addChatMessage,
  addCustomQuickPrompt,
  addMessageToPRChat,
  CACHE_TTL_ALL_REPOS,
  CACHE_TTL_PR_DATA,
  ChatMessage,
  clearAllUserData,
  clearChatHistory,
  clearDataCache,
  clearQueryCache,
  clearToken,
  deleteCustomQuickPrompt,
  deletePRAnalysis,
  factoryReset,
  getActivePRChatId,
  getAIPanel,
  getAIUsage,
  getAllReposCache,
  getCardLayouts,
  getChatHistory,
  getClaudeApiKey,
  getCustomQuickPrompts,
  getEnableThinking,
  getEnableWebFetch,
  getIDEViewSettings,
  getMinimizedRepos,
  getMyPRsRepos,
  getPRAnalysis,
  getPRAnalysisPanelOpen,
  getPRChat,
  getPRChatMessages,
  getPRDataCache,
  getPRDetailPanel,
  // TanStack Query cache persistence
  getQueryCache,
  getRepoColors,
  getRepoOrder,
  getSelectedModel,
  getSelectedRepos,
  getSettings,
  getToken,
  getUser,
  getViewMode,
  IDEViewSettings,
  isCacheValid,
  LayoutItem,
  PanelSettings,
  resetAIUsage,
  setAIPanel,
  setAllReposCache,
  setCardLayouts,
  setClaudeApiKey,
  setEnableThinking,
  setEnableWebFetch,
  setIDEViewSettings,
  setMyPRsRepos,
  setPRAnalysis,
  setPRAnalysisPanelOpen,
  setPRDataCache,
  setPRDetailPanel,
  setQueryCache,
  setRepoColor,
  setRepoMinimized,
  setRepoOrder,
  setSelectedModel,
  setSelectedRepos,
  setSettings,
  setToken,
  setUser,
  setViewMode,
  ViewMode
} from './store'
import { executeWebFetch, FETCH_URL_TOOL } from './web-fetch'

// ═══════════════════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════
//
// The RENDERER's Store is the single source of truth for app state.
// Main process is just an I/O layer:
//   - Fetches from GitHub API
//   - Reads/writes to disk (config.json) for persistence
//   - Returns data to renderer → Store caches it in memory
//
// NO in-memory caching in main process - avoids sync issues.
// ═══════════════════════════════════════════════════════════════════════════

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Set dock icon on macOS (only in dev - production uses icon.icns from bundle)
  if (process.platform === 'darwin' && !app.isPackaged) {
    try {
      const iconPath = join(__dirname, '../../build/icon.png')
      app.dock.setIcon(iconPath)
    } catch {
      // Icon not found in dev, ignore
    }
  }

  // Icon path - only set in dev mode (production uses bundle icon)
  const iconPath = app.isPackaged ? undefined : join(__dirname, '../../build/icon.png')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    fullscreen: true, // Open in fullscreen mode by default
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 18 }, // Position traffic lights vertically centered in header
    backgroundColor: '#0d1117',
    ...(iconPath && { icon: iconPath }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Shared function to send rate limit updates to renderer
  const sendRateLimitUpdate = (rateLimit: RateLimitUpdate) => {
    logger.debug(LogCategory.RATE_LIMIT, 'Rate limit update received', {
      resource: rateLimit.resource,
      used: rateLimit.used,
      remaining: rateLimit.remaining
    })
    // Only send graphql rate limit updates (that's what the app uses)
    if (rateLimit.resource === 'graphql') {
      logger.debug(LogCategory.RATE_LIMIT, 'Sending rate limit to renderer', {
        used: rateLimit.used,
        remaining: rateLimit.remaining
      })
      mainWindow?.webContents.send('rate-limit-update', {
        limit: rateLimit.limit,
        remaining: rateLimit.remaining,
        used: rateLimit.used,
        resetAt: rateLimit.resetAt,
        percentage: rateLimit.percentage
      })
    }
  }

  // Set up rate limit callback for REST API calls (via http-client)
  onRateLimitUpdate(sendRateLimitUpdate)

  // Set up rate limit callback for GraphQL API calls (via @octokit/graphql)
  setGraphQLRateLimitNotifier(sendRateLimitUpdate)
  logger.info(LogCategory.RATE_LIMIT, 'Rate limit notifiers configured')

  // Set up network request tracking (for Network Panel)
  // ALL API calls (GraphQL + REST) go through httpFetch() in http-client.ts
  onHttpNetworkRequest((event: HttpNetworkRequestEvent) => {
    mainWindow?.webContents.send('network-request', event)
  })

  logger.info(LogCategory.API, 'Network request notifier configured (all calls via httpFetch)')

  // Notify renderer of fullscreen changes
  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-change', true)
  })

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('fullscreen-change', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
function setupIPCHandlers(): void {
  logger.info(LogCategory.APP, 'Setting up IPC handlers')

  // Window state
  ipcMain.handle('is-fullscreen', () => {
    return mainWindow?.isFullScreen() ?? false
  })

  // Token management
  ipcMain.handle('get-token', async () => {
    return getToken()
  })

  ipcMain.handle('set-token', async (_, token: string) => {
    logger.info(LogCategory.AUTH, 'Attempting to set token')
    try {
      const user = await validateToken(token)
      if (user) {
        setToken(token)
        setUser(user) // Cache user info to avoid re-validation
        logger.info(LogCategory.AUTH, 'Token validated successfully', { user: user.login })
        return { success: true, user }
      }
      logger.warn(LogCategory.AUTH, 'Token validation failed - invalid token')
      return { success: false, error: 'Invalid token. Please check your token and try again.' }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string }
      if (err.status === 403) {
        logger.error(LogCategory.AUTH, 'Rate limit exceeded during token validation', {
          status: 403
        })
        return {
          success: false,
          error: 'GitHub API rate limit exceeded. Please wait a few minutes and try again.'
        }
      }
      logger.error(LogCategory.AUTH, 'Token validation error', { error: err.message })
      return { success: false, error: err.message || 'Failed to validate token' }
    }
  })

  ipcMain.handle('clear-token', async () => {
    logger.info(LogCategory.AUTH, 'Clearing token and all user data (logout)')
    clearToken()
    // Clear persistent cache and user data
    clearAllUserData()
    return { success: true }
  })

  // Clear all cached data and refresh (without logging out)
  ipcMain.handle('clear-all-data', async () => {
    logger.info(LogCategory.APP, 'Clearing all cached data for fresh reload')
    // Clear persistent data cache only (not user preferences)
    clearDataCache()
    return { success: true }
  })

  // Factory reset - completely wipes ALL data (like a fresh install)
  ipcMain.handle('factory-reset', async () => {
    logger.info(LogCategory.APP, 'Factory reset initiated - wiping ALL data')
    // Wipe everything from electron-store
    factoryReset()
    logger.info(LogCategory.APP, 'Factory reset complete - app is now in fresh install state')
    return { success: true }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERY CACHE PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════
  // These handlers allow TanStack Query to persist/restore its cache from disk.
  // This is the STANDARDIZED approach for React Query caching.

  ipcMain.handle('get-query-cache', async () => {
    return getQueryCache()
  })

  ipcMain.handle('set-query-cache', async (_, cache: string) => {
    setQueryCache(cache)
    return { success: true }
  })

  ipcMain.handle('clear-query-cache', async () => {
    clearQueryCache()
    return { success: true }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM QUICK PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════
  // User-created pre-prompts for the AI chat

  ipcMain.handle('get-custom-prompts', async () => {
    return getCustomQuickPrompts()
  })

  ipcMain.handle('add-custom-prompt', async (_, label: string, prompt: string) => {
    try {
      const newPrompt = addCustomQuickPrompt(label, prompt)
      logger.info(LogCategory.APP, 'Added custom prompt', { id: newPrompt.id, label })
      return { success: true, prompt: newPrompt }
    } catch (error) {
      logger.error(LogCategory.APP, 'Failed to add custom prompt', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('delete-custom-prompt', async (_, id: string) => {
    try {
      const deleted = deleteCustomQuickPrompt(id)
      if (deleted) {
        logger.info(LogCategory.APP, 'Deleted custom prompt', { id })
      }
      return { success: deleted }
    } catch (error) {
      logger.error(LogCategory.APP, 'Failed to delete custom prompt', { error })
      return { success: false, error: String(error) }
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // AI USAGE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('get-ai-usage', async () => {
    return getAIUsage()
  })

  ipcMain.handle('reset-ai-usage', async () => {
    try {
      resetAIUsage()
      logger.info(LogCategory.APP, 'Reset AI usage tracking')
      return { success: true }
    } catch (error) {
      logger.error(LogCategory.APP, 'Failed to reset AI usage', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('get-ai-pricing', async () => {
    return getAllModelPricing()
  })

  ipcMain.handle('validate-token', async () => {
    const token = getToken()
    if (!token) {
      logger.debug(LogCategory.AUTH, 'No token found')
      return { valid: false }
    }

    // First check if we have cached user info (no API call needed)
    const cachedUser = getUser()
    if (cachedUser) {
      logger.debug(LogCategory.AUTH, 'Using cached user info', { user: cachedUser.login })
      return { valid: true, user: cachedUser }
    }

    // If no cached user, validate token (makes API call)
    try {
      logger.info(LogCategory.AUTH, 'Validating token via API')
      const user = await validateToken(token)
      if (user) {
        setUser(user) // Cache for future
        logger.info(LogCategory.AUTH, 'Token validated via API', { user: user.login })
        return { valid: true, user }
      }
      logger.warn(LogCategory.AUTH, 'Token validation returned no user')
      return { valid: false }
    } catch (error) {
      logger.error(LogCategory.AUTH, 'Token validation failed', { error: (error as Error).message })
      return { valid: false, error: 'Could not validate token' }
    }
  })

  // GitHub API - Lazy loading approach
  // Repos fetched independently, PRs fetched only when repos are selected
  //
  // SINGLE SOURCE OF TRUTH: Main process just does I/O.
  // TanStack Query in renderer handles caching.

  // DEPRECATED: Old handler that fetched ALL PRs at once
  // Use fetch-all-prs-for-repos instead for lazy loading
  ipcMain.handle('fetch-prs', async () => {
    logger.warn(LogCategory.API, 'fetch-prs is deprecated - use fetch-all-prs-for-repos instead')
    return { success: true, data: [], deprecated: true }
  })

  // Fetch PRs for specific repos only (lazy loading)
  ipcMain.handle('fetch-all-prs-for-repos', async (_, repoFullNames: string[]) => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      const sortedRepos = [...repoFullNames].sort()
      const reposKey = sortedRepos.join(',')

      // Check persistent cache (30 min TTL)
      // Store in renderer will cache in memory - no need for session cache here
      const persistentCache = getPRDataCache()
      if (
        persistentCache &&
        isCacheValid(persistentCache.lastFetch, CACHE_TTL_PR_DATA) &&
        [...persistentCache.selectedRepos].sort().join(',') === reposKey
      ) {
        const cacheAge = Math.round((Date.now() - persistentCache.lastFetch) / 1000 / 60)
        const expiresIn = Math.round(
          (CACHE_TTL_PR_DATA - (Date.now() - persistentCache.lastFetch)) / 1000 / 60
        )
        logger.info(LogCategory.CACHE, '✅ Using persistent cache (30 min TTL)', {
          ageMinutes: cacheAge,
          expiresInMinutes: expiresIn,
          prs: persistentCache.data.pullRequests?.length || 0,
          repos: repoFullNames.length
        })

        return {
          success: true,
          data: persistentCache.data.pullRequests || [],
          currentUser: persistentCache.data.currentUser,
          rateLimit: persistentCache.data.rateLimit || {
            limit: 5000,
            remaining: 5000,
            used: 0,
            resetAt: '',
            percentage: 0
          },
          fromCache: true
        }
      }

      // Cache miss - fetch fresh data from GitHub API
      logger.info(LogCategory.API, '🔄 Cache miss - fetching from GitHub API', {
        repos: repoFullNames
      })
      const data = await fetchAllPRsForRepos(token, repoFullNames)
      logger.info(LogCategory.API, 'PR data fetched successfully', {
        count: data.pullRequests.length,
        rateLimit: `${data.rateLimit.remaining}/${data.rateLimit.limit}`
      })

      // Save to persistent cache (for app restart)
      setPRDataCache(
        {
          pullRequests: data.pullRequests,
          currentUser: data.currentUser,
          rateLimit: data.rateLimit
        },
        sortedRepos
      )

      return {
        success: true,
        data: data.pullRequests,
        currentUser: data.currentUser,
        rateLimit: data.rateLimit
      }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch all PRs for repos', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // Refresh PRs for a single repository (bypasses cache)
  ipcMain.handle('refresh-repo-prs', async (_, repoFullName: string) => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }

    try {
      logger.info(LogCategory.API, '🔄 Refreshing PRs for single repo', { repo: repoFullName })

      // Fetch fresh data for this specific repo (always bypass cache)
      const data = await fetchAllPRsForRepos(token, [repoFullName])

      logger.info(LogCategory.API, 'Single repo PRs refreshed', {
        repo: repoFullName,
        count: data.pullRequests.length,
        rateLimit: `${data.rateLimit.remaining}/${data.rateLimit.limit}`
      })

      return {
        success: true,
        data: data.pullRequests,
        currentUser: data.currentUser,
        rateLimit: data.rateLimit
      }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to refresh repo PRs', {
        repo: repoFullName,
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // Refresh a SINGLE PR by number (much more efficient than refreshing all PRs)
  // Cost: ~1 point vs 5-10 points for bulk refresh
  ipcMain.handle('refresh-single-pr', async (_, repoFullName: string, prNumber: number) => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }

    try {
      const [owner, repo] = repoFullName.split('/')
      if (!owner || !repo) {
        return { success: false, error: 'Invalid repository name' }
      }

      logger.info(LogCategory.API, '🔄 Refreshing single PR', {
        repo: repoFullName,
        prNumber
      })

      const { fetchSinglePR } = await import('./github-graphql')
      const { pullRequest, rateLimit } = await fetchSinglePR(token, owner, repo, prNumber)

      if (!pullRequest) {
        return { success: false, error: `PR #${prNumber} not found` }
      }

      logger.info(LogCategory.API, 'Single PR refreshed', {
        repo: repoFullName,
        prNumber,
        title: pullRequest.title,
        cost: rateLimit.cost,
        remaining: rateLimit.remaining
      })

      return {
        success: true,
        data: pullRequest,
        rateLimit
      }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to refresh single PR', {
        repo: repoFullName,
        prNumber,
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // PR events - extracted from PR data when PRs are fetched for selected repos
  // Events are embedded in PR data from fetchAllPRsForRepos, no separate fetch needed
  ipcMain.handle('fetch-pr-events', async () => {
    // Events are now extracted client-side from PR data
    // This handler returns empty - UI should use PR data directly
    logger.debug(LogCategory.API, 'fetch-pr-events called - events are embedded in PR data')
    return { success: true, data: [] }
  })

  // PR checks - already included in PR data from fetchAllPRsForRepos
  ipcMain.handle('fetch-pr-checks', async (_, _owner: string, _repo: string, _ref: string) => {
    // Checks are embedded in PR data from lazy loading
    // This handler returns stub - UI should use PR.checks from fetched PRs
    logger.debug(LogCategory.API, 'fetch-pr-checks called - checks are embedded in PR data')
    return {
      success: true,
      data: { state: 'pending', total_count: 0, check_runs: [] }
    }
  })

  ipcMain.handle('fetch-contributed-repos', async () => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      // Check persistent cache (30 min TTL)
      // Store in renderer will cache in memory - no need for session cache here
      const persistentCache = getAllReposCache()
      if (persistentCache && isCacheValid(persistentCache.lastFetch, CACHE_TTL_ALL_REPOS)) {
        const cacheAge = Math.round((Date.now() - persistentCache.lastFetch) / 1000 / 60)
        const expiresIn = Math.round(
          (CACHE_TTL_ALL_REPOS - (Date.now() - persistentCache.lastFetch)) / 1000 / 60
        )
        logger.info(LogCategory.CACHE, '✅ Using persistent repos cache (30 min TTL)', {
          ageMinutes: cacheAge,
          expiresInMinutes: expiresIn,
          count: persistentCache.data?.length || 0
        })
        return { success: true, data: persistentCache.data || [], fromCache: true }
      }

      // Cache miss - fetch from GitHub API
      logger.info(LogCategory.GRAPHQL, '🔄 Cache miss - fetching all repositories')
      const allRepos = await fetchAllRepositories(token)
      logger.info(LogCategory.GRAPHQL, 'Repositories fetched', { count: allRepos.length })

      // Save to persistent cache (for app restart)
      setAllReposCache(allRepos)

      return { success: true, data: allRepos, fromCache: false }
    } catch (error) {
      logger.error(LogCategory.GRAPHQL, 'Failed to fetch repositories', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // Fetch PR changed files
  ipcMain.handle('fetch-pr-files', async (_, owner: string, repo: string, prNumber: number) => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      const { fetchPRFiles } = await import('./github-graphql')
      const { files, rateLimit } = await fetchPRFiles(token, owner, repo, prNumber)
      return { success: true, data: files, rateLimit }
    } catch (error) {
      logger.error(LogCategory.GRAPHQL, 'Failed to fetch PR files', {
        owner,
        repo,
        prNumber,
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // Post PR review comment
  ipcMain.handle(
    'post-pr-comment',
    async (
      _,
      owner: string,
      repo: string,
      prNumber: number,
      commitId: string,
      path: string,
      line: number,
      body: string
    ) => {
      const token = getToken()
      if (!token) return { success: false, error: 'No token' }
      try {
        const { postPRReviewComment } = await import('./github-graphql')
        const result = await postPRReviewComment(
          token,
          owner,
          repo,
          prNumber,
          commitId,
          path,
          line,
          body
        )
        return result
      } catch (error) {
        logger.error(LogCategory.GRAPHQL, 'Failed to post PR comment', {
          owner,
          repo,
          prNumber,
          path,
          line,
          error: (error as Error).message
        })
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Merge PR
  ipcMain.handle(
    'merge-pr',
    async (
      _,
      prNodeId: string,
      mergeMethod?: MergeMethod,
      commitHeadline?: string,
      commitBody?: string
    ) => {
      const token = getToken()
      if (!token) return { success: false, error: 'No GitHub token configured' }

      try {
        const result = await mergePullRequest(
          token,
          prNodeId,
          mergeMethod || 'SQUASH',
          commitHeadline,
          commitBody
        )
        return result
      } catch (error) {
        logger.error(LogCategory.GRAPHQL, 'Failed to merge PR', {
          prNodeId,
          mergeMethod,
          error: (error as Error).message
        })
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Submit PR Review (approve, request changes, or comment)
  ipcMain.handle(
    'submit-pr-review',
    async (_, prNodeId: string, event: ReviewEvent, body?: string) => {
      const token = getToken()
      if (!token) return { success: false, error: 'No GitHub token configured' }

      try {
        const result = await submitPullRequestReview(token, prNodeId, event, body)
        return result
      } catch (error) {
        logger.error(LogCategory.GRAPHQL, 'Failed to submit PR review', {
          prNodeId,
          event,
          error: (error as Error).message
        })
        return { success: false, error: (error as Error).message }
      }
    }
  )

  // Settings
  ipcMain.handle('get-settings', async () => {
    return getSettings()
  })

  ipcMain.handle('set-settings', async (_, settings: Record<string, unknown>) => {
    setSettings(settings)
    return { success: true }
  })

  // Notifications
  ipcMain.handle('show-notification', async (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
    return { success: true }
  })

  // Repo order
  ipcMain.handle('get-repo-order', async () => {
    return getRepoOrder()
  })

  ipcMain.handle('set-repo-order', async (_, order: string[]) => {
    setRepoOrder(order)
    return { success: true }
  })

  // Rate limit info - uses dedicated endpoint that doesn't count against rate limit
  ipcMain.handle('get-rate-limit', async () => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      // Use the dedicated rate limit endpoint (doesn't count against limit!)
      const rateLimit = await fetchRateLimitOnly(token)
      logger.debug(LogCategory.RATE_LIMIT, 'Rate limit status', {
        used: rateLimit.used,
        remaining: rateLimit.remaining,
        limit: rateLimit.limit,
        percentage: rateLimit.percentage,
        resetAt: rateLimit.resetAt
      })
      return { success: true, data: rateLimit }
    } catch (error) {
      logger.error(LogCategory.RATE_LIMIT, 'Failed to get rate limit', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // Card layouts (free-form positioning and sizing)
  ipcMain.handle('get-card-layouts', async () => {
    return getCardLayouts()
  })

  ipcMain.handle('set-card-layouts', async (_, layouts: LayoutItem[]) => {
    setCardLayouts(layouts)
    return { success: true }
  })

  // Selected repos (which repos to display)
  ipcMain.handle('get-selected-repos', async () => {
    return getSelectedRepos()
  })

  ipcMain.handle('set-selected-repos', async (_, repos: string[]) => {
    setSelectedRepos(repos)
    return { success: true }
  })

  // My PRs filter (shared across all views)
  ipcMain.handle('get-my-prs-repos', async () => {
    return getMyPRsRepos()
  })

  ipcMain.handle('set-my-prs-repos', async (_, repos: string[]) => {
    setMyPRsRepos(repos)
    return { success: true }
  })

  // PR Detail panel settings
  ipcMain.handle('get-pr-detail-panel', async () => {
    return getPRDetailPanel()
  })

  ipcMain.handle('set-pr-detail-panel', async (_, settings: Partial<PanelSettings>) => {
    setPRDetailPanel(settings)
    return { success: true }
  })

  // AI Panel settings
  ipcMain.handle('get-ai-panel', async () => {
    return getAIPanel()
  })

  ipcMain.handle('set-ai-panel', async (_, settings: Partial<AIPanelSettings>) => {
    setAIPanel(settings)
    return { success: true }
  })

  // Repo colors
  ipcMain.handle('get-repo-colors', async () => {
    return getRepoColors()
  })

  ipcMain.handle('set-repo-color', async (_, repoFullName: string, color: string | null) => {
    setRepoColor(repoFullName, color)
    return { success: true }
  })

  // Minimized repos
  ipcMain.handle('get-minimized-repos', async () => {
    return getMinimizedRepos()
  })

  ipcMain.handle('set-repo-minimized', async (_, repoFullName: string, isMinimized: boolean) => {
    setRepoMinimized(repoFullName, isMinimized)
    return { success: true }
  })

  // View mode
  ipcMain.handle('get-view-mode', async () => {
    return getViewMode()
  })

  ipcMain.handle('set-view-mode', async (_, mode: ViewMode) => {
    setViewMode(mode)
    return { success: true }
  })

  // IDE view settings
  ipcMain.handle('get-ide-view-settings', async () => {
    return getIDEViewSettings()
  })

  ipcMain.handle('set-ide-view-settings', async (_, settings: Partial<IDEViewSettings>) => {
    setIDEViewSettings(settings)
    return { success: true }
  })

  // AI Chat
  ipcMain.handle('get-claude-api-key', async () => {
    logger.debug(LogCategory.AUTH, 'Getting Claude API key')
    const key = getClaudeApiKey()
    logger.info(LogCategory.AUTH, 'Claude API key retrieved', { hasKey: !!key })
    return key
  })

  ipcMain.handle('set-claude-api-key', async (_, key: string | null) => {
    logger.info(LogCategory.AUTH, 'Setting Claude API key', {
      action: key ? 'set' : 'clear',
      keyLength: key?.length || 0,
      keyPrefix: key ? `${key.substring(0, 10)}...` : null
    })

    if (key) {
      // Simple format validation - actual validation happens on first message
      if (!key.startsWith('sk-ant-')) {
        logger.warn(LogCategory.AUTH, 'Invalid Claude API key format', {
          keyPrefix: key.substring(0, 10),
          expectedPrefix: 'sk-ant-'
        })
        return { success: false, error: 'Invalid API key format. Key should start with sk-ant-' }
      }

      try {
        setClaudeApiKey(key)
        logger.info(LogCategory.AUTH, 'Claude API key saved successfully', {
          keyLength: key.length
        })
        return { success: true }
      } catch (error) {
        logger.error(LogCategory.AUTH, 'Failed to save Claude API key', {
          error: error instanceof Error ? error.message : String(error)
        })
        return { success: false, error: 'Failed to save API key' }
      }
    } else {
      try {
        setClaudeApiKey(null)
        logger.info(LogCategory.AUTH, 'Claude API key cleared')
        return { success: true }
      } catch (error) {
        logger.error(LogCategory.AUTH, 'Failed to clear Claude API key', {
          error: error instanceof Error ? error.message : String(error)
        })
        return { success: false, error: 'Failed to clear API key' }
      }
    }
  })

  ipcMain.handle('get-chat-history', async () => {
    return getChatHistory()
  })

  // Model selection
  ipcMain.handle('fetch-claude-models', async () => {
    const apiKey = getClaudeApiKey()
    if (!apiKey) {
      return { success: false, error: 'No Claude API key configured' }
    }

    logger.info(LogCategory.API, 'Fetching Claude models')
    try {
      const models = await fetchClaudeModels(apiKey)
      return { success: true, models }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch Claude models', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('get-selected-model', async () => {
    const model = getSelectedModel()
    return model || getDefaultModel()
  })

  ipcMain.handle('set-selected-model', async (_, model: string) => {
    logger.info(LogCategory.API, 'Setting selected Claude model', { model })
    setSelectedModel(model)
    return { success: true }
  })

  ipcMain.handle('get-default-model', async () => {
    return getDefaultModel()
  })

  // Extended thinking toggle
  ipcMain.handle('get-enable-thinking', async () => {
    return getEnableThinking()
  })

  ipcMain.handle('set-enable-thinking', async (_, enabled: boolean) => {
    logger.info(LogCategory.API, 'Setting extended thinking', { enabled })
    setEnableThinking(enabled)
    return { success: true }
  })

  // Web fetch toggle (free tool that allows Claude to fetch URLs)
  ipcMain.handle('get-enable-web-fetch', async () => {
    return getEnableWebFetch()
  })

  ipcMain.handle('set-enable-web-fetch', async (_, enabled: boolean) => {
    logger.info(LogCategory.API, 'Setting web fetch tool', { enabled })
    setEnableWebFetch(enabled)
    return { success: true }
  })

  ipcMain.handle('send-chat-message', async (_, userMessage: string) => {
    const apiKey = getClaudeApiKey()
    if (!apiKey) {
      return { success: false, error: 'No Claude API key configured' }
    }

    const selectedModel = getSelectedModel() || getDefaultModel()
    const enableThinking = getEnableThinking()
    logger.info(LogCategory.API, 'Sending chat message to Claude', {
      model: selectedModel,
      thinking: enableThinking
    })

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    addChatMessage(userMsg)

    // Get history and convert to Claude format
    const history = getChatHistory()
    const claudeMessages: ClaudeMessage[] = history.map((m) => ({
      role: m.role,
      content: m.content
    }))

    try {
      const response = await sendClaudeMessage(
        apiKey,
        claudeMessages,
        selectedModel,
        undefined,
        enableThinking
      )

      // Create assistant message (include thinking if present)
      const assistantMsg: ChatMessage = {
        id: response.id || `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.content,
        thinking: response.thinking,
        timestamp: new Date().toISOString()
      }
      addChatMessage(assistantMsg)

      logger.info(LogCategory.API, 'Chat message sent successfully', {
        model: response.model,
        hasThinking: !!response.thinking,
        usage: response.usage
      })
      return { success: true, message: assistantMsg }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to send chat message', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('clear-chat-history', async () => {
    clearChatHistory()
    logger.info(LogCategory.APP, 'Chat history cleared')
    return { success: true }
  })

  // Streaming chat message
  ipcMain.handle(
    'send-chat-message-streaming',
    async (event, userMessage: string, systemContext?: string) => {
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'No Claude API key configured' }
      }

      const selectedModel = getSelectedModel() || getDefaultModel()
      const enableThinking = getEnableThinking()
      const enableWebFetch = getEnableWebFetch()

      // Check if there's an active PR chat
      const activePRChatId = getActivePRChatId()
      const isInPRChat = !!activePRChatId

      logger.info(LogCategory.API, 'Sending streaming chat message to Claude', {
        model: selectedModel,
        thinking: enableThinking,
        webFetch: enableWebFetch,
        hasSystemContext: !!systemContext,
        isInPRChat,
        activePRChatId
      })

      // Create user message
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_user`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString()
      }

      // Save to the correct chat (PR-specific or general)
      if (isInPRChat && activePRChatId) {
        addMessageToPRChat(activePRChatId, userMsg)
      } else {
        addChatMessage(userMsg)
      }

      // Get history from the correct source (PR-specific or general)
      let history: ChatMessage[]
      let effectiveSystemPrompt: string

      if (isInPRChat && activePRChatId) {
        // Use PR chat history
        history = getPRChatMessages(activePRChatId)
        // Get system context from the PR chat itself
        const prChat = getPRChat(activePRChatId)
        effectiveSystemPrompt = prChat?.systemContext || systemContext || GENERAL_CHAT_SYSTEM_PROMPT
      } else {
        // Use general chat history
        history = getChatHistory()
        effectiveSystemPrompt = systemContext || GENERAL_CHAT_SYSTEM_PROMPT
      }

      const claudeMessages: ClaudeMessage[] = history.map((m) => ({
        role: m.role,
        content: m.content
      }))

      // Generate a unique stream ID for this conversation
      const streamId = `stream_${Date.now()}`

      // Get the sender's webContents to send stream updates
      const webContents = event.sender

      // Chunk handler for both regular and tool-enabled streaming
      const handleChunk = (chunk: {
        type: string
        content?: string
        thinking?: string
        error?: string
        toolName?: string
        fullResponse?: {
          id: string
          content: string
          thinking?: string
          model: string
          stop_reason: string | null
          usage?: { input_tokens: number; output_tokens: number }
        }
      }) => {
        // Send chunk to renderer
        webContents.send('chat-stream-chunk', { streamId, ...chunk })

        // If done, save the assistant message to the correct chat
        if (chunk.type === 'done' && chunk.fullResponse) {
          const assistantMsg: ChatMessage = {
            id: chunk.fullResponse.id || `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: chunk.fullResponse.content,
            thinking: chunk.fullResponse.thinking,
            timestamp: new Date().toISOString()
          }

          // Save to the correct chat (PR-specific or general)
          if (isInPRChat && activePRChatId) {
            addMessageToPRChat(activePRChatId, assistantMsg)
          } else {
            addChatMessage(assistantMsg)
          }

          logger.info(LogCategory.API, 'Streaming chat message complete', {
            model: chunk.fullResponse.model,
            hasThinking: !!chunk.fullResponse.thinking,
            usage: chunk.fullResponse.usage,
            savedTo: isInPRChat ? `PR Chat: ${activePRChatId}` : 'General Chat'
          })
        }
      }

      // Start streaming - use tool-enabled version if web fetch is enabled
      if (enableWebFetch) {
        // Tool executor that handles web fetch requests
        const toolExecutor = async (
          toolName: string,
          toolInput: Record<string, unknown>
        ): Promise<{ content: string; isError: boolean }> => {
          if (toolName === 'fetch_url') {
            const url = toolInput.url as string
            return executeWebFetch(url)
          }
          return { content: `Unknown tool: ${toolName}`, isError: true }
        }

        sendClaudeMessageStreamingWithTools(
          apiKey,
          claudeMessages,
          handleChunk,
          [FETCH_URL_TOOL],
          toolExecutor,
          selectedModel,
          effectiveSystemPrompt,
          enableThinking
        )
      } else {
        // Regular streaming without tools
        sendClaudeMessageStreaming(
          apiKey,
          claudeMessages,
          handleChunk,
          selectedModel,
          effectiveSystemPrompt,
          enableThinking
        )
      }

      return { success: true, streamId }
    }
  )

  // Extract preview URL from PR context using AI
  ipcMain.handle(
    'extract-preview-url',
    async (
      _,
      context: {
        title: string
        body: string | null
        comments: Array<{ author: string; body: string }>
      }
    ) => {
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, message: 'No Claude API key configured' }
      }

      logger.info(LogCategory.API, 'Extracting preview URL from PR', {
        title: context.title,
        commentsCount: context.comments.length
      })

      const result = await extractPreviewUrl(apiKey, context)

      if (result.success && result.url) {
        // Open the URL in the default browser
        await shell.openExternal(result.url)
        logger.info(LogCategory.APP, 'Opened preview URL in browser', { url: result.url })
      }

      return result
    }
  )

  // Extract Jira ticket from PR context using AI
  ipcMain.handle(
    'extract-jira-ticket',
    async (
      _,
      context: {
        title: string
        body: string | null
        branchName: string
        comments: Array<{ author: string; body: string }>
      }
    ) => {
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, message: 'Claude API key not configured' }
      }

      logger.info(LogCategory.APP, 'Extracting Jira ticket from PR', {
        title: context.title,
        branchName: context.branchName
      })

      const result = await extractJiraTicket(apiKey, context)

      if (result.success) {
        // Construct the URL if only a key was found
        let url = result.ticketUrl
        if (!url && result.ticketKey) {
          // Default to Atlassian cloud - user can configure their domain later
          // For now, we'll just open a search that works for most setups
          url = `https://jira.atlassian.com/browse/${result.ticketKey}`
        }

        if (url) {
          // Open the URL in the default browser
          await shell.openExternal(url)
          logger.info(LogCategory.APP, 'Opened Jira ticket in browser', {
            ticketKey: result.ticketKey,
            url
          })
        }
      }

      return result
    }
  )

  // Analyze CI failure using AI
  ipcMain.handle(
    'analyze-ci-failure',
    async (
      _,
      params: {
        owner: string
        repo: string
        checkRunId: string
        checkName: string
      }
    ) => {
      const token = getToken()
      if (!token) {
        return { success: false, error: 'Not authenticated' }
      }

      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'Claude API key not configured' }
      }

      logger.info(LogCategory.APP, 'Analyzing CI failure', {
        owner: params.owner,
        repo: params.repo,
        checkRunId: params.checkRunId,
        checkName: params.checkName
      })

      try {
        // 1. Fetch check run details from GitHub
        const { checkRun } = await fetchCheckRunDetails(
          token,
          params.owner,
          params.repo,
          params.checkRunId
        )

        // 2. Try to fetch actual CI logs if this is a GitHub Actions job
        let logs: string | null = null
        if (checkRun.databaseId) {
          logs = await fetchCheckRunLogs(token, params.owner, params.repo, checkRun.databaseId)
          logger.info(LogCategory.APP, 'Fetched CI logs', {
            checkName: params.checkName,
            hasLogs: !!logs,
            logSize: logs?.length || 0
          })
        } else {
          logger.info(
            LogCategory.APP,
            'No databaseId available - third-party CI, skipping log fetch',
            {
              checkName: params.checkName
            }
          )
        }

        // 3. Analyze with Claude - include logs in the text output if available
        const outputText = logs
          ? `${checkRun.output.text || ''}\n\n--- CI LOGS ---\n${logs}`
          : checkRun.output.text

        const result = await analyzeCIFailure(apiKey, {
          checkName: checkRun.name,
          conclusion: checkRun.conclusion,
          output: {
            title: checkRun.output.title,
            summary: checkRun.output.summary,
            text: outputText
          },
          annotations: checkRun.output.annotations
        })

        if (result.success) {
          logger.info(LogCategory.APP, 'CI failure analyzed', {
            checkName: params.checkName,
            hasSummary: !!result.summary,
            hadLogs: !!logs
          })
        }

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(LogCategory.APP, 'Failed to analyze CI failure', { error: errorMessage })
        return { success: false, error: errorMessage }
      }
    }
  )

  // Streaming CI failure analysis (with real-time thinking)
  ipcMain.handle(
    'stream-ci-failure-analysis',
    async (
      event,
      params: {
        owner: string
        repo: string
        checkRunId: string
        checkName: string
      }
    ) => {
      const token = getToken()
      if (!token) {
        return { success: false, error: 'Not authenticated' }
      }

      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'Claude API key not configured' }
      }

      const streamId = `ci-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const webContents = event.sender

      logger.info(LogCategory.APP, 'Starting streaming CI failure analysis', {
        owner: params.owner,
        repo: params.repo,
        checkRunId: params.checkRunId,
        checkName: params.checkName,
        streamId
      })

      try {
        // 1. Fetch check run details from GitHub
        const { checkRun } = await fetchCheckRunDetails(
          token,
          params.owner,
          params.repo,
          params.checkRunId
        )

        // 2. Try to fetch actual CI logs if this is a GitHub Actions job
        let logs: string | null = null
        if (checkRun.databaseId) {
          logs = await fetchCheckRunLogs(token, params.owner, params.repo, checkRun.databaseId)
        }

        // 3. Stream the analysis with Claude
        const outputText = logs
          ? `${checkRun.output.text || ''}\n\n--- CI LOGS ---\n${logs}`
          : checkRun.output.text

        analyzeCIFailureStreaming(
          apiKey,
          {
            checkName: checkRun.name,
            conclusion: checkRun.conclusion,
            output: {
              title: checkRun.output.title,
              summary: checkRun.output.summary,
              text: outputText
            },
            annotations: checkRun.output.annotations
          },
          (chunk) => {
            // Send chunk to renderer
            webContents.send('ci-analysis-stream-chunk', { streamId, ...chunk })
          }
        )

        return { success: true, streamId }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(LogCategory.APP, 'Failed to start streaming CI analysis', {
          error: errorMessage
        })
        return { success: false, error: errorMessage }
      }
    }
  )

  // Analyze PR status (Why is this PR still open?)
  ipcMain.handle(
    'analyze-pr-status',
    async (
      _,
      context: {
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
      }
    ) => {
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, message: 'No Claude API key configured' }
      }

      logger.info(LogCategory.API, 'Analyzing PR status', {
        prId: context.prId,
        title: context.title
      })

      const result = await analyzePRStatus(apiKey, context)

      if (result.success && result.analysis) {
        // Persist the analysis
        setPRAnalysis(context.prId, result.analysis)
        logger.info(LogCategory.APP, 'PR analysis saved', { prId: context.prId })
      }

      return result
    }
  )

  // Streaming PR status analysis with extended thinking
  ipcMain.handle(
    'analyze-pr-status-streaming',
    async (
      event,
      context: {
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
      }
    ) => {
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'No Claude API key configured' }
      }

      logger.info(LogCategory.API, 'Starting streaming PR status analysis', {
        prId: context.prId,
        title: context.title
      })

      // Generate a unique stream ID
      const streamId = `pr_analysis_${Date.now()}`

      // Get the sender's webContents to send stream updates
      const webContents = event.sender

      // Start streaming analysis
      analyzePRStatusStreaming(apiKey, context, (chunk) => {
        // Send chunk to renderer
        webContents.send('pr-analysis-stream-chunk', { streamId, ...chunk })

        // If done, save the analysis
        if (chunk.type === 'done' && chunk.fullResponse) {
          setPRAnalysis(context.prId, chunk.fullResponse.analysis)
          logger.info(LogCategory.APP, 'Streaming PR analysis saved', {
            prId: context.prId,
            hasThinking: !!chunk.fullResponse.thinking
          })
        }
      })

      return { success: true, streamId }
    }
  )

  // Get persisted PR analysis
  ipcMain.handle('get-pr-analysis', async (_, prId: string) => {
    const analysis = getPRAnalysis(prId)
    return analysis
  })

  // Delete PR analysis (to force refresh)
  ipcMain.handle('delete-pr-analysis', async (_, prId: string) => {
    deletePRAnalysis(prId)
    return { success: true }
  })

  // PR Analysis Panel State (open/closed per PR)
  ipcMain.handle('get-pr-analysis-panel-open', async (_, prId: string) => {
    return getPRAnalysisPanelOpen(prId)
  })

  ipcMain.handle('set-pr-analysis-panel-open', async (_, prId: string, isOpen: boolean) => {
    setPRAnalysisPanelOpen(prId, isOpen)
    return { success: true }
  })

  // PR Chat operations
  ipcMain.handle('get-pr-chats', async () => {
    const { getPRChats } = await import('./store')
    return getPRChats()
  })

  ipcMain.handle('get-pr-chat', async (_, prId: string) => {
    const { getPRChat } = await import('./store')
    return getPRChat(prId)
  })

  ipcMain.handle(
    'create-pr-chat',
    async (
      _,
      prId: string,
      prNumber: number,
      prTitle: string,
      repoFullName: string,
      systemContext?: string
    ) => {
      const { createPRChat } = await import('./store')
      return createPRChat(prId, prNumber, prTitle, repoFullName, systemContext)
    }
  )

  ipcMain.handle('add-message-to-pr-chat', async (_, prId: string, message: any) => {
    const { addMessageToPRChat } = await import('./store')
    addMessageToPRChat(prId, message)
    return { success: true }
  })

  ipcMain.handle('get-pr-chat-messages', async (_, prId: string) => {
    const { getPRChatMessages } = await import('./store')
    return getPRChatMessages(prId)
  })

  ipcMain.handle('clear-pr-chat-messages', async (_, prId: string) => {
    const { clearPRChatMessages } = await import('./store')
    clearPRChatMessages(prId)
    return { success: true }
  })

  ipcMain.handle('delete-pr-chat', async (_, prId: string) => {
    const { deletePRChat } = await import('./store')
    deletePRChat(prId)
    return { success: true }
  })

  ipcMain.handle('get-active-pr-chat-id', async () => {
    const { getActivePRChatId } = await import('./store')
    return getActivePRChatId()
  })

  ipcMain.handle('set-active-pr-chat-id', async (_, prId: string | null) => {
    const { setActivePRChatId } = await import('./store')
    setActivePRChatId(prId)
    return { success: true }
  })

  // Logging
  ipcMain.handle('get-logs', async () => {
    return logger.getLogs()
  })

  ipcMain.handle('clear-logs', async () => {
    logger.clearLogs()
    logger.info(LogCategory.APP, 'Logs cleared by user')
    return { success: true }
  })

  ipcMain.handle('export-logs', async () => {
    return logger.exportLogs()
  })

  ipcMain.handle('get-logs-summary', async () => {
    return logger.getLogsSummary()
  })

  // Log from renderer
  ipcMain.handle(
    'log-from-renderer',
    async (_, level: string, category: string, message: string, data?: Record<string, unknown>) => {
      const cat = (LogCategory as Record<string, string>)[category] || LogCategory.APP
      switch (level) {
        case 'error':
          logger.error(cat, `[Renderer] ${message}`, data)
          break
        case 'warn':
          logger.warn(cat, `[Renderer] ${message}`, data)
          break
        case 'debug':
          logger.debug(cat, `[Renderer] ${message}`, data)
          break
        default:
          logger.info(cat, `[Renderer] ${message}`, data)
      }
      return { success: true }
    }
  )
}

app.whenReady().then(() => {
  // Initialize logger (creates logs directory, cleans old sessions)
  logger.init()

  logger.info(LogCategory.APP, 'CodeLobby starting', {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    logsPath: logger.getLogsPath()
  })

  electronApp.setAppUserModelId('com.codelobby.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIPCHandlers()
  createWindow()

  logger.info(LogCategory.APP, 'App initialized successfully')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Save logs before quitting
app.on('before-quit', () => {
  logger.info(LogCategory.APP, 'App shutting down')
  logger.forceSave()
})
