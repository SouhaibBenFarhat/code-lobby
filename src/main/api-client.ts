/**
 * API Client Utility
 * 
 * Provides robust error handling, retry logic with exponential backoff,
 * and detection of GitHub's HTML error responses (like the "Unicorn" 503 page).
 */

import { logger, LogCategory } from './logger'

// Custom error types for GitHub API failures
export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false,
    public readonly isHtmlResponse: boolean = false
  ) {
    super(message)
    this.name = 'GitHubAPIError'
  }
}

export class GitHubRateLimitError extends GitHubAPIError {
  constructor(
    message: string,
    public readonly resetAt?: Date
  ) {
    super(message, 429, true)
    this.name = 'GitHubRateLimitError'
  }
}

export class GitHubTimeoutError extends GitHubAPIError {
  constructor(message: string = 'GitHub API request timed out') {
    super(message, 503, true)
    this.name = 'GitHubTimeoutError'
  }
}

export class GitHubUnavailableError extends GitHubAPIError {
  constructor(message: string = 'GitHub API is temporarily unavailable') {
    super(message, 503, true, true)
    this.name = 'GitHubUnavailableError'
  }
}

// Retry configuration
export interface RetryConfig {
  maxRetries: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs)
  // Add jitter (±25%) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1)
  return Math.round(cappedDelay + jitter)
}

/**
 * Check if an error is a GitHub HTML error page (like the Unicorn 503)
 */
export function isHtmlErrorResponse(error: unknown): boolean {
  if (!error) return false
  
  // Check error message for HTML indicators
  const errorMessage = error instanceof Error ? error.message : String(error)
  const htmlIndicators = [
    '<!DOCTYPE html>',
    '<html>',
    'Unicorn',
    'couldn\'t respond to your request',
    'We couldn\'t respond',
    'githubstatus.com'
  ]
  
  return htmlIndicators.some(indicator => 
    errorMessage.toLowerCase().includes(indicator.toLowerCase())
  )
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  // HTML error pages are retryable (usually temporary server issues)
  if (isHtmlErrorResponse(error)) {
    return true
  }
  
  if (error instanceof GitHubAPIError) {
    return error.isRetryable
  }
  
  // Check for specific error types/messages
  const errorMessage = error instanceof Error ? error.message : String(error)
  const retryablePatterns = [
    /timeout/i,
    /ETIMEDOUT/i,
    /ECONNRESET/i,
    /ECONNREFUSED/i,
    /socket hang up/i,
    /network/i,
    /503/,
    /502/,
    /504/,
    /rate limit/i,
    /secondary rate limit/i,
    /abuse detection/i
  ]
  
  return retryablePatterns.some(pattern => pattern.test(errorMessage))
}

/**
 * Parse GitHub error and convert to appropriate error type
 */
export function parseGitHubError(error: unknown): GitHubAPIError {
  const errorMessage = error instanceof Error ? error.message : String(error)
  
  // Check for HTML error response (GitHub Unicorn page)
  if (isHtmlErrorResponse(error)) {
    logger.warn(LogCategory.API, 'Received HTML error page from GitHub (likely 503 timeout)', {
      preview: errorMessage.substring(0, 200)
    })
    return new GitHubUnavailableError(
      'GitHub is temporarily unavailable. Please try again in a moment.'
    )
  }
  
  // Check for rate limit errors
  if (/rate limit/i.test(errorMessage) || /abuse detection/i.test(errorMessage)) {
    const resetMatch = errorMessage.match(/reset at (\d+)/i)
    const resetAt = resetMatch ? new Date(parseInt(resetMatch[1]) * 1000) : undefined
    return new GitHubRateLimitError(
      'GitHub API rate limit exceeded. Please wait before making more requests.',
      resetAt
    )
  }
  
  // Check for timeout errors
  if (/timeout/i.test(errorMessage) || /ETIMEDOUT/i.test(errorMessage)) {
    return new GitHubTimeoutError()
  }
  
  // Check for specific HTTP status codes
  const statusMatch = errorMessage.match(/\b(4\d{2}|5\d{2})\b/)
  const statusCode = statusMatch ? parseInt(statusMatch[1]) : undefined
  
  if (statusCode === 503 || statusCode === 502 || statusCode === 504) {
    return new GitHubUnavailableError(
      `GitHub API returned ${statusCode}. Please try again.`
    )
  }
  
  // Generic API error
  return new GitHubAPIError(
    errorMessage,
    statusCode,
    isRetryableError(error)
  )
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryConfig> = {},
  context?: string
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options }
  let lastError: Error | undefined
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Parse the error to get more context
      const parsedError = parseGitHubError(error)
      
      // Log the attempt
      logger.warn(LogCategory.API, `API call failed (attempt ${attempt + 1}/${config.maxRetries + 1})`, {
        context,
        error: parsedError.message,
        isRetryable: parsedError.isRetryable,
        isHtmlResponse: parsedError.isHtmlResponse
      })
      
      // Check if we should retry
      if (attempt < config.maxRetries && parsedError.isRetryable) {
        const delay = calculateDelay(attempt, config)
        logger.info(LogCategory.API, `Retrying in ${delay}ms...`, { context, attempt: attempt + 1 })
        await sleep(delay)
        continue
      }
      
      // Throw the parsed error for better context
      throw parsedError
    }
  }
  
  // This shouldn't be reached, but just in case
  throw lastError || new Error('Unknown error in retry logic')
}

/**
 * Execute a function with a timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      logger.warn(LogCategory.API, `Request timed out after ${timeoutMs}ms`, { context })
      reject(new GitHubTimeoutError(`Request timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    
    fn()
      .then(result => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

/**
 * Execute a function with both retry logic and timeout
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  options: {
    retry?: Partial<RetryConfig>
    timeoutMs?: number
    context?: string
  } = {}
): Promise<T> {
  const { retry = {}, timeoutMs = 30000, context } = options
  
  return withRetry(
    () => withTimeout(fn, timeoutMs, context),
    retry,
    context
  )
}
