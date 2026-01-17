// Logger utility for CodeLobby
// Stores logs in memory for debugging

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  category: string
  message: string
  details?: unknown
}

const MAX_LOGS = 500
const logs: LogEntry[] = []
let logIdCounter = 0

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
  
  // Keep only the last MAX_LOGS entries
  if (logs.length > MAX_LOGS) {
    logs.shift()
  }
  
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
  
  getLogsByLevel: (level: LogLevel): LogEntry[] => logs.filter(log => log.level === level),
  
  getLogsByCategory: (category: string): LogEntry[] => logs.filter(log => log.category === category),
  
  clearLogs: (): void => {
    logs.length = 0
    logIdCounter = 0
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
