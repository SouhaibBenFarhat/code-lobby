/**
 * Renderer Process Logger
 *
 * Lightweight logger for the renderer process that:
 * 1. Logs to console (for development)
 * 2. Sends logs to main process via IPC (for persistence)
 * 3. Batches logs to reduce IPC overhead
 *
 * Usage:
 *   import { rendererLogger, LogCategory } from '@codelobby/logger'
 *   rendererLogger.info(LogCategory.IPC, 'Request sent', { method: 'fetchPRs' })
 */

import type { LogLevel } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface QueuedLog {
  level: LogLevel
  category: string
  message: string
  details?: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const logQueue: QueuedLog[] = []
let flushTimeout: number | null = null
const FLUSH_INTERVAL_MS = 100

let logIdCounter = 0

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getTimestamp(): string {
  return new Date().toISOString()
}

function generateLogId(): string {
  return `log_${Date.now()}_${++logIdCounter}`
}

async function flush(): Promise<void> {
  if (logQueue.length === 0) return

  const batch = logQueue.splice(0, logQueue.length)

  for (const log of batch) {
    try {
      // window.electron is injected by preload script
      const electron = (
        window as {
          electron?: {
            logFromRenderer?: (
              level: string,
              category: string,
              message: string,
              details?: Record<string, unknown>
            ) => void
          }
        }
      ).electron
      electron?.logFromRenderer?.(log.level, log.category, log.message, log.details)
    } catch {
      // Silently ignore - main process might not be ready
    }
  }
}

function scheduleFlush(): void {
  if (flushTimeout !== null) return
  flushTimeout = window.setTimeout(() => {
    flushTimeout = null
    flush()
  }, FLUSH_INTERVAL_MS)
}

function log(
  level: LogLevel,
  category: string,
  message: string,
  details?: Record<string, unknown>
): void {
  const timestamp = getTimestamp()
  const id = generateLogId()

  // Format console message
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${category}]`
  const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'

  // Log to console (immediate, for development)
  if (details && Object.keys(details).length > 0) {
    console[consoleMethod](`${prefix} ${message}`, details)
  } else {
    console[consoleMethod](`${prefix} ${message}`)
  }

  // Queue for main process (batched)
  logQueue.push({
    level,
    category,
    message,
    details: details
      ? {
          ...details,
          _logId: id,
          _timestamp: timestamp
        }
      : undefined
  })
  scheduleFlush()
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export const rendererLogger = {
  info: (category: string, message: string, details?: Record<string, unknown>): void =>
    log('info', category, message, details),

  warn: (category: string, message: string, details?: Record<string, unknown>): void =>
    log('warn', category, message, details),

  error: (category: string, message: string, details?: Record<string, unknown>): void =>
    log('error', category, message, details),

  debug: (category: string, message: string, details?: Record<string, unknown>): void =>
    log('debug', category, message, details),

  /**
   * Force flush all queued logs (call on app shutdown)
   */
  flush: (): Promise<void> => {
    if (flushTimeout !== null) {
      clearTimeout(flushTimeout)
      flushTimeout = null
    }
    return flush()
  }
}
