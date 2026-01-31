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

  // ═══════════════════════════════════════════════════════════════════════════
  // PR-specific queries - all share prefix ['github', 'pr', repoFullName, prNumber]
  // This allows invalidating ALL PR data at once with:
  //   queryClient.invalidateQueries({ queryKey: keys.pr(repoFullName, prNumber) })
  // ═══════════════════════════════════════════════════════════════════════════
  /** Base key for a specific PR - use to invalidate ALL PR-related queries */
  pr: (repoFullName: string, prNumber: number): readonly ['github', 'pr', string, number] =>
    ['github', 'pr', repoFullName, prNumber] as const,
  /** PR detail/metadata */
  prDetail: (
    repoFullName: string,
    prNumber: number
  ): readonly ['github', 'pr', string, number, 'detail'] =>
    ['github', 'pr', repoFullName, prNumber, 'detail'] as const,
  /** PR changed files with diffs */
  prFiles: (
    repoFullName: string,
    prNumber: number
  ): readonly ['github', 'pr', string, number, 'files'] =>
    ['github', 'pr', repoFullName, prNumber, 'files'] as const,
  /** Full file content from a specific ref/branch */
  fileContent: (
    repoFullName: string,
    ref: string,
    path: string
  ): readonly ['github', 'file-content', string, string, string] =>
    ['github', 'file-content', repoFullName, ref, path] as const,

  user: ['github', 'user'] as const,
  currentUser: ['github', 'current-user'] as const,
  rateLimit: ['github', 'rate-limit'] as const,
  contributions: ['github', 'contributions'] as const,
  userEvents: ['github', 'user-events'] as const,

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
  aiUsage: ['ai', 'usage'] as const,
  // Agentic action prompts (PERSISTED)
  agenticPrompts: ['ai', 'agentic-prompts'] as const,
  agenticSettingsOpen: ['local', 'agentic-settings-open'] as const,
  // Daily speeches (PERSISTED)
  dailySpeeches: ['ai', 'daily-speeches'] as const,
  dailySpeechModalOpen: ['local', 'daily-speech-modal-open'] as const,
  // Per-PR chat messages (each PR has its own cache entry)
  prChatMessages: (prId: string): readonly ['ai', 'pr-chat', string] =>
    ['ai', 'pr-chat', prId] as const,
  // Per-PR preview URL (persisted forever)
  previewUrl: (prId: string): readonly ['ai', 'preview-url', string] =>
    ['ai', 'preview-url', prId] as const,

  // Network (NOT persisted - runtime only)
  networkRequests: ['network', 'requests'] as const,
  networkPanelOpen: ['network', 'panel-open'] as const,

  // Local UI state (PERSISTED)
  local: {
    selectedPRId: ['local', 'selected-pr-id'] as const,
    isAILoading: ['local', 'is-ai-loading'] as const,
    networkPanelOpen: ['local', 'network-panel-open'] as const,
    networkPanelHeight: ['local', 'network-panel-height'] as const,
    userProfilePanel: ['local', 'user-profile-panel'] as const,
    codeVisualizer: ['local', 'code-visualizer'] as const
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
