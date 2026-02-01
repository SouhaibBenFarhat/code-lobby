/**
 * Custom Prompts Hooks
 *
 * TanStack Query hooks for custom prompt CRUD operations using SQLite via IPC.
 */

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import type { CustomPrompt, DbResult, NewCustomPrompt } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const customPromptKeys = {
  all: ['db', 'customPrompts'] as const,
  list: (): readonly ['db', 'customPrompts', 'list'] => [...customPromptKeys.all, 'list'] as const
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get all custom prompts
 */
export function useCustomPrompts(): UseQueryResult<CustomPrompt[], Error> {
  return useQuery({
    queryKey: customPromptKeys.list(),
    queryFn: async () => {
      const result: DbResult<CustomPrompt[]> = await window.electron.db.customPrompts.list()
      if (!result.success) throw new Error(result.error || 'Failed to load custom prompts')
      return result.data || []
    }
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new custom prompt
 */
export function useCreateCustomPrompt(): UseMutationResult<
  CustomPrompt,
  Error,
  NewCustomPrompt,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewCustomPrompt) => {
      const result: DbResult<CustomPrompt> = await window.electron.db.customPrompts.create(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create custom prompt')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customPromptKeys.list() })
    }
  })
}

/**
 * Update a custom prompt
 */
export function useUpdateCustomPrompt(): UseMutationResult<
  CustomPrompt,
  Error,
  { id: string; data: Partial<Omit<CustomPrompt, 'id' | 'createdAt'>> },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const result: DbResult<CustomPrompt | undefined> =
        await window.electron.db.customPrompts.update(id, data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update custom prompt')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customPromptKeys.list() })
    }
  })
}

/**
 * Delete a custom prompt
 */
export function useDeleteCustomPrompt(): UseMutationResult<boolean, Error, string, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const result: DbResult<boolean> = await window.electron.db.customPrompts.delete(id)
      if (!result.success) throw new Error(result.error || 'Failed to delete custom prompt')
      return result.data || false
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customPromptKeys.list() })
    }
  })
}
