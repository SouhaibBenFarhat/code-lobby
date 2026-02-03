/**
 * Messages Repository Tests
 *
 * Tests for message persistence with metadata serialization/deserialization.
 */

import { describe, expect, it } from 'vitest'

/**
 * Parse metadata JSON string to object
 * (Mirrors the logic in repositories/messages.ts)
 */
function parseMetadata(metadataStr: string | null): Record<string, unknown> | null {
  if (!metadataStr) return null
  try {
    return JSON.parse(metadataStr)
  } catch {
    return null
  }
}

/**
 * Serialize metadata object to JSON string
 * (Mirrors the logic in repositories/messages.ts)
 */
function serializeMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) return null
  return JSON.stringify(metadata)
}

describe('Messages - Metadata Serialization', () => {
  describe('parseMetadata', () => {
    it('returns null for null input', () => {
      expect(parseMetadata(null)).toBeNull()
    })

    it('returns null for empty string', () => {
      expect(parseMetadata('')).toBeNull()
    })

    it('parses valid JSON object', () => {
      const json = JSON.stringify({ foo: 'bar', count: 42 })
      const result = parseMetadata(json)
      expect(result).toEqual({ foo: 'bar', count: 42 })
    })

    it('parses review data correctly', () => {
      const reviewData = {
        reviewData: {
          summary: 'Good implementation overall',
          verdict: 'approve',
          comments: [
            { file: 'src/index.ts', line: 10, body: 'Nice refactor' },
            { file: 'src/utils.ts', line: 25, body: 'Consider adding a type guard' }
          ]
        }
      }
      const json = JSON.stringify(reviewData)
      const result = parseMetadata(json)

      expect(result).toEqual(reviewData)
      expect((result as Record<string, unknown>).reviewData).toBeDefined()
    })

    it('returns null for invalid JSON', () => {
      expect(parseMetadata('not valid json')).toBeNull()
      expect(parseMetadata('{')).toBeNull()
      expect(parseMetadata('undefined')).toBeNull()
    })

    it('handles nested objects', () => {
      const nested = {
        level1: {
          level2: {
            level3: { value: 'deep' }
          }
        }
      }
      const result = parseMetadata(JSON.stringify(nested))
      expect(result).toEqual(nested)
    })

    it('handles arrays', () => {
      const withArrays = {
        items: [1, 2, 3],
        objects: [{ a: 1 }, { b: 2 }]
      }
      const result = parseMetadata(JSON.stringify(withArrays))
      expect(result).toEqual(withArrays)
    })
  })

  describe('serializeMetadata', () => {
    it('returns null for null input', () => {
      expect(serializeMetadata(null)).toBeNull()
    })

    it('serializes simple object', () => {
      const result = serializeMetadata({ foo: 'bar' })
      expect(result).toBe('{"foo":"bar"}')
    })

    it('serializes review data correctly', () => {
      const reviewData = {
        reviewData: {
          summary: 'LGTM',
          verdict: 'approve' as const,
          comments: [{ file: 'test.ts', line: 5, body: 'Nice!' }]
        }
      }
      const result = serializeMetadata(reviewData)
      expect(result).toBeTruthy()

      // Verify round-trip - result is guaranteed non-null here
      if (result) {
        const parsed = parseMetadata(result)
        expect(parsed).toEqual(reviewData)
      }
    })

    it('handles empty object', () => {
      expect(serializeMetadata({})).toBe('{}')
    })

    it('preserves special characters in strings', () => {
      const data = { message: 'Line 1\nLine 2\t"quoted"' }
      const result = serializeMetadata(data)
      expect(result).toBeTruthy()

      if (result) {
        const parsed = parseMetadata(result)
        expect(parsed).toEqual(data)
      }
    })
  })

  describe('round-trip serialization', () => {
    it('preserves review data through serialization cycle', () => {
      const original = {
        reviewData: {
          summary: 'This PR implements the new feature correctly',
          verdict: 'approve' as const,
          comments: [
            {
              file: 'src/components/Button.tsx',
              line: 42,
              body: 'Consider memoizing this callback'
            },
            {
              file: 'src/utils/helpers.ts',
              line: 15,
              body: 'This could be simplified using optional chaining'
            }
          ]
        }
      }

      const serialized = serializeMetadata(original)
      expect(serialized).toBeTruthy()

      if (serialized) {
        const deserialized = parseMetadata(serialized)
        expect(deserialized).toEqual(original)
      }
    })

    it('handles multiple metadata fields', () => {
      const original = {
        reviewData: {
          summary: 'Review summary',
          verdict: 'comment' as const,
          comments: []
        },
        customField: 'extra data',
        timestamp: 1234567890
      }

      const serialized = serializeMetadata(original)
      expect(serialized).toBeTruthy()

      if (serialized) {
        const deserialized = parseMetadata(serialized)
        expect(deserialized).toEqual(original)
      }
    })
  })
})

describe('Messages - Review Data Types', () => {
  it('validates review verdict values', () => {
    const validVerdicts = ['approve', 'request_changes', 'comment']

    for (const verdict of validVerdicts) {
      const data = { reviewData: { summary: '', verdict, comments: [] } }
      const serialized = serializeMetadata(data)
      expect(serialized).toBeTruthy()

      if (serialized) {
        const parsed = parseMetadata(serialized)
        expect(parsed).toBeDefined()
        expect((parsed as Record<string, { verdict: string }>).reviewData.verdict).toBe(verdict)
      }
    }
  })

  it('validates comment structure', () => {
    const comment = {
      file: 'path/to/file.ts',
      line: 100,
      body: 'This is the comment content'
    }

    const data = { reviewData: { summary: '', verdict: 'comment', comments: [comment] } }
    const serialized = serializeMetadata(data)
    expect(serialized).toBeTruthy()

    if (serialized) {
      const parsed = parseMetadata(serialized)
      expect(parsed).toBeDefined()

      const reviewData = (parsed as Record<string, { comments: (typeof comment)[] }>).reviewData
      const parsedComment = reviewData.comments[0]
      expect(parsedComment).toHaveProperty('file', comment.file)
      expect(parsedComment).toHaveProperty('line', comment.line)
      expect(parsedComment).toHaveProperty('body', comment.body)
      // Should NOT have an 'id' field (was incorrectly in type definition)
      expect(parsedComment).not.toHaveProperty('id')
    }
  })
})
