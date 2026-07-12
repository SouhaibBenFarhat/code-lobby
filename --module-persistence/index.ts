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
  useCustomPrompts,
  useDeleteAllConversations,
  useDeleteConversation,
  useDeleteCustomPrompt,
  useDeleteMessage,
  useGetOrCreateConversation,
  useMessages,
  useRecentAIUsage,
  useUpdateConversation,
  useUpdateCustomPrompt,
  useUpdateMessage
} from './hooks'

// Types
export type {
  AIUsageRecord,
  AIUsageStats,
  Conversation,
  ConversationWithMessages,
  CustomPrompt,
  DbResult,
  Message,
  NewAIUsageRecord,
  NewConversation,
  NewCustomPrompt,
  NewMessage
} from './types'

// Session ID helpers (don't require database, pure functions)
export {
  getGeneralSessionId,
  getPRSessionId,
  parsePRSessionId
} from './utils'
