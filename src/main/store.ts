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
    repoColors: {} // Empty = no custom colors
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
