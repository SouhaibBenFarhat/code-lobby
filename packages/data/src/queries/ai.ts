/**
 * AI Queries - TanStack Query hooks for AI chat state
 *
 * Pattern:
 * - usePRChatMessages(prId) - fetch messages for a specific PR
 * - Settings queries use persisted cache
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import { CLAUDE_MODELS } from '../endpoints'
import { http } from '../http'
import { keys } from '../keys'
import type { ChatMessage, ClaudeModel, CustomPrompt } from '../types'

// Claude API headers
function claudeHeaders(apiKey: string): Record<string, string> {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  }
}

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
// SETTINGS QUERIES - API key, model selection, etc.
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

export function useEnableWebFetch(): UseQueryResult<boolean> {
  return useQuery({
    queryKey: keys.enableWebFetch,
    queryFn: (): boolean => getPersisted(keys.enableWebFetch, false),
    staleTime: Infinity
  })
}

export function useCustomPrompts(): UseQueryResult<CustomPrompt[]> {
  return useQuery({
    queryKey: keys.customPrompts,
    queryFn: (): CustomPrompt[] => getPersisted(keys.customPrompts, []),
    staleTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE MODELS - Fetches available models from Anthropic API
// ═══════════════════════════════════════════════════════════════════════════

export function useClaudeModels(): UseQueryResult<ClaudeModel[]> {
  const { data: apiKey } = useClaudeApiKey()

  return useQuery({
    queryKey: keys.claudeModels,
    queryFn: async (): Promise<ClaudeModel[]> => {
      if (!apiKey) return []

      const data = await http.get<{
        data: Array<{ id: string; display_name: string; created_at: string; type?: string }>
      }>(CLAUDE_MODELS, claudeHeaders(apiKey))

      const models: ClaudeModel[] = (data.data || []).map((m) => ({
        id: m.id,
        display_name: m.display_name,
        created_at: m.created_at,
        type: m.type
      }))

      // Sort by created_at descending (newest first)
      models.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      return models
    },
    enabled: !!apiKey,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1
  })
}
