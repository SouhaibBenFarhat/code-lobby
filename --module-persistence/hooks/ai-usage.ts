/**
 * AI Usage Hooks
 *
 * TanStack Query hooks for AI usage tracking using SQLite via IPC.
 */

import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import type { AIUsageRecord, AIUsageStats, DbResult, NewAIUsageRecord } from '../types'

// =============================================================================
// Query Keys
// =============================================================================

export const aiUsageKeys = {
  all: ['db', 'aiUsage'] as const,
  recent: (limit?: number): readonly ['db', 'aiUsage', 'recent', number | undefined] =>
    [...aiUsageKeys.all, 'recent', limit] as const,
  stats: (sinceTimestamp?: number): readonly ['db', 'aiUsage', 'stats', number | undefined] =>
    [...aiUsageKeys.all, 'stats', sinceTimestamp] as const
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Get recent AI usage records
 */
export function useRecentAIUsage(limit?: number): UseQueryResult<AIUsageRecord[], Error> {
  return useQuery({
    queryKey: aiUsageKeys.recent(limit),
    queryFn: async () => {
      const result: DbResult<AIUsageRecord[]> = await window.electron.db.aiUsage.listRecent(limit)
      if (!result.success) throw new Error(result.error || 'Failed to load AI usage')
      return result.data || []
    }
  })
}

/**
 * Get AI usage statistics
 */
export function useAIUsageStats(sinceTimestamp?: number): UseQueryResult<AIUsageStats, Error> {
  return useQuery({
    queryKey: aiUsageKeys.stats(sinceTimestamp),
    queryFn: async () => {
      const result: DbResult<AIUsageStats> =
        await window.electron.db.aiUsage.getStats(sinceTimestamp)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load AI usage stats')
      }
      return result.data
    }
  })
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Record new AI usage
 */
export function useAddAIUsage(): UseMutationResult<
  AIUsageRecord,
  Error,
  NewAIUsageRecord,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: NewAIUsageRecord) => {
      const result: DbResult<AIUsageRecord> = await window.electron.db.aiUsage.add(data)
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to record AI usage')
      }
      return result.data
    },
    onSuccess: () => {
      // Invalidate all usage queries
      queryClient.invalidateQueries({ queryKey: aiUsageKeys.all })
    }
  })
}

/**
 * Clear all AI usage records
 */
export function useClearAIUsage(): UseMutationResult<number, Error, void, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const result: DbResult<number> = await window.electron.db.aiUsage.clear()
      if (!result.success) throw new Error(result.error || 'Failed to clear AI usage')
      return result.data || 0
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiUsageKeys.all })
    }
  })
}
