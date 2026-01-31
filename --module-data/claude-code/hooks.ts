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
  reviewSummary?: string
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
    updates.status = 'tool_use'
    updates.activity = {
      toolName,
      input,
      startedAt: Date.now()
    } as ToolActivity
  } else if (isToolResultEvent(event)) {
    updates.lastToolResult = {
      toolName: session.activity?.toolName || 'Unknown',
      output: event.content || '',
      duration: session.activity ? Date.now() - session.activity.startedAt : 0
    } as ToolResult
    updates.activity = null
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
