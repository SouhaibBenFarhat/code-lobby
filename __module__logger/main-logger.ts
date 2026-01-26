/**
 * Main Process Logger
 *
 * Logger for Electron main process with:
 * - In-memory storage for quick access
 * - Disk persistence (JSON files)
 * - Session management
 * - Console output for development
 *
 * Usage:
 *   import { mainLogger, LogCategory } from '@logger'
 *   mainLogger.info(LogCategory.API, 'Request complete', { status: 200 })
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { app } from 'electron'
import type { LogEntry, LogLevel, LogSession, LogSummary } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MAX_LOGS_PER_SESSION = 1000
const MAX_SESSIONS = 5
const SAVE_DEBOUNCE_MS = 1000

// ═══════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════

const logs: LogEntry[] = []
let logIdCounter = 0
const sessionId = `session_${Date.now()}`
let logsDir: string | null = null
let saveTimeout: NodeJS.Timeout | null = null
let consoleDisabled = false

// ═══════════════════════════════════════════════════════════════════════════
// FILE SYSTEM HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getLogsDir(): string {
  if (!logsDir) {
    logsDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  }
  return logsDir
}

function getSessionFilePath(): string {
  return path.join(getLogsDir(), `${sessionId}.json`)
}

function loadPreviousLogs(): LogEntry[] {
  try {
    const dir = getLogsDir()
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && f.startsWith('session_'))
      .sort()
      .reverse()

    const allLogs: LogEntry[] = []

    for (const file of files.slice(0, MAX_SESSIONS)) {
      if (file === `${sessionId}.json`) continue
      try {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8')
        const session: LogSession = JSON.parse(content)
        allLogs.push(...session.logs)
      } catch {
        // Skip corrupted files
      }
    }

    return allLogs
  } catch {
    return []
  }
}

function scheduleSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveLogs()
  }, SAVE_DEBOUNCE_MS)
}

function saveLogs(): void {
  try {
    const session: LogSession = {
      sessionId,
      startTime: logs[0]?.timestamp || new Date().toISOString(),
      logs: logs.slice(-MAX_LOGS_PER_SESSION)
    }
    fs.writeFileSync(getSessionFilePath(), JSON.stringify(session, null, 2))
  } catch {
    // Silently ignore save errors
  }
}

function cleanupOldSessions(): void {
  try {
    const dir = getLogsDir()
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json') && f.startsWith('session_'))
      .sort()
      .reverse()

    for (const file of files.slice(MAX_SESSIONS)) {
      try {
        fs.unlinkSync(path.join(dir, file))
      } catch {
        // Ignore deletion errors
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGGING HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `log_${Date.now()}_${++logIdCounter}`
}

function formatTimestamp(): string {
  return new Date().toISOString()
}

function safeConsoleLog(method: 'log' | 'warn' | 'error' | 'debug', ...args: unknown[]): void {
  if (consoleDisabled) return

  try {
    console[method](...args)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EPIPE') {
      consoleDisabled = true
    }
  }
}

function addLog(level: LogLevel, category: string, message: string, details?: unknown): void {
  const entry: LogEntry = {
    id: generateId(),
    timestamp: formatTimestamp(),
    level,
    category,
    message,
    details: details !== undefined ? details : undefined
  }

  logs.push(entry)

  if (logs.length > MAX_LOGS_PER_SESSION) {
    logs.shift()
  }

  scheduleSave()

  // Console output for development
  const consoleMsg = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}] ${message}`
  switch (level) {
    case 'error':
      safeConsoleLog('error', consoleMsg, details || '')
      break
    case 'warn':
      safeConsoleLog('warn', consoleMsg, details || '')
      break
    case 'debug':
      safeConsoleLog('debug', consoleMsg, details || '')
      break
    default:
      safeConsoleLog('log', consoleMsg, details || '')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

export const mainLogger = {
  // Log methods
  info: (category: string, message: string, details?: unknown): void =>
    addLog('info', category, message, details),
  warn: (category: string, message: string, details?: unknown): void =>
    addLog('warn', category, message, details),
  error: (category: string, message: string, details?: unknown): void =>
    addLog('error', category, message, details),
  debug: (category: string, message: string, details?: unknown): void =>
    addLog('debug', category, message, details),

  // Log retrieval
  getLogs: (): LogEntry[] => [...logs],

  getAllLogs: (): LogEntry[] => {
    const previousLogs = loadPreviousLogs()
    return [...previousLogs, ...logs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_LOGS_PER_SESSION * 2)
  },

  getLogsByLevel: (level: LogLevel): LogEntry[] => logs.filter((log) => log.level === level),

  getLogsByCategory: (category: string): LogEntry[] =>
    logs.filter((log) => log.category === category),

  // Log management
  clearLogs: (): void => {
    logs.length = 0
    logIdCounter = 0
    try {
      const filePath = getSessionFilePath()
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch {
      // Ignore
    }
  },

  exportLogs: (): string => {
    return JSON.stringify(logs, null, 2)
  },

  getLogsSummary: (): LogSummary => {
    const byLevel: Record<LogLevel, number> = { info: 0, warn: 0, error: 0, debug: 0 }
    const byCategory: Record<string, number> = {}

    for (const log of logs) {
      byLevel[log.level]++
      byCategory[log.category] = (byCategory[log.category] || 0) + 1
    }

    return { total: logs.length, byLevel, byCategory }
  },

  // Utilities
  getLogsPath: (): string => getLogsDir(),

  forceSave: (): void => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveLogs()
  },

  init: (): void => {
    cleanupOldSessions()
    addLog('info', 'App', 'Logger initialized', { sessionId, logsDir: getLogsDir() })
  },

  // Handle logs from renderer process
  logFromRenderer: (
    level: string,
    category: string,
    message: string,
    data?: Record<string, unknown>
  ): void => {
    addLog(level as LogLevel, category, `[Renderer] ${message}`, data)
  }
}
