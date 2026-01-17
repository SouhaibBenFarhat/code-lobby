import { app, shell, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { getToken, setToken, clearToken, getSettings, setSettings, getRepoOrder, setRepoOrder, getUser, setUser, getCardLayouts, setCardLayouts, LayoutItem, getSelectedRepos, setSelectedRepos, getPRDetailPanel, setPRDetailPanel, PanelSettings, getRepoColors, setRepoColor, getViewMode, setViewMode, ViewMode, getIDEViewSettings, setIDEViewSettings, IDEViewSettings } from './store'
import { 
  validateToken,
  fetchAllPRData,
  fetchAllRepositories,
  fetchAllPRsForRepos,
  extractEventsFromPRs,
  GitHubUser,
  PullRequest,
  RateLimitInfo,
  Repository
} from './github-graphql'
import { logger, LogCategory } from './logger'

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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers
function setupIPCHandlers(): void {
  logger.info(LogCategory.APP, 'Setting up IPC handlers')
  
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
        logger.error(LogCategory.AUTH, 'Rate limit exceeded during token validation', { status: 403 })
        return { success: false, error: 'GitHub API rate limit exceeded. Please wait a few minutes and try again.' }
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
      logger.debug(LogCategory.API, 'Returning all PRs for repos', { count: data.pullRequests.length })
      return { success: true, data: data.pullRequests, currentUser: data.currentUser, rateLimit: data.rateLimit }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch all PRs for repos', { error: (error as Error).message })
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
      logger.error(LogCategory.API, 'Failed to fetch PR events', { error: (error as Error).message })
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
      const pr = data.pullRequests.find(p => p.head.sha === _ref)
      return { success: true, data: pr?.checks || { state: 'pending', total_count: 0, check_runs: [] } }
    } catch (error) {
      logger.error(LogCategory.API, 'Failed to fetch PR checks', { error: (error as Error).message })
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
      logger.error(LogCategory.GRAPHQL, 'Failed to fetch repositories', { error: (error as Error).message })
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

  // Rate limit info
  ipcMain.handle('get-rate-limit', async () => {
    const token = getToken()
    if (!token) return { success: false, error: 'No token' }
    try {
      const data = await fetchAndCacheData()
      logger.debug(LogCategory.RATE_LIMIT, 'Rate limit status', {
        used: data.rateLimit.used,
        remaining: data.rateLimit.remaining,
        limit: data.rateLimit.limit,
        percentage: data.rateLimit.percentage
      })
      return { success: true, data: data.rateLimit }
    } catch (error) {
      logger.error(LogCategory.RATE_LIMIT, 'Failed to get rate limit', { error: (error as Error).message })
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

  // PR Detail panel settings
  ipcMain.handle('get-pr-detail-panel', async () => {
    return getPRDetailPanel()
  })

  ipcMain.handle('set-pr-detail-panel', async (_, settings: Partial<PanelSettings>) => {
    setPRDetailPanel(settings)
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
}

app.whenReady().then(() => {
  logger.info(LogCategory.APP, 'CodeLobby starting', { 
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch
  })
  
  electronApp.setAppUserModelId('com.codelobby.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIPCHandlers()
  createWindow()
  
  logger.info(LogCategory.APP, 'App initialized successfully')

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
