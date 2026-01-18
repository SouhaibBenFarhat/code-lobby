/**
 * Tests for the API client utility
 * Covers retry logic, error handling, and HTML error detection
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GitHubAPIError,
  GitHubRateLimitError,
  GitHubTimeoutError,
  GitHubUnavailableError,
  isHtmlErrorResponse,
  isRetryableError,
  parseGitHubError,
  withRetry,
  withRetryAndTimeout,
  withTimeout
} from '../../src/main/api-client'

// Mock the logger
vi.mock('../../src/main/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  },
  LogCategory: {
    API: 'API',
    AUTH: 'AUTH',
    UI: 'UI',
    SYSTEM: 'SYSTEM'
  }
}))

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Custom Error Types', () => {
    it('should create GitHubAPIError with correct properties', () => {
      const error = new GitHubAPIError('Test error', 500, true, false)
      expect(error.name).toBe('GitHubAPIError')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(500)
      expect(error.isRetryable).toBe(true)
      expect(error.isHtmlResponse).toBe(false)
    })

    it('should create GitHubRateLimitError', () => {
      const resetDate = new Date('2025-01-17T12:00:00Z')
      const error = new GitHubRateLimitError('Rate limit exceeded', resetDate)
      expect(error.name).toBe('GitHubRateLimitError')
      expect(error.statusCode).toBe(429)
      expect(error.isRetryable).toBe(true)
      expect(error.resetAt).toEqual(resetDate)
    })

    it('should create GitHubTimeoutError', () => {
      const error = new GitHubTimeoutError()
      expect(error.name).toBe('GitHubTimeoutError')
      expect(error.statusCode).toBe(503)
      expect(error.isRetryable).toBe(true)
    })

    it('should create GitHubUnavailableError', () => {
      const error = new GitHubUnavailableError()
      expect(error.name).toBe('GitHubUnavailableError')
      expect(error.statusCode).toBe(503)
      expect(error.isRetryable).toBe(true)
      expect(error.isHtmlResponse).toBe(true)
    })
  })

  describe('isHtmlErrorResponse', () => {
    it('should detect HTML DOCTYPE', () => {
      const error = new Error('<!DOCTYPE html><html>...')
      expect(isHtmlErrorResponse(error)).toBe(true)
    })

    it('should detect Unicorn error page', () => {
      const error = new Error('Unicorn! GitHub could not respond')
      expect(isHtmlErrorResponse(error)).toBe(true)
    })

    it('should detect "couldn\'t respond" message', () => {
      const error = new Error("We couldn't respond to your request")
      expect(isHtmlErrorResponse(error)).toBe(true)
    })

    it('should detect githubstatus.com reference', () => {
      const error = new Error('Check githubstatus.com for more info')
      expect(isHtmlErrorResponse(error)).toBe(true)
    })

    it('should return false for JSON error', () => {
      const error = new Error('{"message": "Not Found"}')
      expect(isHtmlErrorResponse(error)).toBe(false)
    })

    it('should return false for null/undefined', () => {
      expect(isHtmlErrorResponse(null)).toBe(false)
      expect(isHtmlErrorResponse(undefined)).toBe(false)
    })

    it('should handle string input', () => {
      expect(isHtmlErrorResponse('<!DOCTYPE html>')).toBe(true)
    })
  })

  describe('isRetryableError', () => {
    it('should identify HTML error responses as retryable', () => {
      const error = new Error('<!DOCTYPE html>')
      expect(isRetryableError(error)).toBe(true)
    })

    it('should identify GitHubAPIError.isRetryable', () => {
      const retryable = new GitHubAPIError('Test', 500, true)
      const notRetryable = new GitHubAPIError('Test', 400, false)
      expect(isRetryableError(retryable)).toBe(true)
      expect(isRetryableError(notRetryable)).toBe(false)
    })

    it('should identify timeout errors as retryable', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true)
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true)
    })

    it('should identify connection errors as retryable', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true)
      expect(isRetryableError(new Error('socket hang up'))).toBe(true)
    })

    it('should identify 5xx status codes as retryable', () => {
      expect(isRetryableError(new Error('503 Service Unavailable'))).toBe(true)
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true)
      expect(isRetryableError(new Error('504 Gateway Timeout'))).toBe(true)
    })

    it('should identify rate limit errors as retryable', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true)
      expect(isRetryableError(new Error('secondary rate limit'))).toBe(true)
      expect(isRetryableError(new Error('abuse detection'))).toBe(true)
    })

    it('should not identify 4xx client errors as retryable', () => {
      expect(isRetryableError(new Error('400 Bad Request'))).toBe(false)
      expect(isRetryableError(new Error('401 Unauthorized'))).toBe(false)
      expect(isRetryableError(new Error('404 Not Found'))).toBe(false)
    })
  })

  describe('parseGitHubError', () => {
    it('should parse HTML error response to GitHubUnavailableError', () => {
      const error = new Error('<!DOCTYPE html><html>Unicorn!</html>')
      const parsed = parseGitHubError(error)
      expect(parsed).toBeInstanceOf(GitHubUnavailableError)
      expect(parsed.isHtmlResponse).toBe(true)
    })

    it('should parse rate limit error', () => {
      const error = new Error('rate limit exceeded')
      const parsed = parseGitHubError(error)
      expect(parsed).toBeInstanceOf(GitHubRateLimitError)
    })

    it('should parse timeout error', () => {
      const error = new Error('ETIMEDOUT')
      const parsed = parseGitHubError(error)
      expect(parsed).toBeInstanceOf(GitHubTimeoutError)
    })

    it('should parse 503 status code', () => {
      const error = new Error('HTTP 503 error')
      const parsed = parseGitHubError(error)
      expect(parsed).toBeInstanceOf(GitHubUnavailableError)
    })

    it('should return generic GitHubAPIError for unknown errors', () => {
      const error = new Error('Something went wrong')
      const parsed = parseGitHubError(error)
      expect(parsed).toBeInstanceOf(GitHubAPIError)
      expect(parsed.name).toBe('GitHubAPIError')
    })
  })

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const resultPromise = withRetry(fn, { maxRetries: 3 })
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce('success')

      const resultPromise = withRetry(fn, { maxRetries: 3, initialDelayMs: 100 })

      // Let the first call fail
      await vi.advanceTimersByTimeAsync(0)
      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(200)
      // Let the second call succeed
      await vi.runAllTimersAsync()

      const result = await resultPromise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'))

      let thrownError: Error | undefined
      const resultPromise = withRetry(fn, { maxRetries: 2, initialDelayMs: 100 }).catch((e) => {
        thrownError = e
      })

      // Run through all retries
      await vi.runAllTimersAsync()
      await resultPromise

      expect(thrownError).toBeInstanceOf(GitHubTimeoutError)
      expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid token'))

      let thrownError: Error | undefined
      const resultPromise = withRetry(fn, { maxRetries: 3 }).catch((e) => {
        thrownError = e
      })

      await vi.runAllTimersAsync()
      await resultPromise

      expect(thrownError).toBeDefined()
      expect(fn).toHaveBeenCalledTimes(1) // No retries
    })

    it('should retry on HTML error response (GitHub Unicorn)', async () => {
      const unicornError = new Error(`<!DOCTYPE html>
        <html><head><title>Unicorn! · GitHub</title></head>
        <body>We couldn't respond to your request in time.</body></html>`)

      const fn = vi.fn().mockRejectedValueOnce(unicornError).mockResolvedValueOnce('success')

      const resultPromise = withRetry(fn, { maxRetries: 3, initialDelayMs: 100 })

      await vi.runAllTimersAsync()

      const result = await resultPromise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('withTimeout', () => {
    it('should return result before timeout', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return 'success'
      })

      const resultPromise = withTimeout(fn, 5000)
      await vi.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
    })

    it('should throw on timeout', async () => {
      const fn = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000))
        return 'success'
      })

      let thrownError: Error | undefined
      const resultPromise = withTimeout(fn, 1000).catch((e) => {
        thrownError = e
      })

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(1100)
      await resultPromise

      expect(thrownError).toBeInstanceOf(GitHubTimeoutError)
    })
  })

  describe('withRetryAndTimeout', () => {
    it('should combine retry and timeout functionality', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce('success')

      const resultPromise = withRetryAndTimeout(fn, {
        retry: { maxRetries: 2, initialDelayMs: 100 },
        timeoutMs: 5000,
        context: 'test'
      })

      await vi.runAllTimersAsync()

      const result = await resultPromise
      expect(result).toBe('success')
    })
  })
})

describe('Integration: GitHub Unicorn Error Handling', () => {
  // Simulates the actual GitHub Unicorn 503 error page
  const GITHUB_UNICORN_HTML = `<!DOCTYPE html>
<!-- Hello future GitHubber! -->
<html>
<head>
<title>Unicorn! &middot; GitHub</title>
</head>
<body>
<div class="container">
<p><strong>We couldn't respond to your request in time.</strong></p>
<p>Sorry about that. Please try refreshing and contact us if the problem persists.</p>
<div id="suggestions">
<a href="https://github.com/contact">Contact Support</a> &mdash;
<a href="https://www.githubstatus.com">GitHub Status</a> &mdash;
<a href="https://twitter.com/githubstatus">@githubstatus</a>
</div>
</div>
</body>
</html>`

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should detect GitHub Unicorn error as HTML response', () => {
    const error = new Error(GITHUB_UNICORN_HTML)
    expect(isHtmlErrorResponse(error)).toBe(true)
  })

  it('should parse Unicorn error to GitHubUnavailableError', () => {
    const error = new Error(GITHUB_UNICORN_HTML)
    const parsed = parseGitHubError(error)

    expect(parsed).toBeInstanceOf(GitHubUnavailableError)
    expect(parsed.isRetryable).toBe(true)
    expect(parsed.isHtmlResponse).toBe(true)
    expect(parsed.statusCode).toBe(503)
  })

  it('should retry on Unicorn error and succeed on subsequent attempt', async () => {
    const unicornError = new Error(GITHUB_UNICORN_HTML)
    const fn = vi
      .fn()
      .mockRejectedValueOnce(unicornError)
      .mockRejectedValueOnce(unicornError)
      .mockResolvedValueOnce({ data: 'success' })

    const resultPromise = withRetry(
      fn,
      {
        maxRetries: 3,
        initialDelayMs: 1000
      },
      'test-unicorn'
    )

    await vi.runAllTimersAsync()

    const result = await resultPromise
    expect(result).toEqual({ data: 'success' })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw GitHubUnavailableError after exhausting retries', async () => {
    const unicornError = new Error(GITHUB_UNICORN_HTML)
    const fn = vi.fn().mockRejectedValue(unicornError)

    let thrownError: Error | undefined
    const resultPromise = withRetry(fn, {
      maxRetries: 2,
      initialDelayMs: 100
    }).catch((e) => {
      thrownError = e
    })

    await vi.runAllTimersAsync()
    await resultPromise

    expect(thrownError).toBeInstanceOf(GitHubUnavailableError)
    expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
  })
})
