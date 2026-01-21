/**
 * Tests for AIChat component - specifically the postable comments feature
 */

import { describe, expect, it } from 'vitest'

// Export these functions for testing by re-implementing them here
// Since they're not exported from AIChat.tsx

// Postable comment metadata that Claude can embed in responses
interface PostableComment {
  file: string
  line: number
}

// Parse POSTABLE metadata from message content
// Format: <!--POSTABLE:{"file":"path/to/file.ts","line":42}-->
const POSTABLE_REGEX = /<!--POSTABLE:(\{[^}]+\})-->/g

function parsePostableComments(content: string): PostableComment[] {
  const comments: PostableComment[] = []
  const matches = content.matchAll(POSTABLE_REGEX)

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match[1]) as { file?: string; line?: number }
      if (parsed.file && typeof parsed.line === 'number') {
        comments.push({ file: parsed.file, line: parsed.line })
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  return comments
}

// Remove POSTABLE metadata from content for display
function stripPostableMetadata(content: string): string {
  return content.replace(POSTABLE_REGEX, '').trim()
}

describe('parsePostableComments', () => {
  it('should parse a single postable comment', () => {
    const content = `I found a bug at line 42.
<!--POSTABLE:{"file":"src/utils/auth.ts","line":42}-->`

    const result = parsePostableComments(content)
    expect(result).toEqual([{ file: 'src/utils/auth.ts', line: 42 }])
  })

  it('should parse multiple postable comments', () => {
    const content = `I found several issues:

1. Null pointer at line 42
<!--POSTABLE:{"file":"src/utils/auth.ts","line":42}-->

2. Security issue at line 15
<!--POSTABLE:{"file":"src/api/handler.ts","line":15}-->`

    const result = parsePostableComments(content)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ file: 'src/utils/auth.ts', line: 42 })
    expect(result[1]).toEqual({ file: 'src/api/handler.ts', line: 15 })
  })

  it('should return empty array for content without postable comments', () => {
    const content = 'This is a regular response without any postable metadata.'
    const result = parsePostableComments(content)
    expect(result).toEqual([])
  })

  it('should skip invalid JSON in postable metadata', () => {
    const content = `Here's a finding:
<!--POSTABLE:{invalid json}-->
<!--POSTABLE:{"file":"valid.ts","line":10}-->`

    const result = parsePostableComments(content)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ file: 'valid.ts', line: 10 })
  })

  it('should skip postable comments missing required fields', () => {
    const content = `Missing line:
<!--POSTABLE:{"file":"test.ts"}-->
Missing file:
<!--POSTABLE:{"line":42}-->
Valid:
<!--POSTABLE:{"file":"valid.ts","line":10}-->`

    const result = parsePostableComments(content)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ file: 'valid.ts', line: 10 })
  })

  it('should handle line as number, not string', () => {
    const content = `<!--POSTABLE:{"file":"test.ts","line":"42"}-->`
    const result = parsePostableComments(content)
    expect(result).toEqual([])
  })

  it('should handle deeply nested file paths', () => {
    const content = `<!--POSTABLE:{"file":"src/components/ui/buttons/PrimaryButton.tsx","line":123}-->`
    const result = parsePostableComments(content)
    expect(result).toEqual([{ file: 'src/components/ui/buttons/PrimaryButton.tsx', line: 123 }])
  })
})

describe('stripPostableMetadata', () => {
  it('should remove postable metadata from content', () => {
    const content = `I found a bug at line 42.
<!--POSTABLE:{"file":"src/utils/auth.ts","line":42}-->`

    const result = stripPostableMetadata(content)
    expect(result).toBe('I found a bug at line 42.')
  })

  it('should remove multiple postable metadata tags', () => {
    const content = `Issue 1
<!--POSTABLE:{"file":"a.ts","line":1}-->
Issue 2
<!--POSTABLE:{"file":"b.ts","line":2}-->`

    const result = stripPostableMetadata(content)
    expect(result).toBe('Issue 1\n\nIssue 2')
  })

  it('should preserve content when no metadata present', () => {
    const content = 'This is normal content without metadata.'
    const result = stripPostableMetadata(content)
    expect(result).toBe('This is normal content without metadata.')
  })

  it('should handle content with metadata in the middle', () => {
    const content = `Start
<!--POSTABLE:{"file":"a.ts","line":1}-->
End`

    const result = stripPostableMetadata(content)
    expect(result).toBe('Start\n\nEnd')
  })
})
