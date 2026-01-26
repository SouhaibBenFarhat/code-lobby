/**
 * Claude API request building utilities
 */

import type { ChatMessage, PRFile } from '@data'

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

export const BASE_SYSTEM_PROMPT = `You are the AI Assistant embedded in CodeLobby, a desktop application for managing GitHub Pull Requests.
CodeLobby brings all Pull Requests together in one intelligent dashboard. It provides:
- Canvas View (draggable PR cards) and IDE View (tree structure)
- At-a-glance CI status, review state, comment count, time open
- AI-powered features: PR analysis, code review generation, Jira ticket lookup

You are a helpful coding assistant that:
1. Understands the user is working with GitHub Pull Requests
2. Can help with code review, debugging, and development tasks
3. Provides concise, actionable advice
4. Uses markdown formatting for clarity

Be helpful, technical, and concise.`

/**
 * Instructions for Claude to understand and generate structured reviews.
 * Always included in the system prompt when a PR is selected.
 */
export const REVIEW_FORMAT_INSTRUCTIONS = `

## Code Review Generation

When asked to generate a code review, you can output a structured JSON format that allows the user to preview and submit the review to GitHub. Use this format ONLY when explicitly asked to generate a review.

**Review JSON Format:**

\`\`\`json:review
{
  "summary": "Overall review summary - be constructive and specific",
  "comments": [
    {
      "file": "exact/path/to/file.ts",
      "line": 42,
      "body": "Your comment about this specific line"
    }
  ],
  "verdict": "approve" | "request_changes" | "comment"
}
\`\`\`

**Verdict Guidelines:**
- "approve": Code is good, minor or no issues
- "request_changes": Significant problems that must be fixed
- "comment": Feedback without approval/rejection

**Important:**
- Only use this JSON format when asked to "generate review" or similar
- Each comment must reference an exact file path and line number from the changed files
- Be constructive and actionable
- For regular questions/discussions, respond normally without the JSON format`

export interface PRContext {
  prNumber: number
  prTitle: string
  prBody?: string
  repoFullName: string
  files?: PRFile[]
}

/**
 * Format file changes for inclusion in the system prompt
 */
function formatFileChanges(files: PRFile[]): string {
  if (!files.length) return ''

  let result = '\n\n## Changed Files\n\n'

  for (const file of files) {
    const changeIcon =
      file.changeType === 'ADDED'
        ? '+'
        : file.changeType === 'DELETED'
          ? '-'
          : file.changeType === 'RENAMED'
            ? '→'
            : '~'

    const fileHeader = `### ${changeIcon} ${file.path} (+${file.additions}, -${file.deletions})\n`
    const patchContent = file.patch || '[No diff available]'

    result += `${fileHeader}\`\`\`diff\n${patchContent}\n\`\`\`\n\n`
  }

  return result
}

export interface BuildSystemPromptOptions {
  prContext?: PRContext
}

/**
 * Build the system prompt with optional PR context including file diffs
 */
export function buildSystemPrompt(options?: BuildSystemPromptOptions): string {
  const { prContext } = options || {}

  // Base prompt without PR context
  if (!prContext) {
    return BASE_SYSTEM_PROMPT
  }

  // Build context section for PR
  let contextSection = `You are helping with PR #${prContext.prNumber}: "${prContext.prTitle}" in ${prContext.repoFullName}.`

  // Add PR description if available
  if (prContext.prBody?.trim()) {
    contextSection += `\n\n## PR Description\n\n${prContext.prBody}`
  }

  // Add file changes if available
  if (prContext.files?.length) {
    contextSection += formatFileChanges(prContext.files)
  }

  // When PR is selected, always include review format instructions
  const basePrompt = BASE_SYSTEM_PROMPT + REVIEW_FORMAT_INSTRUCTIONS

  return `${contextSection}\n\n${basePrompt}`
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
