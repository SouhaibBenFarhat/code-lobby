import { describe, expect, it } from 'vitest'
import {
  buildClaudeHeaders,
  buildClaudeRequestBody,
  buildSystemPrompt,
  DEFAULT_MODEL,
  formatMessagesForClaude,
  GENERAL_SYSTEM_PROMPT,
  MAX_TOKENS,
  MAX_TOKENS_WITH_THINKING,
  supportsThinking,
  THINKING_BUDGET
} from './claude-request'

describe('supportsThinking', () => {
  it('returns true for thinking-supported models', () => {
    expect(supportsThinking('claude-sonnet-4-20250514')).toBe(true)
    expect(supportsThinking('claude-opus-4-20250514')).toBe(true)
    expect(supportsThinking('claude-3-7-sonnet-20250101')).toBe(true)
    expect(supportsThinking('claude-3-5-sonnet-20241022')).toBe(true)
  })

  it('returns false for non-thinking models', () => {
    expect(supportsThinking('claude-3-haiku')).toBe(false)
    expect(supportsThinking('gpt-4')).toBe(false)
    expect(supportsThinking('claude-instant')).toBe(false)
  })
})

describe('buildSystemPrompt', () => {
  it('returns general prompt when no PR context', () => {
    expect(buildSystemPrompt()).toBe(GENERAL_SYSTEM_PROMPT)
    expect(buildSystemPrompt(undefined)).toBe(GENERAL_SYSTEM_PROMPT)
  })

  it('includes PR context when provided', () => {
    const result = buildSystemPrompt({
      prNumber: 42,
      prTitle: 'Add feature X',
      repoFullName: 'owner/repo'
    })

    expect(result).toContain('PR #42')
    expect(result).toContain('Add feature X')
    expect(result).toContain('owner/repo')
    expect(result).toContain(GENERAL_SYSTEM_PROMPT)
  })
})

describe('formatMessagesForClaude', () => {
  it('converts messages to Claude format', () => {
    const messages = [
      { id: '1', role: 'user' as const, content: 'Hello', timestamp: '2024-01-01' },
      { id: '2', role: 'assistant' as const, content: 'Hi!', timestamp: '2024-01-01' }
    ]

    const result = formatMessagesForClaude(messages)

    expect(result).toEqual([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi!' }
    ])
  })

  it('handles empty array', () => {
    expect(formatMessagesForClaude([])).toEqual([])
  })

  it('strips extra fields', () => {
    const messages = [
      {
        id: 'x',
        role: 'user' as const,
        content: 'test',
        timestamp: '2024-01-01',
        thinking: 'some thinking'
      }
    ]

    const result = formatMessagesForClaude(messages)

    expect(result).toEqual([{ role: 'user', content: 'test' }])
    expect(result[0]).not.toHaveProperty('id')
    expect(result[0]).not.toHaveProperty('thinking')
  })
})

describe('buildClaudeRequestBody', () => {
  const baseOptions = {
    model: DEFAULT_MODEL,
    systemPrompt: 'Test prompt',
    messages: [{ role: 'user' as const, content: 'Hello' }],
    enableThinking: false
  }

  it('builds basic request body', () => {
    const result = buildClaudeRequestBody(baseOptions)

    expect(result.model).toBe(DEFAULT_MODEL)
    expect(result.system).toBe('Test prompt')
    expect(result.messages).toEqual([{ role: 'user', content: 'Hello' }])
    expect(result.stream).toBe(true)
    expect(result.max_tokens).toBe(MAX_TOKENS)
    expect(result.thinking).toBeUndefined()
  })

  it('enables streaming by default', () => {
    const result = buildClaudeRequestBody(baseOptions)
    expect(result.stream).toBe(true)
  })

  it('can disable streaming', () => {
    const result = buildClaudeRequestBody({ ...baseOptions, stream: false })
    expect(result.stream).toBe(false)
  })

  it('adds thinking config when enabled and model supports it', () => {
    const result = buildClaudeRequestBody({
      ...baseOptions,
      model: 'claude-sonnet-4-20250514',
      enableThinking: true
    })

    expect(result.thinking).toEqual({
      type: 'enabled',
      budget_tokens: THINKING_BUDGET
    })
    expect(result.max_tokens).toBe(MAX_TOKENS_WITH_THINKING)
  })

  it('does not add thinking for unsupported models even if enabled', () => {
    const result = buildClaudeRequestBody({
      ...baseOptions,
      model: 'claude-3-haiku',
      enableThinking: true
    })

    expect(result.thinking).toBeUndefined()
    expect(result.max_tokens).toBe(MAX_TOKENS)
  })
})

describe('buildClaudeHeaders', () => {
  it('builds correct headers', () => {
    const headers = buildClaudeHeaders('sk-ant-api03-xxx')

    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['x-api-key']).toBe('sk-ant-api03-xxx')
    expect(headers['anthropic-version']).toBe('2023-06-01')
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true')
  })
})
