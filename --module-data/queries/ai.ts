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
import type { AIUsage, ChatMessage, ClaudeModel, CustomPrompt } from '../types'

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
      models.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
      })

      return models
    },
    enabled: !!apiKey,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    retry: 1
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
  costUsd: 0
}

export function useAIUsage(): UseQueryResult<AIUsage> {
  return useQuery({
    queryKey: keys.aiUsage,
    queryFn: (): AIUsage => getPersisted(keys.aiUsage, DEFAULT_AI_USAGE),
    staleTime: Infinity // Only updated via mutations
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW URL FINDER - Uses AI to find preview/staging URLs in PR data
// ═══════════════════════════════════════════════════════════════════════════

const PREVIEW_URL_PROMPT = `You are a URL extractor. Find a REAL, COMPLETE preview/staging environment URL from the given PR data.

Look for ACTUAL URLs (not templates or patterns) containing keywords like:
- staging, preview, dev, test, demo
- pr-, pull-request, deploy
- parcellab.dev, parcellab.com
- vercel.app, netlify.app, herokuapp.com

IMPORTANT RULES:
- Only return REAL URLs that exist in the text (e.g., "https://preview-123.staging.parcellab.dev")
- NEVER return template URLs with variables like \${PR_NUMBER} or {number}
- If you only see URL patterns/templates but no actual URLs, return found=false
- The URL must be complete and ready to open in a browser

Use the extract_preview_url tool to return your result.`

// Use Haiku for speed and cost efficiency
const PREVIEW_URL_MODEL = 'claude-3-5-haiku-20241022'

// Tool definition for structured response
const PREVIEW_URL_TOOL = {
  name: 'extract_preview_url',
  description: 'Return the extracted preview URL result',
  input_schema: {
    type: 'object',
    properties: {
      found: {
        type: 'boolean',
        description: 'Whether a preview URL was found'
      },
      url: {
        type: 'string',
        description: 'The preview URL if found, null otherwise'
      }
    },
    required: ['found']
  }
}

export interface PreviewUrlResult {
  url: string | null
  found: boolean
  error?: string
}

export interface FindPreviewUrlParams {
  prId: string
  description: string | null
  comments: Array<{ body: string; author: { login: string } }>
}

// Error messages for different API errors
const API_ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please try again.',
  401: 'Invalid API key. Please check your Claude API key.',
  403: 'Access denied. Please check your API key permissions.',
  404: 'API endpoint not found.',
  429: 'Rate limit exceeded. Please wait a moment and try again.',
  500: 'Claude API server error. Please try again later.',
  529: 'Claude API is overloaded. Please try again in a moment.'
}

async function callClaudeAPI(apiKey: string, userMessage: string): Promise<PreviewUrlResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: PREVIEW_URL_MODEL,
      max_tokens: 256,
      system: PREVIEW_URL_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
      tools: [PREVIEW_URL_TOOL],
      tool_choice: { type: 'tool', name: 'extract_preview_url' }
    })
  })

  if (!response.ok) {
    const errorMessage = API_ERROR_MESSAGES[response.status] || `API error: ${response.status}`
    return { url: null, found: false, error: errorMessage }
  }

  const data = await response.json()

  // Find the tool_use block in the response
  const toolUse = data.content?.find((block: { type: string }) => block.type === 'tool_use')
  if (!toolUse?.input) {
    return { url: null, found: false }
  }

  const { found, url } = toolUse.input as { found: boolean; url?: string }
  if (!found || !url) {
    return { url: null, found: false }
  }

  return { url, found: true }
}

export function useFindPreviewUrl(
  params: FindPreviewUrlParams | null
): UseQueryResult<PreviewUrlResult> & { search: () => void } {
  const { data: apiKey } = useClaudeApiKey()

  const query = useQuery({
    queryKey: params ? keys.previewUrl(params.prId) : ['ai', 'preview-url', 'none'],
    queryFn: async (): Promise<PreviewUrlResult> => {
      if (!params || !apiKey) {
        return { url: null, found: false, error: !apiKey ? 'API key not set' : undefined }
      }

      // Build context from PR data
      const contextParts: string[] = []

      if (params.description) {
        contextParts.push(`## PR Description\n${params.description}`)
      }

      if (params.comments.length > 0) {
        const commentsText = params.comments
          .map((c) => `@${c.author.login}: ${c.body}`)
          .join('\n\n')
        contextParts.push(`## Comments\n${commentsText}`)
      }

      if (contextParts.length === 0) {
        return { url: null, found: false, error: 'No PR content to search' }
      }

      const userMessage = contextParts.join('\n\n')

      try {
        return await callClaudeAPI(apiKey, userMessage)
      } catch {
        return {
          url: null,
          found: false,
          error: 'Network error. Please check your connection.'
        }
      }
    },
    enabled: false, // Only run when search() is called
    staleTime: Infinity, // Cache forever
    gcTime: Infinity, // Never garbage collect
    retry: (failureCount, error) => {
      // Retry up to 2 times for 529 (overloaded) errors
      if (error instanceof Error && error.message.includes('529')) {
        return failureCount < 2
      }
      return false
    },
    retryDelay: 1000 // Wait 1 second between retries
  })

  return {
    ...query,
    search: () => query.refetch()
  }
}
