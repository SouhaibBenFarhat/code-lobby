import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  // Token management
  getToken: () => Promise<string | null>
  setToken: (token: string) => Promise<{ success: boolean; user?: unknown; error?: string }>
  clearToken: () => Promise<{ success: boolean }>
  validateToken: () => Promise<{ valid: boolean; user?: unknown }>
  
  // GitHub API (GraphQL - one query gets everything!)
  fetchPRs: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  fetchAllPRsForRepos: (repoFullNames: string[]) => Promise<{ success: boolean; data?: unknown[]; currentUser?: string; rateLimit?: { limit: number; remaining: number; used: number; resetAt: string; percentage: number }; error?: string }>
  fetchPREvents: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  fetchPRChecks: (owner: string, repo: string, ref: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
  fetchContributedRepos: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
  
  // Settings
  getSettings: () => Promise<{ notifications: boolean; pollInterval: number; theme: string }>
  setSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>
  
  // Notifications
  showNotification: (title: string, body: string) => Promise<{ success: boolean }>
  
  // Repo order
  getRepoOrder: () => Promise<string[]>
  setRepoOrder: (order: string[]) => Promise<{ success: boolean }>
  
  // Rate limit
  getRateLimit: () => Promise<{ success: boolean; data?: { limit: number; remaining: number; used: number; resetAt: string; percentage: number }; error?: string }>
  
  // Card layouts (free-form positioning and sizing in pixels)
  getCardLayouts: () => Promise<Array<{ i: string; x: number; y: number; w: number; h: number }>>
  setCardLayouts: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => Promise<{ success: boolean }>
  
  // Selected repos (which repos to display)
  getSelectedRepos: () => Promise<string[]>
  setSelectedRepos: (repos: string[]) => Promise<{ success: boolean }>
  
  // PR Detail panel settings
  getPRDetailPanel: () => Promise<{ isOpen: boolean; width: number }>
  setPRDetailPanel: (settings: { isOpen?: boolean; width?: number }) => Promise<{ success: boolean }>
  
  // Repo colors
  getRepoColors: () => Promise<Record<string, string>>
  setRepoColor: (repoFullName: string, color: string | null) => Promise<{ success: boolean }>
  
  // View mode
  getViewMode: () => Promise<'canvas' | 'ide'>
  setViewMode: (mode: 'canvas' | 'ide') => Promise<{ success: boolean }>
  
  // IDE view settings
  getIDEViewSettings: () => Promise<{ sidebarWidth: number; expandedRepos: string[] }>
  setIDEViewSettings: (settings: { sidebarWidth?: number; expandedRepos?: string[] }) => Promise<{ success: boolean }>
  
  // Logging
  getLogs: () => Promise<Array<{ id: string; timestamp: string; level: string; category: string; message: string; details?: unknown }>>
  clearLogs: () => Promise<{ success: boolean }>
  exportLogs: () => Promise<string>
  getLogsSummary: () => Promise<{ total: number; byLevel: Record<string, number>; byCategory: Record<string, number> }>
  
  // AI Chat
  getClaudeApiKey: () => Promise<string | null>
  setClaudeApiKey: (key: string | null) => Promise<{ success: boolean; error?: string }>
  getChatHistory: () => Promise<Array<{ id: string; role: 'user' | 'assistant'; content: string; timestamp: string }>>
  sendChatMessage: (message: string) => Promise<{ success: boolean; message?: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }; error?: string }>
  clearChatHistory: () => Promise<{ success: boolean }>
}

const electronAPI: ElectronAPI = {
  // Token management
  getToken: () => ipcRenderer.invoke('get-token'),
  setToken: (token: string) => ipcRenderer.invoke('set-token', token),
  clearToken: () => ipcRenderer.invoke('clear-token'),
  validateToken: () => ipcRenderer.invoke('validate-token'),
  
  // GitHub API (GraphQL - one query gets everything!)
  fetchPRs: () => ipcRenderer.invoke('fetch-prs'),
  fetchAllPRsForRepos: (repoFullNames: string[]) => ipcRenderer.invoke('fetch-all-prs-for-repos', repoFullNames),
  fetchPREvents: () => ipcRenderer.invoke('fetch-pr-events'),
  fetchPRChecks: (owner: string, repo: string, ref: string) => 
    ipcRenderer.invoke('fetch-pr-checks', owner, repo, ref),
  fetchContributedRepos: () => ipcRenderer.invoke('fetch-contributed-repos'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('set-settings', settings),
  
  // Notifications
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  
  // Repo order
  getRepoOrder: () => ipcRenderer.invoke('get-repo-order'),
  setRepoOrder: (order: string[]) => ipcRenderer.invoke('set-repo-order', order),
  
  // Rate limit
  getRateLimit: () => ipcRenderer.invoke('get-rate-limit'),
  
  // Card layouts (free-form positioning and sizing)
  getCardLayouts: () => ipcRenderer.invoke('get-card-layouts'),
  setCardLayouts: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }>) => 
    ipcRenderer.invoke('set-card-layouts', layouts),
  
  // Selected repos (which repos to display)
  getSelectedRepos: () => ipcRenderer.invoke('get-selected-repos'),
  setSelectedRepos: (repos: string[]) => ipcRenderer.invoke('set-selected-repos', repos),
  
  // PR Detail panel settings
  getPRDetailPanel: () => ipcRenderer.invoke('get-pr-detail-panel'),
  setPRDetailPanel: (settings: { isOpen?: boolean; width?: number }) => ipcRenderer.invoke('set-pr-detail-panel', settings),
  
  // Repo colors
  getRepoColors: () => ipcRenderer.invoke('get-repo-colors'),
  setRepoColor: (repoFullName: string, color: string | null) => ipcRenderer.invoke('set-repo-color', repoFullName, color),
  
  // View mode
  getViewMode: () => ipcRenderer.invoke('get-view-mode'),
  setViewMode: (mode: 'canvas' | 'ide') => ipcRenderer.invoke('set-view-mode', mode),
  
  // IDE view settings
  getIDEViewSettings: () => ipcRenderer.invoke('get-ide-view-settings'),
  setIDEViewSettings: (settings: { sidebarWidth?: number; expandedRepos?: string[] }) => ipcRenderer.invoke('set-ide-view-settings', settings),
  
  // Logging
  getLogs: () => ipcRenderer.invoke('get-logs'),
  clearLogs: () => ipcRenderer.invoke('clear-logs'),
  exportLogs: () => ipcRenderer.invoke('export-logs'),
  getLogsSummary: () => ipcRenderer.invoke('get-logs-summary'),
  
  // AI Chat
  getClaudeApiKey: () => ipcRenderer.invoke('get-claude-api-key'),
  setClaudeApiKey: (key: string | null) => ipcRenderer.invoke('set-claude-api-key', key),
  getChatHistory: () => ipcRenderer.invoke('get-chat-history'),
  sendChatMessage: (message: string) => ipcRenderer.invoke('send-chat-message', message),
  clearChatHistory: () => ipcRenderer.invoke('clear-chat-history')
}

contextBridge.exposeInMainWorld('electron', electronAPI)
