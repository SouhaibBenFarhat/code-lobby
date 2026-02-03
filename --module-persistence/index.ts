/**
 * Persistence Module - Renderer Process
 *
 * Exports hooks and types for use in the renderer process.
 * Database operations are performed via IPC to the main process.
 */

// Hooks
export {
  // AI Usage
  aiUsageKeys,
  // Conversations
  conversationKeys,
  // Custom Prompts
  customPromptKeys,
  // Daily Reports
  dailyReportKeys,
  // Messages
  messageKeys,
  useAddAIUsage,
  useAddMessage,
  useAddMessages,
  useAIUsageStats,
  useClearAIUsage,
  useClearMessages,
  useConversation,
  useConversations,
  useConversationWithMessages,
  useCreateConversation,
  useCreateCustomPrompt,
  useCreateDailyReport,
  useCustomPrompts,
  useDailyReport,
  useDailyReportByDate,
  useDailyReports,
  useDeleteAllConversations,
  useDeleteConversation,
  useDeleteCustomPrompt,
  useDeleteDailyReport,
  useDeleteMessage,
  useGetOrCreateConversation,
  useMessages,
  useRecentAIUsage,
  useRecentDailyReports,
  useUpdateConversation,
  useUpdateCustomPrompt,
  useUpdateDailyReport,
  useUpdateMessage,
  useUpsertDailyReport
} from './hooks'

// Types
export type {
  AIUsageRecord,
  AIUsageStats,
  Conversation,
  ConversationWithMessages,
  CustomPrompt,
  DailyReport,
  DbResult,
  Message,
  NewAIUsageRecord,
  NewConversation,
  NewCustomPrompt,
  NewDailyReport,
  NewMessage
} from './types'

// Session ID helpers (don't require database, pure functions)
export {
  getGeneralSessionId,
  getPRSessionId,
  parsePRSessionId
} from './utils'
