import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import {
  ClaudeMessage,
  fetchModels as fetchClaudeModels,
  getDefaultModel,
  sendMessage as sendClaudeMessage,
  sendMessageStreaming as sendClaudeMessageStreaming
} from './claude-api'
import {
  extractEventsFromPRs,
  fetchAllPRData,
  fetchAllPRsForRepos,
  fetchAllRepositories,
  fetchRateLimitOnly,
  PullRequest,
  RateLimitInfo,
  Repository,
  validateToken
} from './github-graphql'
import { LogCategory, logger } from './logger'
import {
  AIPanelSettings,
  addChatMessage,
  ChatMessage,
  clearChatHistory,
  clearToken,
  getAIPanel,
  getCardLayouts,
  getChatHistory,
  getClaudeApiKey,
  getEnableThinking,
  getIDEViewSettings,
  getMyPRsRepos,
  getPRDetailPanel,
  getRepoColors,
  getRepoOrder,
  getSelectedModel,
  getSelectedRepos,
  getSettings,
  getToken,
  getUser,
  getViewMode,
  IDEViewSettings,
  LayoutItem,
  PanelSettings,
  setAIPanel,
  setCardLayouts,
  setClaudeApiKey,
  setEnableThinking,
  setIDEViewSettings,
  setMyPRsRepos,
  setPRDetailPanel,
  setRepoColor,
  setRepoOrder,
  setSelectedModel,
  setSelectedRepos,
  setSettings,
  setToken,
  setUser,
  setViewMode,
  ViewMode
} from './store'

// Cache for GraphQL data to avoid repeated queries
let cachedPRData: {
  pullRequests: PullRequest[]
  repositories: any[]
  rateLimit: RateLimitInfo
  lastFetch: number
} | null = null

