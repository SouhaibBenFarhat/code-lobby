/**
 * Claude API Client
 * Using official @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'
import { LogCategory, mainLogger as logger } from '@codelobby/logger/main'
import { wrapSdkCall, wrapSdkStreamCall } from './http-client'
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
  type: 'thinking' | 'text' | 'done' | 'error' | 'tool_use' | 'tool_result'
  content?: string
  thinking?: string
  fullResponse?: ClaudeResponse
  error?: string
  toolName?: string
  toolInput?: Record<string, unknown>
}) => void

// Tool definition type
export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

// Tool executor function type
export type ToolExecutor = (
  toolName: string,
  toolInput: Record<string, unknown>
) => Promise<{ content: string; isError: boolean }>

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
  try {
    const client = getClient(apiKey)
    const response = await wrapSdkCall('claude.models.list', () => client.models.list(), {
      logCategory: LogCategory.API
    })

    const models: ClaudeModel[] = response.data.map((model) => ({
      id: model.id,
      display_name: model.display_name,
      created_at: model.created_at,
      type: model.type
    }))

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

    const response = await wrapSdkCall(
      'claude.messages.create',
      () => client.messages.create({ ...requestParams, ...thinkingConfig }),
      {
        logCategory: LogCategory.API,
        details: { model: selectedModel, messageCount: messages.length, thinking: useThinking }
      }
    )

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
    await wrapSdkCall('claude.validateApiKey', () => client.models.list({ limit: 1 }), {
      logCategory: LogCategory.AUTH
    })
    return true
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      logger.warn(LogCategory.AUTH, 'Invalid Claude API key')
      return false
    }
    // For other errors (network, etc.), we can't be sure
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

    const response = await wrapSdkCall(
      'claude.analyzePRStatus',
      () =>
        client.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }),
      { logCategory: LogCategory.API, details: { prNumber: context.number } }
    )

    // Extract the response text
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText = block.text.trim()
        break
      }
    }

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

    const stream = await wrapSdkStreamCall(
      'claude.streamPRAnalysis',
      () => client.messages.stream(requestParams),
      { logCategory: LogCategory.API, details: { prNumber: context.number } }
    )

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

    logger.debug(LogCategory.API, 'Streaming PR analysis complete', {
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
  try {
    const client = getClient(apiKey)

    // Build prompt using centralized prompt builder
    const prompt = buildPreviewURLPrompt(context)

    const response = await wrapSdkCall(
      'claude.extractPreviewURL',
      () =>
        client.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }),
      { logCategory: LogCategory.API, details: { title: context.title } }
    )

    // Extract the response text
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText = block.text.trim()
        break
      }
    }

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
  try {
    const client = getClient(apiKey)

    // Build prompt using centralized prompt builder
    const prompt = buildJiraTicketPrompt(context)

    const response = await wrapSdkCall(
      'claude.extractJiraTicket',
      () =>
        client.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
          stream: false
        }),
      {
        logCategory: LogCategory.API,
        details: { title: context.title, branchName: context.branchName }
      }
    )

    // Extract the response text
    let responseText = ''
    for (const block of response.content) {
      if (block.type === 'text') {
        responseText = block.text.trim()
        break
      }
    }

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
    const stream = await wrapSdkStreamCall(
      'claude.streamMessage',
      () => client.messages.stream(requestParams),
      { logCategory: LogCategory.API, details: { model: selectedModel, thinking: useThinking } }
    )

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

    logger.debug(LogCategory.API, 'Claude streaming response complete', {
      id: responseId,
      model: responseModel,
      stopReason,
      inputTokens,
      outputTokens
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

/**
 * Send a message to Claude API with streaming AND tool support
 * Handles the tool use loop: Claude calls tool -> we execute -> return result -> Claude continues
 */
