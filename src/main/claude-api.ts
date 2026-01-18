/**
 * Claude API Client
 * Using official @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'
import { LogCategory, logger } from './logger'

// Re-export types for use elsewhere
export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  id: string
  content: string
  thinking?: string // Extended thinking content
  model: string
  stop_reason: string | null
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
  type: string
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096
const MAX_TOKENS_WITH_THINKING = 16000 // Must be > thinking budget
const THINKING_BUDGET = 8000

// Cache client instances by API key
const clientCache = new Map<string, Anthropic>()

// Stream callback type
export type StreamCallback = (chunk: {
  type: 'thinking' | 'text' | 'done' | 'error'
  content?: string
  thinking?: string
  fullResponse?: ClaudeResponse
  error?: string
}) => void

/**
 * Get or create an Anthropic client for the given API key
 */
function getClient(apiKey: string): Anthropic {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new Anthropic({ apiKey }))
  }
  // Safe to cast - we just set it if it didn't exist
  return clientCache.get(apiKey) as Anthropic
}

/**
 * Clear cached client (e.g., when API key changes)
 */
export function clearClientCache(): void {
  clientCache.clear()
}

/**
 * Fetch available Claude models
 */
export async function fetchModels(apiKey: string): Promise<ClaudeModel[]> {
  logger.info(LogCategory.API, 'Fetching available Claude models (SDK)')

  try {
    const client = getClient(apiKey)
    const response = await client.models.list()

    const models: ClaudeModel[] = response.data.map((model) => ({
      id: model.id,
      display_name: model.display_name,
      created_at: model.created_at,
      type: model.type
    }))

    logger.info(LogCategory.API, 'Claude models fetched successfully', {
      count: models.length,
      models: models.map((m) => m.id)
    })

    // Sort by created_at descending (newest first)
    return models.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Error fetching Claude models', { error: errorMessage })
    throw error
  }
}

/**
 * Get the default model ID
 */
export function getDefaultModel(): string {
  return DEFAULT_MODEL
}

// Models that support extended thinking
const THINKING_SUPPORTED_MODELS = [
  'claude-opus-4',
  'claude-sonnet-4',
  'claude-3-7-sonnet',
  'claude-3-5-sonnet'
]

function supportsThinking(model: string): boolean {
  return THINKING_SUPPORTED_MODELS.some((m) => model.includes(m))
}

/**
 * Send a message to Claude API
 */
export async function sendMessage(
  apiKey: string,
  messages: ClaudeMessage[],
  model?: string,
  systemPrompt?: string,
  enableThinking: boolean = false
): Promise<ClaudeResponse> {
  const selectedModel = model || DEFAULT_MODEL
  const useThinking = enableThinking && supportsThinking(selectedModel)

  logger.info(LogCategory.API, 'Sending message to Claude API (SDK)', {
    messageCount: messages.length,
    model: selectedModel,
    thinking: useThinking
  })

  try {
    const client = getClient(apiKey)

    // Build request parameters
    // When thinking is enabled, max_tokens must be > thinking.budget_tokens
    const requestParams: Parameters<typeof client.messages.create>[0] = {
      model: selectedModel,
      max_tokens: useThinking ? MAX_TOKENS_WITH_THINKING : MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      }))
    }

    // Add thinking configuration if supported and enabled
    if (useThinking) {
      requestParams.thinking = {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET
      }
    }

    const response = await client.messages.create(requestParams)

    // Extract text and thinking content from the response
    let content = ''
    let thinking = ''

    for (const block of response.content) {
      if (block.type === 'text') {
        content = block.text
      } else if (block.type === 'thinking' && 'thinking' in block) {
        thinking = block.thinking
      }
    }

    logger.info(LogCategory.API, 'Claude API response received', {
      id: response.id,
      model: response.model,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      hasThinking: !!thinking
    })

    return {
      id: response.id,
      content,
      thinking: thinking || undefined,
      model: response.model,
      stop_reason: response.stop_reason,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    }
  } catch (error) {
    // SDK provides typed errors
    if (error instanceof Anthropic.APIError) {
      logger.error(LogCategory.API, 'Claude API error', {
        status: error.status,
        message: error.message,
        type: error.constructor.name
      })

      // Provide user-friendly error messages
      if (error instanceof Anthropic.AuthenticationError) {
        throw new Error('Invalid API key. Please check your Claude API key.')
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.')
      }
      if (error instanceof Anthropic.BadRequestError) {
        throw new Error(`Invalid request: ${error.message}`)
      }

      throw new Error(`Claude API error: ${error.message}`)
    }

    logger.error(LogCategory.API, 'Failed to send message to Claude', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Validate a Claude API key by listing models (lightweight check)
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const client = new Anthropic({ apiKey })
    // Use models.list as a lightweight validation (doesn't consume tokens)
    await client.models.list({ limit: 1 })
    logger.info(LogCategory.AUTH, 'Claude API key validated successfully')
    return true
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      logger.warn(LogCategory.AUTH, 'Invalid Claude API key')
      return false
    }
    // For other errors (network, etc.), we can't be sure
    logger.error(LogCategory.AUTH, 'Error validating Claude API key', {
      error: error instanceof Error ? error.message : String(error)
    })
    return false
  }
}

