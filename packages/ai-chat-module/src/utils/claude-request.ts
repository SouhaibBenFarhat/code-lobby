/**
 * Claude API request building utilities
 */

import type { ChatMessage } from '@codelobby/data'

export const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
export const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
export const MAX_TOKENS = 4096
export const MAX_TOKENS_WITH_THINKING = 16000
export const THINKING_BUDGET = 8000

export const THINKING_SUPPORTED_MODELS = [
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
  'claude-3-5-sonnet'
] as const

export function supportsThinking(model: string): boolean {
  return THINKING_SUPPORTED_MODELS.some((m) => model.includes(m))
}

export const GENERAL_SYSTEM_PROMPT = `You are the AI Assistant embedded in CodeLobby, a desktop application for managing GitHub Pull Requests.
CodeLobby brings all Pull Requests together in one intelligent dashboard. It provides:
- Canvas View (draggable PR cards) and IDE View (tree structure)
- At-a-glance CI status, review state, comment count, time open
- AI-powered features: PR analysis, preview URL extraction, Jira ticket lookup
You are a helpful coding assistant that:
1. Understands the user is working with GitHub Pull Requests
2. Can help with code review, debugging, and development tasks
3. Provides concise, actionable advice
4. Uses markdown formatting for clarity
Be helpful, technical, and concise.`

export interface PRContext {
  prNumber: number
  prTitle: string
  repoFullName: string
}

/**
 * Build the system prompt with optional PR context
 */
export function buildSystemPrompt(prContext?: PRContext): string {
  if (!prContext) {
    return GENERAL_SYSTEM_PROMPT
  }

  const contextLine = `You are helping with PR #${prContext.prNumber}: "${prContext.prTitle}" in ${prContext.repoFullName}.`
  return `${contextLine}\n\n${GENERAL_SYSTEM_PROMPT}`
}

/**
 * Convert chat messages to Claude API format
 */
export function formatMessagesForClaude(
  messages: ChatMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))
}

export interface ClaudeRequestOptions {
  model: string
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  enableThinking: boolean
  stream?: boolean
}

/**
 * Build the request body for Claude API
 */
export function buildClaudeRequestBody(options: ClaudeRequestOptions): Record<string, unknown> {
  const { model, systemPrompt, messages, enableThinking, stream = true } = options
  const useThinking = enableThinking && supportsThinking(model)

  const body: Record<string, unknown> = {
    model,
    max_tokens: useThinking ? MAX_TOKENS_WITH_THINKING : MAX_TOKENS,
    system: systemPrompt,
    messages,
    stream
  }

  if (useThinking) {
    body.thinking = {
      type: 'enabled',
      budget_tokens: THINKING_BUDGET
    }
  }

  return body
}

/**
 * Build headers for Claude API requests
 */
export function buildClaudeHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  }
}
