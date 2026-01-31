/**
 * Claude Code Relay Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the logger
vi.mock('@logger/main', () => ({
  LogCategory: { AI: 'AI' },
  mainLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// Mock the store
vi.mock('./store', () => ({
  getClaudeApiKey: vi.fn(() => 'test-api-key')
}))

// Mock fs with importOriginal
vi.mock('fs', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import('fs')
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn()
  }
})

// Mock the SDK
const mockQuery = vi.fn()
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: mockQuery
}))

// Mock BrowserWindow
const mockSend = vi.fn()
const mockMainWindow = {
  webContents: {
    send: mockSend
  }
} as any

describe('Claude Code Relay', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    vi.clearAllMocks()
    // Save original env
    originalEnv = { ...process.env }
    // Clear relevant env vars
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_MODEL
    delete process.env.GITHUB_TOKEN
  })

  afterEach(() => {
    // Restore original env
    process.env = originalEnv
  })

  describe('Model Configuration', () => {
    it('should set ANTHROPIC_MODEL environment variable from config', async () => {
      // Setup mock to return an async iterator
      mockQuery.mockReturnValue(
        (async function* () {
          yield { type: 'result', result: 'test response', total_cost_usd: 0.01 }
        })()
      )

      // Dynamic import to get fresh module
      vi.resetModules()
      const { startClaudeSession } = await import('./claude-code-relay')

      await startClaudeSession(mockMainWindow, {
        sessionId: 'test-session',
        prompt: 'Hello',
        config: {
          model: 'sonnet' // Using model alias
        }
      })

      // Verify ANTHROPIC_MODEL was set
      expect(process.env.ANTHROPIC_MODEL).toBe('sonnet')
    })

    it('should use DEFAULT_MODEL when no model specified in config', async () => {
      mockQuery.mockReturnValue(
        (async function* () {
          yield { type: 'result', result: 'test response', total_cost_usd: 0.01 }
        })()
      )

      vi.resetModules()
      const { startClaudeSession } = await import('./claude-code-relay')

      await startClaudeSession(mockMainWindow, {
        sessionId: 'test-session-2',
        prompt: 'Hello',
        config: {} // No model specified
      })

      // Should use default model alias 'sonnet'
      expect(process.env.ANTHROPIC_MODEL).toBe('sonnet')
    })

    it('should set ANTHROPIC_MODEL for different model selections', async () => {
      mockQuery.mockReturnValue(
        (async function* () {
          yield { type: 'result', result: 'test response', total_cost_usd: 0.01 }
        })()
      )

      vi.resetModules()
      const { startClaudeSession } = await import('./claude-code-relay')

      // Test with Opus model alias
      await startClaudeSession(mockMainWindow, {
        sessionId: 'test-session-3',
        prompt: 'Hello',
        config: {
          model: 'opus'
        }
      })

      expect(process.env.ANTHROPIC_MODEL).toBe('opus')
    })

    it('should set ANTHROPIC_API_KEY from store', async () => {
      mockQuery.mockReturnValue(
        (async function* () {
          yield { type: 'result', result: 'test response', total_cost_usd: 0.01 }
        })()
      )

      vi.resetModules()
      const { startClaudeSession } = await import('./claude-code-relay')

      await startClaudeSession(mockMainWindow, {
        sessionId: 'test-session-4',
        prompt: 'Hello'
      })

      expect(process.env.ANTHROPIC_API_KEY).toBe('test-api-key')
    })

    it('should set GITHUB_TOKEN when PR context has token', async () => {
      mockQuery.mockReturnValue(
        (async function* () {
          yield { type: 'result', result: 'test response', total_cost_usd: 0.01 }
        })()
      )

      vi.resetModules()
      const { startClaudeSession } = await import('./claude-code-relay')

      await startClaudeSession(mockMainWindow, {
        sessionId: 'test-session-5',
        prompt: 'Hello',
        prContext: {
          owner: 'testowner',
          repo: 'testrepo',
          branch: 'feature-branch',
          githubToken: 'ghp_testtoken123'
        }
      })

      expect(process.env.GITHUB_TOKEN).toBe('ghp_testtoken123')
    })
  })

  describe('Error Handling', () => {
    it('should send error when no API key configured', async () => {
      // Mock store to return no API key
      vi.doMock('./store', () => ({
        getClaudeApiKey: vi.fn(() => null)
      }))

      vi.resetModules()
      const { startClaudeSession } = await import('./claude-code-relay')

      await startClaudeSession(mockMainWindow, {
        sessionId: 'test-session-no-key',
        prompt: 'Hello'
      })

      expect(mockSend).toHaveBeenCalledWith('claude:error', {
        sessionId: 'test-session-no-key',
        error: 'Claude API key not configured. Please set your API key.'
      })
    })
  })

  describe('Session Management', () => {
    it('should track active sessions', async () => {
      mockQuery.mockReturnValue(
        (async function* () {
          yield { type: 'result', result: 'test response', total_cost_usd: 0.01 }
        })()
      )

      vi.resetModules()
      const { startClaudeSession, isSessionRunning, getActiveSessions } = await import(
        './claude-code-relay'
      )

      // Initially no sessions
      expect(getActiveSessions()).toHaveLength(0)

      // Start session (it completes immediately in test)
      await startClaudeSession(mockMainWindow, {
        sessionId: 'tracked-session',
        prompt: 'Hello'
      })

      // Session should complete and be removed
      expect(isSessionRunning('tracked-session')).toBe(false)
    })

    it('should stop session when requested', async () => {
      vi.resetModules()
      const { stopClaudeSession, stopAllSessions } = await import('./claude-code-relay')

      // Stopping non-existent session returns false
      expect(stopClaudeSession('non-existent')).toBe(false)

      // stopAllSessions should not throw
      expect(() => stopAllSessions()).not.toThrow()
    })
  })
})
