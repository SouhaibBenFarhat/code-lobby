import { LogCategory, mainLogger as logger } from '@logger/main'
import Store from 'electron-store'

// ═══════════════════════════════════════════════════════════════════════════
// STORE OPERATION WRAPPERS WITH LOGGING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap a store GET operation with logging
 */
function storeGet<T>(key: string, getter: () => T): T {
  const startTime = performance.now()
  const result = getter()
  const durationMs = performance.now() - startTime

  // Only log if operation took more than 1ms (avoid noise for fast reads)
  if (durationMs > 1) {
    logger.debug(LogCategory.STORE, `GET ${key}`, {
      durationMs: Math.round(durationMs * 100) / 100
    })
  }

  return result
}

// Keys that are written frequently and should only log if slow (>100ms)
const HIGH_FREQUENCY_KEYS = new Set(['tanstackQueryCache'])

/**
 * Wrap a store SET operation with logging
 */
function storeSet<_T>(key: string, setter: () => void, details?: Record<string, unknown>): void {
  const startTime = performance.now()
  setter()
  const durationMs = performance.now() - startTime

  // Skip logging for high-frequency keys unless they're slow
  if (HIGH_FREQUENCY_KEYS.has(key) && durationMs < 100) {
    return
  }

  logger.debug(LogCategory.STORE, `SET ${key}`, {
    durationMs: Math.round(durationMs * 100) / 100,
    ...details
  })
}

/**
 * Wrap a store DELETE operation with logging
 */
function storeDelete(key: string, deleter: () => void): void {
  const startTime = performance.now()
  deleter()
  const durationMs = performance.now() - startTime

  logger.debug(LogCategory.STORE, `DELETE ${key}`, {
    durationMs: Math.round(durationMs * 100) / 100
  })
}

interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

// Layout item for free-form canvas (pixel-based)
export interface LayoutItem {
  i: string // Repo full_name as ID
  x: number // X position in pixels
  y: number // Y position in pixels
  w: number // Width in pixels
  h: number // Height in pixels
}

// PR Detail panel settings
export interface PanelSettings {
  isOpen: boolean
  width: number
}

// View modes
export type ViewMode = 'canvas' | 'ide'

// IDE view settings
export interface IDEViewSettings {
  sidebarWidth: number
  expandedRepos: string[] // Which repos are expanded in tree
}

// AI Chat message
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string // Extended thinking content (for assistant messages)
  timestamp: string
}

// AI Chat settings
export interface AIChatSettings {
  claudeApiKey: string | null
  selectedModel: string | null
  enableThinking: boolean
  chatHistory: ChatMessage[]
}

// AI Panel settings (for remembering open state and size)
export interface AIPanelSettings {
  isOpen: boolean
  width: number
}

// Persistent cache for API data (survives app restart)
export interface DataCache {
  prData: {
    data: any // PR data from GraphQL
    lastFetch: number // Timestamp of last fetch
    selectedRepos: string[] // Which repos this cache is for
  } | null
  allRepos: {
    data: any[] // All repositories
    lastFetch: number
  } | null
}

// PR Analysis (Why is this PR still open?)
export interface PRAnalysis {
  prId: string // Unique PR identifier (e.g., "owner/repo#123")
  analysis: string // AI-generated analysis
  generatedAt: number // Timestamp when analysis was generated
}

// PR Chat - AI chat linked to a specific PR
export interface PRChat {
  prId: string // Unique PR identifier (e.g., "owner/repo#123")
  prNumber: number
  prTitle: string
  repoFullName: string
  messages: ChatMessage[]
  systemContext?: string // Pre-loaded PR context (invisible to user, sent to AI as system prompt)
  createdAt: string
  updatedAt: string
}

// Custom quick prompt (user-created pre-prompts)
export interface CustomQuickPrompt {
  id: string
  label: string
  prompt: string
  createdAt: string
}

// AI Usage tracking (for cost calculation)
export interface AIUsage {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  /** Number of messages sent in CLI subscription mode */
  cliMessageCount: number
  sessionStartedAt: string // ISO timestamp when tracking started
  lastUpdatedAt: string // ISO timestamp of last usage
}

