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

// Direct GitHub access
export * as github from './github'
// Hooks
export { useNetworkTracking } from './hooks'
// Keys (for cache manipulation)
export { keys } from './keys'
// Mutations
export {
  useAddCustomPrompt,
  // Network
  useAddNetworkRequest,
  useAddPRComment,
  useClearCache,
  useClearNetworkRequests,
  useClearPRChatMessages,
  useClosePR,
  useConvertPRToDraft,
  useCreatePRChat,
  useDeleteCustomPrompt,
  useFactoryReset,
  useMarkPRReady,
  useMergePR,
  useOpenExternal,
  useRefreshPRDetail,
  useReopenPR,
  useSelectPR,
  useSendChatMessage,
  useSetAILoading,
  useSetAIPanel,
  useSetAIThinking,
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
  useSignIn,
  useSignOut,
  useSubmitPRReview,
  useSwitchToPRChat,
  // System
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
  useActivePRChatId,
  useAIPanel,
  useAIThinking,
  useCardLayouts,
  useChatHistory,
  useClaudeApiKey,
  useCurrentUser,
  useCustomPrompts,
  useEnableThinking,
  useEnableWebFetch,
  useGitHubToken,
  useIDESettings,
  useIsAILoading,
  useIsAuthenticated,
  // System
  useIsFullscreen,
  useMinimizedRepos,
  useMyPRsRepos,
  useNetworkPanel,
  useNetworkPanelHeight,
  // Network
  useNetworkRequests,
  usePRChats,
  usePRDetailPanel,
  usePRFiles,
  usePRs,
  usePRsForRepo,
  useRateLimit,
  useRepoColors,
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