// Separate cache for all repos (longer TTL since it changes less)
let cachedAllRepos: {
  repositories: Repository[]
  lastFetch: number
} | null = null
const ALL_REPOS_CACHE_TTL = 300000 // 5 minutes
const CACHE_TTL = 10000 // 10 seconds

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 18 }, // Position traffic lights vertically centered in header
    backgroundColor: '#0d1117',
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
    logger.info(LogCategory.AUTH, 'Clearing token and caches')
    clearToken()
    // Clear all caches
    cachedAllRepos = null
    cachedPRData = null
    return { success: true }
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

  // GitHub API - Now using GraphQL for efficiency!
  // One query fetches everything: PRs, repos, checks, comments, reviews

  async function fetchAndCacheData() {
    const token = getToken()
    if (!token) throw new Error('No token')

    // Return cached data if fresh
    if (cachedPRData && Date.now() - cachedPRData.lastFetch < CACHE_TTL) {
      logger.debug(LogCategory.CACHE, 'Using cached PR data', {
        age: Date.now() - cachedPRData.lastFetch,
        prs: cachedPRData.pullRequests.length
      })
      return cachedPRData
    }

    logger.info(LogCategory.GRAPHQL, 'Fetching all PR data via GraphQL')
    const data = await fetchAllPRData(token)
    logger.info(LogCategory.GRAPHQL, 'PR data fetched successfully', {
      prs: data.pullRequests.length,
      repos: data.repositories.length,
      rateLimit: `${data.rateLimit.remaining}/${data.rateLimit.limit}`
    })

    cachedPRData = {
      pullRequests: data.pullRequests,
      repositories: data.repositories,
      rateLimit: data.rateLimit,
      lastFetch: Date.now()
    }
    return cachedPRData
  }

  ipcMain.handle('fetch-prs', async () => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      const data = await fetchAndCacheData()
      logger.debug(LogCategory.API, 'Returning PRs', { count: data.pullRequests.length })
      return { success: true, data: data.pullRequests }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch PRs', { error: (error as Error).message })
      return { success: false, error: (error as Error).message }
    }
  })

  // Fetch ALL open PRs for specific repos (not just user's PRs)
  ipcMain.handle('fetch-all-prs-for-repos', async (_, repoFullNames: string[]) => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      logger.info(LogCategory.API, 'Fetching all PRs for repos', { repos: repoFullNames })
      const data = await fetchAllPRsForRepos(token, repoFullNames)
      logger.debug(LogCategory.API, 'Returning all PRs for repos', {
        count: data.pullRequests.length
      })
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

  ipcMain.handle('fetch-pr-events', async () => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      const data = await fetchAndCacheData()
      const events = extractEventsFromPRs(data.pullRequests)
      logger.debug(LogCategory.API, 'Returning PR events', { count: events.length })
      return { success: true, data: events }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch PR events', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('fetch-pr-checks', async (_, _owner: string, _repo: string, _ref: string) => {
    // With GraphQL, checks are already included in PR data
    // This handler is kept for compatibility but data comes from fetch-prs
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      const data = await fetchAndCacheData()
      // Find the PR by ref (sha)
      const pr = data.pullRequests.find((p) => p.head.sha === _ref)
      return {
        success: true,
        data: pr?.checks || { state: 'pending', total_count: 0, check_runs: [] }
      }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch PR checks', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('fetch-contributed-repos', async () => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      // Use cached all repos if fresh
      if (cachedAllRepos && Date.now() - cachedAllRepos.lastFetch < ALL_REPOS_CACHE_TTL) {
        logger.debug(LogCategory.CACHE, 'Using cached repos', {
          count: cachedAllRepos.repositories.length,
          age: Date.now() - cachedAllRepos.lastFetch
        })
        return { success: true, data: cachedAllRepos.repositories }
      }

      // Fetch ALL repos the user has access to
      logger.info(LogCategory.GRAPHQL, 'Fetching all repositories')
      const allRepos = await fetchAllRepositories(token)
      logger.info(LogCategory.GRAPHQL, 'Repositories fetched', { count: allRepos.length })

      cachedAllRepos = {
        repositories: allRepos,
        lastFetch: Date.now()
      }
      return { success: true, data: allRepos }
    } catch (error) {
      logger.error(LogCategory.GRAPHQL, 'Failed to fetch repositories', {
        error: (error as Error).message
      })
      return { success: false, error: (error as Error).message }
    }
  })

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
  ipcMain.handle('send-chat-message-streaming', async (event, userMessage: string) => {
    const apiKey = getClaudeApiKey()
    if (!apiKey) {
      return { success: false, error: 'No Claude API key configured' }
    }

    const selectedModel = getSelectedModel() || getDefaultModel()
    const enableThinking = getEnableThinking()
    logger.info(LogCategory.API, 'Sending streaming chat message to Claude', {
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

    // Generate a unique stream ID for this conversation
    const streamId = `stream_${Date.now()}`

    // Get the sender's webContents to send stream updates
    const webContents = event.sender

    // Start streaming
    sendClaudeMessageStreaming(
      apiKey,
      claudeMessages,
      (chunk) => {
        // Send chunk to renderer
        webContents.send('chat-stream-chunk', { streamId, ...chunk })

        // If done, save the assistant message
        if (chunk.type === 'done' && chunk.fullResponse) {
          const assistantMsg: ChatMessage = {
            id: chunk.fullResponse.id || `msg_${Date.now()}_assistant`,
            role: 'assistant',
            content: chunk.fullResponse.content,
            thinking: chunk.fullResponse.thinking,
            timestamp: new Date().toISOString()
          }
          addChatMessage(assistantMsg)

          logger.info(LogCategory.API, 'Streaming chat message complete', {
            model: chunk.fullResponse.model,
            hasThinking: !!chunk.fullResponse.thinking,
            usage: chunk.fullResponse.usage
          })
        }
      },
      selectedModel,
      undefined,
      enableThinking
    )

    return { success: true, streamId }
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
