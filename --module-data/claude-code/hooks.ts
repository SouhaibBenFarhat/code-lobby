/**
 * Claude Code TanStack Query Hooks
 *
 * Provides React hooks for managing Claude Code sessions using TanStack Query.
 * The TanStack Query cache serves as the single source of truth for session state.
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { keys } from '../keys'
import {
  extractTextContent,
  extractToolInfo,
  getStatusFromEvent,
  isAssistantEvent,
  isErrorEvent,
  isResultEvent,
  isThinkingEvent,
  isToolResultEvent,
  isToolUseEvent
} from './parser'
import {
  addMessageToSession,
  clearSessionMessages as clearStoredMessages,
  deleteSession as deleteStoredSession,
  loadSession
} from './persistence'
import type {
  ClaudeMessage,
  ClaudeSession,
  RepoContext,
  SessionStatus,
  StreamEvent,
  ToolActivity,
  ToolHistoryEntry,
  ToolResult
} from './types'

// =============================================================================
// Query Keys
// =============================================================================

export const claudeKeys = {
  all: ['claude'] as const,
  session: (sessionId: string): readonly ['claude', 'session', string] =>
    ['claude', 'session', sessionId] as const,
  sessions: (): readonly ['claude', 'sessions'] => ['claude', 'sessions'] as const
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create initial session state
 */
function createInitialSession(sessionId: string, repoContext?: RepoContext): ClaudeSession {
  const stored = loadSession(sessionId)

  return {
    id: sessionId,
    status: 'idle',
    messages: stored?.messages || [],
    currentStream: '',
    thinking: null,
    activity: null,
    lastToolResult: null,
    toolHistory: [],
    error: null,
    repoContext: repoContext || stored?.repoContext,
    createdAt: stored?.createdAt || Date.now(),
    updatedAt: stored?.updatedAt || Date.now()
  }
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// =============================================================================
// Session Query Hook
// =============================================================================

/**
 * Get or create a Claude session
 */
export function useClaudeSession(
  sessionId: string,
  repoContext?: RepoContext
): UseQueryResult<ClaudeSession, Error> {
  return useQuery({
    queryKey: claudeKeys.session(sessionId),
    queryFn: () => createInitialSession(sessionId, repoContext),
    staleTime: Infinity, // Session state managed via cache updates, not refetching
    gcTime: 30 * 60 * 1000 // Keep in cache for 30 minutes
  })
}

// =============================================================================
// Send Message Mutation
// =============================================================================

interface PRContext {
  owner: string
  repo: string
  branch?: string
  baseBranch?: string
  prNumber?: number
  prTitle?: string
  prDescription?: string
  changedFiles?: number
  labels?: string[]
  comments?: Array<{ author: string; body: string; createdAt: string }>
  reviews?: Array<{ author: string; state: string; body: string | null; createdAt: string }>
  reviewThreads?: Array<{
    path: string
    line: number | null
    isResolved: boolean
    comments: Array<{ author: string; body: string; createdAt: string }>
  }>
  reviewSummary?: string
  username?: string // GitHub username of the current user
}

interface ClaudeConfig {
  model?: string
  enableExtendedThinking?: boolean
  maxThinkingTokens?: number
}

interface SendMessageOptions {
  sessionId: string
  prompt: string
  displayLabel?: string // Short label to show instead of full prompt (for quick actions)
  prContext?: PRContext
  config?: ClaudeConfig
}

/**
 * Send a message to Claude Code
 */
export function useSendMessage(): UseMutationResult<
  { sessionId: string; prompt: string },
  Error,
  SendMessageOptions,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (options: SendMessageOptions) => {
      const { sessionId, prompt, prContext, config } = options

      // Get GitHub token from TanStack Query cache (same as rest of the app)
      const githubToken = queryClient.getQueryData<string>(keys.githubToken) || ''

      // Get existing session for conversation history
      const session = queryClient.getQueryData<ClaudeSession>(claudeKeys.session(sessionId))

      // Build conversation history for multi-turn
      const conversationHistory = session?.messages.map((m) => ({
        role: m.role,
        content: m.content
      }))

      // Start the Claude Code session via IPC
      // PR context is ALWAYS passed if available - Claude handles everything internally
      await window.electron?.startClaudeSession({
        sessionId,
        prompt,
        conversationHistory,
        prContext: prContext
          ? {
              ...prContext,
              branch: prContext.branch || 'main', // Fallback to 'main' if branch is undefined
              githubToken
            }
          : undefined,
        config
      })

      return { sessionId, prompt }
    },
    onMutate: async (options) => {
      const { sessionId, prompt, displayLabel } = options

      // Optimistically add user message
      const userMessage: ClaudeMessage = {
        id: generateMessageId(),
        role: 'user',
        content: prompt,
        displayLabel, // Show this instead of full content in UI
        timestamp: Date.now()
      }

      // Update TanStack cache
      queryClient.setQueryData<ClaudeSession>(claudeKeys.session(sessionId), (old) => {
        const session = old || createInitialSession(sessionId)
        return {
          ...session,
          status: 'streaming' as SessionStatus,
          messages: [...session.messages, userMessage],
          currentStream: '',
          thinking: null,
          activity: null,
          error: null,
          updatedAt: Date.now()
        }
      })

      // Persist user message
      addMessageToSession(sessionId, userMessage)
    }
  })
}

