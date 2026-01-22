import Store from 'electron-store'

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
  enableWebSearch: boolean // Toggle for web search tool
  tavilyApiKey: string | null // Tavily API key for web search
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
      enableWebSearch: false, // Web search disabled by default
      tavilyApiKey: null, // Tavily API key for web search
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
    customQuickPrompts: [] // User-created quick prompts
  },
  encryptionKey: 'codelobby-secure-key'
})

export function getToken(): string | null {
  return store.get('token')
}

export function setToken(token: string): void {
  store.set('token', token)
}

export function clearToken(): void {
  store.delete('token')
  store.delete('user')
}

export function getUser(): GitHubUser | null {
  return store.get('user')
}

export function setUser(user: GitHubUser): void {
  store.set('user', user)
}

export function getSettings(): StoreSchema['settings'] {
  return store.get('settings')
}

export function setSettings(settings: Partial<StoreSchema['settings']>): void {
  const current = getSettings()
  store.set('settings', { ...current, ...settings })
}

export function getRepoOrder(): string[] {
  return store.get('repoOrder')
}

export function setRepoOrder(order: string[]): void {
  store.set('repoOrder', order)
}

export function getCardLayouts(): LayoutItem[] {
  return store.get('cardLayouts')
}

export function setCardLayouts(layouts: LayoutItem[]): void {
  store.set('cardLayouts', layouts)
}

export function getSelectedRepos(): string[] | null {
  return store.get('selectedRepos')
}

export function setSelectedRepos(repos: string[]): void {
  store.set('selectedRepos', repos)
}

// My PRs filter (shared across all views)
export function getMyPRsRepos(): string[] {
  return store.get('myPRsRepos')
}

export function setMyPRsRepos(repos: string[]): void {
  store.set('myPRsRepos', repos)
}

export function getPRDetailPanel(): PanelSettings {
  return store.get('prDetailPanel')
}

export function setPRDetailPanel(settings: Partial<PanelSettings>): void {
  const current = getPRDetailPanel()
  store.set('prDetailPanel', { ...current, ...settings })
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
  return store.get('aiChat').claudeApiKey
}

export function setClaudeApiKey(key: string | null): void {
  const current = store.get('aiChat')
  store.set('aiChat', { ...current, claudeApiKey: key })
}

export function getSelectedModel(): string | null {
  return store.get('aiChat').selectedModel
}

export function setSelectedModel(model: string | null): void {
  const current = store.get('aiChat')
  store.set('aiChat', { ...current, selectedModel: model })
}

export function getEnableThinking(): boolean {
  return store.get('aiChat').enableThinking ?? true
}

export function setEnableThinking(enabled: boolean): void {
  const current = store.get('aiChat')
  store.set('aiChat', { ...current, enableThinking: enabled })
}

// Web search settings
export function getEnableWebSearch(): boolean {
  return store.get('aiChat').enableWebSearch ?? false
}

export function setEnableWebSearch(enabled: boolean): void {
  const current = store.get('aiChat')
  store.set('aiChat', { ...current, enableWebSearch: enabled })
}

export function getTavilyApiKey(): string | null {
  return store.get('aiChat').tavilyApiKey ?? null
}

export function setTavilyApiKey(key: string | null): void {
  const current = store.get('aiChat')
  store.set('aiChat', { ...current, tavilyApiKey: key })
}

export function getChatHistory(): ChatMessage[] {
  return store.get('aiChat').chatHistory
}

export function addChatMessage(message: ChatMessage): void {
  const current = store.get('aiChat')
  store.set('aiChat', {
    ...current,
    chatHistory: [...current.chatHistory, message]
  })
}

export function clearChatHistory(): void {
  const current = store.get('aiChat')
  store.set('aiChat', { ...current, chatHistory: [] })
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
  return store.get('dataCache')
}

export function getPRDataCache(): DataCache['prData'] {
  return store.get('dataCache').prData
}

export function setPRDataCache(data: any, selectedRepos: string[]): void {
  const current = getDataCache()
  store.set('dataCache', {
    ...current,
    prData: {
      data,
      lastFetch: Date.now(),
      selectedRepos
    }
  })
}

export function getAllReposCache(): DataCache['allRepos'] {
  return store.get('dataCache').allRepos
}

export function setAllReposCache(data: any[]): void {
  const current = getDataCache()
  store.set('dataCache', {
    ...current,
    allRepos: {
      data,
      lastFetch: Date.now()
    }
  })
}

export function clearDataCache(): void {
  store.set('dataCache', { prData: null, allRepos: null })
}

/**
 * Clear all user data (used on logout or manual reset)
 * Preserves: settings (theme, notifications), Claude API key
 * Clears: all cached data, PR analyses, chat history, layouts, etc.
 */
export function clearAllUserData(): void {
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
  return store.get('prChats') || []
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

  store.set('prChats', updatedChats)
  return newChat
}

export function addMessageToPRChat(prId: string, message: ChatMessage): void {
  const chats = getPRChats()
  const index = chats.findIndex((c) => c.prId === prId)

  if (index >= 0) {
    chats[index].messages.push(message)
    chats[index].updatedAt = new Date().toISOString()
    store.set('prChats', chats)
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
    chats[index].messages = []
    chats[index].updatedAt = new Date().toISOString()
    store.set('prChats', chats)
  }
}

export function deletePRChat(prId: string): void {
  const chats = getPRChats()
  const filtered = chats.filter((c) => c.prId !== prId)
  store.set('prChats', filtered)

  // Clear activePRChatId if we deleted the active chat
  const activeChatId = getActivePRChatId()
  if (activeChatId === prId) {
    setActivePRChatId(null)
  }
}

export function clearAllPRChats(): void {
  store.set('prChats', [])
}

export function getActivePRChatId(): string | null {
  return store.get('activePRChatId')
}

export function setActivePRChatId(prId: string | null): void {
  store.set('activePRChatId', prId)
}

/**
 * Factory reset - completely wipes ALL data
 * This is equivalent to a fresh install of the app
 * Clears: EVERYTHING (token, settings, API keys, cache, history, layouts, etc.)
 */
export function factoryReset(): void {
  store.clear()
}

// ═══════════════════════════════════════════════════════════════════════════
// TANSTACK QUERY CACHE PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
// These functions allow TanStack Query to persist its cache to disk.
// This is the STANDARDIZED way to handle query caching in React apps.

export function getQueryCache(): string | null {
  return store.get('tanstackQueryCache') || null
}

export function setQueryCache(cache: string): void {
  store.set('tanstackQueryCache', cache)
}

export function clearQueryCache(): void {
  store.delete('tanstackQueryCache')
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
