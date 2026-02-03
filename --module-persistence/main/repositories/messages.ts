/**
 * Messages Repository
 *
 * Provides CRUD operations for chat messages.
 */

import { eq } from 'drizzle-orm'

import { getDatabase } from '../connection'
import { type Message, messages, type NewMessage } from '../schema'
import { conversationsRepo } from './conversations'

// Type for parsed message with metadata
interface ParsedMessage extends Omit<Message, 'metadata'> {
  metadata: Record<string, unknown> | null
}

// Input type that accepts metadata as either string or object
type MessageInput = Omit<NewMessage, 'metadata'> & {
  metadata?: string | Record<string, unknown> | null
}

/**
 * Parse metadata JSON string to object
 */
function parseMetadata(metadataStr: string | null): Record<string, unknown> | null {
  if (!metadataStr) return null
  try {
    return JSON.parse(metadataStr)
  } catch {
    console.error('[messagesRepo] Failed to parse metadata:', metadataStr)
    return null
  }
}

/**
 * Serialize metadata to JSON string (accepts string, object, or null)
 */
function serializeMetadata(
  metadata: string | Record<string, unknown> | null | undefined
): string | null {
  if (metadata === null || metadata === undefined) return null
  if (typeof metadata === 'string') return metadata
  return JSON.stringify(metadata)
}

/**
 * Transform database message to include parsed metadata
 */
function transformMessage(msg: Message): ParsedMessage {
  return {
    ...msg,
    metadata: parseMetadata(msg.metadata)
  }
}

/**
 * Messages repository with all database operations
 */
export const messagesRepo = {
  /**
   * Get all messages (limited for debug purposes)
   */
  list(limit = 100): ParsedMessage[] {
    const db = getDatabase()
    const msgs = db.select().from(messages).orderBy(messages.createdAt).limit(limit).all()
    return msgs.map(transformMessage)
  },

  /**
   * Get all messages for a conversation, ordered by creation time
   */
  listForConversation(conversationId: string): ParsedMessage[] {
    const db = getDatabase()
    const msgs = db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .all()
    return msgs.map(transformMessage)
  },

  /**
   * Get a message by ID
   */
  get(id: string): ParsedMessage | undefined {
    const db = getDatabase()
    const msg = db.select().from(messages).where(eq(messages.id, id)).get()
    return msg ? transformMessage(msg) : undefined
  },

  /**
   * Add a message to a conversation
   */
  add(data: MessageInput): ParsedMessage {
    const db = getDatabase()
    const now = Date.now()

    const message = {
      id: data.id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      thinking: data.thinking ?? null,
      displayLabel: data.displayLabel ?? null,
      metadata: serializeMetadata(data.metadata),
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
  addMany(msgs: MessageInput[]): void {
    if (msgs.length === 0) return

    const db = getDatabase()
    const now = Date.now()

    const messagesToInsert = msgs.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      role: m.role,
      content: m.content,
      thinking: m.thinking ?? null,
      displayLabel: m.displayLabel ?? null,
      metadata: serializeMetadata(m.metadata),
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
    data: Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt' | 'metadata'>> & {
      metadata?: string | Record<string, unknown> | null
    }
  ): ParsedMessage | undefined {
    const db = getDatabase()

    // Serialize metadata if provided
    const updateData: Record<string, unknown> = { ...data }
    if ('metadata' in data) {
      updateData.metadata = serializeMetadata(data.metadata)
    }

    db.update(messages).set(updateData).where(eq(messages.id, id)).run()

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
