/**
 * Claude API Client
 * Using official @anthropic-ai/sdk
 */

import Anthropic from '@anthropic-ai/sdk'
import { logger, LogCategory } from './logger'

// Re-export types for use elsewhere
export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  id: string
  content: string
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

// Cache client instances by API key
const clientCache = new Map<string, Anthropic>()

/**
 * Get or create an Anthropic client for the given API key
 */
function getClient(apiKey: string): Anthropic {
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new Anthropic({ apiKey }))
  }
  return clientCache.get(apiKey)!
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
    
    const models: ClaudeModel[] = response.data.map(model => ({
      id: model.id,
      display_name: model.display_name,
      created_at: model.created_at,
      type: model.type
    }))
    
    logger.info(LogCategory.API, 'Claude models fetched successfully', { 
      count: models.length,
      models: models.map(m => m.id)
    })
    
    // Sort by created_at descending (newest first)
    return models.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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

/**
 * Send a message to Claude API
 */
export async function sendMessage(
  apiKey: string,
  messages: ClaudeMessage[],
  model?: string,
  systemPrompt?: string
): Promise<ClaudeResponse> {
  const selectedModel = model || DEFAULT_MODEL
  
  logger.info(LogCategory.API, 'Sending message to Claude API (SDK)', { 
    messageCount: messages.length,
    model: selectedModel
  })

  try {
    const client = getClient(apiKey)
    
    const response = await client.messages.create({
      model: selectedModel,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    })
    
    // Extract the text content from the response
    const textContent = response.content.find(c => c.type === 'text')
    const content = textContent && 'text' in textContent ? textContent.text : ''
    
    logger.info(LogCategory.API, 'Claude API response received', { 
      id: response.id,
      model: response.model,
      stopReason: response.stop_reason,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens
    })

    return {
      id: response.id,
      content,
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
