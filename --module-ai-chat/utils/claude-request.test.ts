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

  it('includes CI status when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        checks: {
          state: 'failure',
          total_count: 2,
          check_runs: [
            { id: '1', name: 'build', status: 'completed', conclusion: 'failure', html_url: '' },
            { id: '2', name: 'lint', status: 'completed', conclusion: 'success', html_url: '' }
          ]
        }
      }
    })

    expect(result).toContain('## CI Status')
    expect(result).toContain('FAILURE')
    expect(result).toContain('build')
    expect(result).toContain('lint')
    expect(result).toContain('❌') // failure emoji
    expect(result).toContain('✅') // success emoji
  })

  it('shows correct emoji for different CI states', () => {
    const states = [
      { state: 'success' as const, emoji: '✅' },
      { state: 'failure' as const, emoji: '❌' },
      { state: 'error' as const, emoji: '⚠️' },
      { state: 'pending' as const, emoji: '⏳' }
    ]

    for (const { state, emoji } of states) {
      const result = buildSystemPrompt({
        prContext: {
          prNumber: 42,
          prTitle: 'Test',
          repoFullName: 'owner/repo',
          checks: { state, total_count: 0, check_runs: [] }
        }
      })
      expect(result).toContain(emoji)
      expect(result).toContain(state.toUpperCase())
    }
  })

  it('includes code reviews when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        reviews: [
          {
            id: '1',
            state: 'approved',
            created_at: '2026-01-25T10:00:00Z',
            author: { login: 'reviewer1', avatar_url: '', isBot: false },
            body: 'LGTM!'
          },
          {
            id: '2',
            state: 'changes_requested',
            created_at: '2026-01-24T10:00:00Z',
            author: { login: 'reviewer2', avatar_url: '', isBot: false },
            body: 'Please fix the edge case'
          }
        ]
      }
    })

    expect(result).toContain('## Code Reviews')
    expect(result).toContain('@reviewer1')
    expect(result).toContain('@reviewer2')
    expect(result).toContain('APPROVED')
    expect(result).toContain('CHANGES_REQUESTED')
    expect(result).toContain('LGTM!')
    expect(result).toContain('Please fix the edge case')
  })

  it('filters out bot reviews', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        reviews: [
          {
            id: '1',
            state: 'approved',
            created_at: '2026-01-25T10:00:00Z',
            author: { login: 'human-reviewer', avatar_url: '', isBot: false },
            body: 'Good work!'
          },
          {
            id: '2',
            state: 'commented',
            created_at: '2026-01-24T10:00:00Z',
            author: { login: 'codecov[bot]', avatar_url: '', isBot: true },
            body: 'Coverage report...'
          }
        ]
      }
    })

    expect(result).toContain('@human-reviewer')
    expect(result).not.toContain('codecov[bot]')
    expect(result).not.toContain('Coverage report')
  })

  it('includes PR comments when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        comments: [
          {
            id: '1',
            body: 'Have you considered using the new API?',
            created_at: '2026-01-25T10:00:00Z',
            author: { login: 'teammate', avatar_url: '', isBot: false }
          }
        ]
      }
    })

    expect(result).toContain('## PR Discussion')
    expect(result).toContain('@teammate')
    expect(result).toContain('Have you considered using the new API?')
  })

  it('filters out bot comments', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        comments: [
          {
            id: '1',
            body: 'Human comment',
            created_at: '2026-01-25T10:00:00Z',
            author: { login: 'human', avatar_url: '', isBot: false }
          },
          {
            id: '2',
            body: 'Bot comment',
            created_at: '2026-01-25T10:00:00Z',
            author: { login: 'github-actions[bot]', avatar_url: '', isBot: true }
          }
        ]
      }
    })

    expect(result).toContain('Human comment')
    expect(result).not.toContain('Bot comment')
  })

  it('includes unresolved review threads when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        reviewThreads: [
          {
            id: '1',
            isResolved: false,
            path: 'src/auth.ts',
            line: 42,
            comments: [
              {
                id: 'c1',
                body: 'This could cause a null pointer',
                created_at: '2026-01-25T10:00:00Z',
                author: { login: 'reviewer', avatar_url: '', isBot: false },
                path: 'src/auth.ts',
                line: 42
              }
            ]
          },
          {
            id: '2',
            isResolved: true, // Should be excluded
            path: 'src/utils.ts',
            line: 10,
            comments: [
              {
                id: 'c2',
                body: 'Already resolved issue',
                created_at: '2026-01-25T10:00:00Z',
                author: { login: 'reviewer', avatar_url: '', isBot: false },
                path: 'src/utils.ts',
                line: 10
              }
            ]
          }
        ]
      }
    })

    expect(result).toContain('## Active Review Threads (Unresolved)')
    expect(result).toContain('src/auth.ts:42')
    expect(result).toContain('This could cause a null pointer')
    expect(result).not.toContain('Already resolved issue')
  })

  it('limits comments to last 10', () => {
    const manyComments = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      body: `Comment ${i}`,
      created_at: '2026-01-25T10:00:00Z',
      author: { login: `user${i}`, avatar_url: '', isBot: false }
    }))

    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        comments: manyComments
      }
    })

    // Should only include last 10 (indices 5-14)
    expect(result).not.toContain('Comment 0')
    expect(result).not.toContain('Comment 4')
    expect(result).toContain('Comment 5')
    expect(result).toContain('Comment 14')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // PR METADATA TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  it('includes branch names when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        headBranch: 'feature/add-auth',
        baseBranch: 'main'
      }
    })

    expect(result).toContain('**Branch:**')
    expect(result).toContain('`feature/add-auth`')
    expect(result).toContain('`main`')
    expect(result).toContain('→')
  })

  it('includes author when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        author: 'johndoe'
      }
    })

    expect(result).toContain('**Author:**')
    expect(result).toContain('@johndoe')
  })

  it('includes draft status when PR is draft', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        isDraft: true
      }
    })

    expect(result).toContain('**Status:**')
    expect(result).toContain('🚧')
    expect(result).toContain('Draft')
  })

  it('does not include draft status when PR is not draft', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        isDraft: false
      }
    })

    expect(result).not.toContain('🚧')
    expect(result).not.toContain('Draft')
  })

  it('includes labels when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        labels: ['bug', 'priority-high', 'needs-tests']
      }
    })

    expect(result).toContain('**Labels:**')
    expect(result).toContain('`bug`')
    expect(result).toContain('`priority-high`')
    expect(result).toContain('`needs-tests`')
  })

  it('does not include labels section when no labels', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        labels: []
      }
    })

    expect(result).not.toContain('**Labels:**')
  })

  it('includes PR stats when provided', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        additions: 150,
        deletions: 30,
        changedFiles: 8
      }
    })

    expect(result).toContain('**Changes:**')
    expect(result).toContain('+150')
    expect(result).toContain('-30')
    expect(result).toContain('8 files')
  })

  it('includes review decision when provided', () => {
    const decisions = [
      { decision: 'APPROVED' as const, emoji: '✅' },
      { decision: 'CHANGES_REQUESTED' as const, emoji: '🔴' },
      { decision: 'REVIEW_REQUIRED' as const, emoji: '⏳' }
    ]

    for (const { decision, emoji } of decisions) {
      const result = buildSystemPrompt({
        prContext: {
          prNumber: 42,
          prTitle: 'Add feature X',
          repoFullName: 'owner/repo',
          reviewDecision: decision
        }
      })

      expect(result).toContain('**Review Status:**')
      expect(result).toContain(emoji)
      expect(result).toContain(decision.replace('_', ' '))
    }
  })

  it('includes all metadata together', () => {
    const result = buildSystemPrompt({
      prContext: {
        prNumber: 42,
        prTitle: 'Add feature X',
        repoFullName: 'owner/repo',
        headBranch: 'feature/xyz',
        baseBranch: 'main',
        author: 'developer',
        isDraft: false,
        labels: ['enhancement'],
        additions: 100,
        deletions: 20,
        changedFiles: 5,
        reviewDecision: 'APPROVED'
      }
    })

    // All metadata should be present
    expect(result).toContain('`feature/xyz`')
    expect(result).toContain('@developer')
    expect(result).toContain('`enhancement`')
    expect(result).toContain('+100')
    expect(result).toContain('✅')
    expect(result).toContain('APPROVED')
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
