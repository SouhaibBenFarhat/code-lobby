/**
 * Logger Types
 *
 * Shared types for the logging system
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string
  message: string
  details?: unknown
}

export interface LogSession {
  sessionId: string
  startTime: string
  logs: LogEntry[]
}

export interface LogSummary {
  total: number
  byLevel: Record<LogLevel, number>
  byCategory: Record<string, number>
}

/**
 * Logger interface - implemented by both main and renderer loggers
 */
export interface Logger {
  info: (category: string, message: string, details?: Record<string, unknown>) => void
  warn: (category: string, message: string, details?: Record<string, unknown>) => void
  error: (category: string, message: string, details?: Record<string, unknown>) => void
  debug: (category: string, message: string, details?: Record<string, unknown>) => void
}
