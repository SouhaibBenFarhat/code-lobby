/**
 * AI Queries - Data persisted via TanStack Query persistence
 */

import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import { keys } from '../keys'
import type { ChatMessage, CustomPrompt, PRChat } from '../types'

// Helper to get persisted data with default
function getPersisted<T>(key: readonly string[], defaultValue: T): T {
  return queryClient.getQueryData(key) ?? defaultValue
}

export function useClaudeApiKey() {
  return useQuery({
    queryKey: keys.claudeApiKey,
    queryFn: (): string | null => getPersisted(keys.claudeApiKey, null),
    staleTime: Infinity
  })
}

export function useSelectedModel() {
  return useQuery({
    queryKey: keys.selectedModel,
    queryFn: (): string | null => getPersisted(keys.selectedModel, null),
    staleTime: Infinity
  })
}

export function useEnableThinking() {
  return useQuery({
    queryKey: keys.enableThinking,
    queryFn: (): boolean => getPersisted(keys.enableThinking, true),
    staleTime: Infinity
  })
}

export function useEnableWebFetch() {
  return useQuery({
    queryKey: keys.enableWebFetch,
    queryFn: (): boolean => getPersisted(keys.enableWebFetch, false),
    staleTime: Infinity
  })
}

export function useCustomPrompts() {
  return useQuery({
    queryKey: keys.customPrompts,
    queryFn: (): CustomPrompt[] => getPersisted(keys.customPrompts, []),
    staleTime: Infinity
  })
}

export function useChatHistory() {
  return useQuery({
    queryKey: keys.chatHistory,
    queryFn: (): ChatMessage[] => getPersisted(keys.chatHistory, []),
    staleTime: Infinity
  })
}

export function usePRChats() {
  return useQuery({
    queryKey: keys.prChats,
    queryFn: (): PRChat[] => getPersisted(keys.prChats, []),
    staleTime: Infinity
  })
}

export function useActivePRChatId() {
  return useQuery({
    queryKey: keys.activePRChatId,
    queryFn: (): string | null => getPersisted(keys.activePRChatId, null),
    staleTime: Infinity
  })
}

export function useIsAILoading() {
  return useQuery({
    queryKey: keys.isAILoading,
    queryFn: (): boolean => getPersisted(keys.isAILoading, false),
    staleTime: Infinity
  })
}

export function useAIThinking() {
  return useQuery({
    queryKey: keys.aiThinking,
    queryFn: (): string => getPersisted(keys.aiThinking, ''),
    staleTime: Infinity
  })
}
