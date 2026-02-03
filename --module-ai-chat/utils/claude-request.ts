/**
 * Claude API request building utilities
 */

import type { ChatMessage, CheckStatus, PRComment, PRFile, PRReview, ReviewThread } from '@data'

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
- Make sure you are looking at the most recent commit of the branch related to the PR. Feel free to pull the latest changes from the branch before generating a review.
- Only use this JSON format when asked to "generate review" or similar
- Each comment must reference an exact file path and line number from the changed files
- Be constructive and actionable
- For regular questions/discussions, respond normally without the JSON format`

export interface PRContext {
  prNumber: number
  prTitle: string
  prBody?: string
  repoFullName: string
  // Branch info
  headBranch?: string
  baseBranch?: string
  // PR metadata
  author?: string
  isDraft?: boolean
  labels?: string[]
  // Stats
  additions?: number
  deletions?: number
  changedFiles?: number
  // Review status
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  // Detailed data
  files?: PRFile[]
  comments?: PRComment[]
  reviews?: PRReview[]
  reviewThreads?: ReviewThread[]
  checks?: CheckStatus
}

/**
 * Format file changes for inclusion in the system prompt
 */
function formatFileChanges(files: PRFile[]): string {
  if (!files.length) return ''

  const filesWithPatches = files.filter((f) => f.patch).length
  const filesWithoutPatches = files.length - filesWithPatches

  let result = '\n\n## Changed Files\n\n'

  // Add explicit summary so Claude knows exactly what it has access to
  result += `**📊 You have access to ${files.length} files total.**\n`
  if (filesWithPatches === files.length) {
    result += `All ${files.length} files include their full diff/patch content below.\n\n`
  } else {
    result += `- ${filesWithPatches} files with full diff content\n`
    result += `- ${filesWithoutPatches} files without diff (binary/large/renamed)\n\n`
  }

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

/**
 * Format CI/checks status for inclusion in the system prompt
 */
function formatCIStatus(checks: CheckStatus): string {
  const stateEmoji =
    checks.state === 'success'
      ? '✅'
      : checks.state === 'failure'
        ? '❌'
        : checks.state === 'error'
          ? '⚠️'
          : '⏳'

  let result = `\n\n## CI Status: ${stateEmoji} ${checks.state.toUpperCase()}\n\n`

  if (checks.check_runs.length > 0) {
    result += '| Check | Status | Conclusion |\n|-------|--------|------------|\n'
    for (const run of checks.check_runs) {
      const conclusionEmoji =
        run.conclusion === 'success'
          ? '✅'
          : run.conclusion === 'failure'
            ? '❌'
            : run.conclusion === 'skipped'
              ? '⏭️'
              : '⏳'
      result += `| ${run.name} | ${run.status} | ${conclusionEmoji} ${run.conclusion || 'pending'} |\n`
    }
  }

  return result
}

/**
 * Format PR discussion comments for inclusion in the system prompt
 */
function formatComments(comments: PRComment[]): string {
  if (!comments.length) return ''

  // Filter out bot comments for cleaner context
  const humanComments = comments.filter((c) => !c.author.isBot)
  if (!humanComments.length) return ''

  let result = '\n\n## PR Discussion\n\n'

  for (const comment of humanComments.slice(-10)) {
    // Last 10 comments
    const date = new Date(comment.created_at).toLocaleDateString()
    result += `**@${comment.author.login}** (${date}):\n> ${comment.body.split('\n').join('\n> ')}\n\n`
  }

  return result
}

/**
 * Format code reviews for inclusion in the system prompt
 */
function formatReviews(reviews: PRReview[]): string {
  if (!reviews.length) return ''

  // Filter out bot reviews
  const humanReviews = reviews.filter((r) => !r.author.isBot)
  if (!humanReviews.length) return ''

  let result = '\n\n## Code Reviews\n\n'

  for (const review of humanReviews) {
    const stateEmoji =
      review.state === 'approved'
        ? '✅'
        : review.state === 'changes_requested'
          ? '🔴'
          : review.state === 'commented'
            ? '💬'
            : '📝'
    const date = new Date(review.created_at).toLocaleDateString()
    result += `**@${review.author.login}** ${stateEmoji} ${review.state.toUpperCase()} (${date})`
    if (review.body) {
      result += `\n> ${review.body.split('\n').join('\n> ')}`
    }
    result += '\n\n'
  }

  return result
}

/**
 * Format inline review threads for inclusion in the system prompt
 */
function formatReviewThreads(threads: ReviewThread[]): string {
  if (!threads.length) return ''

  // Only include unresolved threads - these are the active discussions
  const unresolvedThreads = threads.filter((t) => !t.isResolved)
  if (!unresolvedThreads.length) return ''

  let result = '\n\n## Active Review Threads (Unresolved)\n\n'

  for (const thread of unresolvedThreads.slice(0, 10)) {
    // Limit to 10 threads
    result += `### ${thread.path}${thread.line ? `:${thread.line}` : ''}\n`
    for (const comment of thread.comments) {
      if (comment.author.isBot) continue
      result += `**@${comment.author.login}**: ${comment.body}\n`
    }
    result += '\n'
  }

  return result
}

