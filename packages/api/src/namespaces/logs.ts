/**
 * Logs API namespace
 *
 * API calls for the logging system itself
 */

/// <reference path="../../../../src/preload/electron-api.d.ts" />

import { call } from '../call'
import { LogCategory } from '../logger'

export const logs = {
  async getLogs(): Promise<
    Array<{
      id: string
      timestamp: string
      level: string
      category: string
      message: string
      details?: unknown
    }>
  > {
    // Don't log this call to avoid infinite recursion
    return window.electron.getLogs()
  },

  async clearLogs(): Promise<{ success: boolean }> {
    return call('logs.clearLogs', () => window.electron.clearLogs(), undefined, {
      category: LogCategory.APP
    })
  },

  async exportLogs(): Promise<string> {
    return call('logs.exportLogs', () => window.electron.exportLogs(), undefined, {
      category: LogCategory.APP,
      logResponse: false // Export can be large
    })
  },

  async getLogsSummary(): Promise<{
    total: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
  }> {
    // Don't log this call to avoid noise
    return window.electron.getLogsSummary()
  },

  /**
   * Log from renderer to main process
   * Note: This is used internally by the logger, shouldn't be called directly
   */
  async logFromRenderer(
    level: 'info' | 'warn' | 'error' | 'debug',
    category: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<{ success: boolean }> {
    // Don't log this call - it would cause infinite recursion!
    return window.electron.logFromRenderer(level, category, message, data)
  }
}
