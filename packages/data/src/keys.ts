/**
 * Query Keys
 *
 * Keys starting with 'settings' or 'ai' are persisted to localStorage.
 * Keys starting with 'github' are fetched fresh.
 * Keys starting with 'local' are persisted (UI state).
 */

export const keys = {
  // GitHub (NOT persisted - fetch fresh)
  repos: ['github', 'repos'] as const,
  // Per-repo PR cache (each repo has its own cache entry)
  prsForRepo: (repoFullName: string): readonly ['github', 'prs', string] =>
    ['github', 'prs', repoFullName] as const,
  // Legacy: combined key (deprecated - use prsForRepo instead)
  prs: (repoFullNames: string[]): readonly ['github', 'prs', ...string[]] =>
    ['github', 'prs', ...repoFullNames.sort()] as const,
  prDetail: (
    repoFullName: string,
    prNumber: number
  ): readonly ['github', 'pr-detail', string, number] =>
    ['github', 'pr-detail', repoFullName, prNumber] as const,
  prFiles: (
    owner: string,
    repo: string,
    prNumber: number
  ): readonly ['github', 'pr-files', string, string, number] =>
    ['github', 'pr-files', owner, repo, prNumber] as const,
  user: ['github', 'user'] as const,
  currentUser: ['github', 'current-user'] as const,
  rateLimit: ['github', 'rate-limit'] as const,

  // Settings (PERSISTED)
  selectedRepos: ['settings', 'selected-repos'] as const,
  viewMode: ['settings', 'view-mode'] as const,
  aiPanel: ['settings', 'ai-panel'] as const,
  prDetailPanel: ['settings', 'pr-detail-panel'] as const,
  ideSettings: ['settings', 'ide-settings'] as const,
  cardLayouts: ['settings', 'card-layouts'] as const,
  repoColors: ['settings', 'repo-colors'] as const,
  minimizedRepos: ['settings', 'minimized-repos'] as const,
  myPRsRepos: ['settings', 'my-prs-repos'] as const,
  githubToken: ['settings', 'github-token'] as const,

  // AI (PERSISTED)
  claudeApiKey: ['ai', 'claude-api-key'] as const,
  claudeModels: ['ai', 'claude-models'] as const,
  selectedModel: ['ai', 'selected-model'] as const,
  enableThinking: ['ai', 'enable-thinking'] as const,
  enableWebFetch: ['ai', 'enable-web-fetch'] as const,
  customPrompts: ['ai', 'custom-prompts'] as const,
  // Per-PR chat messages (each PR has its own cache entry)
  prChatMessages: (prId: string): readonly ['ai', 'pr-chat', string] =>
    ['ai', 'pr-chat', prId] as const,

  // Network (NOT persisted - runtime only)
  networkRequests: ['network', 'requests'] as const,
  networkPanelOpen: ['network', 'panel-open'] as const,

  // Local UI state (PERSISTED)
  local: {
    selectedPRId: ['local', 'selected-pr-id'] as const,
    isAILoading: ['local', 'is-ai-loading'] as const,
    networkPanelOpen: ['local', 'network-panel-open'] as const,
    networkPanelHeight: ['local', 'network-panel-height'] as const
  },

  // For backward compat - keep flat keys
  selectedPRId: ['local', 'selected-pr-id'] as const,
  isAILoading: ['local', 'is-ai-loading'] as const,

  // System (native/OS state)
  system: {
    fullscreen: ['system', 'fullscreen'] as const,
    theme: ['system', 'theme'] as const
  }
} as const
