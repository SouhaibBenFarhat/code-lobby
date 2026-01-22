/**
 * Types for the API client
 */

export type { LogCategoryType, LogLevel } from '@codelobby/logger'
// Re-export log types from the logger package
export { LogCategory } from '@codelobby/logger'

// Import for local use
import type { LogCategoryType } from '@codelobby/logger'

/**
 * Structure of an API call log entry
 */
export interface ApiCallLog {
  id: string
  timestamp: string
  category: LogCategoryType
  method: string
  params?: unknown
  durationMs: number
  success: boolean
  error?: string
  responsePreview?: string
}

/**
 * Options for making an API call
 */
export interface ApiCallOptions {
  /** Category for logging (defaults to 'API') */
  category?: LogCategoryType
  /** Whether to log parameters (defaults to true, set to false for sensitive data) */
  logParams?: boolean
  /** Whether to log response (defaults to true) */
  logResponse?: boolean
  /** Custom message to include in log */
  message?: string
  /** Skip all logging for this call (for high-frequency operations) */
  silent?: boolean
}

/**
 * Standard API response shape
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
