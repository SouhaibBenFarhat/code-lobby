import { join } from 'node:path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'

// Set app name immediately at module load (before app.whenReady)
// This is required for macOS dock tooltip to show correct name
if (process.platform === 'darwin') {
  app.setName('CodeLobby')
}

import { LogCategory, mainLogger as logger } from '@logger/main'
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
  generateDailySpeech,
  getDefaultModel,
  sendMessage as sendClaudeMessage,
  sendMessageStreaming as sendClaudeMessageStreaming,
  sendMessageStreamingWithTools as sendClaudeMessageStreamingWithTools
} from './claude-api'
import { GENERAL_CHAT_SYSTEM_PROMPT } from './prompts'
import {
  addChatMessage,
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
  getClaudeApiKey,
  getCustomQuickPrompts,
  getEnableThinking,
  getEnableWebFetch,
  getPRAnalysis,
  getPRAnalysisPanelOpen,
  getPRChat,
  getPRChatMessages,
  getSelectedModel,
  resetAIUsage,
  setClaudeApiKey,
  setEnableThinking,
  setEnableWebFetch,
  setPRAnalysis,
  setPRAnalysisPanelOpen,
  setSelectedModel
} from './store'
import { executeWebFetch, FETCH_URL_TOOL } from './web-fetch'

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

// IPC Handlers - Only AI and native features
function setupIPCHandlers(): void {
  logger.info(LogCategory.APP, 'Setting up IPC handlers (AI + native features only)')

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAUDE AI CHAT
  // ═══════════════════════════════════════════════════════════════════════════

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
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'Claude API key not configured' }
      }

      logger.info(LogCategory.APP, 'Analyzing CI failure', {
        checkName: params.checkName
      })

      try {
        const result = await analyzeCIFailure(apiKey, params)
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
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'Claude API key not configured' }
      }

      const streamId = `ci-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const webContents = event.sender

      logger.info(LogCategory.APP, 'Starting streaming CI failure analysis', {
        checkName: params.checkName,
        streamId
      })

      try {
        analyzeCIFailureStreaming(apiKey, params, (chunk) => {
          webContents.send('ci-analysis-stream-chunk', { streamId, ...chunk })
        })

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

  // Generate daily speech from user events using AI
  ipcMain.handle(
    'generate-daily-speech',
    async (
      _,
      context: {
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
      }
    ) => {
      const apiKey = getClaudeApiKey()
      if (!apiKey) {
        return { success: false, error: 'No Claude API key configured' }
      }

      logger.info(LogCategory.API, 'Generating daily speech', {
        username: context.username,
        date: context.date,
        eventCount: context.events.length
      })

      const result = await generateDailySpeech(apiKey, context)
      return result
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
