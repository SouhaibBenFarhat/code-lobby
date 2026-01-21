/**
 * Token estimation utilities for context window management
 */

import type { ChatMessage } from '../types'

// Estimate tokens from text (~4 characters per token for English)
// This is a rough estimate. Actual tokenization varies by model.
// For accurate counting, we track input_tokens from API responses.
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

// Calculate total tokens from messages
// Uses estimation - actual tokens are tracked separately via API responses
export function calculateTotalTokens(
  messages: ChatMessage[],
  streamingContent?: string,
  streamingThinking?: string
): number {
  let total = 0

  // Add tokens from all messages
  for (const msg of messages) {
    total += estimateTokens(msg.content)
    if (msg.thinking) {
      total += estimateTokens(msg.thinking)
    }
  }

  // Add streaming content if present
  if (streamingContent) {
    total += estimateTokens(streamingContent)
  }
  if (streamingThinking) {
    total += estimateTokens(streamingThinking)
  }

  // Add overhead for message formatting (~20 tokens per message)
  total += messages.length * 20

  return total
}