// Cache TTL constants (in milliseconds)
export const CACHE_TTL_PR_DATA = 30 * 60 * 1000 // 30 minutes
export const CACHE_TTL_ALL_REPOS = 30 * 60 * 1000 // 30 minutes

interface StoreSchema {
  token: string | null
  user: GitHubUser | null // Cache user info to avoid re-validation
  settings: {
    notifications: boolean
    pollInterval: number
    theme: 'light' | 'dark' | 'system'
  }
  repoOrder: string[] // Array of repo full_names in user's preferred order
  cardLayouts: LayoutItem[] // Free-form card positions and sizes
  selectedRepos: string[] | null // null = show all (default), [] = show none, array = show those
  myPRsRepos: string[] // Array of repo full_names with "My PRs" filter enabled (shared across views)
  prDetailPanel: PanelSettings // PR detail panel state
  repoColors: Record<string, string> // Map of repo full_name to color hex
  minimizedRepos: string[] // Array of repo full_names that are minimized in canvas view
  viewMode: ViewMode // Current view mode (canvas or ide)
  ideViewSettings: IDEViewSettings // IDE view specific settings
  aiChat: AIChatSettings // AI chat settings and history
  aiPanel: AIPanelSettings // AI panel open state and size
  dataCache: DataCache // Persistent cache for API data
  prAnalyses: PRAnalysis[] // Persisted AI analyses of PRs
  prAnalysisPanelStates: Record<string, boolean> // Panel open/closed state per PR (prId -> isOpen)
  prChats: PRChat[] // AI chats linked to specific PRs
  activePRChatId: string | null // Currently active PR chat (null = general chat)
  tanstackQueryCache: string | null // TanStack Query cache for standardized persistence
  customQuickPrompts: CustomQuickPrompt[] // User-created quick prompts
  aiUsage: AIUsage // Cumulative AI token usage and costs
}

const store = new Store<StoreSchema>({
  defaults: {
    token: null,
    user: null,
    settings: {
      notifications: true,
      pollInterval: 30000,
      theme: 'dark'
    },
    repoOrder: [],
    cardLayouts: [],
    selectedRepos: null, // null = show all (default)
    myPRsRepos: [], // Repos with "My PRs" filter enabled
    prDetailPanel: {
      isOpen: false,
      width: 400
    },
    repoColors: {}, // Empty = no custom colors
    minimizedRepos: [], // Empty = no minimized repos
    viewMode: 'canvas', // Default to canvas view
    ideViewSettings: {
      sidebarWidth: 280,
      expandedRepos: []
    },
    aiChat: {
      claudeApiKey: null,
      selectedModel: null,
      enableThinking: true, // Show Claude's reasoning by default
      chatHistory: []
    },
    aiPanel: {
      isOpen: false,
      width: 400
    },
    dataCache: {
      prData: null,
      allRepos: null
    },
    prAnalyses: [],
    prAnalysisPanelStates: {},
    prChats: [],
    activePRChatId: null,
    tanstackQueryCache: null, // TanStack Query cache (starts empty)
    customQuickPrompts: [], // User-created quick prompts
    aiUsage: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      cliMessageCount: 0,
      sessionStartedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString()
    }
  },
  encryptionKey: 'codelobby-secure-key'
})

export function getToken(): string | null {
  return storeGet('token', () => store.get('token'))
}

export function setToken(token: string): void {
  storeSet('token', () => store.set('token', token), { hasToken: !!token })
}

export function clearToken(): void {
  storeDelete('token', () => {
    store.delete('token')
    store.delete('user')
  })
  logger.info(LogCategory.STORE, 'Cleared token and user data')
}

export function getUser(): GitHubUser | null {
  return storeGet('user', () => store.get('user'))
}

export function setUser(user: GitHubUser): void {
  storeSet('user', () => store.set('user', user), { login: user.login })
}

export function getSettings(): StoreSchema['settings'] {
  return storeGet('settings', () => store.get('settings'))
}

export function setSettings(settings: Partial<StoreSchema['settings']>): void {
  const current = getSettings()
  storeSet('settings', () => store.set('settings', { ...current, ...settings }), {
    keys: Object.keys(settings)
  })
}

export function getRepoOrder(): string[] {
  return storeGet('repoOrder', () => store.get('repoOrder'))
}

export function setRepoOrder(order: string[]): void {
  storeSet('repoOrder', () => store.set('repoOrder', order), { count: order.length })
}

