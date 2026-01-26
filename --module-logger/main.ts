/**
 * Main Process Logger Entry Point
 *
 * Use this import in the Electron main process:
 *   import { mainLogger, LogCategory } from '@logger/main'
 *
 * DO NOT import this in renderer code - it requires 'electron' module.
 */

// Categories
export { LogCategory, type LogCategoryType } from './categories'
// Main process logger
// Alias
export { mainLogger, mainLogger as logger } from './main-logger'
// Types
export type { LogEntry, Logger, LogLevel, LogSession, LogSummary } from './types'
