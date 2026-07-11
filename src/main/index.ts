import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Menu,
  Notification,
  session,
  shell,
  webContents
} from 'electron'
import { fixPath } from './fix-path'

// =============================================================================
// CONTEXT MENU - Enable right-click copy/paste/cut everywhere in the app
// Uses dynamic import because electron-context-menu is ESM-only
// =============================================================================
import('electron-context-menu').then(({ default: contextMenu }) => {
  contextMenu({
    showSaveImageAs: true,
    showCopyImage: true,
    showInspectElement: !app.isPackaged // Only show "Inspect Element" in dev mode
  })
})

// =============================================================================
// FIX PATH FOR PACKAGED APP
// Packaged Electron apps don't inherit the user's shell PATH, which causes
// "spawn node ENOENT" errors when trying to run Node.js-based tools.
// This reads the user's actual shell PATH (from .zshrc, .bashrc, etc.)
// =============================================================================
if (app.isPackaged) {
  fixPath()
}

// Set app name immediately at module load (before app.whenReady)
// This is required for macOS dock tooltip to show correct name
if (process.platform === 'darwin') {
  app.setName('CodeLobby')
}

import { LogCategory, mainLogger as logger } from '@logger/main'
import { closeDatabase, initDatabase, registerPersistenceIpcHandlers } from '@persistence/main'
import { getAllModelPricing } from './ai-pricing'
import {
  cliOneShot,
  sendCliMessageStreaming,
  startClaudeCliSession,
  stopAllCliSessions,
  stopClaudeCliSession
} from './claude-cli'
import { setCachedClaudePath } from './claude-cli-path'
import { fetchCliUsageStats } from './claude-cli-usage'
import { cancelGitHubDeviceAuth, startGitHubDeviceAuth } from './github-auth'
import {
  buildCIFailureAnalysisPrompt,
  buildJiraTicketPrompt,
  buildPRAnalysisPrompt,
  buildPreviewURLPrompt,
  CI_FAILURE_ANALYSIS_SYSTEM_PROMPT,
  GENERAL_CHAT_SYSTEM_PROMPT
} from './prompts'
import {
  addChatMessage,
  addCliMessageCount,
  addCustomQuickPrompt,
  addMessageToPRChat,
  ChatMessage,
  clearChatHistory,
  deleteCustomQuickPrompt,
  deletePRAnalysis,
  factoryReset,
  getActivePRChatId,
  getAIUsage,
  getChatHistory,
  getCustomQuickPrompts,
  getEnableThinking,
  getPRAnalysis,
  getPRAnalysisPanelOpen,
  getPRChat,
  getPRChatMessages,
  getSelectedModel,
  resetAIUsage,
  setEnableThinking,
  setPRAnalysis,
  setPRAnalysisPanelOpen,
  setSelectedModel
} from './store'

