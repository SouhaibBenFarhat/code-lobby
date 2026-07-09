/**
 * AI Queries - TanStack Query hooks for AI chat state
 *
 * Pattern:
 * - usePRChatMessages(prId) - fetch messages for a specific PR
 * - Settings queries use persisted cache
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import { keys } from '../keys'
import type { AIUsage, ChatMessage, CliUsageStats, CustomPrompt } from '../types'

// Helper to get persisted data with default
function getPersisted<T>(key: readonly string[], defaultValue: T): T {
  return queryClient.getQueryData(key) ?? defaultValue
}

// ═══════════════════════════════════════════════════════════════════════════
// PR CHAT MESSAGES - The main query for fetching chat for a specific PR
// ═══════════════════════════════════════════════════════════════════════════

export function usePRChatMessages(prId: string | null): UseQueryResult<ChatMessage[]> {
  return useQuery({
    queryKey: prId ? keys.prChatMessages(prId) : ['ai', 'pr-chat', 'none'],
    queryFn: (): ChatMessage[] => {
      if (!prId) return []
      // Read from persisted cache (TanStack Query persistence handles storage)
      return getPersisted(keys.prChatMessages(prId), [])
    },
    enabled: !!prId,
    staleTime: Infinity // Only updated via mutations
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS QUERIES - model selection, etc.
// ═══════════════════════════════════════════════════════════════════════════

export function useClaudeApiKey(): UseQueryResult<string | null> {
  return useQuery({
    queryKey: keys.claudeApiKey,
    queryFn: (): string | null => getPersisted(keys.claudeApiKey, null),
    staleTime: Infinity
  })
}

export function useSelectedModel(): UseQueryResult<string | null> {
  return useQuery({
    queryKey: keys.selectedModel,
    queryFn: (): string | null => getPersisted(keys.selectedModel, null),
    staleTime: Infinity
  })
}

export function useEnableThinking(): UseQueryResult<boolean> {
  return useQuery({
    queryKey: keys.enableThinking,
    queryFn: (): boolean => getPersisted(keys.enableThinking, true),
    staleTime: Infinity
  })
}

export function useCustomPrompts(): UseQueryResult<CustomPrompt[]> {
  return useQuery({
    queryKey: keys.customPrompts,
    queryFn: async (): Promise<CustomPrompt[]> => {
      const result = await window.electron.db.customPrompts.list()
      if (!result.success) {
        console.error('Failed to load custom prompts:', result.error)
        return []
      }
      return (result.data || []).map((data) => ({
        id: data.id,
        label: data.label,
        prompt: data.prompt,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : undefined
      }))
    }
    // No staleTime - always fetch fresh from SQLite
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI USAGE TRACKING - Token counts and cost
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_AI_USAGE: AIUsage = {
  inputTokens: 0,
  outputTokens: 0,
  inputCostUsd: 0,
  outputCostUsd: 0,
  costUsd: 0,
  cliMessageCount: 0,
  sessionStartedAt: new Date().toISOString()
}

export function useAIUsage(): UseQueryResult<AIUsage> {
  return useQuery({
    queryKey: keys.aiUsage,
    queryFn: (): AIUsage => getPersisted(keys.aiUsage, DEFAULT_AI_USAGE),
    staleTime: Infinity // Only updated via mutations
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI SUBSCRIPTION USAGE - Real-time utilization via CLI /usage command
// ═══════════════════════════════════════════════════════════════════════════

export function useCliUsageStats(enabled: boolean): UseQueryResult<CliUsageStats | null> {
  return useQuery({
    queryKey: keys.cliSubscriptionUsage,
    queryFn: async (): Promise<CliUsageStats | null> => {
      return window.electron.getCliSubscriptionUsage()
    },
    enabled,
    staleTime: 1000 * 60 * 2, // Refetch every 2 minutes
    refetchInterval: 1000 * 60 * 2 // Auto-refresh every 2 minutes
  })
}
