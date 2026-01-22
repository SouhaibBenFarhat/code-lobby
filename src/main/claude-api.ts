/**
 * Claude API Client
 * Using official @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'
import { LogCategory, logger } from './logger'
import { buildJiraTicketPrompt, buildPRAnalysisPrompt, buildPreviewURLPrompt } from './prompts'

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
    const requestParams = {
      model: selectedModel,
      max_tokens: useThinking ? MAX_TOKENS_WITH_THINKING : MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      stream: false as const // Explicitly disable streaming for proper type narrowing
    }

    // Add thinking configuration if supported and enabled
    const thinkingConfig = useThinking
      ? { thinking: { type: 'enabled' as const, budget_tokens: THINKING_BUDGET } }
      : {}

    const response = await client.messages.create({ ...requestParams, ...thinkingConfig })

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

    // Build prompt using centralized prompt builder
    const prompt = buildPRAnalysisPrompt(context)

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

    // Build prompt using centralized prompt builder
    const prompt = buildPRAnalysisPrompt(context)

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

    // Build prompt using centralized prompt builder
    const prompt = buildPreviewURLPrompt(context)

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
 * Extract a Jira ticket reference from PR context using Claude
 * This is a specialized function for the "Find Jira Ticket" feature
 */
export async function extractJiraTicket(
  apiKey: string,
  context: {
    title: string
    body: string | null
    branchName: string
    comments: Array<{ author: string; body: string }>
  }
): Promise<{ success: boolean; ticketKey?: string; ticketUrl?: string; message?: string }> {
  logger.info(LogCategory.API, 'Extracting Jira ticket from PR context', {
    title: context.title,
    branchName: context.branchName,
    commentsCount: context.comments.length
  })

  try {
    const client = getClient(apiKey)

    // Build prompt using centralized prompt builder
    const prompt = buildJiraTicketPrompt(context)

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

    logger.info(LogCategory.API, 'Jira ticket extraction result', {
      response: responseText
    })

    // Check if no ticket was found
    if (responseText.includes('NO_JIRA_TICKET_FOUND') || !responseText) {
      return {
        success: false,
        message: 'No Jira ticket found in this PR'
      }
    }

    // Check if a full URL was found
    if (responseText.startsWith('JIRA_URL:')) {
      const url = responseText.replace('JIRA_URL:', '').trim()
      // Validate it's a valid URL
      const urlMatch = url.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/)
      if (urlMatch) {
        return {
          success: true,
          ticketUrl: urlMatch[0]
        }
      }
    }

    // Check if a ticket key was found
    if (responseText.startsWith('JIRA_KEY:')) {
      const key = responseText.replace('JIRA_KEY:', '').trim()
      // Validate it matches Jira key pattern
      const keyMatch = key.match(/^[A-Z][A-Z0-9]*-\d+$/)
      if (keyMatch) {
        return {
          success: true,
          ticketKey: keyMatch[0]
        }
      }
    }

    // Try to extract Jira key from response as fallback
    const jiraKeyMatch = responseText.match(/[A-Z][A-Z0-9]*-\d+/)
    if (jiraKeyMatch) {
      return {
        success: true,
        ticketKey: jiraKeyMatch[0]
      }
    }

    // Try to extract Jira URL from response as fallback
    const jiraUrlMatch = responseText.match(/https?:\/\/[^\s]*\/browse\/[A-Z][A-Z0-9]*-\d+/)
    if (jiraUrlMatch) {
      return {
        success: true,
        ticketUrl: jiraUrlMatch[0]
      }
    }

    return {
      success: false,
      message: 'Could not extract a valid Jira ticket from the response'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Error extracting Jira ticket', { error: errorMessage })

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

// Tool definition type for Claude API
export interface ToolDefinition {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Tool use block from Claude response
export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

// Tool result to send back to Claude
export interface ToolResult {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
}

// Extended stream callback that includes tool events
export type StreamCallbackWithTools = (chunk: {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'done' | 'error'
  content?: string
  thinking?: string
  toolUse?: { id: string; name: string; input: Record<string, unknown> }
  toolResult?: { toolName: string; result: string }
  fullResponse?: ClaudeResponse
  error?: string
}) => void

// Tool executor function type
export type ToolExecutor = (
  toolName: string,
  toolInput: Record<string, unknown>
) => Promise<{ content: string; isError?: boolean }>

/**
 * Send a message to Claude API with streaming and tool support
 * Implements tool use loop: send → tool_use → execute → tool_result → continue
 */
export async function sendMessageStreamingWithTools(
  apiKey: string,
  messages: ClaudeMessage[],
  onChunk: StreamCallbackWithTools,
  tools: ToolDefinition[],
  toolExecutor: ToolExecutor,
  model?: string,
  systemPrompt?: string,
  enableThinking: boolean = false
): Promise<void> {
  const selectedModel = model || DEFAULT_MODEL
  const useThinking = enableThinking && supportsThinking(selectedModel)

  logger.info(LogCategory.API, 'Sending streaming message with tools to Claude API', {
    messageCount: messages.length,
    model: selectedModel,
    thinking: useThinking,
    toolCount: tools.length,
    toolNames: tools.map((t) => t.name)
  })

  // Track accumulated content and tool uses across iterations
  let fullContent = ''
  let fullThinking = ''
  let responseId = ''
  let responseModel = selectedModel
  let totalInputTokens = 0
  let totalOutputTokens = 0

  // Build conversation messages (mutable for tool loop)
  // Type is complex due to tool use blocks and tool results
  type ConversationMessage = Parameters<
    typeof Anthropic.prototype.messages.create
  >[0]['messages'][0]
  const conversationMessages: ConversationMessage[] = messages.map((m) => ({
    role: m.role,
    content: m.content
  }))

  try {
    const client = getClient(apiKey)
    let continueLoop = true
    let iterationCount = 0
    const maxIterations = 10 // Prevent infinite loops

    while (continueLoop && iterationCount < maxIterations) {
      iterationCount++

      // Build request parameters
      const requestParams: Parameters<typeof client.messages.create>[0] = {
        model: selectedModel,
        max_tokens: useThinking ? MAX_TOKENS_WITH_THINKING : MAX_TOKENS,
        system: systemPrompt,
        messages: conversationMessages,
        tools: tools as Parameters<typeof client.messages.create>[0]['tools'],
        stream: true
      }

      // Add thinking configuration if supported and enabled (only on first iteration)
      if (useThinking && iterationCount === 1) {
        requestParams.thinking = {
          type: 'enabled',
          budget_tokens: THINKING_BUDGET
        }
      }

      // Create streaming response
      const stream = client.messages.stream(requestParams)

      let _iterationContent = ''
      let _iterationThinking = ''
      const toolUses: ToolUseBlock[] = []
      const _currentToolUse: Partial<ToolUseBlock> | null = null

      // Handle stream events
      stream.on('text', (text) => {
        _iterationContent += text
        fullContent += text
        onChunk({ type: 'text', content: text })
      })

      // Handle thinking events
      stream.on('thinking', (thinkingDelta: string, _accumulated: string) => {
        _iterationThinking += thinkingDelta
        fullThinking += thinkingDelta
        onChunk({ type: 'thinking', thinking: thinkingDelta })
      })

      // Wait for completion
      const finalMessage = await stream.finalMessage()

      responseId = finalMessage.id
      responseModel = finalMessage.model
      totalInputTokens += finalMessage.usage.input_tokens
      totalOutputTokens += finalMessage.usage.output_tokens

      // Check for tool uses in response content
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          const toolUseBlock = block as unknown as ToolUseBlock
          toolUses.push(toolUseBlock)
          logger.info(LogCategory.API, 'Claude requested tool use', {
            toolName: toolUseBlock.name,
            toolId: toolUseBlock.id
          })
          onChunk({
            type: 'tool_use',
            toolUse: {
              id: toolUseBlock.id,
              name: toolUseBlock.name,
              input: toolUseBlock.input
            }
          })
        }
      }

      // If no tool uses, we're done
      if (toolUses.length === 0 || finalMessage.stop_reason === 'end_turn') {
        continueLoop = false
        logger.info(LogCategory.API, 'Claude streaming with tools complete', {
          id: responseId,
          model: responseModel,
          iterations: iterationCount,
          totalInputTokens,
          totalOutputTokens,
          hasThinking: !!fullThinking
        })
      } else {
        // Execute tools and continue conversation
        // Add assistant message with tool uses to conversation
        conversationMessages.push({
          role: 'assistant',
          content: finalMessage.content
        })

        // Execute each tool and collect results
        const toolResults: ToolResult[] = []
        for (const toolUse of toolUses) {
          try {
            const result = await toolExecutor(toolUse.name, toolUse.input)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result.content,
              is_error: result.isError
            })
            onChunk({
              type: 'tool_result',
              toolResult: { toolName: toolUse.name, result: result.content }
            })
            logger.info(LogCategory.API, 'Tool executed successfully', {
              toolName: toolUse.name,
              toolId: toolUse.id,
              isError: result.isError
            })
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error executing tool: ${errorMsg}`,
              is_error: true
            })
            logger.error(LogCategory.API, 'Tool execution failed', {
              toolName: toolUse.name,
              toolId: toolUse.id,
              error: errorMsg
            })
          }
        }

        // Add tool results as user message
        conversationMessages.push({
          role: 'user',
          content: toolResults
        })
      }
    }

    if (iterationCount >= maxIterations) {
      logger.warn(LogCategory.API, 'Tool loop reached max iterations', { maxIterations })
    }

    // Send done signal with full response
    onChunk({
      type: 'done',
      fullResponse: {
        id: responseId,
        content: fullContent,
        thinking: fullThinking || undefined,
        model: responseModel,
        stop_reason: 'end_turn',
        usage: {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens
        }
      }
    })
  } catch (error) {
    let errorMessage = 'Unknown error'

    if (error instanceof Anthropic.APIError) {
      logger.error(LogCategory.API, 'Claude streaming with tools API error', {
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
      logger.error(LogCategory.API, 'Failed to stream message with tools from Claude', {
        error: errorMessage
      })
    }

    onChunk({ type: 'error', error: errorMessage })
  }
}
