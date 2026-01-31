/**
 * Claude Code Session Persistence
 *
 * Handles localStorage persistence for Claude Code chat sessions.
 * Sessions are stored to preserve conversation history across app restarts.
 */

import type { ClaudeMessage, RepoContext, StoredSession, StoredSessions } from './types'

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'codelobby-claude-sessions'
const MAX_SESSIONS = 50 // Maximum number of sessions to keep
const MAX_MESSAGES_PER_SESSION = 100 // Maximum messages per session

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Load all stored sessions from localStorage
 */
export function loadAllSessions(): StoredSessions {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw)
    return parsed as StoredSessions
  } catch (error) {
    console.error('[ClaudeCode] Failed to load sessions:', error)
    return {}
  }
}

/**
 * Load a single session by ID
 */
export function loadSession(sessionId: string): StoredSession | null {
  const sessions = loadAllSessions()
  return sessions[sessionId] || null
}

/**
 * Save a session to localStorage
 */
export function saveSession(session: StoredSession): void {
  try {
    const sessions = loadAllSessions()

    // Limit messages
    const limitedMessages = session.messages.slice(-MAX_MESSAGES_PER_SESSION)

    sessions[session.id] = {
      ...session,
      messages: limitedMessages,
      updatedAt: Date.now()
    }

    // Prune old sessions if we have too many
    const sessionIds = Object.keys(sessions)
    if (sessionIds.length > MAX_SESSIONS) {
      // Sort by updatedAt, oldest first
      const sortedIds = sessionIds.sort(
        (a, b) => (sessions[a].updatedAt || 0) - (sessions[b].updatedAt || 0)
      )

      // Remove oldest sessions
      const toRemove = sortedIds.slice(0, sessionIds.length - MAX_SESSIONS)
      for (const id of toRemove) {
        delete sessions[id]
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.error('[ClaudeCode] Failed to save session:', error)
  }
}

/**
 * Delete a session from localStorage
 */
export function deleteSession(sessionId: string): void {
  try {
    const sessions = loadAllSessions()
    delete sessions[sessionId]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.error('[ClaudeCode] Failed to delete session:', error)
  }
}

/**
 * List all session IDs
 */
export function listSessionIds(): string[] {
  const sessions = loadAllSessions()
  return Object.keys(sessions)
}

/**
 * Clear all sessions from localStorage
 */
export function clearAllSessions(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[ClaudeCode] Failed to clear sessions:', error)
  }
}

// =============================================================================
// Session Update Functions
// =============================================================================

/**
 * Add a message to a session
 */
export function addMessageToSession(sessionId: string, message: ClaudeMessage): StoredSession {
  const existing = loadSession(sessionId)

  const session: StoredSession = existing || {
    id: sessionId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  session.messages.push(message)
  session.updatedAt = Date.now()

  saveSession(session)
  return session
}

/**
 * Update the last message in a session (for streaming updates)
 */
export function updateLastMessage(
  sessionId: string,
  update: Partial<ClaudeMessage>
): StoredSession | null {
  const session = loadSession(sessionId)
  if (!session || session.messages.length === 0) return null

  const lastIndex = session.messages.length - 1
  session.messages[lastIndex] = {
    ...session.messages[lastIndex],
    ...update
  }
  session.updatedAt = Date.now()

  saveSession(session)
  return session
}

/**
 * Set repo context for a session
 */
export function setSessionRepoContext(sessionId: string, repoContext: RepoContext): void {
  const session = loadSession(sessionId) || {
    id: sessionId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  session.repoContext = repoContext
  session.updatedAt = Date.now()

  saveSession(session)
}

/**
 * Clear messages from a session but keep the session itself
 */
export function clearSessionMessages(sessionId: string): void {
  const session = loadSession(sessionId)
  if (!session) return

  session.messages = []
  session.updatedAt = Date.now()

  saveSession(session)
}

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Get all messages for a session
 */
export function getSessionMessages(sessionId: string): ClaudeMessage[] {
  const session = loadSession(sessionId)
  return session?.messages || []
}

/**
 * Get recent sessions sorted by updatedAt
 */
export function getRecentSessions(limit = 10): StoredSession[] {
  const sessions = loadAllSessions()
  return Object.values(sessions)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit)
}

/**
 * Check if a session exists
 */
export function sessionExists(sessionId: string): boolean {
  const sessions = loadAllSessions()
  return sessionId in sessions
}

// =============================================================================
// Session ID Helpers
// =============================================================================

/**
 * Generate a PR session ID
 */
export function getPRSessionId(owner: string, repo: string, prNumber: number): string {
  return `pr-${owner}-${repo}-${prNumber}`
}

/**
 * Generate a general chat session ID
 */
export function getGeneralSessionId(): string {
  return 'general'
}

/**
 * Parse a PR session ID
 */
export function parsePRSessionId(
  sessionId: string
): { owner: string; repo: string; prNumber: number } | null {
  const match = sessionId.match(/^pr-(.+)-(.+)-(\d+)$/)
  if (!match) return null

  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  }
}
