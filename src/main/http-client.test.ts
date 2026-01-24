/**
 * HTTP Client Tests
 *
 * These tests ensure that request and response bodies are passed through
 * RAW (unmodified) to the network tracking callback.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Import after mocking
import { http, type NetworkRequestEvent, onNetworkRequest } from './http-client'

describe('HTTP Client', () => {
  let networkEvents: NetworkRequestEvent[] = []

  beforeEach(() => {
    networkEvents = []
    onNetworkRequest((event) => {
      networkEvents.push(event)
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    onNetworkRequest(null)
  })

  describe('Network Request Tracking - RAW Bodies', () => {
    it('should pass through RAW request body without any modification', async () => {
      // The exact JSON string we're sending
      const rawRequestBody = '{"query":"query Test { viewer { login } }","variables":{"foo":"bar"}}'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/json'
        }),
        text: async () => '{"data":{"viewer":{"login":"test"}}}'
      })

      await http.post('https://api.github.com/graphql', {
        body: rawRequestBody
      })

      // Find the success event
      const successEvent = networkEvents.find((e) => e.status === 'success')
      expect(successEvent).toBeDefined()

      // The requestBody should be EXACTLY the same as what we sent - no modification
      expect(successEvent?.requestBody).toBe(rawRequestBody)

      // Verify it wasn't pretty-printed or reformatted
      expect(successEvent?.requestBody).not.toContain('\n')
      expect(successEvent?.requestBody).not.toContain('  ') // No indentation
    })

    it('should pass through RAW response body without any modification', async () => {
      // The exact JSON string GitHub returns (minified, no formatting)
      const rawResponseBody =
        '{"data":{"rateLimit":{"limit":5000,"remaining":4999,"used":1,"resetAt":"2026-01-23T23:00:00Z","cost":1},"viewer":{"login":"testuser"}}}'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/json'
        }),
        text: async () => rawResponseBody
      })

      await http.post('https://api.github.com/graphql', {
        body: '{"query":"test"}'
      })

      // Find the success event
      const successEvent = networkEvents.find((e) => e.status === 'success')
      expect(successEvent).toBeDefined()

      // The responseBody should be EXACTLY the same as what the server returned
      expect(successEvent?.responseBody).toBe(rawResponseBody)

      // Verify it wasn't pretty-printed or reformatted
      expect(successEvent?.responseBody).not.toContain('\n')
      expect(successEvent?.responseBody).not.toContain('  ') // No indentation
    })

    it('should preserve cost field in raw response exactly as returned by GitHub', async () => {
      // GitHub returns cost as an integer in the rateLimit object
      const rawResponseWithCost =
        '{"data":{"rateLimit":{"limit":5000,"remaining":4998,"used":2,"resetAt":"2026-01-23T23:00:00Z","cost":42},"viewer":{"login":"test"}}}'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'application/json'
        }),
        text: async () => rawResponseWithCost
      })

      await http.post('https://api.github.com/graphql', {
        body: '{"query":"test"}'
      })

      const successEvent = networkEvents.find((e) => e.status === 'success')
      expect(successEvent).toBeDefined()

      // The raw response should contain the exact cost value
      expect(successEvent?.responseBody).toBe(rawResponseWithCost)
      expect(successEvent?.responseBody).toContain('"cost":42')
    })

    it('should NOT modify, add, or remove any fields from request body', async () => {
      const originalRequest = '{"query":"query { viewer }","variables":{"a":1,"b":"test"}}'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{}'
      })

      await http.post('https://api.github.com/graphql', {
        body: originalRequest
      })

      const successEvent = networkEvents.find((e) => e.status === 'success')

      // Parse both to compare structure
      const originalParsed = JSON.parse(originalRequest)
      const trackedParsed = JSON.parse(successEvent?.requestBody || '{}')

      // Should have exact same keys
      expect(Object.keys(trackedParsed)).toEqual(Object.keys(originalParsed))
      expect(trackedParsed.query).toBe(originalParsed.query)
      expect(trackedParsed.variables).toEqual(originalParsed.variables)
    })

    it('should NOT modify, add, or remove any fields from response body', async () => {
      const originalResponse =
        '{"data":{"rateLimit":{"limit":5000,"remaining":4999,"used":1,"resetAt":"2026-01-23T23:00:00Z","cost":1},"search":{"nodes":[]}}}'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => originalResponse
      })

      await http.post('https://api.github.com/graphql', {
        body: '{"query":"test"}'
      })

      const successEvent = networkEvents.find((e) => e.status === 'success')

      // Parse both to compare structure
      const originalParsed = JSON.parse(originalResponse)
      const trackedParsed = JSON.parse(successEvent?.responseBody || '{}')

      // Should have exact same structure
      expect(trackedParsed).toEqual(originalParsed)

      // Specifically verify rateLimit fields are preserved
      expect(trackedParsed.data.rateLimit.cost).toBe(1)
      expect(trackedParsed.data.rateLimit.limit).toBe(5000)
      expect(trackedParsed.data.rateLimit.remaining).toBe(4999)
    })

    it('should handle non-JSON request body as raw string', async () => {
      const rawTextBody = 'This is plain text, not JSON'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'OK'
      })

      await http.post('https://api.github.com/test', {
        body: rawTextBody
      })

      const successEvent = networkEvents.find((e) => e.status === 'success')
      expect(successEvent?.requestBody).toBe(rawTextBody)
    })

    it('should handle non-JSON response body as raw string', async () => {
      const rawTextResponse = 'Plain text response from server'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => rawTextResponse
      })

      await http.get('https://api.github.com/test')

      const successEvent = networkEvents.find((e) => e.status === 'success')
      expect(successEvent?.responseBody).toBe(rawTextResponse)
    })

    it('should include both requestBody and responseBody in success event', async () => {
      const requestBody = '{"query":"test query"}'
      const responseBody = '{"data":{"result":"success"}}'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => responseBody
      })

      await http.post('https://api.github.com/graphql', {
        body: requestBody
      })

      const successEvent = networkEvents.find((e) => e.status === 'success')
      expect(successEvent).toBeDefined()
      expect(successEvent?.requestBody).toBe(requestBody)
      expect(successEvent?.responseBody).toBe(responseBody)
    })

    it('should only track GitHub API calls (not other URLs)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{}'
      })

      await http.get('https://example.com/api')

      // Should not have any network events for non-GitHub URLs
      expect(networkEvents.length).toBe(0)
    })

    it('should track GitHub API calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '{}'
      })

      await http.get('https://api.github.com/user')

      // Should have network events for GitHub URLs
      expect(networkEvents.length).toBeGreaterThan(0)
    })
  })
})