export function getCardLayouts(): LayoutItem[] {
  return storeGet('cardLayouts', () => store.get('cardLayouts'))
}

export function setCardLayouts(layouts: LayoutItem[]): void {
  storeSet('cardLayouts', () => store.set('cardLayouts', layouts), { count: layouts.length })
}

export function getSelectedRepos(): string[] | null {
  return storeGet('selectedRepos', () => store.get('selectedRepos'))
}

export function setSelectedRepos(repos: string[]): void {
  storeSet('selectedRepos', () => store.set('selectedRepos', repos), { count: repos.length })
}

// My PRs filter (shared across all views)
export function getMyPRsRepos(): string[] {
  return storeGet('myPRsRepos', () => store.get('myPRsRepos'))
}

export function setMyPRsRepos(repos: string[]): void {
  storeSet('myPRsRepos', () => store.set('myPRsRepos', repos), { count: repos.length })
}

export function getPRDetailPanel(): PanelSettings {
  return storeGet('prDetailPanel', () => store.get('prDetailPanel'))
}

export function setPRDetailPanel(settings: Partial<PanelSettings>): void {
  const current = getPRDetailPanel()
  storeSet('prDetailPanel', () => store.set('prDetailPanel', { ...current, ...settings }), {
    keys: Object.keys(settings)
  })
}

export function getRepoColors(): Record<string, string> {
  return store.get('repoColors')
}

export function setRepoColor(repoFullName: string, color: string | null): void {
  const current = getRepoColors()
  if (color === null) {
    delete current[repoFullName]
  } else {
    current[repoFullName] = color
  }
  store.set('repoColors', current)
}

// Minimized repos
export function getMinimizedRepos(): string[] {
  return store.get('minimizedRepos')
}

export function setRepoMinimized(repoFullName: string, isMinimized: boolean): void {
  const current = getMinimizedRepos()
  if (isMinimized && !current.includes(repoFullName)) {
    store.set('minimizedRepos', [...current, repoFullName])
  } else if (!isMinimized && current.includes(repoFullName)) {
    store.set(
      'minimizedRepos',
      current.filter((r) => r !== repoFullName)
    )
  }
}

// View mode
export function getViewMode(): ViewMode {
  return store.get('viewMode')
}

export function setViewMode(mode: ViewMode): void {
  store.set('viewMode', mode)
}

// IDE view settings
export function getIDEViewSettings(): IDEViewSettings {
  return store.get('ideViewSettings')
}

export function setIDEViewSettings(settings: Partial<IDEViewSettings>): void {
  const current = getIDEViewSettings()
  store.set('ideViewSettings', { ...current, ...settings })
}

// AI Chat
export function getClaudeApiKey(): string | null {
  return storeGet('aiChat.claudeApiKey', () => store.get('aiChat').claudeApiKey)
}

export function setClaudeApiKey(key: string | null): void {
  const current = store.get('aiChat')
  storeSet('aiChat.claudeApiKey', () => store.set('aiChat', { ...current, claudeApiKey: key }), {
    hasKey: !!key
  })
}

export function getSelectedModel(): string | null {
  return storeGet('aiChat.selectedModel', () => store.get('aiChat').selectedModel)
}

export function setSelectedModel(model: string | null): void {
  const current = store.get('aiChat')
  storeSet(
    'aiChat.selectedModel',
    () => store.set('aiChat', { ...current, selectedModel: model }),
    {
      model
    }
  )
}

export function getEnableThinking(): boolean {
  return storeGet('aiChat.enableThinking', () => store.get('aiChat').enableThinking ?? true)
}

export function setEnableThinking(enabled: boolean): void {
  const current = store.get('aiChat')
  storeSet(
    'aiChat.enableThinking',
    () => store.set('aiChat', { ...current, enableThinking: enabled }),
    { enabled }
  )
}

export function getChatHistory(): ChatMessage[] {
  return storeGet('aiChat.chatHistory', () => store.get('aiChat').chatHistory)
}

export function addChatMessage(message: ChatMessage): void {
  const current = store.get('aiChat')
  storeSet(
    'aiChat.chatHistory',
    () =>
      store.set('aiChat', {
        ...current,
        chatHistory: [...current.chatHistory, message]
      }),
    { role: message.role, messageCount: current.chatHistory.length + 1 }
  )
}

