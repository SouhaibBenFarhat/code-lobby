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

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096

/**
 * Send a message to Claude API
 */
export async function sendMessage(
  apiKey: string,
  messages: ClaudeMessage[],
  systemPrompt?: string
): Promise<ClaudeResponse> {
  logger.info(LogCategory.API, 'Sending message to Claude API', { 
    messageCount: messages.length 
  })

  const body: Record<string, unknown> = {
    model: DEFAULT_MODEL,
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