// =============================================================================
// Stop Session Mutation
// =============================================================================

/**
 * Stop an active Claude Code session
 */
export function useStopClaude(): UseMutationResult<
  { sessionId: string; stopped: boolean | undefined },
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const result = await window.electron?.stopClaudeSession(sessionId)
      return { sessionId, stopped: result }
    },
    onSuccess: (data) => {
      const { sessionId } = data

      queryClient.setQueryData<ClaudeSession>(claudeKeys.session(sessionId), (old) => {
        if (!old) return old
        return {
          ...old,
          status: 'idle',
          activity: null,
          updatedAt: Date.now()
        }
      })
    }
  })
}

// =============================================================================
// Clear Session Mutation
// =============================================================================

/**
 * Clear all messages from a session
 */
export function useClearSession(): UseMutationResult<
  { sessionId: string },
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      clearStoredMessages(sessionId)
      return { sessionId }
    },
    onSuccess: (data) => {
      const { sessionId } = data

      queryClient.setQueryData<ClaudeSession>(claudeKeys.session(sessionId), (old) => {
        if (!old) return old
        return {
          ...old,
          messages: [],
          currentStream: '',
          thinking: null,
          activity: null,
          lastToolResult: null,
          toolHistory: [],
          error: null,
          updatedAt: Date.now()
        }
      })

      // Also invalidate to ensure fresh state
      queryClient.invalidateQueries({
        queryKey: claudeKeys.session(sessionId)
      })
    }
  })
}

// =============================================================================
// Delete Session Mutation
// =============================================================================

/**
 * Delete a session completely
 */
export function useDeleteSession(): UseMutationResult<
  { sessionId: string },
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (sessionId: string) => {
      deleteStoredSession(sessionId)
      return { sessionId }
    },
    onSuccess: (data) => {
      queryClient.removeQueries({
        queryKey: claudeKeys.session(data.sessionId)
      })
    }
  })
}

// =============================================================================
// Stream Listener Hook
// =============================================================================

/**
 * Listen for Claude Code stream events and update TanStack cache
 * Should be initialized once at app root
 */
