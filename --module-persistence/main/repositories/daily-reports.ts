/**
 * Daily Reports Repository
 *
 * Provides CRUD operations for AI-generated daily work summaries.
 */

import { desc, eq } from 'drizzle-orm'

import { getDatabase } from '../connection'
import { type DailyReport, dailyReports, type NewDailyReport } from '../schema'

/**
 * Daily reports repository with all database operations
 */
export const dailyReportsRepo = {
  /**
   * Get all daily reports, ordered by date (most recent first)
   */
  list(): DailyReport[] {
    const db = getDatabase()
    return db.select().from(dailyReports).orderBy(desc(dailyReports.date)).all()
  },

  /**
   * Get a daily report by ID
   */
  get(id: string): DailyReport | undefined {
    const db = getDatabase()
    return db.select().from(dailyReports).where(eq(dailyReports.id, id)).get()
  },

  /**
   * Get a daily report by date (YYYY-MM-DD)
   */
  getByDate(date: string): DailyReport | undefined {
    const db = getDatabase()
    return db.select().from(dailyReports).where(eq(dailyReports.date, date)).get()
  },

  /**
   * Create a new daily report
   */
  create(data: NewDailyReport): DailyReport {
    const db = getDatabase()
    const now = Date.now()

    const report: NewDailyReport = {
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now
    }

    db.insert(dailyReports).values(report).run()
    const created = this.get(data.id)
    if (!created) throw new Error(`Failed to create daily report: ${data.id}`)
    return created
  },

  /**
   * Upsert a daily report (update if exists by date, create if not)
   */
  upsert(data: NewDailyReport): DailyReport {
    const existing = this.getByDate(data.date)
    if (existing) {
      return this.update(existing.id, data) || existing
    }
    return this.create(data)
  },

  /**
   * Update a daily report
   */
  update(
    id: string,
    data: Partial<Omit<DailyReport, 'id' | 'createdAt'>>
  ): DailyReport | undefined {
    const db = getDatabase()
    const now = Date.now()

    db.update(dailyReports)
      .set({ ...data, updatedAt: now })
      .where(eq(dailyReports.id, id))
      .run()

    return this.get(id)
  },

  /**
   * Delete a daily report
   */
  delete(id: string): boolean {
    const db = getDatabase()
    const result = db.delete(dailyReports).where(eq(dailyReports.id, id)).run()
    return result.changes > 0
  },

  /**
   * Delete all daily reports
   */
  deleteAll(): number {
    const db = getDatabase()
    const result = db.delete(dailyReports).run()
    return result.changes
  },

  /**
   * Get recent reports (last N days)
   */
  listRecent(limit: number = 30): DailyReport[] {
    const db = getDatabase()
    return db.select().from(dailyReports).orderBy(desc(dailyReports.date)).limit(limit).all()
  }
}
