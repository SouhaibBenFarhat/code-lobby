/**
 * AI Mutations - Just update the query cache (persisted automatically)
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'
import type { ChatMessage, CustomPrompt, PRChat } from '../types'

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

interface SendChatMessageParams {
  message: string
}

export function useSendChatMessage(): UseMutationResult<ChatMessage, Error, SendChatMessageParams> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ message }: SendChatMessageParams) => {
      qc.setQueryData(keys.isAILoading, true)

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }

      // Add to history
      const current = qc.getQueryData<ChatMessage[]>(keys.chatHistory) || []
      qc.setQueryData(keys.chatHistory, [...current, userMessage])

      // TODO: Call Claude API directly here
      return userMessage
    },
    onSettled: () => {
      qc.setQueryData(keys.isAILoading, false)
    }
  })
}

interface CreatePRChatParams {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
}

export function useCreatePRChat(): UseMutationResult<PRChat, Error, CreatePRChatParams> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ prId, prNumber, prTitle, repoFullName }: CreatePRChatParams) => {
      const chat: PRChat = {
        prId,
        prNumber,
        prTitle,
        repoFullName,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return chat
    },
    onSuccess: (chat) => {
      const current = qc.getQueryData<PRChat[]>(keys.prChats) || []
      qc.setQueryData(keys.prChats, [...current, chat])
      qc.setQueryData(keys.activePRChatId, chat.prId)
    }
  })
}

interface SwitchToPRChatResult {
  prId: string
  chat: PRChat | undefined
}

export function useSwitchToPRChat(): UseMutationResult<SwitchToPRChatResult, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (prId: string) => {
      const chats = qc.getQueryData<PRChat[]>(keys.prChats) || []
      const chat = chats.find((c) => c.prId === prId)
      return { prId, chat }
    },
    onSuccess: ({ prId, chat }) => {
      qc.setQueryData(keys.activePRChatId, prId)
      if (chat) {
        qc.setQueryData(keys.chatHistory, chat.messages)
      }
    }
  })
}

export function useClearPRChatMessages(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (prChatId: string) => prChatId,
    onSuccess: (prChatId) => {
      const chats = qc.getQueryData<PRChat[]>(keys.prChats) || []
      qc.setQueryData(
        keys.prChats,
        chats.map((c) => (c.prId === prChatId ? { ...c, messages: [] } : c))
      )
      qc.setQueryData(keys.chatHistory, [])
    }
  })
}

export function useSetAILoading(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (isLoading: boolean) => Promise.resolve(isLoading),
    onSuccess: (isLoading) => {
      qc.setQueryData(keys.isAILoading, isLoading)
    }
  })
}

export function useSetAIThinking(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (thinking: string) => Promise.resolve(thinking),
    onSuccess: (thinking) => {
      qc.setQueryData(keys.aiThinking, thinking)
    }
  })
}