/**
 * Send a message to Claude API with streaming
 */

/**
 * Analyze why a PR is still open using Claude
 * Provides insights based on CI status, comments, reviews, and description
 */
export async function analyzePRStatus(
  apiKey: string,
  context: {
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }
): Promise<{ success: boolean; analysis?: string; message?: string }> {
  logger.info(LogCategory.API, 'Analyzing PR status', {
    prNumber: context.number,
    title: context.title,
    checksCount: context.checks.length,
    reviewsCount: context.reviews.length,
    commentsCount: context.comments.length
  })

  try {
    const client = getClient(apiKey)

    // Build comprehensive CI summary
    const ciSummary =
      context.checks.length > 0
        ? context.checks
            .map((c) => {
              const status = c.conclusion || c.status
              const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳'
              return `${icon} ${c.name}: ${status}`
            })
            .join('\n')
        : 'No CI checks found'

    // Build reviews summary
    const reviewsSummary =
      context.reviews.length > 0
        ? context.reviews
            .map((r) => {
              const icon =
                r.state === 'approved' ? '✅' : r.state === 'changes_requested' ? '🔄' : '💬'
              const body = r.body
                ? ` - "${r.body.slice(0, 100)}${r.body.length > 100 ? '...' : ''}"`
                : ''
              return `${icon} ${r.author}: ${r.state}${body}`
            })
            .join('\n')
        : 'No reviews yet'

    // Build unresolved threads summary
    const unresolvedThreads = context.reviewThreads.filter((t) => !t.isResolved)
    const threadsSummary =
      unresolvedThreads.length > 0
        ? `${unresolvedThreads.length} unresolved thread(s) in: ${unresolvedThreads.map((t) => t.path).join(', ')}`
        : 'All review threads resolved'

    // Build comments summary (last 10)
    const recentComments = context.comments.slice(-10)
    const commentsSummary =
      recentComments.length > 0
        ? recentComments
            .map(
              (c) => `**${c.author}**: ${c.body.slice(0, 150)}${c.body.length > 150 ? '...' : ''}`
            )
            .join('\n\n')
        : 'No comments'

    const prompt = `Analyze this Pull Request and explain why it's still open. Provide a concise, actionable summary.

## PR #${context.number}: ${context.title}
- **Author**: ${context.author}
- **Branch**: ${context.headBranch} → ${context.baseBranch}
- **Status**: ${context.draft ? 'Draft' : 'Ready for review'}
- **Created**: ${context.createdAt}
- **Changes**: ${context.changedFiles} files (+${context.additions} -${context.deletions})

## Description
${context.body || 'No description provided'}

## CI/CD Status
${ciSummary}

## Code Reviews
${reviewsSummary}

## Review Threads
${threadsSummary}

## Recent Comments
${commentsSummary}

---

Based on this information, provide a brief analysis (2-4 sentences) explaining:
1. Why this PR is still open (e.g., failing CI, pending reviews, unresolved discussions, draft status)
2. What action is needed to move it forward

Be direct and specific. Use bullet points if there are multiple blockers.`

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })

    // Extract the response text
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText = block.text.trim()
        break
      }
    }

    logger.info(LogCategory.API, 'PR status analysis complete', {
      prNumber: context.number,
      responseLength: responseText.length
    })

    if (!responseText) {
      return {
        success: false,
        message: 'Failed to generate analysis'
      }
    }

    return {
      success: true,
      analysis: responseText
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Error analyzing PR status', {
      prNumber: context.number,
      error: errorMessage
    })

    if (error instanceof Anthropic.AuthenticationError) {
      return { success: false, message: 'Invalid Claude API key' }
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { success: false, message: 'Rate limit exceeded. Please try again.' }
    }

    return { success: false, message: `Error: ${errorMessage}` }
  }
}

// PR Analysis streaming chunk type
export type PRAnalysisChunk =
  | { type: 'thinking'; thinking: string }
  | { type: 'text'; content: string }
  | {
      type: 'done'
      fullResponse: {
        analysis: string
        thinking?: string
      }
    }
  | { type: 'error'; error: string }

/**
 * Analyze PR status with streaming and extended thinking
 * Shows the model's reasoning process during analysis
 */
