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
  selectedRepos: string[] // Array of repo full_names to display (empty = show all)
  myPRsRepos: string[] // Array of repo full_names with "My PRs" filter enabled (shared across views)
  prDetailPanel: PanelSettings // PR detail panel state
  repoColors: Record<string, string> // Map of repo full_name to color hex
  viewMode: ViewMode // Current view mode (canvas or ide)
  ideViewSettings: IDEViewSettings // IDE view specific settings
  aiChat: AIChatSettings // AI chat settings and history
  aiPanel: AIPanelSettings // AI panel open state and size
  dataCache: DataCache // Persistent cache for API data
  prAnalyses: PRAnalysis[] // Persisted AI analyses of PRs
  prAnalysisPanelStates: Record<string, boolean> // Panel open/closed state per PR (prId -> isOpen)
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
    selectedRepos: [], // Empty means show all
    myPRsRepos: [], // Repos with "My PRs" filter enabled
    prDetailPanel: {
      isOpen: false,
      width: 400
    },
    repoColors: {}, // Empty = no custom colors
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
    prAnalysisPanelStates: {}
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

export function getSelectedRepos(): string[] {
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
