/**
 * Persistence Hooks
 *
 * TanStack Query hooks for database operations.
 * Export all hooks for use in the renderer process.
 */

// AI Usage
export {
  aiUsageKeys,
  useAddAIUsage,
  useAIUsageStats,
  useClearAIUsage,
  useRecentAIUsage
} from './ai-usage'
// Conversations
export {
  conversationKeys,
  useConversation,
  useConversations,
  useConversationWithMessages,
  useCreateConversation,
  useDeleteAllConversations,
  useDeleteConversation,
  useGetOrCreateConversation,
  useUpdateConversation
} from './conversations'

// Custom Prompts
export {
  customPromptKeys,
  useCreateCustomPrompt,
  useCustomPrompts,
  useDeleteCustomPrompt,
  useUpdateCustomPrompt
} from './custom-prompts'
// Messages
export {
  messageKeys,
  useAddMessage,
  useAddMessages,
  useClearMessages,
  useDeleteMessage,
  useMessages,
  useUpdateMessage
} from './messages'
