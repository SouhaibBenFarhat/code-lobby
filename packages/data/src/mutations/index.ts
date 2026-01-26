/**
 * Mutation Exports
 */

// AI
export {
  useAddCustomPrompt,
  useClearChat,
  useDeleteCustomPrompt,
  useSaveMessage,
  useSetClaudeApiKey,
  useSetEnableThinking,
  useSetEnableWebFetch,
  useSetSelectedModel
} from './ai'
// Network
export {
  useAddNetworkRequest,
  useClearNetworkRequests,
  useSetNetworkPanelOpen,
  useToggleNetworkPanel,
  useUpdateNetworkRequest
} from './network'
// Pull Request
export {
  type MergeMethod,
  type ReviewCommentInput,
  type ReviewEvent,
  useAddPRComment,
  useClosePR,
  useConvertPRToDraft,
  useMarkPRReady,
  useMergePR,
  useReopenPR,
  useSelectPR,
  useSubmitPRReview,
  useSubmitPRReviewWithComments
} from './pull-request'
// Settings
export {
  useClearCache,
  useFactoryReset,
  useSetAIPanel,
  useSetCardLayouts,
  useSetIDESettings,
  useSetPRDetailPanel,
  useSetRepoColor,
  useSetRepoMinimized,
  useSetSelectedRepos,
  useSetViewMode,
  useToggleMyPRsFilter,
  useToggleRepoExpanded
} from './settings'

// System
export {
  useOpenExternal,
  useSetNetworkPanel,
  useSetNetworkPanelHeight,
  useSetTheme,
  useShowNotification,
  useToggleFullscreen
} from './system'
// User / Auth
export { useSignIn, useSignOut, useValidatePersistedToken, useValidateToken } from './user'
