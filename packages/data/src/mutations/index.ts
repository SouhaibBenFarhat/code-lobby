/**
 * Mutation Exports
 */

// AI
export {
  useAddCustomPrompt,
  useClearPRChatMessages,
  useCreatePRChat,
  useDeleteCustomPrompt,
  useSendChatMessage,
  useSetAILoading,
  useSetAIThinking,
  useSetClaudeApiKey,
  useSetEnableThinking,
  useSetEnableWebFetch,
  useSetSelectedModel,
  useSwitchToPRChat
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
  type ReviewEvent,
  useAddPRComment,
  useClosePR,
  useConvertPRToDraft,
  useMarkPRReady,
  useMergePR,
  useRefreshPRDetail,
  useReopenPR,
  useSelectPR,
  useSubmitPRReview
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
