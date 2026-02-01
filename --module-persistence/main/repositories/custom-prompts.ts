/**
 * Custom Prompts Repository
 *
 * Provides CRUD operations for user-created quick action prompts.
 */

import { desc, eq } from 'drizzle-orm'

import { getDatabase } from '../connection'
import { type CustomPrompt, customPrompts, type NewCustomPrompt } from '../schema'

/**
 * Custom prompts repository with all database operations
 */
export const customPromptsRepo = {
  /**
   * Get all custom prompts, ordered by creation time (newest first)
   */
  list(): CustomPrompt[] {
    const db = getDatabase()
    return db.select().from(customPrompts).orderBy(desc(customPrompts.createdAt)).all()
  },

  /**
   * Get a custom prompt by ID
   */
  get(id: string): CustomPrompt | undefined {
    const db = getDatabase()
    return db.select().from(customPrompts).where(eq(customPrompts.id, id)).get()
  },

  /**
   * Create a new custom prompt
   */
  create(data: NewCustomPrompt): CustomPrompt {
    const db = getDatabase()
    const now = Date.now()

    const prompt: NewCustomPrompt = {
      ...data,
      createdAt: data.createdAt ?? now
    }

    db.insert(customPrompts).values(prompt).run()
    const created = this.get(data.id)
    if (!created) throw new Error(`Failed to create custom prompt: ${data.id}`)
    return created
  },

  /**
   * Update a custom prompt
   */
  update(
    id: string,
    data: Partial<Omit<CustomPrompt, 'id' | 'createdAt'>>
  ): CustomPrompt | undefined {
    const db = getDatabase()

    db.update(customPrompts).set(data).where(eq(customPrompts.id, id)).run()

    return this.get(id)
  },

  /**
   * Delete a custom prompt
   */
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.delete(customPrompts).where(eq(customPrompts.id, id)).run()
    return result.changes > 0
  },

  /**
   * Delete all custom prompts
   */
  deleteAll(): number {
    const db = getDatabase()
    const result = db.delete(customPrompts).run()
    return result.changes
  }
}
