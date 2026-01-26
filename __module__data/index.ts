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
  useAddCustomPrompt,
  // Network
  useAddNetworkRequest,
  // Pull Request
  useAddPRComment,
  // Settings
  useClearCache,
  useClearChat,
  useClearNetworkRequests,
  useClosePR,
  useConvertPRToDraft,
  useDeleteCustomPrompt,
  useFactoryReset,
  useMarkPRReady,
  useMergePR,
  // System
  useOpenExternal,
  useReopenPR,
  useSaveMessage,
  useSelectPR,
  useSetAIPanel,
  useSetCardLayouts,
  useSetClaudeApiKey,
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
  useValidatePersistedToken,
  useValidateToken
} from './mutations'
// Queries
export {
  // User / Auth
  type AuthData,
  // Settings
  useAIPanel,
  useCardLayouts,
  useClaudeApiKey,
  useClaudeModels,
  useCurrentUser,
  useCustomPrompts,
  useEnableThinking,
  useEnableWebFetch,
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
  useRepoColors,
  // Repository
  useRepos,
  useSelectedModel,
  useSelectedPR,
  useSelectedPRId,
  useSelectedRepos,
  useTheme,
  useUser,
  useViewMode
} from './queries'
// Types
export type {
  CardLayout,
  ChatMessage,
  CheckStatus,
  ClaudeModel,
  CustomPrompt,
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