export function useClaudeStreamListener(): void {
  const queryClient = useQueryClient()
  const cleanupRef = useRef<(() => void)[]>([])

  useEffect(() => {
    if (!window.electron) return

    // Handle stream chunks
    const unsubChunk = window.electron.onClaudeChunk((data) => {
      const { sessionId, event } = data

      // Debug: Log tool_use events to see actual command structure
      if (event && (event as StreamEvent).type === 'tool_use') {
        const toolEvent = event as { tool_name?: string; input?: Record<string, unknown> }
        console.log('[Claude Tool Use]', {
          tool_name: toolEvent.tool_name,
          input_keys: toolEvent.input ? Object.keys(toolEvent.input) : [],
          input: toolEvent.input
        })
      }

      queryClient.setQueryData<ClaudeSession>(claudeKeys.session(sessionId), (old) => {
        if (!old) return old
        // Cast event to StreamEvent - the type guard functions will validate the actual type
        return processStreamEvent(old, event as StreamEvent)
      })
    })

    // Handle session completion
    const unsubDone = window.electron.onClaudeDone((data) => {
      const { sessionId, success, error } = data

      queryClient.setQueryData<ClaudeSession>(claudeKeys.session(sessionId), (old) => {
        if (!old) return old

        // Finalize the session
        const finalSession = finalizeSession(old, success, error)

        // Persist the final assistant message
        if (old.currentStream) {
          const assistantMessage: ClaudeMessage = {
            id: generateMessageId(),
            role: 'assistant',
            content: old.currentStream,
            thinking: old.thinking || undefined,
            timestamp: Date.now()
          }
          addMessageToSession(sessionId, assistantMessage)
        }

        return finalSession
      })
    })

    // Handle errors
    const unsubError = window.electron.onClaudeError((data) => {
      const { sessionId, error } = data

      queryClient.setQueryData<ClaudeSession>(claudeKeys.session(sessionId), (old) => {
        if (!old) return old
        return {
          ...old,
          status: 'error',
          error,
          activity: null,
          updatedAt: Date.now()
        }
      })
    })

    cleanupRef.current = [unsubChunk, unsubDone, unsubError]

    return () => {
      for (const unsub of cleanupRef.current) {
        unsub()
      }
    }
  }, [queryClient])
}

// =============================================================================
// Stream Event Processing
// =============================================================================

/**
 * Process a stream event and return updated session state
 */
function processStreamEvent(session: ClaudeSession, event: StreamEvent): ClaudeSession {
  const updates: Partial<ClaudeSession> = {
    status: getStatusFromEvent(event),
    updatedAt: Date.now()
  }

  // Handle different event types
  if (isAssistantEvent(event)) {
    const text = extractTextContent(event)
    updates.status = 'streaming'
    updates.currentStream = session.currentStream + text
    updates.activity = null // Clear activity when receiving text
  } else if (isThinkingEvent(event)) {
    updates.status = 'thinking'
    updates.thinking = (session.thinking || '') + (event.thinking || '')
  } else if (isToolUseEvent(event)) {
    const { toolName, input } = extractToolInfo(event)
    const now = Date.now()
    updates.status = 'tool_use'
    updates.activity = {
      toolName,
      input,
      startedAt: now
    } as ToolActivity

    // Only add to history if we have meaningful input (skip empty {} placeholders)
    const hasInput = input && input !== '{}' && input !== '' && !input.startsWith('[')
    if (hasInput) {
      // Check if we should update the last entry (same tool, was running with no input)
      const history = [...(session.toolHistory || [])]
      const lastEntry = history.length > 0 ? history[history.length - 1] : null

      if (
        lastEntry &&
        lastEntry.toolName === toolName &&
        lastEntry.status === 'running' &&
        !lastEntry.input
      ) {
        // Update existing entry with the input
        history[history.length - 1] = { ...lastEntry, input }
        updates.toolHistory = history
      } else {
        // Add new entry
        const historyEntry: ToolHistoryEntry = {
          id: `tool-${now}-${Math.random().toString(36).slice(2, 8)}`,
          toolName,
          input,
          startedAt: now,
          status: 'running'
        }
        updates.toolHistory = [...history, historyEntry]
      }
    } else if (
      !session.toolHistory?.some((e) => e.status === 'running' && e.toolName === toolName)
    ) {
      // Add placeholder entry (will be updated when we get input)
      const historyEntry: ToolHistoryEntry = {
        id: `tool-${now}-${Math.random().toString(36).slice(2, 8)}`,
        toolName,
        input: '',
        startedAt: now,
        status: 'running'
      }
      updates.toolHistory = [...(session.toolHistory || []), historyEntry]
    }
  } else if (isToolResultEvent(event)) {
    const now = Date.now()
    const duration = session.activity ? now - session.activity.startedAt : 0
    updates.lastToolResult = {
      toolName: session.activity?.toolName || 'Unknown',
      output: event.content || '',
      duration
    } as ToolResult
    updates.activity = null
    // Update the last tool history entry with result
    if (session.toolHistory && session.toolHistory.length > 0) {
      const history = [...session.toolHistory]
      const lastEntry = { ...history[history.length - 1] }
      lastEntry.output = (event.content || '').slice(0, 500) // Truncate for storage
      lastEntry.completedAt = now
      lastEntry.duration = duration
      lastEntry.status = 'completed'
      history[history.length - 1] = lastEntry
      updates.toolHistory = history
    }
  } else if (isResultEvent(event)) {
    // Final result - the result is the FULL content, not a delta
    // Only use it if we don't have accumulated content yet
    if (event.result && !session.currentStream) {
      updates.currentStream = event.result
    }
    updates.status = 'done'
    updates.activity = null
  } else if (isErrorEvent(event)) {
    updates.status = 'error'
    updates.error = event.error
    updates.activity = null
    // Mark any running tool as errored
    if (session.toolHistory && session.toolHistory.length > 0) {
      const history = [...session.toolHistory]
      const lastEntry = history[history.length - 1]
      if (lastEntry.status === 'running') {
        history[history.length - 1] = { ...lastEntry, status: 'error', completedAt: Date.now() }
        updates.toolHistory = history
      }
    }
  }

  return { ...session, ...updates }
}

