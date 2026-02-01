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
    mutationFn: async (apiKey: string) => {
      // Persist to Electron store
      if (window.electron?.setClaudeApiKey) {
        await window.electron.setClaudeApiKey(apiKey)
      }
      return apiKey
    },
    onSuccess: (apiKey) => {
      qc.setQueryData(keys.claudeApiKey, apiKey)
      // Also invalidate the status query
      qc.invalidateQueries({ queryKey: ['system', 'claude-api-key-status'] })
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

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM PROMPTS MUTATIONS - Persisted to SQLite
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
    mutationFn: async ({ label, prompt }: AddCustomPromptParams): Promise<CustomPrompt> => {
      const id = crypto.randomUUID()
      const result = await window.electron.db.customPrompts.create({ id, label, prompt })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to save custom prompt')
      }
      const data = result.data
      return {
        id: data.id,
        label: data.label,
        prompt: data.prompt,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : undefined
      }
    },
    onSuccess: (newPrompt) => {
      const current = qc.getQueryData<CustomPrompt[]>(keys.customPrompts) || []
      // Prepend new prompt (newest first ordering)
      qc.setQueryData(keys.customPrompts, [newPrompt, ...current])
    }
  })
}

export function useDeleteCustomPrompt(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string): Promise<string> => {
      const result = await window.electron.db.customPrompts.delete(id)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete custom prompt')
      }
      return id
    },
    onSuccess: (id) => {
      const current = qc.getQueryData<CustomPrompt[]>(keys.customPrompts) || []
      qc.setQueryData(
        keys.customPrompts,
        current.filter((p) => p.id !== id)
      )
    }
  })
}

interface UpdateCustomPromptParams {
  id: string
  label?: string
  prompt?: string
}

export function useUpdateCustomPrompt(): UseMutationResult<
  CustomPrompt,
  Error,
  UpdateCustomPromptParams
> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, label, prompt }: UpdateCustomPromptParams): Promise<CustomPrompt> => {
      const result = await window.electron.db.customPrompts.update(id, { label, prompt })
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update custom prompt')
      }
      const data = result.data
      return {
        id: data.id,
        label: data.label,
        prompt: data.prompt,
        createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : undefined
      }
    },
    onSuccess: (updatedPrompt) => {
      const current = qc.getQueryData<CustomPrompt[]>(keys.customPrompts) || []
      qc.setQueryData(
        keys.customPrompts,
        current.map((p) => (p.id === updatedPrompt.id ? updatedPrompt : p))
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