export async function sendMessageStreamingWithTools(
  apiKey: string,
  messages: ClaudeMessage[],
  onChunk: StreamCallback,
  tools: Tool[],
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
    toolCount: tools.length
  })

  // Convert our messages to Anthropic format, allowing for tool result content
  type MessageContent = string | Array<{ type: string; tool_use_id?: string; content?: string }>
  const conversationMessages: Array<{ role: 'user' | 'assistant'; content: MessageContent }> =
    messages.map((m) => ({
      role: m.role,
      content: m.content
    }))

  let fullContent = ''
  let fullThinking = ''
  let inputTokens = 0
  let outputTokens = 0

  // Tool use loop - continue until Claude stops calling tools
  let continueLoop = true

  while (continueLoop) {
    try {
      const client = getClient(apiKey)

      // Build request parameters
      const requestParams: Parameters<typeof client.messages.stream>[0] = {
        model: selectedModel,
        max_tokens: useThinking ? MAX_TOKENS_WITH_THINKING : MAX_TOKENS,
        system: systemPrompt,
        messages: conversationMessages as Parameters<typeof client.messages.stream>[0]['messages'],
        tools:
          tools.length > 0
            ? (tools as Parameters<typeof client.messages.stream>[0]['tools'])
            : undefined
      }

      // Add thinking configuration if supported and enabled
      if (useThinking) {
        requestParams.thinking = {
          type: 'enabled',
          budget_tokens: THINKING_BUDGET
        }
      }

      // Create streaming response
      const stream = await wrapSdkStreamCall(
        'claude.streamWithTools',
        () => client.messages.stream(requestParams),
        {
          logCategory: LogCategory.API,
          details: { model: selectedModel, hasTools: tools.length > 0 }
        }
      )

      let _currentToolUse: { id: string; name: string; input: string } | null = null
      let responseStopReason: string | null = null

      // Handle stream events
      stream.on('text', (text) => {
        fullContent += text
        onChunk({ type: 'text', content: text })
      })

      // Handle thinking events
      stream.on('thinking', (thinkingDelta: string, _accumulated: string) => {
        fullThinking += thinkingDelta
        onChunk({ type: 'thinking', thinking: thinkingDelta })
      })

      // Wait for completion
      const finalMessage = await stream.finalMessage()

      // Process tool use blocks from final message (more reliable than streaming events)
      const toolBlocks = finalMessage.content.filter(
        (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
      )

      if (toolBlocks.length > 0) {
        _currentToolUse = {
          id: toolBlocks[0].id,
          name: toolBlocks[0].name,
          input: JSON.stringify(toolBlocks[0].input)
        }
        onChunk({
          type: 'tool_use',
          toolName: toolBlocks[0].name,
          content: `Using tool: ${toolBlocks[0].name}...`
        })
      }

      responseStopReason = finalMessage.stop_reason
      inputTokens += finalMessage.usage.input_tokens
      outputTokens += finalMessage.usage.output_tokens

      // Check if Claude wants to use a tool
      if (responseStopReason === 'tool_use') {
        // Find tool use blocks in the response
        const toolUseBlocks = finalMessage.content.filter(
          (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
        )

        if (toolUseBlocks.length > 0) {
          // Add assistant message with tool use to conversation
          conversationMessages.push({
            role: 'assistant',
            content: finalMessage.content as unknown as MessageContent
          })

          // Execute each tool and collect results
          const toolResults: Array<{
            type: 'tool_result'
            tool_use_id: string
            content: string
            is_error?: boolean
          }> = []

          for (const toolUse of toolUseBlocks) {
            logger.info(LogCategory.API, 'Executing tool', {
              name: toolUse.name,
              input: toolUse.input
            })

            const result = await toolExecutor(
              toolUse.name,
              toolUse.input as Record<string, unknown>
            )

            onChunk({
              type: 'tool_result',
              toolName: toolUse.name,
              content: result.isError
                ? `Tool error: ${result.content}`
                : 'Tool completed successfully'
            })

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: result.content,
              is_error: result.isError
            })
          }

          // Add tool results as user message
          conversationMessages.push({
            role: 'user',
            content: toolResults
          })

          // Continue the loop to get Claude's response with tool results
          continue
        }
      }

      // No more tool calls - we're done
      continueLoop = false

      logger.info(LogCategory.API, 'Claude streaming with tools complete', {
        model: finalMessage.model,
        stopReason: responseStopReason,
        inputTokens,
        outputTokens,
        hasThinking: !!fullThinking
      })

      // Send done signal with full response
      onChunk({
        type: 'done',
        fullResponse: {
          id: finalMessage.id,
          content: fullContent,
          thinking: fullThinking || undefined,
          model: finalMessage.model,
          stop_reason: responseStopReason,
          usage: {
            input_tokens: inputTokens,
            output_tokens: outputTokens
          }
        }
      })
    } catch (error) {
      continueLoop = false

      let errorMessage = 'Unknown error'
      if (error instanceof Anthropic.APIError) {
        logger.error(LogCategory.API, 'Claude streaming with tools API error', {
          status: error.status,
          message: error.message
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
}
