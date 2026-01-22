/**
 * @codelobby/logger
 *
 * Centralized logging module for CodeLobby
 *
 * Usage in Main Process:
 *   import { mainLogger, LogCategory } from '@codelobby/logger/main'
 *   mainLogger.info(LogCategory.API, 'Request complete', { status: 200 })
 *
 * Usage in Renderer Process:
 *   import { rendererLogger, LogCategory } from '@codelobby/logger'
 *   rendererLogger.info(LogCategory.IPC, 'Request sent')
 */

// Categories
export { LogCategory, type LogCategoryType } from './categories'
// Renderer logger only (no electron dependency)
// Alias for renderer
export { rendererLogger, rendererLogger as logger } from './renderer-logger'
// Types
export type { LogEntry, Logger, LogLevel, LogSession, LogSummary } from './types'
