/**
 * @codelobby/data - The Single Source of Truth
 *
 * Architecture:
 *   Component → TanStack hooks → fetch()/queryCache
 *
 * Persistence:
 *   - Settings & AI data: Persisted to localStorage automatically
 *   - GitHub data: Fetched fresh (not persisted)
 */

// Client
export {
  isQueryCacheHydrated,
  QueryClientProvider,
  queryClient,
  useQueryClient,
  waitForHydration
} from './client'

// API Endpoints
export {
  GITHUB_API,
  GITHUB_GRAPHQL
} from './endpoints'
// Direct GitHub access
export * as github from './github'
// HTTP Client
export { type HttpError, http } from './http'
// Keys (for cache manipulation)
export { keys } from './keys'
// Mutations
export {
  type ReviewCommentInput,
  // AI Mutations
  useAddAIUsage,
  useAddCustomPrompt,
  // Labels
  useAddLabels,
  // Network
  useAddNetworkRequest,
  // Pull Request
  useAddPRComment,
  // Webview Tabs
  useAddWebviewTab,
  // Settings
  useClearCache,
  useClearChat,
  useClearNetworkRequests,
  // Code Visualizer
  useCloseCodeVisualizer,
  useClosePR,
  useConvertPRToDraft,
  useDeleteCustomPrompt,
  // Daily Speech
  useDeleteDailySpeech,
  useDeletePRComment,
  useFactoryReset,
  useMarkPRReady,
  useMergePR,
  // Multi-account
  useMigrateAccounts,
  // Code Visualizer
  useOpenCodeVisualizer,
  // System
  useOpenExternal,
  useRemoveAccount,
  // Labels
  useRemoveLabel,
  // Webview Tabs
  useRemoveWebviewTab,
  useReopenPR,
  useReplyToReviewComment,
  useResetAIUsage,
  // Review Threads
  useResolveReviewThread,
  // Daily Speech
  useSaveDailySpeech,
  useSaveMessage,
  useSelectPR,
  useSetAIPanel,
  useSetCardLayouts,
  useSetClaudeApiKey,
  // Code Visualizer
  useSetCodeVisualizer,
  useSetDailySpeechModalOpen,
  useSetEnableThinking,
  useSetIDESettings,
  useSetNetworkPanel,
  useSetNetworkPanelHeight,
  useSetNetworkPanelOpen,
  // Webview Tabs
  useSetPRActiveTab,
  useSetPRDetailPanel,
  useSetRepoColor,
  useSetRepoMinimized,
  useSetSelectedModel,
  useSetSelectedRepos,
  useSetTheme,
  useSetUserProfilePanel,
  useSetViewMode,
  useShowNotification,
  // User / Auth
  useSignIn,
  useSignOut,
  useSubmitPRReview,
  useSubmitPRReviewWithComments,
  useSwitchAccount,
  useToggleFullscreen,
  useToggleMyPRsFilter,
  useToggleNetworkPanel,
  useToggleRepoExpanded,
  useUnresolveReviewThread,
  useUpdateCustomPrompt,
  useUpdateNetworkRequest,
  useUpdatePRBody,
  useUpdatePRBranch,
  useUpdatePRTitle,
  // Webview Tabs
  useUpdateWebviewTab,
  // Screenshot Upload
  useUploadScreenshot,
  useValidatePersistedToken,
  useValidateToken
} from './mutations'
// Queries
export {
  // User / Auth
  type AuthData,
  // Claude Code CLI
  type ClaudeCodeStatus,
  // GitHub Status
  type ComponentStatus,
  // Contributions & Events
  type ContributionsData,
  // AI
  type GitHubStatusComponent,
  type GitHubStatusSummary,
  type MemoryUsage,
  // Theme
  type ThemeVariant,
  type UserEvent,
  type UserProfilePanel,
  // Multi-account
  useAccounts,
  useActiveAccount,
  useActiveAccountId,
  // Settings
  useAIPanel,
  // AI
  useAIUsage,
  useCardLayouts,
  useClaudeApiKey,
  useClaudeApiKeyStatus,
  // Claude Code CLI
  useClaudeCodeStatus,
  useCliUsageStats,
  // Code Visualizer
  useCodeVisualizer,
  // Contributions
  useContributions,
  useCurrentUser,
  useCustomPrompts,
  useDailySpeeches,
  // Daily Speech
  useDailySpeechModalOpen,
  useEnableThinking,
  // File Content (Code Visualizer)
  useFileContent,
  useGitHubStatus,
  useGitHubToken,
  useIDESettings,
  useIsAuthenticated,
  // System
  useIsFullscreen,
  // Memory Usage
  useMemoryUsage,
  useMinimizedRepos,
  useMyPRsRepos,
  useNetworkPanel,
  useNetworkPanelHeight,
  // Network
  useNetworkRequests,
  // Webview Tabs
  usePRActiveTab,
  usePRChatMessages,
  usePRDetailPanel,
  // Pull Request
  usePRFiles,
  usePRs,
  usePRsForRepo,
  // Webview Tabs
  usePRWebviewTabs,
  // Rate Limit
  useRateLimit,
  useRefreshContributions,
  useRefreshUserEvents,
  useRepoColors,
  // Labels
  useRepoLabels,
  // Repository
  useRepos,
  useSelectedModel,
  useSelectedPR,
  useSelectedPRId,
  useSelectedRepos,
  useTheme,
  useUser,
  useUserEvents,
  useUserProfilePanel,
  useViewMode
} from './queries'
// Types
export type {
  Account,
  AIUsage,
  CardLayout,
  ChatMessage,
  CheckStatus,
  ClaudeModel,
  CliUsageStats,
  CodeVisualizerState,
  CustomPrompt,
  DailySpeech,
  GitHubUser,
  MergeableState,
  MergeMethod,
  MergeStateStatus,
  NetworkRequest,
  PRChat,
  PRComment,
  PRCommit,
  PRFile,
  PRIdentifier,
  PRReview,
  PRWebviewTab,
  PullRequest,
  RateLimit,
  Repository,
  ReviewComment,
  ReviewDecision,
  ReviewEvent,
  ReviewThread,
  ViewMode
} from './types'

