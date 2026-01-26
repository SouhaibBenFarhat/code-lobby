/**
 * Tests for token estimation utilities
 */

import { describe, expect, it } from 'vitest'
import type { ChatMessage } from '../types'
import { calculateTotalTokens, estimateTokens } from './tokens'

describe('estimateTokens', () => {
  it('should return 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('should return 0 for null/undefined', () => {
    expect(estimateTokens(null as unknown as string)).toBe(0)
    expect(estimateTokens(undefined as unknown as string)).toBe(0)
  })

  it('should estimate ~4 chars per token', () => {
    const text = 'abcd' // 4 chars = 1 token
    expect(estimateTokens(text)).toBe(1)

    const text2 = 'abcdefgh' // 8 chars = 2 tokens
    expect(estimateTokens(text2)).toBe(2)
  })

  it('should round up', () => {
    const text = 'abc' // 3 chars = 0.75 tokens, rounds to 1
    expect(estimateTokens(text)).toBe(1)

    const text2 = 'abcde' // 5 chars = 1.25 tokens, rounds to 2
    expect(estimateTokens(text2)).toBe(2)
  })

  it('should handle long text', () => {
    const text = 'a'.repeat(1000) // 1000 chars = 250 tokens
    expect(estimateTokens(text)).toBe(250)
  })
})

describe('calculateTotalTokens', () => {
  const createMessage = (
    content: string,
    role: 'user' | 'assistant' = 'user',
    thinking?: string
  ): ChatMessage => ({
    id: `msg_${Date.now()}`,
    role,
    content,
    thinking,
    timestamp: new Date().toISOString()
  })

  it('should return 0 for empty messages array', () => {
    expect(calculateTotalTokens([])).toBe(0)
  })

  it('should calculate tokens from messages', () => {
    const messages: ChatMessage[] = [
      createMessage('Hello'), // 5 chars = 2 tokens
      createMessage('World') // 5 chars = 2 tokens
    ]
    // 4 content tokens + 2 messages * 20 overhead = 44 tokens
    expect(calculateTotalTokens(messages)).toBe(44)
  })

  it('should include thinking tokens', () => {
    const messages: ChatMessage[] = [createMessage('Hello', 'assistant', 'Thinking...')]
    // 2 content tokens + 3 thinking tokens + 20 overhead = 25 tokens
    const result = calculateTotalTokens(messages)
    expect(result).toBeGreaterThan(20) // At least overhead + some content
  })

  it('should include streaming content', () => {
    const messages: ChatMessage[] = [createMessage('Hi')]
    const withoutStreaming = calculateTotalTokens(messages)
    const withStreaming = calculateTotalTokens(messages, 'Streaming content here')

    expect(withStreaming).toBeGreaterThan(withoutStreaming)
  })

  it('should include streaming thinking', () => {
    const messages: ChatMessage[] = [createMessage('Hi')]
    const withoutThinking = calculateTotalTokens(messages)
    const withThinking = calculateTotalTokens(messages, undefined, 'Thinking process...')

    expect(withThinking).toBeGreaterThan(withoutThinking)
  })

  it('should handle all parameters together', () => {
    const messages: ChatMessage[] = [
      createMessage('User message', 'user'),
      createMessage('Assistant response', 'assistant', 'Internal thinking')
    ]
    const result = calculateTotalTokens(messages, 'New streaming', 'New thinking')

    // Should include all sources of tokens
    expect(result).toBeGreaterThan(40) // 2 messages * 20 overhead
  })
})