/**
 * Format PR metadata (labels, branches, stats) for inclusion in the system prompt
 */
function formatPRMetadata(ctx: PRContext): string {
  const parts: string[] = []

  // Branch info
  if (ctx.headBranch && ctx.baseBranch) {
    parts.push(`**Branch:** \`${ctx.headBranch}\` → \`${ctx.baseBranch}\``)
  }

  // Author
  if (ctx.author) {
    parts.push(`**Author:** @${ctx.author}`)
  }

  // Draft status
  if (ctx.isDraft) {
    parts.push(`**Status:** 🚧 Draft`)
  }

  // Review decision
  if (ctx.reviewDecision) {
    const decisionEmoji =
      ctx.reviewDecision === 'APPROVED'
        ? '✅'
        : ctx.reviewDecision === 'CHANGES_REQUESTED'
          ? '🔴'
          : '⏳'
    parts.push(`**Review Status:** ${decisionEmoji} ${ctx.reviewDecision.replace('_', ' ')}`)
  }

  // Labels
  if (ctx.labels && ctx.labels.length > 0) {
    parts.push(`**Labels:** ${ctx.labels.map((l) => `\`${l}\``).join(', ')}`)
  }

  // Stats
  if (
    ctx.additions !== undefined ||
    ctx.deletions !== undefined ||
    ctx.changedFiles !== undefined
  ) {
    const stats: string[] = []
    if (ctx.additions !== undefined) stats.push(`+${ctx.additions}`)
    if (ctx.deletions !== undefined) stats.push(`-${ctx.deletions}`)
    if (ctx.changedFiles !== undefined) stats.push(`${ctx.changedFiles} files`)
    parts.push(`**Changes:** ${stats.join(', ')}`)
  }

  if (parts.length === 0) return ''

  return `\n\n${parts.join('\n')}`
}

export interface BuildSystemPromptOptions {
  prContext?: PRContext
}

/**
 * Build the system prompt with optional PR context including file diffs, comments, and CI status
 */
export function buildSystemPrompt(options?: BuildSystemPromptOptions): string {
  const { prContext } = options || {}

  // Base prompt without PR context
  if (!prContext) {
    return BASE_SYSTEM_PROMPT
  }

  // Build context section for PR
  let contextSection = `You are helping with PR #${prContext.prNumber}: "${prContext.prTitle}" in ${prContext.repoFullName}.`

  // Add PR metadata (labels, branches, stats, review status)
  contextSection += formatPRMetadata(prContext)

  // Add PR description if available
  if (prContext.prBody?.trim()) {
    contextSection += `\n\n## PR Description\n\n${prContext.prBody}`
  }

  // Add CI status if available
  if (prContext.checks) {
    contextSection += formatCIStatus(prContext.checks)
  }

  // Add code reviews if available
  if (prContext.reviews?.length) {
    contextSection += formatReviews(prContext.reviews)
  }

  // Add unresolved review threads if available
  if (prContext.reviewThreads?.length) {
    contextSection += formatReviewThreads(prContext.reviewThreads)
  }

  // Add PR discussion comments if available
  if (prContext.comments?.length) {
    contextSection += formatComments(prContext.comments)
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

/**
 * Model pricing (USD per million tokens)
 * Source: https://www.anthropic.com/pricing
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Latest models (2025)
  'claude-opus-4-5': { input: 5, output: 25 }, // Opus 4.5 - 67% cheaper than Opus 4
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  // Older models
  'claude-3-7-sonnet': { input: 3, output: 15 },
  'claude-3-5-sonnet': { input: 3, output: 15 },
  'claude-3-5-haiku': { input: 0.25, output: 1.25 },
  'claude-3-opus': { input: 15, output: 75 },
  'claude-3-sonnet': { input: 3, output: 15 },
  'claude-3-haiku': { input: 0.25, output: 1.25 }
}

// Default pricing for unknown models (use Sonnet pricing)
const DEFAULT_PRICING = { input: 3, output: 15 }

export interface TokenCost {
  inputCostUsd: number
  outputCostUsd: number
  totalCostUsd: number
}

/**
 * Calculate cost in USD for token usage
 */
export function calculateTokenCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): TokenCost {
  // Find matching pricing by checking if model ID includes any prefix
  let pricing = DEFAULT_PRICING
  for (const [prefix, p] of Object.entries(MODEL_PRICING)) {
    if (modelId.includes(prefix)) {
      pricing = p
      break
    }
  }

  const inputCostUsd = (inputTokens / 1_000_000) * pricing.input
  const outputCostUsd = (outputTokens / 1_000_000) * pricing.output
  return {
    inputCostUsd,
    outputCostUsd,
    totalCostUsd: inputCostUsd + outputCostUsd
  }
}
