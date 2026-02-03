/**
 * Claude Code Session Persistence
 *
 * Handles SQLite persistence for Claude Code chat sessions via IPC.
 * Sessions are stored to preserve conversation history across app restarts.
 *
 * This replaces the previous localStorage-based implementation with SQLite.
 */

import type {
  ClaudeMessage,
  MessageReviewData,
  RepoContext,
  StoredSession,
  StoredSessions
} from './types'

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

// =============================================================================
// Async SQLite Operations
// =============================================================================

/**
 * Result of loading all sessions - includes both sessions and reviews
 */
export interface LoadAllSessionsResult {
  sessions: StoredSessions
  reviews: Record<string, Record<string, MessageReviewData>>
}

/**
 * Load all stored sessions from SQLite
 */
export async function loadAllSessionsAsync(): Promise<LoadAllSessionsResult> {
  try {
    const result = await window.electron.db.conversations.list()
    if (!result.success || !result.data) {
      return { sessions: {}, reviews: {} }
    }

    const sessions: StoredSessions = {}
    const allReviews: Record<string, Record<string, MessageReviewData>> = {}

    // Load messages for each conversation
    for (const conv of result.data) {
      const messagesResult = await window.electron.db.messages.listForConversation(conv.id)
      const sessionReviews: Record<string, MessageReviewData> = {}

      const messages: ClaudeMessage[] =
        messagesResult.success && messagesResult.data
          ? messagesResult.data.map((m) => {
              // Extract review data from metadata if present
              const metadata = m.metadata as { reviewData?: MessageReviewData } | null
              if (metadata?.reviewData) {
                sessionReviews[m.id] = metadata.reviewData
              }

              return {
                id: m.id,
                role: m.role,
                content: m.content,
                displayLabel: m.displayLabel || undefined,
                thinking: m.thinking || undefined,
                hasReview: !!metadata?.reviewData,
                timestamp: m.createdAt
              }
            })
          : []

      if (Object.keys(sessionReviews).length > 0) {
        allReviews[conv.id] = sessionReviews
      }

      sessions[conv.id] = {
        id: conv.id,
        messages,
        repoContext:
          conv.repoFullName && conv.prNumber
            ? {
                owner: conv.repoFullName.split('/')[0],
                repo: conv.repoFullName.split('/')[1],
                branch: 'main', // Default, not stored in DB
                prNumber: conv.prNumber
              }
            : undefined,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }
    }

    return { sessions, reviews: allReviews }
  } catch (error) {
    console.error('[ClaudeCode] Failed to load sessions:', error)
    return { sessions: {}, reviews: {} }
  }
}

/**
 * Loaded session with optional reviews
 */
export interface LoadedSession extends StoredSession {
  reviews?: Record<string, MessageReviewData>
}

/**
 * Load a single session by ID (async)
 */
export async function loadSessionAsync(sessionId: string): Promise<LoadedSession | null> {
  try {
    const result = await window.electron.db.conversations.getWithMessages(sessionId)
    if (!result.success || !result.data) return null

    const { conversation: conv, messages: dbMessages } = result.data
    const reviews: Record<string, MessageReviewData> = {}

    const messages: ClaudeMessage[] = dbMessages.map((m) => {
      // Extract review data from metadata if present
      const metadata = m.metadata as { reviewData?: MessageReviewData } | null
      if (metadata?.reviewData) {
        reviews[m.id] = metadata.reviewData
      }

      return {
        id: m.id,
        role: m.role,
        content: m.content,
        displayLabel: m.displayLabel || undefined,
        thinking: m.thinking || undefined,
        hasReview: !!metadata?.reviewData,
        timestamp: m.createdAt
      }
    })

    return {
      id: conv.id,
      messages,
      reviews: Object.keys(reviews).length > 0 ? reviews : undefined,
      repoContext:
        conv.repoFullName && conv.prNumber
          ? {
              owner: conv.repoFullName.split('/')[0],
              repo: conv.repoFullName.split('/')[1],
              branch: 'main',
              prNumber: conv.prNumber
            }
          : undefined,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt
    }
  } catch (error) {
    console.error('[ClaudeCode] Failed to load session:', error)
    return null
  }
}