/**
 * Finalize a session after completion
 */
function finalizeSession(session: ClaudeSession, success: boolean, error?: string): ClaudeSession {
  // Create the assistant message from the streamed content
  const assistantMessage: ClaudeMessage | null = session.currentStream
    ? {
        id: generateMessageId(),
        role: 'assistant',
        content: session.currentStream,
        thinking: session.thinking || undefined,
        timestamp: Date.now()
      }
    : null

  return {
    ...session,
    status: success ? 'idle' : 'error',
    messages: assistantMessage ? [...session.messages, assistantMessage] : session.messages,
    currentStream: '',
    thinking: null,
    activity: null,
    error: success ? null : error || 'Session failed',
    updatedAt: Date.now()
  }
}

// =============================================================================
// Review Event Hook
// =============================================================================

/**
 * Review data from Claude's structured review output
 */
export interface ClaudeReviewData {
  summary: string
  comments: Array<{ file: string; line: number; body: string }>
  verdict: 'approve' | 'request_changes' | 'comment'
}

/**
 * Listen for Claude review events (when Claude generates a structured review)
 * This uses a tool-based approach - the main process detects review JSON and emits a dedicated event
 */
export function useClaudeReviewListener(
  sessionId: string | null,
  onReview: (review: ClaudeReviewData) => void
): void {
  const onReviewRef = useRef(onReview)
  onReviewRef.current = onReview

  useEffect(() => {
    if (!window.electron || !sessionId) return

    const unsubscribe = window.electron.onClaudeReview((data) => {
      // Only handle reviews for our session
      if (data.sessionId === sessionId) {
        onReviewRef.current(data.review)
      }
    })

    return unsubscribe
  }, [sessionId])
}

// =============================================================================
// Utility Hooks
// =============================================================================

/**
 * Check if a session is currently streaming
 */
export function useIsStreaming(sessionId: string): boolean {
  const { data: session } = useClaudeSession(sessionId)
  return (
    session?.status === 'streaming' ||
    session?.status === 'thinking' ||
    session?.status === 'tool_use'
  )
}

/**
 * Get session messages
 */
export function useSessionMessages(sessionId: string): ClaudeMessage[] {
  const { data: session } = useClaudeSession(sessionId)
  return session?.messages || []
}

/**
 * Get current tool activity
 */
export function useToolActivity(sessionId: string): ToolActivity | null {
  const { data: session } = useClaudeSession(sessionId)
  return session?.activity || null
}

/**
 * Get current thinking content
 */
export function useThinking(sessionId: string): string | null {
  const { data: session } = useClaudeSession(sessionId)
  return session?.thinking || null
}