export async function analyzePRStatusStreaming(
  apiKey: string,
  context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  },
  onChunk: (chunk: PRAnalysisChunk) => void
): Promise<void> {
  logger.info(LogCategory.API, 'Starting streaming PR status analysis', {
    prNumber: context.number,
    title: context.title
  })

  try {
    const client = getClient(apiKey)

    // Build comprehensive CI summary
    const ciSummary =
      context.checks.length > 0
        ? context.checks
            .map((c) => {
              const status = c.conclusion || c.status
              const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳'
              return `${icon} ${c.name}: ${status}`
            })
            .join('\n')
        : 'No CI checks found'

    // Build reviews summary
    const reviewsSummary =
      context.reviews.length > 0
        ? context.reviews
            .map((r) => {
              const icon =
                r.state === 'approved' ? '✅' : r.state === 'changes_requested' ? '🔄' : '💬'
              const body = r.body
                ? ` - "${r.body.slice(0, 100)}${r.body.length > 100 ? '...' : ''}"`
                : ''
              return `${icon} ${r.author}: ${r.state}${body}`
            })
            .join('\n')
        : 'No reviews yet'

    // Build unresolved threads summary
    const unresolvedThreads = context.reviewThreads.filter((t) => !t.isResolved)
    const threadsSummary =
      unresolvedThreads.length > 0
        ? `${unresolvedThreads.length} unresolved thread(s) in: ${unresolvedThreads.map((t) => t.path).join(', ')}`
        : 'All review threads resolved'

    // Build comments summary (last 10)
    const recentComments = context.comments.slice(-10)
    const commentsSummary =
      recentComments.length > 0
        ? recentComments
            .map(
              (c) => `**${c.author}**: ${c.body.slice(0, 150)}${c.body.length > 150 ? '...' : ''}`
            )
            .join('\n\n')
        : 'No comments'

    const prompt = `Analyze this Pull Request and explain why it's still open. Provide a concise, actionable summary.

## PR #${context.number}: ${context.title}
- **Author**: ${context.author}
- **Branch**: ${context.headBranch} → ${context.baseBranch}
- **Status**: ${context.draft ? 'Draft' : 'Ready for review'}
- **Created**: ${context.createdAt}
- **Changes**: ${context.changedFiles} files (+${context.additions} -${context.deletions})

## Description
${context.body || 'No description provided'}

## CI/CD Status
${ciSummary}

## Code Reviews
${reviewsSummary}

## Review Threads
${threadsSummary}

## Recent Comments
${commentsSummary}

---

Based on this information, provide a brief analysis (2-4 sentences) explaining:
1. Why this PR is still open (e.g., failing CI, pending reviews, unresolved discussions, draft status)
2. What action is needed to move it forward

Be direct and specific. Use bullet points if there are multiple blockers.`

    // Enable extended thinking for deeper analysis
    const requestParams: Parameters<typeof client.messages.stream>[0] = {
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS_WITH_THINKING,
      messages: [{ role: 'user', content: prompt }],
      thinking: {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET
      }
    }

    const stream = client.messages.stream(requestParams)

    let fullContent = ''
    let fullThinking = ''

    // Handle text events
    stream.on('text', (text: string) => {
      fullContent += text
      onChunk({ type: 'text', content: text })
    })

    // Handle thinking events
    stream.on('thinking', (thinkingDelta: string, _accumulated: string) => {
      fullThinking += thinkingDelta
      onChunk({ type: 'thinking', thinking: thinkingDelta })
    })

    // Wait for completion
    await stream.finalMessage()

    logger.info(LogCategory.API, 'Streaming PR analysis complete', {
      prNumber: context.number,
      hasThinking: !!fullThinking,
      analysisLength: fullContent.length
    })

    // Send done signal with full response
    onChunk({
      type: 'done',
      fullResponse: {
        analysis: fullContent,
        thinking: fullThinking || undefined
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Error in streaming PR analysis', {
      prNumber: context.number,
      error: errorMessage
    })

    if (error instanceof Anthropic.AuthenticationError) {
      onChunk({ type: 'error', error: 'Invalid Claude API key' })
    } else if (error instanceof Anthropic.RateLimitError) {
      onChunk({ type: 'error', error: 'Rate limit exceeded. Please try again.' })
    } else {
      onChunk({ type: 'error', error: `Error: ${errorMessage}` })
    }
  }
}

/**
 * Extract a preview/demo URL from PR context using Claude
 * This is a specialized function for the "Open Preview" feature
 */
export async function extractPreviewUrl(
  apiKey: string,
  context: {
    title: string
    body: string | null
    comments: Array<{ author: string; body: string }>
  }
): Promise<{ success: boolean; url?: string; message?: string }> {
  logger.info(LogCategory.API, 'Extracting preview URL from PR context', {
    title: context.title,
    commentsCount: context.comments.length
  })

  try {
    const client = getClient(apiKey)

    // Build a focused prompt for URL extraction
    const prompt = `Find the preview/demo environment URL for this Pull Request.

## PR Title
${context.title}

## PR Description
${context.body || 'No description provided'}

## Comments
${context.comments.map((c) => `**${c.author}**: ${c.body}`).join('\n\n')}

---

Look through the PR description and comments to find a URL to a preview, staging, or demo deployment of this PR's changes. This could be posted by a bot or a human.

Respond with ONLY the URL if found. If no preview URL exists, respond with: NO_PREVIEW_URL_FOUND`

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })

    // Extract the response text
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText = block.text.trim()
        break
      }
    }

    logger.info(LogCategory.API, 'Preview URL extraction result', {
      response: responseText
    })

    // Check if no URL was found
    if (responseText.includes('NO_PREVIEW_URL_FOUND') || !responseText) {
      return {
        success: false,
        message: 'No preview URL found in this PR'
      }
    }

    // Extract URL from response (handle cases where AI might add extra text)
    const urlMatch = responseText.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/)
    if (urlMatch) {
      return {
        success: true,
        url: urlMatch[0]
      }
    }

    return {
      success: false,
      message: 'Could not extract a valid URL from the response'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Error extracting preview URL', { error: errorMessage })

    if (error instanceof Anthropic.AuthenticationError) {
      return { success: false, message: 'Invalid Claude API key' }
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { success: false, message: 'Rate limit exceeded. Please try again.' }
    }

    return { success: false, message: `Error: ${errorMessage}` }
  }
}

