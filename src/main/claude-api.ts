/**
 * Claude API Client
 * Simple implementation for chat functionality
 */

import { logger, LogCategory } from './logger'

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ClaudeResponse {
  id: string
  content: string
  model: string
  stop_reason: string | null
}

export interface ClaudeError {
  type: string
  message: string
}

export interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
  type: string
}

const CLAUDE_API_BASE = 'https://api.anthropic.com/v1'
const CLAUDE_API_URL = `${CLAUDE_API_BASE}/messages`
const CLAUDE_MODELS_URL = `${CLAUDE_API_BASE}/models`
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

/**
 * Fetch available Claude models
 */
export async function fetchModels(apiKey: string): Promise<ClaudeModel[]> {
  logger.info(LogCategory.API, 'Fetching available Claude models')
  
  try {
    const response = await fetch(CLAUDE_MODELS_URL, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = (errorData as ClaudeError)?.message || `HTTP ${response.status}`
      logger.error(LogCategory.API, 'Failed to fetch Claude models', { 
        status: response.status, 
        error: errorMessage 
      })
      throw new Error(`Failed to fetch models: ${errorMessage}`)
    }

    const data = await response.json()
    const models: ClaudeModel[] = data.data || []
    
    logger.info(LogCategory.API, 'Claude models fetched successfully', { 
      count: models.length,
      models: models.map(m => m.id)
    })
    
    // Sort by created_at descending (newest first)
    return models.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  } catch (error) {
    logger.error(LogCategory.API, 'Error fetching Claude models', { 
      error: error instanceof Error ? error.message : String(error) 
    })
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
  
  logger.info(LogCategory.API, 'Sending message to Claude API', { 
    messageCount: messages.length,
    model: selectedModel
  })

  const body: Record<string, unknown> = {
    model: selectedModel,
    max_tokens: MAX_TOKENS,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content
    }))
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = (errorData as ClaudeError)?.message || `HTTP ${response.status}`
      logger.error(LogCategory.API, 'Claude API error', { 
        status: response.status, 
        error: errorMessage 
      })
      throw new Error(`Claude API error: ${errorMessage}`)
    }

    const data = await response.json()
    
    // Extract the text content from the response
    const textContent = data.content?.find((c: { type: string }) => c.type === 'text')
    
    logger.info(LogCategory.API, 'Claude API response received', { 
      model: data.model,
      stopReason: data.stop_reason
    })

    return {
      id: data.id,
      content: textContent?.text || '',
      model: data.model,
      stop_reason: data.stop_reason
    }
  } catch (error) {
    logger.error(LogCategory.API, 'Failed to send message to Claude', { 
      error: error instanceof Error ? error.message : String(error) 
    })
    throw error
  }
}

/**
 * Validate a Claude API key by making a minimal request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    // Send a minimal message to validate the key
    await sendMessage(apiKey, [{ role: 'user', content: 'Hi' }])
    return true
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Check if it's an auth error vs other errors
    if (errorMessage.includes('401') || errorMessage.includes('invalid') || errorMessage.includes('authentication')) {
      return false
    }
    // For other errors (like rate limits), the key might still be valid
    // but we'll return false to be safe
    return false
  }
}
