// Logger utility for CodeLobby
// Stores logs in memory and persists to disk

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string
  message: string
  details?: unknown
}

interface LogSession {
  sessionId: string
  startTime: string
  logs: LogEntry[]
}

const MAX_LOGS_PER_SESSION = 1000
const MAX_SESSIONS = 5
const logs: LogEntry[] = []
let logIdCounter = 0
let sessionId = `session_${Date.now()}`
let logsDir: string | null = null
let saveTimeout: NodeJS.Timeout | null = null

// Initialize logs directory
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

// Load previous sessions' logs
function loadPreviousLogs(): LogEntry[] {
  try {
    const dir = getLogsDir()
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && f.startsWith('session_'))
      .sort()
      .reverse() // Most recent first
    
    const allLogs: LogEntry[] = []
    
    // Load logs from previous sessions (excluding current)
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

// Save current session logs to disk (debounced)
function scheduleSave(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveLogs()
  }, 1000) // Save after 1 second of inactivity
}

function saveLogs(): void {
  try {
    const session: LogSession = {
      sessionId,
      startTime: logs[0]?.timestamp || new Date().toISOString(),
      logs: logs.slice(-MAX_LOGS_PER_SESSION) // Keep last N logs
    }
    fs.writeFileSync(getSessionFilePath(), JSON.stringify(session, null, 2))
  } catch (e) {
    console.error('Failed to save logs:', e)
  }
}

// Cleanup old session files
function cleanupOldSessions(): void {
  try {
    const dir = getLogsDir()
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json') && f.startsWith('session_'))
      .sort()
      .reverse()
    
    // Remove sessions older than MAX_SESSIONS
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

function generateId(): string {
  return `log_${Date.now()}_${++logIdCounter}`
}

function formatTimestamp(): string {
  return new Date().toISOString()
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
  
  // Keep only the last MAX_LOGS_PER_SESSION entries in memory
  if (logs.length > MAX_LOGS_PER_SESSION) {
    logs.shift()
  }
  
  // Schedule save to disk
  scheduleSave()
  
  // Also log to console for development
  const consoleMsg = `[${entry.timestamp}] [${level.toUpperCase()}] [${category}] ${message}`
  switch (level) {
    case 'error':
      console.error(consoleMsg, details || '')
      break
    case 'warn':
      console.warn(consoleMsg, details || '')
      break
    case 'debug':
      console.debug(consoleMsg, details || '')
      break
    default:
      console.log(consoleMsg, details || '')
  }
}

export const logger = {
  info: (category: string, message: string, details?: unknown) => addLog('info', category, message, details),
  warn: (category: string, message: string, details?: unknown) => addLog('warn', category, message, details),
  error: (category: string, message: string, details?: unknown) => addLog('error', category, message, details),
  debug: (category: string, message: string, details?: unknown) => addLog('debug', category, message, details),
  
  getLogs: (): LogEntry[] => [...logs],
  
  // Get logs including from previous sessions
  getAllLogs: (): LogEntry[] => {
    const previousLogs = loadPreviousLogs()
    return [...previousLogs, ...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ).slice(0, MAX_LOGS_PER_SESSION * 2) // Limit total
  },
  
  getLogsByLevel: (level: LogLevel): LogEntry[] => logs.filter(log => log.level === level),
  
  getLogsByCategory: (category: string): LogEntry[] => logs.filter(log => log.category === category),
  
  clearLogs: (): void => {
    logs.length = 0
    logIdCounter = 0
    // Also clear current session file
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
  
  getLogsSummary: (): { total: number; byLevel: Record<LogLevel, number>; byCategory: Record<string, number> } => {
    const byLevel: Record<LogLevel, number> = { info: 0, warn: 0, error: 0, debug: 0 }
    const byCategory: Record<string, number> = {}
    
    for (const log of logs) {
      byLevel[log.level]++
      byCategory[log.category] = (byCategory[log.category] || 0) + 1
    }
    
    return { total: logs.length, byLevel, byCategory }
  },
  
  // Get logs directory path for user reference
  getLogsPath: (): string => getLogsDir(),
  
  // Force save (call on app quit)
  forceSave: (): void => {
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }
    saveLogs()
  },
  
  // Initialize (call on app start)
  init: (): void => {
    cleanupOldSessions()
    addLog('info', 'App', 'Logger initialized', { sessionId, logsDir: getLogsDir() })
  }
}

// Log categories for consistency
export const LogCategory = {
  AUTH: 'Auth',
  API: 'API',
  GRAPHQL: 'GraphQL',
  CACHE: 'Cache',
  IPC: 'IPC',
  APP: 'App',
  STORE: 'Store',
  RATE_LIMIT: 'RateLimit',
} as const
