/**
 * HTTP Client - Abstract fetch wrapper
 *
 * A pure, generic HTTP client with no API-specific logic.
 * API-specific code (headers, auth) belongs in respective modules.
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
// HTTP CLIENT
// ═══════════════════════════════════════════════════════════════════════════

export async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', headers = {}, body, timeout = DEFAULT_TIMEOUT } = config

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    })

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

    return JSON.parse(text) as T
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