export function clearChatHistory(): void {
  const current = store.get('aiChat')
  storeSet('aiChat.chatHistory', () => store.set('aiChat', { ...current, chatHistory: [] }))
  logger.info(LogCategory.STORE, 'Cleared chat history')
}

// AI Panel settings
export function getAIPanel(): AIPanelSettings {
  return store.get('aiPanel')
}

export function setAIPanel(settings: Partial<AIPanelSettings>): void {
  const current = getAIPanel()
  store.set('aiPanel', { ...current, ...settings })
}

// Data Cache (persistent across app restarts)
export function getDataCache(): DataCache {
  return storeGet('dataCache', () => store.get('dataCache'))
}

export function getPRDataCache(): DataCache['prData'] {
  return storeGet('dataCache.prData', () => store.get('dataCache').prData)
}

export function setPRDataCache(data: any, selectedRepos: string[]): void {
  const current = getDataCache()
  storeSet(
    'dataCache.prData',
    () =>
      store.set('dataCache', {
        ...current,
        prData: {
          data,
          lastFetch: Date.now(),
          selectedRepos
        }
      }),
    { repoCount: selectedRepos.length }
  )
}

export function getAllReposCache(): DataCache['allRepos'] {
  return storeGet('dataCache.allRepos', () => store.get('dataCache').allRepos)
}

export function setAllReposCache(data: any[]): void {
  const current = getDataCache()
  storeSet(
    'dataCache.allRepos',
    () =>
      store.set('dataCache', {
        ...current,
        allRepos: {
          data,
          lastFetch: Date.now()
        }
      }),
    { repoCount: data.length }
  )
}

export function clearDataCache(): void {
  storeSet('dataCache', () => store.set('dataCache', { prData: null, allRepos: null }))
  logger.info(LogCategory.STORE, 'Cleared data cache')
}

/**
 * Clear all user data (used on logout or manual reset)
 * Preserves: settings (theme, notifications), Claude API key
 * Clears: all cached data, PR analyses, chat history, layouts, etc.
 */
export function clearAllUserData(): void {
  const startTime = performance.now()

  // Clear cached data
  store.set('dataCache', { prData: null, allRepos: null })

  // Clear user info
  store.set('user', null)

  // Clear PR-related data
  store.set('prAnalyses', [])
  store.set('prAnalysisPanelStates', {})
  store.set('prChats', [])
  store.set('activePRChatId', null)

  // Clear chat history (but keep API key and model selection)
  const aiChat = store.get('aiChat')
  store.set('aiChat', {
    ...aiChat,
    chatHistory: []
  })

  // Clear layout data
  store.set('cardLayouts', [])
  store.set('repoColors', {})
  store.set('minimizedRepos', [])
  store.set('selectedRepos', null) // null = show all (default)
  store.set('myPRsRepos', [])
  store.set('repoOrder', [])

  // Reset IDE view
  store.set('ideViewSettings', {
    sidebarWidth: 280,
    expandedRepos: []
  })

  // Clear TanStack Query cache
  store.delete('tanstackQueryCache')

  const durationMs = performance.now() - startTime
  logger.info(LogCategory.STORE, 'Cleared all user data', {
    durationMs: Math.round(durationMs * 100) / 100,
    preserved: ['settings', 'claudeApiKey', 'selectedModel']
  })
}

export function isCacheValid(lastFetch: number | undefined, ttl: number): boolean {
  if (!lastFetch) return false
  return Date.now() - lastFetch < ttl
}

// PR Analysis persistence
export function getPRAnalyses(): PRAnalysis[] {
  return store.get('prAnalyses') || []
}

export function getPRAnalysis(prId: string): PRAnalysis | null {
  const analyses = getPRAnalyses()
  return analyses.find((a) => a.prId === prId) || null
}

export function setPRAnalysis(prId: string, analysis: string): void {
  const analyses = getPRAnalyses()
  const existingIndex = analyses.findIndex((a) => a.prId === prId)
  const newAnalysis: PRAnalysis = {
    prId,
    analysis,
    generatedAt: Date.now()
  }

  if (existingIndex >= 0) {
    analyses[existingIndex] = newAnalysis
  } else {
    analyses.push(newAnalysis)
  }

  // Keep only the last 100 analyses to prevent unbounded growth
  const trimmed = analyses.slice(-100)
  store.set('prAnalyses', trimmed)
}