/**
 * Send a message to Claude API with streaming
 */
export async function sendMessageStreaming(
  apiKey: string,
  messages: ClaudeMessage[],
  onChunk: StreamCallback,
  model?: string,
  systemPrompt?: string,
  enableThinking: boolean = false
): Promise<void> {
  const selectedModel = model || DEFAULT_MODEL
  const useThinking = enableThinking && supportsThinking(selectedModel)

  logger.info(LogCategory.API, 'Sending streaming message to Claude API', {
    messageCount: messages.length,
    model: selectedModel,
    thinking: useThinking
  })

  try {
    const client = getClient(apiKey)

    // Build request parameters
    // When thinking is enabled, max_tokens must be > thinking.budget_tokens
    const requestParams: Parameters<typeof client.messages.create>[0] = {
      model: selectedModel,
      max_tokens: useThinking ? MAX_TOKENS_WITH_THINKING : MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      stream: true
    }

    // Add thinking configuration if supported and enabled
    if (useThinking) {
      requestParams.thinking = {
        type: 'enabled',
        budget_tokens: THINKING_BUDGET
      }
    }

    // Create streaming response
    const stream = client.messages.stream(requestParams)

    let fullContent = ''
    let fullThinking = ''
    let responseId = ''
    let responseModel = selectedModel
    let stopReason: string | null = null
    let inputTokens = 0
    let outputTokens = 0

    // Handle stream events
    stream.on('text', (text) => {
      fullContent += text
      onChunk({ type: 'text', content: text })
    })

    // Handle thinking events (if extended thinking is enabled)
    // The SDK emits 'thinking' event with (delta, accumulated) args
    stream.on('thinking', (thinkingDelta: string, _accumulated: string) => {
      fullThinking += thinkingDelta
      onChunk({ type: 'thinking', thinking: thinkingDelta })
    })

    // Wait for completion
    const finalMessage = await stream.finalMessage()

    responseId = finalMessage.id
    responseModel = finalMessage.model
    stopReason = finalMessage.stop_reason
    inputTokens = finalMessage.usage.input_tokens
    outputTokens = finalMessage.usage.output_tokens

    logger.info(LogCategory.API, 'Claude streaming response complete', {
      id: responseId,
      model: responseModel,
      stopReason,
      inputTokens,
      outputTokens,
      hasThinking: !!fullThinking
    })

    // Send done signal with full response
    onChunk({
      type: 'done',
      fullResponse: {
        id: responseId,
        content: fullContent,
        thinking: fullThinking || undefined,
        model: responseModel,
        stop_reason: stopReason,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens
        }
      }
    })
  } catch (error) {
    // SDK provides typed errors
    let errorMessage = 'Unknown error'

    if (error instanceof Anthropic.APIError) {
      logger.error(LogCategory.API, 'Claude streaming API error', {
        status: error.status,
        message: error.message,
        type: error.constructor.name
      })

      if (error instanceof Anthropic.AuthenticationError) {
        errorMessage = 'Invalid API key. Please check your Claude API key.'
      } else if (error instanceof Anthropic.RateLimitError) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (error instanceof Anthropic.BadRequestError) {
        errorMessage = `Invalid request: ${error.message}`
      } else {
        errorMessage = `Claude API error: ${error.message}`
      }
    } else {
      errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(LogCategory.API, 'Failed to stream message from Claude', { error: errorMessage })
    }

    onChunk({ type: 'error', error: errorMessage })
  }
}
