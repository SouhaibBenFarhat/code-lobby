import { describe, expect, it } from 'vitest'
import {
  calculateTotals,
  filterRequests,
  formatDuration,
  formatJsonBody,
  getMethodColor
} from './index'

describe('formatDuration', () => {
  it('should format milliseconds less than 1000 as ms', () => {
    expect(formatDuration(150)).toBe('150ms')
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('should format milliseconds 1000+ as seconds with one decimal', () => {
    expect(formatDuration(1000)).toBe('1.0s')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(2345)).toBe('2.3s')
    expect(formatDuration(10000)).toBe('10.0s')
  })

  it('should round milliseconds to nearest integer', () => {
    expect(formatDuration(150.4)).toBe('150ms')
    expect(formatDuration(150.6)).toBe('151ms')
  })
})

describe('formatJsonBody', () => {
  it('should format valid JSON with 2-space indentation', () => {
    const input = '{"name":"test","value":123}'
    const expected = '{\n  "name": "test",\n  "value": 123\n}'
    expect(formatJsonBody(input)).toBe(expected)
  })

  it('should format nested JSON correctly', () => {
    const input = '{"user":{"name":"test"}}'
    const result = formatJsonBody(input)
    expect(result).toContain('"user":')
    expect(result).toContain('"name": "test"')
  })

  it('should format arrays correctly', () => {
    const input = '[1,2,3]'
    const expected = '[\n  1,\n  2,\n  3\n]'
    expect(formatJsonBody(input)).toBe(expected)
  })

  it('should return original string for invalid JSON', () => {
    const input = 'not valid json'
    expect(formatJsonBody(input)).toBe(input)
  })

  it('should return original string for empty string', () => {
    expect(formatJsonBody('')).toBe('')
  })

  it('should handle already formatted JSON', () => {
    const input = '{\n  "name": "test"\n}'
    const result = formatJsonBody(input)
    expect(result).toContain('"name": "test"')
  })

  describe('GraphQL query formatting', () => {
    it('should format GraphQL query field with proper indentation', () => {
      const input = JSON.stringify({
        query: 'query GetUser { user { name } }',
        variables: { id: '123' }
      })
      const result = formatJsonBody(input)
      // Should contain the query in backticks format
      expect(result).toContain('"query": `')
      expect(result).toContain('query GetUser')
      expect(result).toContain('"variables":')
    })

    it('should preserve multi-line GraphQL query formatting', () => {
      const input = JSON.stringify({
        query: `query GetUser {
  user {
    name
    email
  }
}`,
        variables: {}
      })
      const result = formatJsonBody(input)
      // Should contain the properly indented query
      expect(result).toContain('query GetUser')
      expect(result).toContain('user {')
      expect(result).toContain('name')
    })

    it('should handle GraphQL query with escaped newlines', () => {
      const input = '{"query":"query {\\n  viewer {\\n    login\\n  }\\n}","variables":{}}'
      const result = formatJsonBody(input)
      expect(result).toContain('query {')
      expect(result).toContain('viewer {')
      expect(result).toContain('login')
    })

    it('should format variables object correctly', () => {
      const input = JSON.stringify({
        query: 'query { test }',
        variables: { searchQuery: 'test', cursor: null }
      })
      const result = formatJsonBody(input)
      expect(result).toContain('"variables":')
      expect(result).toContain('"searchQuery": "test"')
      expect(result).toContain('"cursor": null')
    })

    it('should handle GraphQL query without variables', () => {
      const input = JSON.stringify({
        query: 'query { viewer { login } }'
      })
      const result = formatJsonBody(input)
      expect(result).toContain('"query": `')
      expect(result).toContain('viewer')
      // Should not throw and should not include undefined variables
    })
  })
})

describe('getMethodColor', () => {
  it('should return green classes for GET', () => {
    const result = getMethodColor('GET')
    expect(result).toContain('green')
    expect(result).toContain('bg-')
    expect(result).toContain('text-')
    expect(result).toContain('border-')
  })

  it('should return blue classes for POST', () => {
    const result = getMethodColor('POST')
    expect(result).toContain('blue')
  })

  it('should return yellow classes for PUT', () => {
    const result = getMethodColor('PUT')
    expect(result).toContain('yellow')
  })

  it('should return red classes for DELETE', () => {
    const result = getMethodColor('DELETE')
    expect(result).toContain('red')
  })

  it('should return purple classes for PATCH', () => {
    const result = getMethodColor('PATCH')
    expect(result).toContain('purple')
  })

  it('should be case insensitive', () => {
    expect(getMethodColor('get')).toBe(getMethodColor('GET'))
    expect(getMethodColor('Post')).toBe(getMethodColor('POST'))
  })

  it('should return muted classes for unknown methods', () => {
    const result = getMethodColor('UNKNOWN')
    expect(result).toContain('muted')
  })

  it('should return muted classes for undefined', () => {
    const result = getMethodColor(undefined)
    expect(result).toContain('muted')
  })
})

describe('filterRequests', () => {
  const mockRequests = [
    { url: 'https://api.github.com/graphql', method: 'fetchPRs', httpMethod: 'POST' },
    { url: 'https://api.github.com/repos/owner/repo', method: 'getRepo', httpMethod: 'GET' },
    { url: 'https://api.example.com/users', method: 'listUsers', httpMethod: 'GET' }
  ]

  it('should return all requests when query is empty', () => {
    expect(filterRequests(mockRequests, '')).toEqual(mockRequests)
    expect(filterRequests(mockRequests, '  ')).toEqual(mockRequests)
  })

  it('should filter by URL', () => {
    const result = filterRequests(mockRequests, 'github')
    expect(result).toHaveLength(2)
    expect(result[0].url).toContain('github')
  })

  it('should filter by method name', () => {
    const result = filterRequests(mockRequests, 'fetch')
    expect(result).toHaveLength(1)
    expect(result[0].method).toBe('fetchPRs')
  })

  it('should filter by HTTP method', () => {
    const result = filterRequests(mockRequests, 'GET')
    expect(result).toHaveLength(2)
  })

  it('should be case insensitive', () => {
    expect(filterRequests(mockRequests, 'GITHUB')).toHaveLength(2)
    expect(filterRequests(mockRequests, 'GitHub')).toHaveLength(2)
  })

  it('should return empty array when no matches', () => {
    const result = filterRequests(mockRequests, 'nonexistent')
    expect(result).toHaveLength(0)
  })

  it('should handle requests with missing properties', () => {
    const partialRequests = [{ url: 'https://api.test.com' }, { method: 'testMethod' }, {}]
    const result = filterRequests(partialRequests, 'test')
    expect(result).toHaveLength(2)
  })
})

describe('calculateTotals', () => {
  it('should calculate totals correctly', () => {
    const requests = [
      { cost: 10, status: 'success' },
      { cost: 5, status: 'success' },
      { cost: 3, status: 'error' },
      { status: 'pending' }
    ]
    const result = calculateTotals(requests)
    expect(result.totalCost).toBe(18)
    expect(result.successCount).toBe(2)
    expect(result.errorCount).toBe(1)
    expect(result.pendingCount).toBe(1)
    expect(result.total).toBe(4)
  })

  it('should handle empty array', () => {
    const result = calculateTotals([])
    expect(result.totalCost).toBe(0)
    expect(result.successCount).toBe(0)
    expect(result.errorCount).toBe(0)
    expect(result.pendingCount).toBe(0)
    expect(result.total).toBe(0)
  })

  it('should handle requests without cost', () => {
    const requests = [{ status: 'success' }, { status: 'success', cost: undefined }]
    const result = calculateTotals(requests)
    expect(result.totalCost).toBe(0)
    expect(result.successCount).toBe(2)
  })

  it('should count only matching statuses', () => {
    const requests = [
      { status: 'success' },
      { status: 'success' },
      { status: 'error' },
      { status: 'pending' },
      { status: 'unknown' } // Should not count as any specific status
    ]
    const result = calculateTotals(requests)
    expect(result.successCount).toBe(2)
    expect(result.errorCount).toBe(1)
    expect(result.pendingCount).toBe(1)
    expect(result.total).toBe(5)
  })
})
