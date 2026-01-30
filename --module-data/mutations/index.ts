/**
 * Mutation Exports
 */

// AI
export {
  useAddAIUsage,
  useAddCustomPrompt,
  useClearChat,
  useDeleteCustomPrompt,
  useResetAIUsage,
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
  useSubmitPRReviewWithComments,
  useUpdatePRBody,
  useUpdatePRBranch,
  useUpdatePRTitle
} from './pull-request'
// Settings
export {
  useClearCache,
  useDeleteDailySpeech,
  useFactoryReset,
  useSaveDailySpeech,
  useSetAgenticPrompts,
  useSetAgenticSettingsOpen,
  useSetAIPanel,
  useSetCardLayouts,
  useSetDailySpeechModalOpen,
  useSetIDESettings,
  useSetPRDetailPanel,
  useSetRepoColor,
  useSetRepoMinimized,
  useSetSelectedRepos,
  useSetUserProfilePanel,
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