// =============================================================================
// REVIEWER SUGGESTION (AGENTIC)
// =============================================================================

export type {
  ReviewerSuggestionResult,
  ReviewerSuggestRequest,
  SuggestedReviewer
} from './reviewer-suggest'

export {
  setPendingReviewerRequest,
  useReviewerSuggestListener,
  useSuggestReviewers,
  useTriggerReviewerSuggestion
} from './reviewer-suggest'

// =============================================================================
// CLAUDE CODE CLI INTEGRATION
// =============================================================================

// Claude Code Types
export type {
  ClaudeMessage,
  ClaudeSession,
  ClaudeSessionComplete,
  ClaudeStartRequest,
  ClaudeStreamChunk,
  FormattedActivity,
  RepoContext,
  SessionStatus,
  StoredSession,
  StreamEvent,
  ToolActivity,
  ToolHistoryEntry,
  ToolResult
} from './claude-code'
// Claude Code Constants
// Claude Code Hooks
// Claude Code Parser
// Claude Code Persistence
export {
  type ClaudeReviewData,
  claudeKeys,
  formatToolActivity,
  formatToolResult,
  getGeneralSessionId,
  getPRSessionId,
  initSessionCache,
  isTerminalEvent,
  parsePRSessionId,
  TOOL_DISPLAY_NAMES,
  useClaudeReviewListener,
  useClaudeSession,
  useClaudeStreamListener,
  useClearSession,
  useDeleteSession,
  useIsStreaming,
  useMessageReview,
  useSendMessage,
  useSessionMessages,
  useSessionReviews,
  useStopClaude,
  useThinking,
  useToolActivity
} from './claude-code'

// =============================================================================
// GITHUB DEVICE FLOW SIGN-IN
// =============================================================================

export {
  type GitHubAuthStatus,
  type GitHubDeviceAuthState,
  useGitHubDeviceAuth
} from './github-auth'
