/**
 * Persistence Module - Main Process
 *
 * Exports database connection and repositories for use in Electron main process.
 * This module provides SQLite-based persistence for AI data.
 */

// Database connection
export { closeDatabase, getDatabase, initDatabase, isDatabaseAvailable } from './connection'

// IPC Handlers (call once at startup)
export { registerPersistenceIpcHandlers } from './ipc-handlers'
export { aiUsageRepo } from './repositories/ai-usage'
// Repositories
export { conversationsRepo } from './repositories/conversations'
export { customPromptsRepo } from './repositories/custom-prompts'
export { messagesRepo } from './repositories/messages'

// Schema types (for type inference)
export type {
  AIUsageRecord,
  Conversation,
  CustomPrompt,
  Message,
  NewAIUsageRecord,
  NewConversation,
  NewCustomPrompt,
  NewMessage
} from './schema'
