/**
 * AI Usage Repository
 *
 * Provides operations for tracking AI token usage and costs.
 */

import { desc, gte, sql } from 'drizzle-orm'

import { getDatabase } from '../connection'
import { type AIUsageRecord, aiUsage, type NewAIUsageRecord } from '../schema'

/**
 * AI usage tracking repository
 */
export const aiUsageRepo = {
  /**
   * Record a new AI usage entry
   */
  add(data: Omit<NewAIUsageRecord, 'id' | 'createdAt'>): AIUsageRecord {
    const db = getDatabase()
    const now = Date.now()

    const usage: Omit<NewAIUsageRecord, 'id'> = {
      ...data,
      createdAt: now
    }

    const result = db.insert(aiUsage).values(usage).run()
    const created = this.get(Number(result.lastInsertRowid))
    if (!created) throw new Error('Failed to create AI usage record')
    return created
  },

  /**
   * Get a usage record by ID
   */
  get(id: number): AIUsageRecord | undefined {
    const db = getDatabase()
    return db.select().from(aiUsage).where(sql`${aiUsage.id} = ${id}`).get()
  },

  /**
   * Get recent usage records
   */
  listRecent(limit = 100): AIUsageRecord[] {
    const db = getDatabase()
    return db.select().from(aiUsage).orderBy(desc(aiUsage.createdAt)).limit(limit).all()
  },

  /**
   * Get usage records since a timestamp
   */
  listSince(sinceTimestamp: number): AIUsageRecord[] {
    const db = getDatabase()
    return db
      .select()
      .from(aiUsage)
      .where(gte(aiUsage.createdAt, sinceTimestamp))
      .orderBy(aiUsage.createdAt)
      .all()
  },

  /**
   * Get aggregated usage statistics
   */
  getStats(sinceTimestamp?: number): {
    totalInputTokens: number
    totalOutputTokens: number
    totalInputCostUsd: number
    totalOutputCostUsd: number
    totalCostUsd: number
    recordCount: number
  } {
    const db = getDatabase()

    let query = db.select().from(aiUsage)
    if (sinceTimestamp) {
      query = query.where(gte(aiUsage.createdAt, sinceTimestamp)) as typeof query
    }

    const records = query.all()

    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0)
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0)
    const totalInputCostUsd = records.reduce((sum, r) => sum + r.inputCostUsd, 0)
    const totalOutputCostUsd = records.reduce((sum, r) => sum + r.outputCostUsd, 0)

    return {
      totalInputTokens,
      totalOutputTokens,
      totalInputCostUsd,
      totalOutputCostUsd,
      totalCostUsd: totalInputCostUsd + totalOutputCostUsd,
      recordCount: records.length
    }
  },

  /**
   * Clear all usage records
   */
  clear(): number {
    const db = getDatabase()
    const result = db.delete(aiUsage).run()
    return result.changes
  },

  /**
   * Clear usage records older than a timestamp
   */
  clearOlderThan(timestamp: number): number {
    const db = getDatabase()
    const result = db.delete(aiUsage).where(sql`${aiUsage.createdAt} < ${timestamp}`).run()
    return result.changes
  }
}
