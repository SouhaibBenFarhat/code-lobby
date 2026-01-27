/**
 * AI Mutations - TanStack Query mutations for AI chat
 *
 * Pattern:
 * 1. Component does streaming fetch directly via XHR (for real-time updates)
 * 2. useSaveMessage() - saves message to cache after streaming completes
 * 3. Settings mutations for API key, model, etc.
 *
 * Note: Claude API constants and request building are in:
 * packages/ai-chat-module/src/utils/claude-request.ts
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'
import type { AIUsage, ChatMessage, CustomPrompt } from '../types'

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function useSetClaudeApiKey(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (apiKey: string) => Promise.resolve(apiKey),
    onSuccess: (apiKey) => {
      qc.setQueryData(keys.claudeApiKey, apiKey)
    }
  })
}

export function useSetSelectedModel(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (model: string) => Promise.resolve(model),
    onSuccess: (model) => {
      qc.setQueryData(keys.selectedModel, model)
    }
  })
}

export function useSetEnableThinking(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => Promise.resolve(enabled),
    onSuccess: (enabled) => {
      qc.setQueryData(keys.enableThinking, enabled)
    }
  })
}

export function useSetEnableWebFetch(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enabled: boolean) => Promise.resolve(enabled),
    onSuccess: (enabled) => {
      qc.setQueryData(keys.enableWebFetch, enabled)
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM PROMPTS MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

interface AddCustomPromptParams {
  label: string
  prompt: string
}

export function useAddCustomPrompt(): UseMutationResult<
  CustomPrompt,
  Error,
  AddCustomPromptParams
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ label, prompt }: AddCustomPromptParams) => {
      const newPrompt: CustomPrompt = { id: crypto.randomUUID(), label, prompt }
      return Promise.resolve(newPrompt)
    },
    onSuccess: (newPrompt) => {
      const current = qc.getQueryData<CustomPrompt[]>(keys.customPrompts) || []
      qc.setQueryData(keys.customPrompts, [...current, newPrompt])
    }
  })
}

export function useDeleteCustomPrompt(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => Promise.resolve(id),
    onSuccess: (id) => {
      const current = qc.getQueryData<CustomPrompt[]>(keys.customPrompts) || []
      qc.setQueryData(
        keys.customPrompts,
        current.filter((p) => p.id !== id)
      )
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SAVE MESSAGE MUTATION - Call this after streaming completes
// ═══════════════════════════════════════════════════════════════════════════

interface SaveMessageParams {
  prId: string
  message: ChatMessage
}

export function useSaveMessage(): UseMutationResult<ChatMessage, Error, SaveMessageParams> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ message }: SaveMessageParams) => Promise.resolve(message),
    onSuccess: (message, { prId }) => {
      const currentMessages = qc.getQueryData<ChatMessage[]>(keys.prChatMessages(prId)) || []
      qc.setQueryData(keys.prChatMessages(prId), [...currentMessages, message])
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CLEAR CHAT MUTATION
// ═══════════════════════════════════════════════════════════════════════════

export function useClearChat(): UseMutationResult<void, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (prId: string) => {
      qc.setQueryData(keys.prChatMessages(prId), [])
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI USAGE TRACKING MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

interface AddAIUsageParams {
  inputTokens: number
  outputTokens: number
  inputCostUsd: number
  outputCostUsd: number
}

const DEFAULT_AI_USAGE: AIUsage = {
  inputTokens: 0,
  outputTokens: 0,
  inputCostUsd: 0,
  outputCostUsd: 0,
  costUsd: 0
}

export function useAddAIUsage(): UseMutationResult<AIUsage, Error, AddAIUsageParams> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ inputTokens, outputTokens, inputCostUsd, outputCostUsd }: AddAIUsageParams) => {
      const current = qc.getQueryData<AIUsage>(keys.aiUsage) || DEFAULT_AI_USAGE
      const updated: AIUsage = {
        inputTokens: current.inputTokens + inputTokens,
        outputTokens: current.outputTokens + outputTokens,
        inputCostUsd: current.inputCostUsd + inputCostUsd,
        outputCostUsd: current.outputCostUsd + outputCostUsd,
        costUsd: current.costUsd + inputCostUsd + outputCostUsd
      }
      return Promise.resolve(updated)
    },
    onSuccess: (updated) => {
      qc.setQueryData(keys.aiUsage, updated)
    }
  })
}

export function useResetAIUsage(): UseMutationResult<AIUsage, Error, void> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => Promise.resolve(DEFAULT_AI_USAGE),
    onSuccess: () => {
      qc.setQueryData(keys.aiUsage, DEFAULT_AI_USAGE)
    }
  })
}
