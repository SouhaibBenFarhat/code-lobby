/**
 * Network Tracking Hook
 *
 * Intercepts global fetch() to track ALL HTTP requests with full
 * request/response bodies, timing, and status codes.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { keys } from '../keys'
import type { NetworkRequest } from '../types'

// Store original fetch to restore later
let originalFetch: typeof fetch | null = null
let isIntercepted = false

/**
 * Hook that intercepts global fetch() to track network requests.
 * Should be mounted once - the network module handles this.
 */
export function useNetworkTracking(): void {
  const qc = useQueryClient()
  const requestIdRef = useRef(0)

  useEffect(() => {
    // Prevent double interception
    if (isIntercepted) return

    // Save original fetch
    originalFetch = window.fetch
    isIntercepted = true

    // Override global fetch
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = init?.method || 'GET'
      const startTime = Date.now()
      const requestId = `fetch-${++requestIdRef.current}-${startTime}`

      // Get request body
      let requestBody: string | undefined
      if (init?.body) {
        if (typeof init.body === 'string') {
          requestBody = init.body
        } else if (init.body instanceof FormData) {
          requestBody = '[FormData]'
        } else if (init.body instanceof ArrayBuffer) {
          requestBody = '[ArrayBuffer]'
        } else {
          requestBody = String(init.body)
        }
      }

      // Add pending request
      const request: NetworkRequest = {
        id: requestId,
        method: getMethodName(url, method),
        httpMethod: method,
        url,
        status: 'pending',
        startTime,
        requestBody
      }
      addNetworkRequest(qc, request)

      try {
        // Make actual request
        if (!originalFetch) throw new Error('Fetch not intercepted')
        const response = await originalFetch(input, init)
        const endTime = Date.now()
        const durationMs = endTime - startTime

        // Clone response to read body without consuming it
        const clone = response.clone()
        let responseBody: string | undefined
        let responseSize: number | undefined

        try {
          responseBody = await clone.text()
          responseSize = responseBody.length
        } catch {
          responseBody = '[Unable to read response]'
        }

        // Update with success/error based on HTTP status
        const isSuccess = response.ok
        updateNetworkRequest(qc, requestId, {
          status: isSuccess ? 'success' : 'error',
          statusCode: response.status,
          endTime,
          durationMs,
          responseBody,
          responseSize,
          error: isSuccess ? undefined : `HTTP ${response.status} ${response.statusText}`
        })

        return response
      } catch (error) {
        const endTime = Date.now()
        const durationMs = endTime - startTime

        // Update with network error
        updateNetworkRequest(qc, requestId, {
          status: 'error',
          endTime,
          durationMs,
          error: error instanceof Error ? error.message : String(error)
        })

        throw error
      }
    }

    // Cleanup: restore original fetch
    return () => {
      if (originalFetch) {
        window.fetch = originalFetch
        isIntercepted = false
      }
    }
  }, [qc])
}

/**
 * Extract a human-readable method name from URL
 */
function getMethodName(url: string, httpMethod: string): string {
  // GitHub GraphQL
  if (url.includes('api.github.com/graphql')) {
    return 'GitHub GraphQL'
  }

  // GitHub REST API
  if (url.includes('api.github.com')) {
    if (url.includes('/user')) return 'fetchUser'
    if (url.includes('/repos')) return 'fetchRepos'
    if (url.includes('/pulls')) return 'fetchPRs'
    if (url.includes('/rate_limit')) return 'fetchRateLimit'
    return `GitHub ${httpMethod}`
  }

  // Claude API
  if (url.includes('anthropic.com') || url.includes('claude')) {
    return 'Claude AI'
  }

  // Generic
  return `${httpMethod} ${new URL(url).pathname}`
}

/**
 * Add a network request to the cache
 */
function addNetworkRequest(qc: ReturnType<typeof useQueryClient>, request: NetworkRequest): void {
  const current = qc.getQueryData<NetworkRequest[]>(keys.networkRequests) ?? []
  qc.setQueryData(keys.networkRequests, [...current, request])
}

/**
 * Update an existing network request in the cache
 */
function updateNetworkRequest(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  updates: Partial<NetworkRequest>
): void {
  const current = qc.getQueryData<NetworkRequest[]>(keys.networkRequests) ?? []
  const updated = current.map((req) => (req.id === id ? { ...req, ...updates } : req))
  qc.setQueryData(keys.networkRequests, updated)
}