export function deletePRAnalysis(prId: string): void {
  const analyses = getPRAnalyses()
  const filtered = analyses.filter((a) => a.prId !== prId)
  store.set('prAnalyses', filtered)
}

export function clearPRAnalyses(): void {
  store.set('prAnalyses', [])
}

// PR Analysis Panel State (open/closed per PR)
export function getPRAnalysisPanelStates(): Record<string, boolean> {
  return store.get('prAnalysisPanelStates') || {}
}

export function getPRAnalysisPanelOpen(prId: string): boolean {
  const states = getPRAnalysisPanelStates()
  return states[prId] ?? false // Default to closed
}

export function setPRAnalysisPanelOpen(prId: string, isOpen: boolean): void {
  const states = getPRAnalysisPanelStates()
  states[prId] = isOpen

  // Keep only the last 200 entries to prevent unbounded growth
  const entries = Object.entries(states)
  if (entries.length > 200) {
    const trimmed = Object.fromEntries(entries.slice(-200))
    store.set('prAnalysisPanelStates', trimmed)
  } else {
    store.set('prAnalysisPanelStates', states)
  }
}

export function clearPRAnalysisPanelStates(): void {
  store.set('prAnalysisPanelStates', {})
}

// PR Chat functions
const MAX_PR_CHATS = 50 // Limit to prevent unbounded growth

export function getPRChats(): PRChat[] {
  return storeGet('prChats', () => store.get('prChats') || [])
}

export function getPRChat(prId: string): PRChat | null {
  const chats = getPRChats()
  return chats.find((c) => c.prId === prId) || null
}

