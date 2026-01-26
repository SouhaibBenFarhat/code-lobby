import { describe, expect, it } from 'vitest'
import {
  BASE_SYSTEM_PROMPT,
  buildClaudeHeaders,
  buildClaudeRequestBody,
  buildSystemPrompt,
  DEFAULT_MODEL,
  formatMessagesForClaude,
  MAX_TOKENS,
  MAX_TOKENS_WITH_THINKING,
  REVIEW_FORMAT_INSTRUCTIONS,
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
  it('returns base prompt when no options', () => {
    expect(buildSystemPrompt()).toBe(BASE_SYSTEM_PROMPT)
    expect(buildSystemPrompt(undefined)).toBe(BASE_SYSTEM_PROMPT)
    expect(buildSystemPrompt({})).toBe(BASE_SYSTEM_PROMPT)
  })

  it('does NOT include review instructions without PR context', () => {
    const result = buildSystemPrompt()
    expect(result).not.toContain('Code Review Generation')
    expect(result).not.toContain('REVIEW_FORMAT_INSTRUCTIONS')
  })

  it('includes review format instructions when PR context is provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo'
      }
    })
    expect(result).toContain(REVIEW_FORMAT_INSTRUCTIONS)
    expect(result).toContain('Code Review Generation')
    expect(result).toContain('json:review')
  })

  it('includes PR context when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo'
      }
    })

    expect(result).toContain('PR #42')
    expect(result).toContain('Add feature X')
    expect(result).toContain('owner/repo')
    expect(result).toContain(BASE_SYSTEM_PROMPT)
  })

  it('includes PR description when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        prBody: 'This PR adds a new feature that does amazing things.',
        repoFullName: 'owner/repo'
      }
    })

    expect(result).toContain('## PR Description')
    expect(result).toContain('This PR adds a new feature that does amazing things.')
  })

  it('skips empty PR body', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        prBody: '   ',
        repoFullName: 'owner/repo'
      }
    })

    expect(result).not.toContain('## PR Description')
  })

  it('includes file diffs when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        files: [
          {
            path: 'src/index.ts',
            additions: 10,
            deletions: 5,
            changeType: 'MODIFIED',
            patch: '@@ -1,5 +1,10 @@\n-old code\n+new code'
          }
        ]
      }
    })

    expect(result).toContain('## Changed Files')
    expect(result).toContain('src/index.ts')
    expect(result).toContain('+10, -5')
    expect(result).toContain('```diff')
    expect(result).toContain('-old code')
    expect(result).toContain('+new code')
  })

  it('shows correct icon for different change types', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        files: [
          { path: 'added.ts', additions: 10, deletions: 0, changeType: 'ADDED', patch: '+new' },
          { path: 'deleted.ts', additions: 0, deletions: 10, changeType: 'DELETED', patch: '-old' },
          { path: 'renamed.ts', additions: 0, deletions: 0, changeType: 'RENAMED', patch: '' },
          { path: 'modified.ts', additions: 5, deletions: 5, changeType: 'MODIFIED', patch: '~' }
        ]
      }
    })

    expect(result).toContain('+ added.ts')
    expect(result).toContain('- deleted.ts')
    expect(result).toContain('→ renamed.ts')
    expect(result).toContain('~ modified.ts')
  })

  it('handles files without patch content', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        files: [{ path: 'binary.png', additions: 0, deletions: 0, changeType: 'ADDED' }]
      }
    })

    expect(result).toContain('binary.png')
    expect(result).toContain('[No diff available]')
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
