/**
 * Main API client
 *
 * This is the single entry point for all API calls.
 * Import `api` from this module and use it everywhere.
 *
 * Example:
 *   import { api } from '@codelobby/api'
 *
 *   // GitHub operations
 *   const repos = await api.github.fetchContributedRepos()
 *
 *   // Settings operations
 *   await api.settings.setViewMode('canvas')
 *
 *   // AI operations
 *   const result = await api.ai.sendChatMessageStreaming(message)
 */

import { LogCategory, logger } from './logger'
import { ai } from './namespaces/ai'
import { github } from './namespaces/github'
import { logs } from './namespaces/logs'
import { settings } from './namespaces/settings'

/**
 * Centralized API client with automatic logging
 *
 * All methods automatically:
 * - Log the start of the call (debug level)
 * - Log success with duration (info level)
 * - Log failures with error details (error level)
 * - Sanitize sensitive data (tokens, keys)
 * - Summarize large responses
 */
export const api: {
  github: typeof github
  settings: typeof settings
  ai: typeof ai
  logs: typeof logs
  logger: typeof logger
  LogCategory: typeof LogCategory
} = {
  /**
   * GitHub API (repos, PRs, comments, rate limits)
   */
  github: github,

  /**
   * Settings API (view mode, layouts, panels, etc.)
   */
  settings: settings,

  /**
   * AI API (Claude, chat, PR analysis, etc.)
   */
  ai: ai,

  /**
   * Logs API (get/clear/export logs)
   */
  logs: logs,

  /**
   * Direct access to the logger for custom logging
   *
   * Example:
   *   api.logger.info(LogCategory.UI, 'Button clicked', { buttonId: 'save' })
   */
  logger: logger,

  /**
   * Log categories for consistency
   */
  LogCategory: LogCategory
}
