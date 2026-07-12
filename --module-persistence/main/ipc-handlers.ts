/**
 * Persistence IPC Handlers
 *
 * Registers IPC handlers for database operations.
 * Called from main process during app initialization.
 */

import { LogCategory, mainLogger as logger } from '@logger/main'
import { ipcMain } from 'electron'
import { getRawDatabase } from './connection'
import { aiUsageRepo } from './repositories/ai-usage'
import { conversationsRepo } from './repositories/conversations'
import { customPromptsRepo } from './repositories/custom-prompts'
import { messagesRepo } from './repositories/messages'
import type { NewAIUsageRecord, NewConversation, NewCustomPrompt, NewMessage } from './schema'

/**
 * Register all persistence-related IPC handlers.
 * Should be called once during app initialization after database is initialized.
 */
export function registerPersistenceIpcHandlers(): void {
  logger.info(LogCategory.AI, 'Registering persistence IPC handlers')

  // ===========================================================================
  // Conversations
  // ===========================================================================

  ipcMain.handle('db:conversations:list', async () => {
    try {
      return { success: true, data: conversationsRepo.list() }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to list conversations', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:conversations:get', async (_, id: string) => {
    try {
      return { success: true, data: conversationsRepo.get(id) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to get conversation', { error, id })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:conversations:getWithMessages', async (_, id: string) => {
    try {
      return { success: true, data: conversationsRepo.getWithMessages(id) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to get conversation with messages', { error, id })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:conversations:create', async (_, data: NewConversation) => {
    try {
      return { success: true, data: conversationsRepo.create(data) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to create conversation', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:conversations:getOrCreate', async (_, data: NewConversation) => {
    try {
      return { success: true, data: conversationsRepo.getOrCreate(data) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to get or create conversation', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'db:conversations:update',
    async (_, id: string, data: Partial<Omit<NewConversation, 'id' | 'createdAt'>>) => {
      try {
        return { success: true, data: conversationsRepo.update(id, data) }
      } catch (error) {
        logger.error(LogCategory.AI, 'Failed to update conversation', { error, id })
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('db:conversations:delete', async (_, id: string) => {
    try {
      return { success: true, data: conversationsRepo.delete(id) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to delete conversation', { error, id })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:conversations:deleteAll', async () => {
    try {
      return { success: true, data: conversationsRepo.deleteAll() }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to delete all conversations', { error })
      return { success: false, error: String(error) }
    }
  })

  // ===========================================================================
  // Messages
  // ===========================================================================

  ipcMain.handle('db:messages:list', async () => {
    try {
      return { success: true, data: messagesRepo.list() }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to list messages', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:messages:listForConversation', async (_, conversationId: string) => {
    try {
      return { success: true, data: messagesRepo.listForConversation(conversationId) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to list messages', { error, conversationId })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:messages:add', async (_, data: NewMessage) => {
    try {
      return { success: true, data: messagesRepo.add(data) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to add message', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:messages:addMany', async (_, messages: NewMessage[]) => {
    try {
      messagesRepo.addMany(messages)
      return { success: true }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to add messages', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'db:messages:update',
    async (
      _,
      id: string,
      data: Partial<Omit<NewMessage, 'id' | 'conversationId' | 'createdAt'>>
    ) => {
      try {
        return { success: true, data: messagesRepo.update(id, data) }
      } catch (error) {
        logger.error(LogCategory.AI, 'Failed to update message', { error, id })
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('db:messages:delete', async (_, id: string) => {
    try {
      return { success: true, data: messagesRepo.delete(id) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to delete message', { error, id })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:messages:clearForConversation', async (_, conversationId: string) => {
    try {
      return { success: true, data: messagesRepo.clearForConversation(conversationId) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to clear messages', { error, conversationId })
      return { success: false, error: String(error) }
    }
  })

  // ===========================================================================
  // Custom Prompts
  // ===========================================================================

  ipcMain.handle('db:customPrompts:list', async () => {
    try {
      return { success: true, data: customPromptsRepo.list() }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to list custom prompts', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:customPrompts:create', async (_, data: NewCustomPrompt) => {
    try {
      return { success: true, data: customPromptsRepo.create(data) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to create custom prompt', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(
    'db:customPrompts:update',
    async (_, id: string, data: Partial<Omit<NewCustomPrompt, 'id' | 'createdAt'>>) => {
      try {
        return { success: true, data: customPromptsRepo.update(id, data) }
      } catch (error) {
        logger.error(LogCategory.AI, 'Failed to update custom prompt', { error, id })
        return { success: false, error: String(error) }
      }
    }
  )

  ipcMain.handle('db:customPrompts:delete', async (_, id: string) => {
    try {
      return { success: true, data: customPromptsRepo.delete(id) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to delete custom prompt', { error, id })
      return { success: false, error: String(error) }
    }
  })

  // ===========================================================================
  // AI Usage
  // ===========================================================================

  ipcMain.handle('db:aiUsage:add', async (_, data: Omit<NewAIUsageRecord, 'id' | 'createdAt'>) => {
    try {
      return { success: true, data: aiUsageRepo.add(data) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to add AI usage', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:aiUsage:listRecent', async (_, limit?: number) => {
    try {
      return { success: true, data: aiUsageRepo.listRecent(limit) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to list recent AI usage', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:aiUsage:getStats', async (_, sinceTimestamp?: number) => {
    try {
      return { success: true, data: aiUsageRepo.getStats(sinceTimestamp) }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to get AI usage stats', { error })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:aiUsage:clear', async () => {
    try {
      return { success: true, data: aiUsageRepo.clear() }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to clear AI usage', { error })
      return { success: false, error: String(error) }
    }
  })

  // ===========================================================================
  // Dynamic Table Access (for Database Viewer)
  // ===========================================================================

  ipcMain.handle('db:tables:list', async () => {
    try {
      const db = getRawDatabase()
      // Get all tables from sqlite_master
      const allTables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>
      // Filter out SQLite internal tables and Drizzle migration tables
      const tables = allTables
        .map((r) => r.name)
        .filter((name) => !name.startsWith('sqlite_') && !name.startsWith('__'))
        .sort()
      return { success: true, data: tables }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to list tables', {
        error: error instanceof Error ? error.message : String(error)
      })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:tables:query', async (_, tableName: string, limit?: number) => {
    try {
      const db = getRawDatabase()
      // Validate table name to prevent SQL injection (only allow alphanumeric and underscore)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        return { success: false, error: 'Invalid table name' }
      }
      const safeLimit = Math.min(limit || 1000, 10000)
      const result = db.prepare(`SELECT * FROM ${tableName} LIMIT ${safeLimit}`).all()
      return { success: true, data: result }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to query table', { error, tableName })
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle('db:tables:count', async (_, tableName: string) => {
    try {
      const db = getRawDatabase()
      // Validate table name to prevent SQL injection
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
        return { success: false, error: 'Invalid table name' }
      }
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as
        | { count: number }
        | undefined
      return { success: true, data: result?.count ?? 0 }
    } catch (error) {
      logger.error(LogCategory.AI, 'Failed to count table rows', { error, tableName })
      return { success: false, error: String(error) }
    }
  })

  logger.info(LogCategory.AI, 'Persistence IPC handlers registered')
}
