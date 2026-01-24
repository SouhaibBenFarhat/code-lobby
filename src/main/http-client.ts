/**
 * Centralized HTTP Client
 *
 * All HTTP calls in the main process go through this module.
 * Provides automatic logging of:
 * - Request URL, method, and headers (sanitized)
 * - Response status code and duration
 * - Response size
 * - Errors with details
 *
 * Usage:
 *   import { http } from './http-client'
 *
 *   // Simple GET
 *   const response = await http.get('https://api.github.com/user')
 *
 *   // POST with body
 *   const response = await http.post('https://api.example.com/data', {
 *     body: JSON.stringify({ key: 'value' }),
 *     headers: { 'Content-Type': 'application/json' }
 *   })
 *
 *   // Raw fetch with full control
 *   const response = await http.fetch('https://api.example.com', { method: 'PUT', ... })
 */

import { LogCategory, mainLogger as logger } from '@codelobby/logger/main'

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMIT CALLBACK
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimitUpdate {
  limit: number
  remaining: number
  used: number
  resetAt: string
  percentage: number
  resource: string
}

type RateLimitCallback = (rateLimit: RateLimitUpdate) => void
let rateLimitCallback: RateLimitCallback | null = null

/**
 * Set a callback to be called whenever rate limit info is received from GitHub
 */
export function onRateLimitUpdate(callback: RateLimitCallback | null): void {
  rateLimitCallback = callback
}

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK REQUEST TRACKING (for Network Panel)
// ═══════════════════════════════════════════════════════════════════════════

export interface NetworkRequestEvent {
  id: string
  method: string
  status: 'pending' | 'success' | 'error'
  startTime: number
  endTime?: number
  durationMs?: number
  httpMethod?: string
  url?: string
  statusCode?: number
  cost?: number // GraphQL query cost (from response body)
  rateLimit?: {
    limit: number
    remaining: number
    used: number
    resetAt: string
  }
  error?: string
  requestBody?: string // GraphQL query or POST body (truncated)
  responseBody?: string // Response data (truncated)
}

type NetworkRequestCallback = (event: NetworkRequestEvent) => void
let networkRequestCallback: NetworkRequestCallback | null = null

/**
 * Set a callback to track HTTP requests (for Network Panel)
 * This tracks ALL REST API calls that go through this http client
 */
export function onNetworkRequest(callback: NetworkRequestCallback | null): void {
  networkRequestCallback = callback
}

/**
 * Extract rate limit info from GitHub API response headers
 */
function extractRateLimitFromHeaders(headers: Headers): RateLimitUpdate | null {
  const limit = headers.get('x-ratelimit-limit')
  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')
  const used = headers.get('x-ratelimit-used')
  const resource = headers.get('x-ratelimit-resource')

  if (!limit || !remaining || !reset) return null

  const limitNum = parseInt(limit, 10)
  const remainingNum = parseInt(remaining, 10)
  const usedNum = used ? parseInt(used, 10) : limitNum - remainingNum
  const resetTimestamp = parseInt(reset, 10) * 1000

  return {
    limit: limitNum,
    remaining: remainingNum,
    used: usedNum,
    resetAt: new Date(resetTimestamp).toISOString(),
    percentage: Math.round((usedNum / limitNum) * 100),
    resource: resource || 'unknown'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HttpRequestOptions extends Omit<RequestInit, 'method'> {
  /** Custom timeout in milliseconds (default: 30000) */
  timeout?: number
  /** Custom log category (default: LogCategory.API) */
  logCategory?: string
  /** Custom operation name for logging (default: URL path) */
  operationName?: string
  /** Skip logging for this request */
  skipLogging?: boolean
}

export interface HttpResponse<T = unknown> {
  ok: boolean
  status: number
  statusText: string
  headers: Headers
  data: T
  durationMs: number
  size: number
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT = 30000 // 30 seconds

// Headers that should be redacted in logs
const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'api-key', 'token', 'cookie', 'set-cookie']

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Sanitize headers for logging (redact sensitive values)
 */
function sanitizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {}

  const sanitized: Record<string, string> = {}

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      sanitized[key] = SENSITIVE_HEADERS.includes(key.toLowerCase()) ? '[REDACTED]' : value
    })
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      sanitized[key] = SENSITIVE_HEADERS.includes(key.toLowerCase()) ? '[REDACTED]' : value
    }
  } else {
    for (const [key, value] of Object.entries(headers)) {
      sanitized[key] = SENSITIVE_HEADERS.includes(key.toLowerCase()) ? '[REDACTED]' : value
    }
  }

  return sanitized
}

