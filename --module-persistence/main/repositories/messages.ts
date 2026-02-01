/**
 * Messages Repository
 *
 * Provides CRUD operations for chat messages.
 */

import { eq } from 'drizzle-orm'

import { getDatabase } from '../connection'
import { type Message, messages, type NewMessage } from '../schema'
import { conversationsRepo } from './conversations'

/**
 * Messages repository with all database operations
 */
export const messagesRepo = {
  /**
   * Get all messages (limited for debug purposes)
   */
  list(limit = 100): Message[] {
    const db = getDatabase()
    return db.select().from(messages).orderBy(messages.createdAt).limit(limit).all()
  },

  /**
   * Get all messages for a conversation, ordered by creation time
   */
  listForConversation(conversationId: string): Message[] {
    const db = getDatabase()
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .all()
  },

  /**
   * Get a message by ID
   */
  get(id: string): Message | undefined {
    const db = getDatabase()
    return db.select().from(messages).where(eq(messages.id, id)).get()
  },

  /**
   * Add a message to a conversation
   */
  add(data: NewMessage): Message {
    const db = getDatabase()
    const now = Date.now()

    const message: NewMessage = {
      ...data,
      createdAt: data.createdAt ?? now
    }

    db.insert(messages).values(message).run()

    // Update conversation's updatedAt
    conversationsRepo.touch(data.conversationId)

    const created = this.get(data.id)
    if (!created) throw new Error(`Failed to create message: ${data.id}`)
    return created
  },

  /**
   * Add multiple messages to a conversation (batch insert)
   */
  addMany(msgs: NewMessage[]): void {
    if (msgs.length === 0) return

    const db = getDatabase()
    const now = Date.now()

    const messagesToInsert = msgs.map((m) => ({
      ...m,
      createdAt: m.createdAt ?? now
    }))

    db.insert(messages).values(messagesToInsert).run()

    // Update conversation's updatedAt (use first message's conversationId)
    if (msgs[0]) {
      conversationsRepo.touch(msgs[0].conversationId)
    }
  },

  /**
   * Update a message
   */
  update(
    id: string,
    data: Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt'>>
  ): Message | undefined {
    const db = getDatabase()

    db.update(messages).set(data).where(eq(messages.id, id)).run()

    return this.get(id)
  },

  /**
   * Delete a message
   */
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.delete(messages).where(eq(messages.id, id)).run()
    return result.changes > 0
  },

  /**
   * Clear all messages for a conversation
   */
  clearForConversation(conversationId: string): number {
    const db = getDatabase()
    const result = db.delete(messages).where(eq(messages.conversationId, conversationId)).run()

    // Update conversation's updatedAt
    conversationsRepo.touch(conversationId)

    return result.changes
  },

  /**
   * Count messages in a conversation
   */
  countForConversation(conversationId: string): number {
    const db = getDatabase()
    const result = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .all()
    return result.length
  }
}
