/**
 * Conversations Repository
 *
 * Provides CRUD operations for chat conversations.
 */

import { eq } from 'drizzle-orm'

import { getDatabase } from '../connection'
import { type Conversation, conversations, messages, type NewConversation } from '../schema'

/**
 * Conversations repository with all database operations
 */
export const conversationsRepo = {
  /**
   * Get all conversations, ordered by most recently updated
   */
  list(): Conversation[] {
    const db = getDatabase()
    return db.select().from(conversations).orderBy(conversations.updatedAt).all().reverse()
  },

  /**
   * Get a conversation by ID
   */
  get(id: string): Conversation | undefined {
    const db = getDatabase()
    return db.select().from(conversations).where(eq(conversations.id, id)).get()
  },

  /**
   * Get a conversation with all its messages (eager load)
   */
  getWithMessages(
    id: string
  ): { conversation: Conversation; messages: (typeof messages.$inferSelect)[] } | undefined {
    const db = getDatabase()
    const conversation = db.select().from(conversations).where(eq(conversations.id, id)).get()

    if (!conversation) return undefined

    const msgs = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt)
      .all()

    return { conversation, messages: msgs }
  },

  /**
   * Create a new conversation
   */
  create(data: NewConversation): Conversation {
    const db = getDatabase()
    const now = Date.now()

    const conversation: NewConversation = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now
    }

    db.insert(conversations).values(conversation).run()
    const created = this.get(data.id)
    if (!created) throw new Error(`Failed to create conversation: ${data.id}`)
    return created
  },

  /**
   * Create a conversation if it doesn't exist, otherwise return existing
   */
  getOrCreate(data: NewConversation): Conversation {
    const existing = this.get(data.id)
    if (existing) return existing
    return this.create(data)
  },

  /**
   * Update a conversation's metadata
   */
  update(
    id: string,
    data: Partial<Omit<Conversation, 'id' | 'createdAt'>>
  ): Conversation | undefined {
    const db = getDatabase()
    const now = Date.now()

    db.update(conversations)
      .set({ ...data, updatedAt: now })
      .where(eq(conversations.id, id))
      .run()

    return this.get(id)
  },

  /**
   * Update the updatedAt timestamp (called when messages are added)
   */
  touch(id: string): void {
    const db = getDatabase()
    db.update(conversations).set({ updatedAt: Date.now() }).where(eq(conversations.id, id)).run()
  },

  /**
   * Delete a conversation (messages are cascade deleted)
   */
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.delete(conversations).where(eq(conversations.id, id)).run()
    return result.changes > 0
  },

  /**
   * Delete all conversations
   */
  deleteAll(): number {
    const db = getDatabase()
    const result = db.delete(conversations).run()
    return result.changes
  }
}