/**
 * Extract a short operation name from URL
 */
function getOperationName(url: string): string {
  try {
    const parsed = new URL(url)
    // Get last 2-3 path segments
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length === 0) return parsed.host
    if (segments.length <= 3) return segments.join('/')
    return `.../${segments.slice(-2).join('/')}`
  } catch {
    return url.slice(0, 50)
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Get approximate response size
 */
async function getResponseSize(
  response: Response,
  body: string | ArrayBuffer | null
): Promise<number> {
  // Try content-length header first
  const contentLength = response.headers.get('content-length')
  if (contentLength) return parseInt(contentLength, 10)

  // Fall back to body length
  if (typeof body === 'string') return new TextEncoder().encode(body).length
  if (body instanceof ArrayBuffer) return body.byteLength

  return 0
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HTTP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Make an HTTP request with automatic logging
 *
 * THIS IS THE SINGLE PLACE WHERE ALL REST API CALLS ARE TRACKED
 */
async function httpFetch<T = unknown>(
  url: string,
  options: HttpRequestOptions & { method?: string } = {}
): Promise<HttpResponse<T>> {
  const {
    timeout = DEFAULT_TIMEOUT,
    logCategory = LogCategory.API,
    operationName = getOperationName(url),
    skipLogging = false,
    ...fetchOptions
  } = options

  const method = fetchOptions.method || 'GET'
  const startTime = performance.now()
  const startTimestamp = Date.now()

  // Generate unique request ID for tracking
  const requestId = `http_${startTimestamp}_${Math.random().toString(36).substring(2, 9)}`
  const isGitHubApi = url.includes('github.com')
  const isGraphQL = url.includes('api.github.com/graphql')

  // Extract RAW request body for tracking (no formatting/modification)
  const requestBody: string | undefined =
    fetchOptions.body && typeof fetchOptions.body === 'string' ? fetchOptions.body : undefined

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // Log request start
  if (!skipLogging) {
    logger.debug(logCategory, `${method} ${operationName}`, {
      url,
      method,
      headers: sanitizeHeaders(fetchOptions.headers),
      hasBody: !!fetchOptions.body
    })
  }

  // Track request start (for GitHub REST API calls only)
  if (isGitHubApi && networkRequestCallback) {
    networkRequestCallback({
      id: requestId,
      method: `rest.${operationName}`,
      status: 'pending',
      startTime: startTimestamp,
      httpMethod: method,
      url,
      requestBody
    })
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    const durationMs = performance.now() - startTime
    const endTimestamp = Date.now()

    // Parse response body
    const contentType = response.headers.get('content-type') || ''
    let data: T
    let bodyText: string | null = null

    if (contentType.includes('application/json')) {
      bodyText = await response.text()
      try {
        data = JSON.parse(bodyText) as T
      } catch {
        data = bodyText as T
      }
    } else {
      bodyText = await response.text()
      data = bodyText as T
    }

    const size = await getResponseSize(response, bodyText)

    // Extract and notify about rate limit (for GitHub API responses)
    if (isGitHubApi && rateLimitCallback) {
      const rateLimit = extractRateLimitFromHeaders(response.headers)
      if (rateLimit) {
        rateLimitCallback(rateLimit)
      }
    }

    // Track request success (for GitHub REST API calls only)
    if (isGitHubApi && networkRequestCallback) {
      // RAW response body (no formatting/modification - exactly what GitHub returns)
      const responseBody: string | undefined = bodyText || undefined

      // Extract GraphQL cost from response (if this is a GraphQL request)
      let cost: number | undefined
      let rateLimitFromBody: NetworkRequestEvent['rateLimit'] | undefined
      if (isGraphQL && data && typeof data === 'object') {
        const graphqlData = data as {
          rateLimit?: {
            cost?: number
            limit?: number
            remaining?: number
            used?: number
            resetAt?: string
          }
        }
        if (graphqlData.rateLimit) {
          cost = graphqlData.rateLimit.cost
          if (graphqlData.rateLimit.limit && graphqlData.rateLimit.remaining !== undefined) {
            rateLimitFromBody = {
              limit: graphqlData.rateLimit.limit,
              remaining: graphqlData.rateLimit.remaining,
              used: graphqlData.rateLimit.used || 0,
              resetAt: graphqlData.rateLimit.resetAt || ''
            }
          }
        }
      }

      // Get rate limit from headers (for REST API calls)
      const rateLimit = extractRateLimitFromHeaders(response.headers)
      const rateLimitForEvent =
        rateLimitFromBody ||
        (rateLimit
          ? {
              limit: rateLimit.limit,
              remaining: rateLimit.remaining,
              used: rateLimit.used,
              resetAt: rateLimit.resetAt
            }
          : undefined)

      networkRequestCallback({
        id: requestId,
        method: `rest.${operationName}`,
        status: response.ok ? 'success' : 'error',
        startTime: startTimestamp,
        endTime: endTimestamp,
        durationMs: Math.round(durationMs * 100) / 100,
        httpMethod: method,
        url,
        statusCode: response.status,
        cost, // GraphQL query cost (only for GraphQL requests)
        rateLimit: rateLimitForEvent,
        error: response.ok ? undefined : `${response.status} ${response.statusText}`,
        requestBody, // RAW request body (exactly what we sent to GitHub)
        responseBody // RAW response body (exactly what GitHub returned)
      })
    }

    // Log response
    if (!skipLogging) {
      const logLevel = response.ok ? 'info' : 'error'
      const statusEmoji = response.ok ? '✓' : '✗'

      logger[logLevel](
        logCategory,
        `${statusEmoji} ${method} ${operationName} - ${response.status} ${response.statusText}`,
        {
          durationMs: Math.round(durationMs * 100) / 100,
          status: response.status,
          size: formatBytes(size),
          url
        }
      )
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data,
      durationMs,
      size
    }
  } catch (error) {
    clearTimeout(timeoutId)
    const durationMs = performance.now() - startTime
    const endTimestamp = Date.now()

    // Determine error type
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    const errorMessage = isTimeout
      ? `Request timeout after ${timeout}ms`
      : error instanceof Error
        ? error.message
        : 'Unknown error'

    // Track request error (for GitHub REST API calls only)
    if (isGitHubApi && networkRequestCallback) {
      networkRequestCallback({
        id: requestId,
        method: `rest.${operationName}`,
        status: 'error',
        startTime: startTimestamp,
        endTime: endTimestamp,
        durationMs: Math.round(durationMs * 100) / 100,
        httpMethod: method,
        url,
        error: errorMessage
      })
    }

    // Log error
    if (!skipLogging) {
      logger.error(logCategory, `✗ ${method} ${operationName} - FAILED`, {
        durationMs: Math.round(durationMs * 100) / 100,
        error: errorMessage,
        isTimeout,
        url
      })
    }

    throw new HttpError(errorMessage, { url, method, durationMs, isTimeout })
  }
}

/**
 * Custom HTTP error with request details
 */
export class HttpError extends Error {
  public readonly url: string
  public readonly method: string
  public readonly durationMs: number
  public readonly isTimeout: boolean

  constructor(
    message: string,
    details: { url: string; method: string; durationMs: number; isTimeout: boolean }
  ) {
    super(message)
    this.name = 'HttpError'
    this.url = details.url
    this.method = details.method
    this.durationMs = details.durationMs
    this.isTimeout = details.isTimeout
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVENIENCE METHODS
// ═══════════════════════════════════════════════════════════════════════════

export const http = {
  /**
   * Raw fetch with full control
   */
  fetch: httpFetch,

  /**
   * GET request
   */
  get<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return httpFetch<T>(url, { ...options, method: 'GET' })
  },

  /**
   * POST request
   */
  post<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return httpFetch<T>(url, { ...options, method: 'POST' })
  },

  /**
   * PUT request
   */
  put<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return httpFetch<T>(url, { ...options, method: 'PUT' })
  },

  /**
   * DELETE request
   */
  delete<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return httpFetch<T>(url, { ...options, method: 'DELETE' })
  },

  /**
   * PATCH request
   */
  patch<T = unknown>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return httpFetch<T>(url, { ...options, method: 'PATCH' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPHQL HELPER
// ═══════════════════════════════════════════════════════════════════════════

export interface GraphQLResponse<T = unknown> {
  data?: T
  errors?: Array<{ message: string; path?: string[] }>
}

/**
 * Make a GraphQL request with automatic logging
 */
export async function graphqlRequest<T = unknown>(
  url: string,
  query: string,
  variables?: Record<string, unknown>,
  options?: HttpRequestOptions & { headers?: Record<string, string> }
): Promise<GraphQLResponse<T>> {
  const { headers = {}, operationName, ...restOptions } = options || {}

  // Extract operation name from query if not provided
  const opName = operationName || extractGraphQLOperationName(query) || 'graphql'

  const response = await http.post<GraphQLResponse<T>>(url, {
    ...restOptions,
    operationName: opName,
    logCategory: LogCategory.GRAPHQL,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({ query, variables })
  })

  return response.data
}

/**
 * Extract operation name from GraphQL query
 */
function extractGraphQLOperationName(query: string): string | null {
  const match = query.match(/(?:query|mutation|subscription)\s+(\w+)/)
  return match ? match[1] : null
}

// ═══════════════════════════════════════════════════════════════════════════
// SDK CALL WRAPPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Wrap an SDK call (like Anthropic) with logging
 *
 * Usage:
 *   const response = await wrapSdkCall(
 *     'claude.messages.create',
 *     () => client.messages.create({ model: '...', messages: [...] }),
 *     { logCategory: LogCategory.API }
 *   )
 */
export async function wrapSdkCall<T>(
  operationName: string,
  fn: () => Promise<T>,
  options?: {
    logCategory?: string
    details?: Record<string, unknown>
  }
): Promise<T> {
  const { logCategory = LogCategory.API, details } = options || {}
  const startTime = performance.now()

  logger.debug(logCategory, `${operationName} - started`, details)

  try {
    const result = await fn()
    const durationMs = performance.now() - startTime

    logger.info(logCategory, `✓ ${operationName} - success`, {
      durationMs: Math.round(durationMs * 100) / 100,
      ...details
    })

    return result
  } catch (error) {
    const durationMs = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(logCategory, `✗ ${operationName} - failed`, {
      durationMs: Math.round(durationMs * 100) / 100,
      error: errorMessage,
      ...details
    })

    throw error
  }
}

/**
 * Wrap a streaming SDK call with logging
 *
 * Usage:
 *   const stream = await wrapSdkStreamCall(
 *     'claude.messages.stream',
 *     () => client.messages.stream({ model: '...', messages: [...] }),
 *     { logCategory: LogCategory.API }
 *   )
 */
export async function wrapSdkStreamCall<T>(
  operationName: string,
  fn: () => T,
  options?: {
    logCategory?: string
    details?: Record<string, unknown>
  }
): Promise<T> {
  const { logCategory = LogCategory.API, details } = options || {}
  const startTime = performance.now()

  logger.debug(logCategory, `${operationName} - stream started`, details)

  try {
    const result = fn()
    const durationMs = performance.now() - startTime

    logger.info(logCategory, `✓ ${operationName} - stream initiated`, {
      durationMs: Math.round(durationMs * 100) / 100,
      ...details
    })

    return result
  } catch (error) {
    const durationMs = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error(logCategory, `✗ ${operationName} - stream failed`, {
      durationMs: Math.round(durationMs * 100) / 100,
      error: errorMessage,
      ...details
    })

    throw error
  }
}