/**
 * Save a message to a session (async)
 */
export async function addMessageToSessionAsync(
  sessionId: string,
  message: ClaudeMessage,
  repoContext?: RepoContext,
  reviewData?: MessageReviewData
): Promise<LoadedSession> {
  try {
    // Ensure conversation exists
    const sessionType = sessionId.startsWith('pr-') ? 'pr' : 'general'
    const parsedPR = sessionType === 'pr' ? parsePRSessionId(sessionId) : null

    await window.electron.db.conversations.getOrCreate({
      id: sessionId,
      sessionType,
      repoFullName: parsedPR ? `${parsedPR.owner}/${parsedPR.repo}` : null,
      prNumber: parsedPR?.prNumber || null,
      prTitle: null
    })

    // Build metadata object if we have review data
    const metadata = reviewData ? { reviewData } : null

    // Add the message with optional review metadata
    await window.electron.db.messages.add({
      id: message.id,
      conversationId: sessionId,
      role: message.role,
      content: message.content,
      thinking: message.thinking || null,
      displayLabel: message.displayLabel || null,
      metadata
    })

    // Return the updated session
    const session = await loadSessionAsync(sessionId)
    return (
      session || {
        id: sessionId,
        messages: [message],
        reviews: reviewData ? { [message.id]: reviewData } : undefined,
        repoContext,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    )
  } catch (error) {
    console.error('[ClaudeCode] Failed to save message:', error)
    // Return a minimal session on error
    return {
      id: sessionId,
      messages: [message],
      repoContext,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }
}

/**
 * Delete a session from SQLite (async)
 */
export async function deleteSessionAsync(sessionId: string): Promise<void> {
  try {
    await window.electron.db.conversations.delete(sessionId)
  } catch (error) {
    console.error('[ClaudeCode] Failed to delete session:', error)
  }
}

/**
 * Clear messages from a session (async)
 */
export async function clearSessionMessagesAsync(sessionId: string): Promise<void> {
  try {
    await window.electron.db.messages.clearForConversation(sessionId)
  } catch (error) {
    console.error('[ClaudeCode] Failed to clear messages:', error)
  }
}

// =============================================================================
// Synchronous Wrappers (for backward compatibility during migration)
// These use a cache that's populated asynchronously
// =============================================================================

let sessionCache: StoredSessions = {}
let reviewsCache: Record<string, Record<string, MessageReviewData>> = {}
let cacheLoaded = false
let cacheLoadPromise: Promise<void> | null = null

/**
 * Initialize the session cache (call at app startup)
 */
export async function initSessionCache(): Promise<void> {
  if (cacheLoaded) return
  if (cacheLoadPromise) return cacheLoadPromise

  cacheLoadPromise = (async () => {
    const { sessions, reviews } = await loadAllSessionsAsync()
    sessionCache = sessions
    reviewsCache = reviews
    cacheLoaded = true
  })()

  return cacheLoadPromise
}

/**
 * Get cached reviews for a session
 */
export function getSessionReviews(sessionId: string): Record<string, MessageReviewData> {
  return reviewsCache[sessionId] || {}
}

/**
 * Add a review to the cache (called when review is generated)
 */
export function cacheSessionReview(
  sessionId: string,
  messageId: string,
  review: MessageReviewData
): void {
  if (!reviewsCache[sessionId]) {
    reviewsCache[sessionId] = {}
  }
  reviewsCache[sessionId][messageId] = review
}

/**
 * Load all stored sessions (sync, uses cache)
 * @deprecated Use loadAllSessionsAsync instead
 */
export function loadAllSessions(): StoredSessions {
  return sessionCache
}

/**
 * Load a single session by ID (sync, uses cache)
 * @deprecated Use loadSessionAsync instead
 */
export function loadSession(sessionId: string): StoredSession | null {
  return sessionCache[sessionId] || null
}

/**
 * Add a message to a session (fire-and-forget with cache update)
 * @deprecated Use addMessageToSessionAsync instead
 */
export function addMessageToSession(
  sessionId: string,
  message: ClaudeMessage,
  reviewData?: MessageReviewData
): StoredSession {
  // Update cache immediately
  const existing = sessionCache[sessionId]
  const session: StoredSession = existing || {
    id: sessionId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  session.messages = [...session.messages, message]
  session.updatedAt = Date.now()
  sessionCache[sessionId] = session

  // Persist async (fire-and-forget) - include review data if present
  addMessageToSessionAsync(sessionId, message, session.repoContext, reviewData).catch((err) => {
    console.error('[ClaudeCode] Failed to persist message:', err)
  })

  return session
}

/**
 * Delete a session (fire-and-forget with cache update)
 * @deprecated Use deleteSessionAsync instead
 */
export function deleteSession(sessionId: string): void {
  delete sessionCache[sessionId]
  deleteSessionAsync(sessionId).catch((err) => {
    console.error('[ClaudeCode] Failed to delete session:', err)
  })
}

/**
 * Clear all sessions (fire-and-forget with cache update)
 */
export function clearAllSessions(): void {
  sessionCache = {}
  window.electron.db.conversations.deleteAll().catch((err) => {
    console.error('[ClaudeCode] Failed to clear sessions:', err)
  })
}

/**
 * Clear messages from a session but keep the session itself
 * @deprecated Use clearSessionMessagesAsync instead
 */
export function clearSessionMessages(sessionId: string): void {
  const session = sessionCache[sessionId]
  if (session) {
    session.messages = []
    session.updatedAt = Date.now()
  }

  clearSessionMessagesAsync(sessionId).catch((err) => {
    console.error('[ClaudeCode] Failed to clear messages:', err)
  })
}

// =============================================================================
// Query Helpers (use cache)
// =============================================================================

/**
 * List all session IDs
 */
export function listSessionIds(): string[] {
  return Object.keys(sessionCache)
}

/**
 * Get all messages for a session
 */
export function getSessionMessages(sessionId: string): ClaudeMessage[] {
  const session = sessionCache[sessionId]
  return session?.messages || []
}

/**
 * Get recent sessions sorted by updatedAt
 */
export function getRecentSessions(limit = 10): StoredSession[] {
  return Object.values(sessionCache)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, limit)
}

/**
 * Check if a session exists
 */
export function sessionExists(sessionId: string): boolean {
  return sessionId in sessionCache
}

/**
 * Update the last message in a session (for streaming updates)
 */
export function updateLastMessage(
  sessionId: string,
  update: Partial<ClaudeMessage>
): StoredSession | null {
  const session = sessionCache[sessionId]
  if (!session || session.messages.length === 0) return null

  const lastIndex = session.messages.length - 1
  session.messages[lastIndex] = {
    ...session.messages[lastIndex],
    ...update
  }
  session.updatedAt = Date.now()

  // Note: We don't persist streaming updates - only final messages are persisted

  return session
}

/**
 * Set repo context for a session
 */
export function setSessionRepoContext(sessionId: string, repoContext: RepoContext): void {
  const session = sessionCache[sessionId] || {
    id: sessionId,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  session.repoContext = repoContext
  session.updatedAt = Date.now()
  sessionCache[sessionId] = session

  // Context is stored as part of the conversation metadata
  // It will be persisted when the first message is saved
}

/**
 * Save a session to storage (sync wrapper)
 * @deprecated Messages are persisted individually via addMessageToSession
 */
export function saveSession(session: StoredSession): void {
  sessionCache[session.id] = session
  // Full session save not needed - messages are persisted individually
}
