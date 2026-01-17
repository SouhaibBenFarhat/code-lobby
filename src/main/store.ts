import Store from 'electron-store'

interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

// Layout item for free-form canvas (pixel-based)
export interface LayoutItem {
  i: string      // Repo full_name as ID
  x: number      // X position in pixels
  y: number      // Y position in pixels
  w: number      // Width in pixels
  h: number      // Height in pixels
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
  thinking?: string  // Extended thinking content (for assistant messages)
  timestamp: string
}

// AI Chat settings
export interface AIChatSettings {
  claudeApiKey: string | null
  selectedModel: string | null
  enableThinking: boolean
  chatHistory: ChatMessage[]
}

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
  prDetailPanel: PanelSettings // PR detail panel state
  repoColors: Record<string, string> // Map of repo full_name to color hex
  viewMode: ViewMode // Current view mode (canvas or ide)
  ideViewSettings: IDEViewSettings // IDE view specific settings
  aiChat: AIChatSettings // AI chat settings and history
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
      enableThinking: false,
      chatHistory: []
    }
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
  return store.get('aiChat').enableThinking ?? false
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
