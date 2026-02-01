/**
 * Conversations Hooks
 *
 * TanStack Query hooks for conversation CRUD operations using SQLite via IPC.
 */

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import type { Conversation, ConversationWithMessages, DbResult, NewConversation } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const conversationKeys = {
  all: ['db', 'conversations'] as const,
  lists: (): readonly ['db', 'conversations', 'list'] => [...conversationKeys.all, 'list'] as const,
  list: (): readonly ['db', 'conversations', 'list'] => [...conversationKeys.lists()] as const,
  details: (): readonly ['db', 'conversations', 'detail'] =>
    [...conversationKeys.all, 'detail'] as const,
  detail: (id: string): readonly ['db', 'conversations', 'detail', string] =>
    [...conversationKeys.details(), id] as const,
  withMessages: (id: string): readonly ['db', 'conversations', 'detail', string, 'messages'] =>
    [...conversationKeys.detail(id), 'messages'] as const
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all conversations
 */
export function useConversations(): UseQueryResult<Conversation[], Error> {
  return useQuery({
    queryKey: conversationKeys.list(),
    queryFn: async () => {
      const result: DbResult<Conversation[]> = await window.electron.db.conversations.list()
      if (!result.success) throw new Error(result.error || 'Failed to load conversations')
      return result.data || []
    }
  })
}

/**
 * Get a single conversation by ID
 */
export function useConversation(id: string | null): UseQueryResult<Conversation | null, Error> {
  return useQuery({
    queryKey: conversationKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) return null
      const result: DbResult<Conversation | undefined> =
        await window.electron.db.conversations.get(id)
      if (!result.success) throw new Error(result.error || 'Failed to load conversation')
      return result.data || null
    },
    enabled: !!id
  })
}

/**
 * Get a conversation with all its messages
 */
export function useConversationWithMessages(
  id: string | null
): UseQueryResult<ConversationWithMessages | null, Error> {
  return useQuery({
    queryKey: conversationKeys.withMessages(id || ''),
    queryFn: async () => {
      if (!id) return null
      const result: DbResult<ConversationWithMessages | undefined> =
        await window.electron.db.conversations.getWithMessages(id)
      if (!result.success) throw new Error(result.error || 'Failed to load conversation')
      return result.data || null
    },
    enabled: !!id
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new conversation
 */
export function useCreateConversation(): UseMutationResult<
  Conversation,
  Error,
  NewConversation,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewConversation) => {
      const result: DbResult<Conversation> = await window.electron.db.conversations.create(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create conversation')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
    }
  })
}

/**
 * Get or create a conversation (useful for ensuring a conversation exists)
 */
export function useGetOrCreateConversation(): UseMutationResult<
  Conversation,
  Error,
  NewConversation,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewConversation) => {
      const result: DbResult<Conversation> =
        await window.electron.db.conversations.getOrCreate(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to get or create conversation')
      }
      return result.data
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation)
    }
  })
}

/**
 * Update a conversation
 */
export function useUpdateConversation(): UseMutationResult<
  Conversation,
  Error,
  { id: string; data: Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>> },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result: DbResult<Conversation | undefined> =
        await window.electron.db.conversations.update(id, data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update conversation')
      }
      return result.data
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.setQueryData(conversationKeys.detail(conversation.id), conversation)
    }
  })
}

/**
 * Delete a conversation
 */
export function useDeleteConversation(): UseMutationResult<boolean, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result: DbResult<boolean> = await window.electron.db.conversations.delete(id)
      if (!result.success) throw new Error(result.error || 'Failed to delete conversation')
      return result.data || false
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() })
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) })
    }
  })
}

/**
 * Delete all conversations
 */
export function useDeleteAllConversations(): UseMutationResult<number, Error, void, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result: DbResult<number> = await window.electron.db.conversations.deleteAll()
      if (!result.success) throw new Error(result.error || 'Failed to delete all conversations')
      return result.data || 0
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all })
    }
  })
}