export function createPRChat(
  prId: string,
  prNumber: number,
  prTitle: string,
  repoFullName: string,
  systemContext?: string
): PRChat {
  const chats = getPRChats()

  // Check if chat already exists
  const existing = chats.find((c) => c.prId === prId)
  if (existing) {
    logger.debug(LogCategory.STORE, 'PR chat already exists', { prId })
    return existing
  }

  const newChat: PRChat = {
    prId,
    prNumber,
    prTitle,
    repoFullName,
    messages: [],
    systemContext,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  // Add new chat and trim if over limit
  const updatedChats = [...chats, newChat]
  if (updatedChats.length > MAX_PR_CHATS) {
    // Remove oldest chats (by createdAt)
    updatedChats.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    updatedChats.splice(MAX_PR_CHATS)
  }

  storeSet('prChats', () => store.set('prChats', updatedChats), {
    prId,
    totalChats: updatedChats.length
  })

  return newChat
}

export function addMessageToPRChat(prId: string, message: ChatMessage): void {
  const chats = getPRChats()
  const index = chats.findIndex((c) => c.prId === prId)

  if (index >= 0) {
    chats[index].messages.push(message)
    chats[index].updatedAt = new Date().toISOString()
    storeSet('prChats.message', () => store.set('prChats', chats), {
      prId,
      role: message.role,
      messageCount: chats[index].messages.length
    })
  }
}

export function getPRChatMessages(prId: string): ChatMessage[] {
  const chat = getPRChat(prId)
  return chat?.messages || []
}

export function clearPRChatMessages(prId: string): void {
  const chats = getPRChats()
  const index = chats.findIndex((c) => c.prId === prId)

  if (index >= 0) {
    const oldCount = chats[index].messages.length
    chats[index].messages = []
    chats[index].updatedAt = new Date().toISOString()
    storeSet('prChats.messages', () => store.set('prChats', chats), {
      prId,
      clearedMessages: oldCount
    })
  }
}

export function deletePRChat(prId: string): void {
  const chats = getPRChats()
  const filtered = chats.filter((c) => c.prId !== prId)
  storeSet('prChats', () => store.set('prChats', filtered), {
    deletedPrId: prId,
    remainingChats: filtered.length
  })

  // Clear activePRChatId if we deleted the active chat
  const activeChatId = getActivePRChatId()
  if (activeChatId === prId) {
    setActivePRChatId(null)
  }
}

export function clearAllPRChats(): void {
  storeSet('prChats', () => store.set('prChats', []))
  logger.info(LogCategory.STORE, 'Cleared all PR chats')
}

export function getActivePRChatId(): string | null {
  return storeGet('activePRChatId', () => store.get('activePRChatId'))
}

export function setActivePRChatId(prId: string | null): void {
  storeSet('activePRChatId', () => store.set('activePRChatId', prId), { prId })
}

/**
 * Factory reset - completely wipes ALL data
 * This is equivalent to a fresh install of the app
 * Clears: EVERYTHING (token, settings, API keys, cache, history, layouts, etc.)
 */
export function factoryReset(): void {
  const startTime = performance.now()
  store.clear()
  const durationMs = performance.now() - startTime

  logger.info(LogCategory.STORE, '🔄 FACTORY RESET - All data wiped', {
    durationMs: Math.round(durationMs * 100) / 100
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// TANSTACK QUERY CACHE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
// These functions allow TanStack Query to persist its cache to disk.
// This is the STANDARDIZED way to handle query caching in React apps.

export function getQueryCache(): string | null {
  return storeGet('tanstackQueryCache', () => store.get('tanstackQueryCache') || null)
}

export function setQueryCache(cache: string): void {
  const sizeKB = Math.round((new TextEncoder().encode(cache).length / 1024) * 10) / 10
  storeSet('tanstackQueryCache', () => store.set('tanstackQueryCache', cache), {
    sizeKB
  })
}

export function clearQueryCache(): void {
  storeDelete('tanstackQueryCache', () => store.delete('tanstackQueryCache'))
  logger.info(LogCategory.STORE, 'Cleared TanStack Query cache')
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM QUICK PROMPTS
// ═══════════════════════════════════════════════════════════════════════════
// User-created pre-prompts for the AI chat

export function getCustomQuickPrompts(): CustomQuickPrompt[] {
  return store.get('customQuickPrompts') || []
}

export function addCustomQuickPrompt(label: string, prompt: string): CustomQuickPrompt {
  const prompts = getCustomQuickPrompts()
  const newPrompt: CustomQuickPrompt = {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    label,
    prompt,
    createdAt: new Date().toISOString()
  }
  prompts.push(newPrompt)
  store.set('customQuickPrompts', prompts)
  return newPrompt
}

export function deleteCustomQuickPrompt(id: string): boolean {
  const prompts = getCustomQuickPrompts()
  const index = prompts.findIndex((p) => p.id === id)
  if (index === -1) return false
  prompts.splice(index, 1)
  store.set('customQuickPrompts', prompts)
  return true
}

// ═══════════════════════════════════════════════════════════════════════════
// AI USAGE TRACKING
// ═══════════════════════════════════════════════════════════════════════════
// Track cumulative token usage and costs for AI features

export function getAIUsage(): AIUsage {
  return storeGet('aiUsage', () => store.get('aiUsage'))
}

export function addAIUsage(inputTokens: number, outputTokens: number, costUsd: number): void {
  const current = getAIUsage()
  const updated: AIUsage = {
    totalInputTokens: current.totalInputTokens + inputTokens,
    totalOutputTokens: current.totalOutputTokens + outputTokens,
    totalCostUsd: current.totalCostUsd + costUsd,
    cliMessageCount: current.cliMessageCount ?? 0,
    sessionStartedAt: current.sessionStartedAt,
    lastUpdatedAt: new Date().toISOString()
  }
  storeSet('aiUsage', () => store.set('aiUsage', updated), {
    addedInputTokens: inputTokens,
    addedOutputTokens: outputTokens,
    addedCostUsd: Math.round(costUsd * 10000) / 10000
  })
}

export function addCliMessageCount(): void {
  const current = getAIUsage()
  const updated: AIUsage = {
    ...current,
    cliMessageCount: (current.cliMessageCount ?? 0) + 1,
    lastUpdatedAt: new Date().toISOString()
  }
  storeSet('aiUsage.cliMessageCount', () => store.set('aiUsage', updated))
}

export function resetAIUsage(): void {
  const fresh: AIUsage = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCostUsd: 0,
    cliMessageCount: 0,
    sessionStartedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString()
  }
  storeSet('aiUsage', () => store.set('aiUsage', fresh))
  logger.info(LogCategory.STORE, 'Reset AI usage tracking')
}
