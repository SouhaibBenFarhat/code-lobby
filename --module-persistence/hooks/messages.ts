/**
 * Messages Hooks
 *
 * TanStack Query hooks for message CRUD operations using SQLite via IPC.
 */

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import type { DbResult, Message, NewMessage } from '../types'
import { conversationKeys } from './conversations'

// =============================================================================
// Query Keys
// =============================================================================

export const messageKeys = {
  all: ['db', 'messages'] as const,
  forConversation: (conversationId: string): readonly ['db', 'messages', 'conversation', string] =>
    [...messageKeys.all, 'conversation', conversationId] as const
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all messages for a conversation
 */
export function useMessages(conversationId: string | null): UseQueryResult<Message[], Error> {
  return useQuery({
    queryKey: messageKeys.forConversation(conversationId || ''),
    queryFn: async () => {
      if (!conversationId) return []
      const result: DbResult<Message[]> =
        await window.electron.db.messages.listForConversation(conversationId)
      if (!result.success) throw new Error(result.error || 'Failed to load messages')
      return result.data || []
    },
    enabled: !!conversationId
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Add a single message to a conversation
 */
export function useAddMessage(): UseMutationResult<Message, Error, NewMessage, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewMessage) => {
      const result: DbResult<Message> = await window.electron.db.messages.add(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to add message')
      }
      return result.data
    },
    onSuccess: (message) => {
      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: messageKeys.forConversation(message.conversationId)
      })
      // Also invalidate the conversation with messages query
      queryClient.invalidateQueries({
        queryKey: conversationKeys.withMessages(message.conversationId)
      })
      // Update conversation list (updatedAt changed)
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    }
  })
}

/**
 * Add multiple messages at once (batch insert)
 */
export function useAddMessages(): UseMutationResult<
  void,
  Error,
  { messages: NewMessage[] },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ messages }) => {
      if (messages.length === 0) return
      const result: DbResult<void> = await window.electron.db.messages.addMany(messages)
      if (!result.success) throw new Error(result.error || 'Failed to add messages')
    },
    onSuccess: (_, { messages }) => {
      // Get unique conversation IDs
      const conversationIds = [...new Set(messages.map((m) => m.conversationId))]

      for (const conversationId of conversationIds) {
        queryClient.invalidateQueries({
          queryKey: messageKeys.forConversation(conversationId)
        })
        queryClient.invalidateQueries({
          queryKey: conversationKeys.withMessages(conversationId)
        })
      }
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    }
  })
}

/**
 * Update a message
 */
export function useUpdateMessage(): UseMutationResult<
  Message,
  Error,
  {
    id: string
    conversationId: string
    data: Partial<Omit<Message, 'id' | 'conversationId' | 'createdAt'>>
  },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result: DbResult<Message | undefined> = await window.electron.db.messages.update(
        id,
        data
      )
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update message')
      }
      return result.data
    },
    onSuccess: (_message, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.forConversation(conversationId)
      })
      queryClient.invalidateQueries({
        queryKey: conversationKeys.withMessages(conversationId)
      })
    }
  })
}

/**
 * Delete a single message
 */
export function useDeleteMessage(): UseMutationResult<
  boolean,
  Error,
  { id: string; conversationId: string },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }) => {
      const result: DbResult<boolean> = await window.electron.db.messages.delete(id)
      if (!result.success) throw new Error(result.error || 'Failed to delete message')
      return result.data || false
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.forConversation(conversationId)
      })
      queryClient.invalidateQueries({
        queryKey: conversationKeys.withMessages(conversationId)
      })
    }
  })
}

/**
 * Clear all messages for a conversation
 */
export function useClearMessages(): UseMutationResult<number, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const result: DbResult<number> =
        await window.electron.db.messages.clearForConversation(conversationId)
      if (!result.success) throw new Error(result.error || 'Failed to clear messages')
      return result.data || 0
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.forConversation(conversationId)
      })
      queryClient.invalidateQueries({
        queryKey: conversationKeys.withMessages(conversationId)
      })
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    }
  })
}
