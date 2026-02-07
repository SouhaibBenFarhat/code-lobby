/**
 * HTTP Client - Abstract fetch wrapper
 *
 * A pure, generic HTTP client with no API-specific logic.
 * API-specific code (headers, auth) belongs in respective modules.
 *
 * Features:
 * - ETag support for GET requests: Automatically sends If-None-Match headers
 *   and returns cached data on 304 Not Modified responses. This saves GitHub
 *   API rate limit points when data hasn't changed.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HttpError extends Error {
  status: number
  statusText: string
  body?: string
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: unknown
  timeout?: number // milliseconds
}

// Default timeout: 30 seconds
const DEFAULT_TIMEOUT = 30_000

// ═══════════════════════════════════════════════════════════════════════════
// ETAG CACHE — lightweight store for conditional requests
// Only stores ETag strings (~20 bytes each) and the last response data.
// On 304 Not Modified, returns the cached response without consuming
// a GitHub API rate limit point.
// ═══════════════════════════════════════════════════════════════════════════

interface ETagEntry {
  etag: string
  data: unknown
}

const etagCache = new Map<string, ETagEntry>()

/** Get ETag cache stats (for debugging/monitoring) */
export function getETagCacheStats(): { size: number; urls: string[] } {
  return { size: etagCache.size, urls: [...etagCache.keys()] }
}

/** Clear ETag cache (e.g. on sign-out) */
export function clearETagCache(): void {
  etagCache.clear()
}

// ═══════════════════════════════════════════════════════════════════════════
// HTTP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

export async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT } = config

  const isGet = method === 'GET'

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  // For GET requests, attach saved ETag if we have one
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers
  }

  if (isGet) {
    const cached = etagCache.get(url)
    if (cached) {
      requestHeaders['If-None-Match'] = cached.etag
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

    // Handle 304 Not Modified — return cached data, no rate limit cost
    if (response.status === 304 && isGet) {
      const cached = etagCache.get(url)
      if (cached) {
        return cached.data as T
      }
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => undefined)
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as HttpError
      error.status = response.status
      error.statusText = response.statusText
      error.body = errorBody
      throw error
    }

    // Handle empty responses
    const text = await response.text()
    if (!text) return undefined as T

    const data = JSON.parse(text) as T

    // Save ETag for GET requests
    if (isGet) {
      const etag = response.headers?.get?.('etag')
      if (etag) {
        etagCache.set(url, { etag, data })
      }
    }

    return data
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`) as HttpError
      timeoutError.status = 408
      timeoutError.statusText = 'Request Timeout'
      throw timeoutError
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// Convenience methods
export const http: {
  request: typeof request
  get<T>(url: string, headers?: Record<string, string>): Promise<T>
  post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T>
  put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T>
  patch<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T>
  delete<T>(url: string, headers?: Record<string, string>): Promise<T>
} = {
  request,

  get<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, { method: 'GET', headers })
  },

  post<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, { method: 'POST', body, headers })
  },

  put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, { method: 'PUT', body, headers })
  },

  patch<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, { method: 'PATCH', body, headers })
  },

  delete<T>(url: string, headers?: Record<string, string>): Promise<T> {
    return request<T>(url, { method: 'DELETE', headers })
  }
}
