/**
 * Mutation Exports
 */

// Multi-account
export { useMigrateAccounts, useRemoveAccount, useSwitchAccount } from './accounts'
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
  useSetSelectedModel,
  useUpdateCustomPrompt
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
  useAddLabels,
  useAddPRComment,
  useClosePR,
  useConvertPRToDraft,
  useDeletePRComment,
  useMarkPRReady,
  useMergePR,
  useRemoveLabel,
  useReopenPR,
  useReplyToReviewComment,
  useResolveReviewThread,
  useSelectPR,
  useSubmitPRReview,
  useSubmitPRReviewWithComments,
  useUnresolveReviewThread,
  useUpdatePRBody,
  useUpdatePRBranch,
  useUpdatePRTitle,
  useUploadScreenshot
} from './pull-request'
// Settings
export {
  useAddWebviewTab,
  useClearCache,
  useCloseCodeVisualizer,
  useDeleteDailySpeech,
  useFactoryReset,
  useOpenCodeVisualizer,
  useRemoveWebviewTab,
  useSaveDailySpeech,
  useSetAIPanel,
  useSetCardLayouts,
  useSetCodeVisualizer,
  useSetDailySpeechModalOpen,
  useSetIDESettings,
  useSetPRActiveTab,
  useSetPRDetailPanel,
  useSetRepoColor,
  useSetRepoMinimized,
  useSetSelectedRepos,
  useSetUserProfilePanel,
  useSetViewMode,
  useToggleMyPRsFilter,
  useToggleRepoExpanded,
  useUpdateWebviewTab
} from './settings'

// System
export {
  useOpenExternal,
  useSetAboutModalOpen,
  useSetNetworkPanel,
  useSetNetworkPanelHeight,
  useSetTheme,
  useShowNotification,
  useToggleFullscreen
} from './system'
// User / Auth
export { useSignIn, useSignOut, useValidatePersistedToken, useValidateToken } from './user'