// ═══════════════════════════════════════════════════════════════════════════
// ARCHITECTURE NOTE
// ═══════════════════════════════════════════════════════════════════════════
//
// After the TanStack Query refactor, the main process is now ONLY responsible for:
// 1. Window/app lifecycle (Electron)
// 2. Claude AI integration (CORS requires main process)
// 3. Native features (notifications, fullscreen, shell.openExternal)
//
// GitHub API calls and settings are now handled directly in the renderer
// using @codelobby/data package with TanStack Query + localStorage.
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
      nodeIntegration: false,
      webviewTag: true // Enable <webview> tag for embedded browser views
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

  // Zoom: always apply to main window so it works in every view (canvas, IDE, PR
  // detail). When a webview has focus we also sync its zoom so preview content
  // matches. This avoids focus-dependent failures (IDE view) and webview stealing
  // focus (PR detail panel).
  const mainWc = (): Electron.WebContents | null =>
    mainWindow?.webContents && !mainWindow.webContents.isDestroyed() ? mainWindow.webContents : null

  const applyZoomToFocusedIfDifferent = (level: number): void => {
    const main = mainWc()
    if (!main) return
    const focused = webContents.getFocusedWebContents()
    if (focused && !focused.isDestroyed() && focused !== main) focused.setZoomLevel(level)
  }

  const zoomIn = (): void => {
    const main = mainWc()
    if (!main) return
    const next = main.getZoomLevel() + 1
    main.setZoomLevel(next)
    applyZoomToFocusedIfDifferent(next)
  }
  const zoomOut = (): void => {
    const main = mainWc()
    if (!main) return
    const next = main.getZoomLevel() - 1
    main.setZoomLevel(next)
    applyZoomToFocusedIfDifferent(next)
  }
  const zoomReset = (): void => {
    const main = mainWc()
    if (!main) return
    main.setZoomLevel(0)
    applyZoomToFocusedIfDifferent(0)
  }
  globalShortcut.register('CommandOrControl+Plus', zoomIn)
  globalShortcut.register('CommandOrControl+=', zoomIn) // US keyboard: + is Shift+=
  globalShortcut.register('CommandOrControl+-', zoomOut) // Docs: "-" is valid key code (punctuation)
  globalShortcut.register('CommandOrControl+0', zoomReset)

  mainWindow.on('closed', () => {
    mainWindow = null
    globalShortcut.unregister('CommandOrControl+Plus')
    globalShortcut.unregister('CommandOrControl+=')
    globalShortcut.unregister('CommandOrControl+-')
    globalShortcut.unregister('CommandOrControl+0')
  })

  // Application menu: View > Zoom uses same handlers as globalShortcut (main
  // window always zooms; focused webview synced). Custom click ensures macOS
  // menu accelerators run our logic instead of Electron’s focus-based zoom.
  // Opens the in-app About modal (features book) in the renderer.
  const openAbout = (): void => {
    mainWindow?.webContents.send('menu:open-about')
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS: About lives in the app menu (App menu → About CodeLobby).
    // Other platforms get it in a Help menu below. Both open the in-app modal.
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { label: 'About CodeLobby', click: openAbout },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          } as Electron.MenuItemConstructorOptions
        ]
      : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      role: 'viewMenu',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CommandOrControl+Plus', click: zoomIn },
        { label: 'Zoom Out', accelerator: 'CommandOrControl+-', click: zoomOut },
        { label: 'Reset Zoom', accelerator: 'CommandOrControl+0', click: zoomReset },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' }
      ]
    },
    { role: 'windowMenu' },
    // Non-macOS: expose About under a Help menu so it stays reachable.
    ...(process.platform === 'darwin'
      ? []
      : [
          {
            role: 'help',
            submenu: [{ label: 'About CodeLobby', click: openAbout }]
          } as Electron.MenuItemConstructorOptions
        ])
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// IPC Handlers - Only AI and native features
function setupIPCHandlers(): void {
  logger.info(LogCategory.APP, 'Setting up IPC handlers (AI + native features only)')

  // ═══════════════════════════════════════════════════════════════════════════
  // GITHUB AUTH (OAuth Device Flow)
  // github.com/login/* endpoints have no CORS, so the flow runs in main.
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('github-auth:start', async () => {
    if (!mainWindow) {
      return { success: false, error: 'Main window not available' }
    }
    return startGitHubDeviceAuth(mainWindow)
  })

  ipcMain.handle('github-auth:cancel', () => {
    cancelGitHubDeviceAuth()
    return { success: true }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW & NATIVE FEATURES
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('is-fullscreen', () => {
    return mainWindow?.isFullScreen() ?? false
  })

  ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen())
    }
  })

  ipcMain.handle('show-notification', async (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show()
    }
    return { success: true }
  })

  ipcMain.handle('shell-open-external', async (_, url: string) => {
    await shell.openExternal(url)
    return { success: true }
  })

  // Factory reset - completely wipes ALL data (like a fresh install)
  ipcMain.handle('factory-reset', async () => {
    logger.info(LogCategory.APP, 'Factory reset initiated - wiping ALL data')
    factoryReset()
    logger.info(LogCategory.APP, 'Factory reset complete - app is now in fresh install state')
    return { success: true }
  })

  // Clear webview browsing data (cookies, cache, storage) - clears EVERYTHING
  ipcMain.handle('clear-webview-data', async () => {
    try {
      logger.info(LogCategory.APP, 'Clearing webview browsing data')
      // Clear all storage types
      await session.defaultSession.clearStorageData({
        storages: [
          // 'appcache', // Application cache (deprecated/unsupported in Electron, removed for type safety)
          'cookies', // All cookies
          'filesystem', // File System API
          'indexdb', // IndexedDB
          'localstorage', // localStorage
          'shadercache', // GPU shader cache
          'websql', // WebSQL databases
          'serviceworkers', // Service workers
          'cachestorage' // Cache Storage API
        ]
      })
      // Clear HTTP cache
      await session.defaultSession.clearCache()
      // Clear host resolver cache (DNS)
      await session.defaultSession.clearHostResolverCache()
      // Clear authentication cache
      await session.defaultSession.clearAuthCache()
      logger.info(LogCategory.APP, 'Webview browsing data cleared successfully')
      return { success: true }
    } catch (error) {
      logger.error(LogCategory.APP, 'Failed to clear webview data', {
        error: error instanceof Error ? error.message : String(error)
      })
      return { success: false, error: (error as Error).message }
    }
  })

  // Memory usage - returns process memory info
  ipcMain.handle('get-memory-usage', () => {
    const memUsage = process.memoryUsage()
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss, // Resident Set Size - total memory allocated
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers
    }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM QUICK PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

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

  // CLI Usage Stats (reads ~/.claude/stats-cache.json)
  ipcMain.handle('get-cli-subscription-usage', async () => {
    return fetchCliUsageStats()
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // AI MODE (API key vs CLI subscription)
  // ═══════════════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAUDE AI CHAT
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('get-chat-history', async () => {
    return getChatHistory()
  })

  // Model selection — CLI handles model resolution, return static list
  ipcMain.handle('fetch-claude-models', async () => {
    return {
      success: true,
      models: [
        { id: 'sonnet', display_name: 'Claude Sonnet', created_at: '', type: 'model' },
        { id: 'opus', display_name: 'Claude Opus', created_at: '', type: 'model' },
        { id: 'haiku', display_name: 'Claude Haiku', created_at: '', type: 'model' }
      ]
    }
  })

  ipcMain.handle('get-selected-model', async () => {
    const model = getSelectedModel()
    return model || 'sonnet'
  })

  ipcMain.handle('set-selected-model', async (_, model: string) => {
    logger.info(LogCategory.API, 'Setting selected Claude model', { model })
    setSelectedModel(model)
    return { success: true }
  })

  ipcMain.handle('get-default-model', async () => {
    return 'sonnet'
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
    const selectedModel = getSelectedModel() || 'sonnet'
    logger.info(LogCategory.API, '[CLI] Sending chat message', { model: selectedModel })

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    addChatMessage(userMsg)

    // Build history as a single prompt
    const history = getChatHistory()
    const historyText = history
      .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n')

    try {
      const response = await cliOneShot(historyText, GENERAL_CHAT_SYSTEM_PROMPT, selectedModel)

      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }
      addChatMessage(assistantMsg)

      addCliMessageCount()
      logger.info(LogCategory.API, '[CLI] Chat message sent successfully')
      return { success: true, message: assistantMsg }
    } catch (error) {
      logger.error(LogCategory.API, '[CLI] Failed to send chat message', {
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
      const selectedModel = getSelectedModel() || 'sonnet'

      // Check if there's an active PR chat
      const activePRChatId = getActivePRChatId()
      const isInPRChat = !!activePRChatId

      logger.info(LogCategory.API, 'Sending streaming chat message to Claude', {
        model: selectedModel,
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
        history = getPRChatMessages(activePRChatId)
        const prChat = getPRChat(activePRChatId)
        effectiveSystemPrompt = prChat?.systemContext || systemContext || GENERAL_CHAT_SYSTEM_PROMPT
      } else {
        history = getChatHistory()
        effectiveSystemPrompt = systemContext || GENERAL_CHAT_SYSTEM_PROMPT
      }

      // Generate a unique stream ID for this conversation
      const streamId = `stream_${Date.now()}`

      // Get the sender's webContents to send stream updates
      const webContents = event.sender

      // Use CLI streaming
      const historyText = history
        .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
        .join('\n\n')

      let fullContent = ''

      sendCliMessageStreaming(
        historyText,
        (chunk) => {
          if (chunk.type === 'text' && chunk.content) {
            fullContent += chunk.content
            webContents.send('chat-stream-chunk', {
              streamId,
              type: 'text',
              content: chunk.content
            })
          } else if (chunk.type === 'thinking' && chunk.thinking) {
            webContents.send('chat-stream-chunk', {
              streamId,
              type: 'thinking',
              thinking: chunk.thinking
            })
          } else if (chunk.type === 'done') {
            const assistantMsg: ChatMessage = {
              id: `msg_${Date.now()}_assistant`,
              role: 'assistant',
              content: fullContent,
              timestamp: new Date().toISOString()
            }

            if (isInPRChat && activePRChatId) {
              addMessageToPRChat(activePRChatId, assistantMsg)
            } else {
              addChatMessage(assistantMsg)
            }

            webContents.send('chat-stream-chunk', {
              streamId,
              type: 'done',
              fullResponse: {
                id: assistantMsg.id,
                content: fullContent,
                model: selectedModel,
                stop_reason: 'end_turn',
                usage: undefined
              }
            })

            addCliMessageCount()
            logger.info(LogCategory.API, '[CLI] Streaming chat message complete', {
              savedTo: isInPRChat ? `PR Chat: ${activePRChatId}` : 'General Chat'
            })
          } else if (chunk.type === 'error') {
            webContents.send('chat-stream-chunk', { streamId, type: 'error', error: chunk.error })
          }
        },
        selectedModel,
        effectiveSystemPrompt
      )

      return { success: true, streamId }
    }
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // AI-POWERED FEATURES (Preview URL, Jira, CI Analysis, PR Analysis)
  // ═══════════════════════════════════════════════════════════════════════════

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
      logger.info(LogCategory.API, 'Extracting preview URL from PR', {
        title: context.title,
        commentsCount: context.comments.length
      })

      let result: { success: boolean; url?: string; message?: string }

      try {
        const prompt = buildPreviewURLPrompt(context)
        const responseText = await cliOneShot(prompt)

        if (responseText.includes('NO_PREVIEW_URL_FOUND') || !responseText) {
          result = { success: false, message: 'No preview URL found in this PR' }
        } else {
          const urlMatch = responseText.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/)
          result = urlMatch
            ? { success: true, url: urlMatch[0] }
            : { success: false, message: 'Could not extract a valid URL from the response' }
        }
      } catch (error) {
        result = { success: false, message: `Error: ${(error as Error).message}` }
      }

      if (result.success && result.url) {
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
      logger.info(LogCategory.APP, 'Extracting Jira ticket from PR', {
        title: context.title,
        branchName: context.branchName
      })

      let result: { success: boolean; ticketKey?: string; ticketUrl?: string; message?: string }

      try {
        const prompt = buildJiraTicketPrompt(context)
        const responseText = await cliOneShot(prompt)

        if (responseText.includes('NO_JIRA_TICKET_FOUND') || !responseText) {
          result = { success: false, message: 'No Jira ticket found in this PR' }
        } else if (responseText.startsWith('JIRA_URL:')) {
          const url = responseText.replace('JIRA_URL:', '').trim()
          const urlMatch = url.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/)
          result = urlMatch
            ? { success: true, ticketUrl: urlMatch[0] }
            : { success: false, message: 'Could not extract a valid Jira ticket' }
        } else if (responseText.startsWith('JIRA_KEY:')) {
          const key = responseText.replace('JIRA_KEY:', '').trim()
          const keyMatch = key.match(/^[A-Z][A-Z0-9]*-\d+$/)
          result = keyMatch
            ? { success: true, ticketKey: keyMatch[0] }
            : { success: false, message: 'Could not extract a valid Jira ticket' }
        } else {
          // Fallback: try to extract Jira key or URL from response
          const jiraKeyMatch = responseText.match(/[A-Z][A-Z0-9]*-\d+/)
          const jiraUrlMatch = responseText.match(/https?:\/\/[^\s]*\/browse\/[A-Z][A-Z0-9]*-\d+/)
          if (jiraUrlMatch) {
            result = { success: true, ticketUrl: jiraUrlMatch[0] }
          } else if (jiraKeyMatch) {
            result = { success: true, ticketKey: jiraKeyMatch[0] }
          } else {
            result = {
              success: false,
              message: 'Could not extract a valid Jira ticket from the response'
            }
          }
        }
      } catch (error) {
        result = { success: false, message: `Error: ${(error as Error).message}` }
      }

      if (result.success) {
        let url = result.ticketUrl
        if (!url && result.ticketKey) {
          url = `https://jira.atlassian.com/browse/${result.ticketKey}`
        }

        if (url) {
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
        checkName: string
        conclusion: string | null
        output: {
          title: string | null
          summary: string | null
          text: string | null
        }
        annotations: Array<{
          path: string
          startLine: number
          endLine: number
          message: string
          annotationLevel: string
          title: string | null
          rawDetails: string | null
        }>
      }
    ) => {
      logger.info(LogCategory.APP, 'Analyzing CI failure', {
        checkName: params.checkName
      })

      try {
        const prompt = buildCIFailureAnalysisPrompt(params)
        const responseText = await cliOneShot(prompt, CI_FAILURE_ANALYSIS_SYSTEM_PROMPT)

        if (!responseText) {
          return { success: false, error: 'Empty response from Claude CLI' }
        }

        const summaryMatch = responseText.match(/\*\*Summary:\*\*\s*(.+?)(?=\n\*\*|$)/s)
        const rootCauseMatch = responseText.match(/\*\*Root Cause:\*\*\s*(.+?)(?=\n\*\*|$)/s)
        const fixMatch = responseText.match(/\*\*Fix:\*\*\s*(.+?)$/s)

        return {
          success: true,
          summary: summaryMatch ? summaryMatch[1].trim() : responseText.split('\n')[0],
          failureReason: rootCauseMatch ? rootCauseMatch[1].trim() : undefined,
          suggestedFix: fixMatch ? fixMatch[1].trim() : undefined
        }
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
        checkName: string
        conclusion: string | null
        output: {
          title: string | null
          summary: string | null
          text: string | null
        }
        annotations: Array<{
          path: string
          startLine: number
          endLine: number
          message: string
          annotationLevel: string
          title: string | null
          rawDetails: string | null
        }>
      }
    ) => {
      const streamId = `ci-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const webContents = event.sender

      logger.info(LogCategory.APP, 'Starting streaming CI failure analysis', {
        checkName: params.checkName,
        streamId
      })

      try {
        const prompt = buildCIFailureAnalysisPrompt(params)
        sendCliMessageStreaming(
          prompt,
          (chunk) => {
            if (chunk.type === 'text') {
              webContents.send('ci-analysis-stream-chunk', {
                streamId,
                type: 'text',
                content: chunk.content
              })
            } else if (chunk.type === 'thinking') {
              webContents.send('ci-analysis-stream-chunk', {
                streamId,
                type: 'thinking',
                thinking: chunk.thinking
              })
            } else if (chunk.type === 'done') {
              webContents.send('ci-analysis-stream-chunk', { streamId, type: 'done' })
            } else if (chunk.type === 'error') {
              webContents.send('ci-analysis-stream-chunk', {
                streamId,
                type: 'error',
                error: chunk.error
              })
            }
          },
          undefined,
          CI_FAILURE_ANALYSIS_SYSTEM_PROMPT
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
      logger.info(LogCategory.API, 'Analyzing PR status', {
        prId: context.prId,
        title: context.title
      })

      let result: { success: boolean; analysis?: string; message?: string }

      try {
        const prompt = buildPRAnalysisPrompt(context)
        const responseText = await cliOneShot(prompt)

        result = responseText
          ? { success: true, analysis: responseText }
          : { success: false, message: 'Failed to generate analysis' }
      } catch (error) {
        result = { success: false, message: `Error: ${(error as Error).message}` }
      }

      if (result.success && result.analysis) {
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
      const streamId = `pr_analysis_${Date.now()}`
      const webContents = event.sender

      logger.info(LogCategory.API, 'Starting streaming PR status analysis', {
        prId: context.prId,
        title: context.title
      })

      const prompt = buildPRAnalysisPrompt(context)
      let fullContent = ''

      sendCliMessageStreaming(prompt, (chunk) => {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content
          webContents.send('pr-analysis-stream-chunk', {
            streamId,
            type: 'text',
            content: chunk.content
          })
        } else if (chunk.type === 'thinking' && chunk.thinking) {
          webContents.send('pr-analysis-stream-chunk', {
            streamId,
            type: 'thinking',
            thinking: chunk.thinking
          })
        } else if (chunk.type === 'done') {
          setPRAnalysis(context.prId, fullContent)
          webContents.send('pr-analysis-stream-chunk', {
            streamId,
            type: 'done',
            fullResponse: { analysis: fullContent }
          })
          logger.info(LogCategory.APP, 'Streaming PR analysis saved', { prId: context.prId })
        } else if (chunk.type === 'error') {
          webContents.send('pr-analysis-stream-chunk', {
            streamId,
            type: 'error',
            error: chunk.error
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

  // Generate daily speech from user events using Claude Code (streaming with thinking)
  ipcMain.handle(
    'generate-daily-speech-streaming',
    async (
      _,
      options: {
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
      }
    ) => {
      if (!mainWindow) {
        return { success: false, error: 'Main window not available' }
      }

      logger.info(LogCategory.API, 'Starting streaming daily speech generation', {
        sessionId: options.sessionId,
        username: options.username,
        date: options.date,
        eventCount: options.events.length
      })

      const { buildDailySpeechPrompt } = await import('./prompts')
      const prompt = buildDailySpeechPrompt({
        username: options.username,
        date: options.date,
        events: options.events
      })

      let fullContent = ''
      let fullThinking = ''

      sendCliMessageStreaming(prompt, (chunk) => {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content
          mainWindow?.webContents.send('daily-speech:chunk', {
            sessionId: options.sessionId,
            event: { type: 'text', content: chunk.content }
          })
        } else if (chunk.type === 'thinking' && chunk.thinking) {
          fullThinking += chunk.thinking
          mainWindow?.webContents.send('daily-speech:chunk', {
            sessionId: options.sessionId,
            event: { type: 'thinking', thinking: chunk.thinking }
          })
        } else if (chunk.type === 'done') {
          mainWindow?.webContents.send('daily-speech:done', {
            sessionId: options.sessionId,
            success: true,
            content: fullContent,
            thinking: fullThinking || null,
            metadata: {
              eventCount: options.events.length,
              analyzedRepos: [],
              analyzedPRs: [],
              toolsUsed: [],
              generationDurationMs: 0
            }
          })
        } else if (chunk.type === 'error') {
          mainWindow?.webContents.send('daily-speech:error', {
            sessionId: options.sessionId,
            error: chunk.error
          })
        }
      })

      return { success: true, sessionId: options.sessionId }
    }
  )

  // Stop daily speech generation (no-op — CLI streaming is fire-and-forget)
  ipcMain.handle('stop-daily-speech', () => {
    return false
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // REVIEWER SUGGESTION (AGENTIC)
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle(
    'reviewer-suggest:start',
    async (
      _,
      options: {
        repoFullName: string
        prNumber: number
        branch: string
        baseBranch: string
        changedFiles: string[]
        prAuthor: string
        githubToken: string
      }
    ) => {
      if (!mainWindow) {
        return { success: false, error: 'Main window not available' }
      }

      logger.info(LogCategory.API, 'Starting reviewer suggestion', {
        repo: options.repoFullName,
        prNumber: options.prNumber,
        fileCount: options.changedFiles.length
      })

      const prompt = `Analyze git blame data for the following PR and suggest optimal reviewers.

Repository: ${options.repoFullName}
PR #${options.prNumber}
Branch: ${options.branch} → ${options.baseBranch}
PR Author (exclude from suggestions): ${options.prAuthor}

Changed files:
${options.changedFiles.map((f) => `- ${f}`).join('\n')}

For each changed file, consider who has recently modified it and who has the most expertise.
Return your response as a JSON array with this format:
[{"login": "username", "score": 0.95, "reason": "Modified 5 of the changed files recently"}]

Return ONLY the JSON array, no other text.`

      try {
        const responseText = await cliOneShot(prompt, undefined, 'haiku')
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0])
          mainWindow.webContents.send('reviewer-suggest:result', {
            success: true,
            suggestions
          })
        } else {
          mainWindow.webContents.send('reviewer-suggest:result', {
            success: false,
            error: 'Could not parse reviewer suggestions'
          })
        }
      } catch (error) {
        mainWindow.webContents.send('reviewer-suggest:result', {
          success: false,
          error: (error as Error).message
        })
      }

      return { success: true }
    }
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // PR CHAT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

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

  ipcMain.handle('add-message-to-pr-chat', async (_, prId: string, message: ChatMessage) => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAUDE CODE CLI
  // ═══════════════════════════════════════════════════════════════════════════

  ipcMain.handle('check-claude-code-installed', async () => {
    const { exec } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const { existsSync } = await import('node:fs')
    const { homedir } = await import('node:os')
    const execAsync = promisify(exec)

    const home = homedir()
    logger.info(LogCategory.APP, 'Checking for Claude Code CLI', { home })

    // Common paths where claude might be installed
    const possiblePaths = [
      `${home}/.volta/bin/claude`, // Volta
      '/usr/local/bin/claude', // Homebrew / manual
      '/opt/homebrew/bin/claude', // Homebrew on Apple Silicon
      `${home}/.local/bin/claude`, // pip/pipx style
      `${home}/.npm-global/bin/claude`, // npm global custom
      `${home}/n/bin/claude` // n (node version manager)
    ]

    // Build enhanced PATH including common locations
    const enhancedPath = [
      process.env.PATH,
      `${home}/.volta/bin`,
      `${home}/.local/bin`,
      '/usr/local/bin',
      '/opt/homebrew/bin',
      `${home}/.npm-global/bin`,
      `${home}/n/bin`
    ]
      .filter(Boolean)
      .join(':')

    // Check which paths exist
    for (const p of possiblePaths) {
      const exists = existsSync(p)
      logger.debug(LogCategory.APP, `Path check: ${p}`, { exists })
    }

    // Try with enhanced PATH first
    try {
      logger.info(LogCategory.APP, 'Trying claude with enhanced PATH')
      const { stdout, stderr } = await execAsync('claude --version', {
        env: { ...process.env, PATH: enhancedPath },
        shell: '/bin/zsh' // Use zsh which might have Volta configured
      })
      const version = stdout.trim()
      logger.info(LogCategory.APP, 'Claude Code CLI detected', { version, stderr: stderr?.trim() })
      setCachedClaudePath('claude') // Available via enhanced PATH
      return { installed: true, version }
    } catch (err) {
      logger.warn(LogCategory.APP, 'Enhanced PATH failed', { error: (err as Error).message })

      // Try direct paths
      for (const claudePath of possiblePaths) {
        if (!existsSync(claudePath)) continue

        try {
          logger.info(LogCategory.APP, `Trying direct path: ${claudePath}`)
          const { stdout } = await execAsync(`"${claudePath}" --version`, {
            env: { ...process.env, VOLTA_HOME: `${home}/.volta` },
            shell: '/bin/zsh'
          })
          const version = stdout.trim()
          logger.info(LogCategory.APP, 'Claude Code CLI detected at path', {
            path: claudePath,
            version
          })
          setCachedClaudePath(claudePath) // Cache the resolved path
          return { installed: true, version, path: claudePath }
        } catch (pathErr) {
          logger.warn(LogCategory.APP, `Path ${claudePath} failed`, {
            error: (pathErr as Error).message
          })
        }
      }

      logger.info(LogCategory.APP, 'Claude Code CLI not installed')
      return { installed: false, version: null }
    }
  })

  // Start Claude Code session
  ipcMain.handle(
    'claude:start',
    async (
      _,
      options: {
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
          githubToken: string
        }
        config?: {
          model?: string
          enableExtendedThinking?: boolean
          maxThinkingTokens?: number
        }
      }
    ) => {
      if (!mainWindow) {
        throw new Error('Main window not available')
      }
      await startClaudeCliSession(mainWindow, options)
    }
  )

  // Stop Claude Code session
  ipcMain.handle('claude:stop', (_, sessionId: string) => {
    return stopClaudeCliSession(sessionId)
  })
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

  // Initialize SQLite database
  initDatabase()
  registerPersistenceIpcHandlers()

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

// Save logs and cleanup before quitting
app.on('before-quit', () => {
  logger.info(LogCategory.APP, 'App shutting down')
  stopAllCliSessions()
  closeDatabase()
  logger.forceSave()
})
