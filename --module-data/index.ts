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
export { QueryClientProvider, queryClient, useQueryClient } from './client'

// API Endpoints
export {
  CLAUDE_API,
  CLAUDE_MESSAGES,
  CLAUDE_MODELS,
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
  // Network
  useAddNetworkRequest,
  // Pull Request
  useAddPRComment,
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
  useFactoryReset,
  useMarkPRReady,
  useMergePR,
  // Code Visualizer
  useOpenCodeVisualizer,
  // System
  useOpenExternal,
  useReopenPR,
  useResetAIUsage,
  // Daily Speech
  useSaveDailySpeech,
  useSaveMessage,
  useSelectPR,
  // Agentic Settings
  useSetAgenticPrompts,
  useSetAgenticSettingsOpen,
  useSetAIPanel,
  useSetCardLayouts,
  useSetClaudeApiKey,
  // Code Visualizer
  useSetCodeVisualizer,
  useSetDailySpeechModalOpen,
  useSetEnableThinking,
  useSetEnableWebFetch,
  useSetIDESettings,
  useSetNetworkPanel,
  useSetNetworkPanelHeight,
  useSetNetworkPanelOpen,
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
  useToggleFullscreen,
  useToggleMyPRsFilter,
  useToggleNetworkPanel,
  useToggleRepoExpanded,
  useUpdateNetworkRequest,
  useUpdatePRBody,
  useUpdatePRBranch,
  useUpdatePRTitle,
  useValidatePersistedToken,
  useValidateToken
} from './mutations'
// Queries
export {
  // User / Auth
  type AuthData,
  // Contributions & Events
  type ContributionsData,
  // AI
  type FindPreviewUrlParams,
  type UserEvent,
  type UserProfilePanel,
  // Agentic Settings
  useAgenticPrompts,
  useAgenticSettingsOpen,
  // Settings
  useAIPanel,
  // AI
  useAIUsage,
  useCardLayouts,
  useClaudeApiKey,
  useClaudeModels,
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
  useEnableWebFetch,
  // File Content (Code Visualizer)
  useFileContent,
  useFindPreviewUrl,
  useGitHubToken,
  useIDESettings,
  useIsAuthenticated,
  // System
  useIsFullscreen,
  useMinimizedRepos,
  useMyPRsRepos,
  useNetworkPanel,
  useNetworkPanelHeight,
  // Network
  useNetworkRequests,
  usePRChatMessages,
  usePRDetailPanel,
  // Pull Request
  usePRFiles,
  usePRs,
  usePRsForRepo,
  // Rate Limit
  useRateLimit,
  useRefreshContributions,
  useRefreshUserEvents,
  useRepoColors,
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
  AgenticPrompts,
  AIUsage,
  CardLayout,
  ChatMessage,
  CheckStatus,
  ClaudeModel,
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
  PRFile,
  PRIdentifier,
  PRReview,
  PullRequest,
  RateLimit,
  Repository,
  ReviewComment,
  ReviewDecision,
  ReviewEvent,
  ReviewThread,
  ViewMode
} from './types'
