import {
  containsReviewJson,
  extractReviewJson,
  formatVerdict,
  getDisplayContentWithoutReview,
  getVerdictColor,
  parseReviewFromMessage,
  rawToReviewData
} from './review-parser'

describe('review-parser', () => {
  describe('containsReviewJson', () => {
    it('should return false for empty content', () => {
      expect(containsReviewJson('')).toBe(false)
    })

    it('should return false for content without review JSON', () => {
      expect(containsReviewJson('Hello, this is just text')).toBe(false)
    })

    it('should return true for ```json:review format', () => {
      const content = `Some text
\`\`\`json:review
{"summary":"Good code","comments":[],"verdict":"approve"}
\`\`\`
More text`
      expect(containsReviewJson(content)).toBe(true)
    })

    it('should return true for ```json format with review fields', () => {
      const content = `\`\`\`json
{"summary":"Test","comments":[],"verdict":"comment"}
\`\`\``
      expect(containsReviewJson(content)).toBe(true)
    })

    it('should return false for incomplete JSON (streaming)', () => {
      const content = `\`\`\`json:review
{"summary":"Test","comments":[{"file":"test.ts","line":1`
      expect(containsReviewJson(content)).toBe(false)
    })

    it('should return true for raw JSON object with review fields', () => {
      const content = `Here is the review: {"summary":"LGTM","comments":[],"verdict":"approve"}`
      expect(containsReviewJson(content)).toBe(true)
    })

    it('should return false for JSON without review fields', () => {
      const content = `\`\`\`json
{"name":"test","value":123}
\`\`\``
      expect(containsReviewJson(content)).toBe(false)
    })

    it('should return true for raw JSON even in incomplete code block', () => {
      // The function also detects raw JSON objects, so incomplete code block with valid JSON still matches
      const content = `\`\`\`json
{"summary":"Test","comments":[],"verdict":"approve"}`
      expect(containsReviewJson(content)).toBe(true)
    })
  })

  describe('extractReviewJson', () => {
    it('should return null for empty content', () => {
      expect(extractReviewJson('')).toBeNull()
    })

    it('should return null for content without review', () => {
      expect(extractReviewJson('Just some text')).toBeNull()
    })

    it('should extract from ```json:review format', () => {
      const content = `\`\`\`json:review
{"summary":"Great work","comments":[{"file":"test.ts","line":10,"body":"Nice!"}],"verdict":"approve"}
\`\`\``
      const result = extractReviewJson(content)
      expect(result).not.toBeNull()
      expect(result?.summary).toBe('Great work')
      expect(result?.verdict).toBe('approve')
      expect(result?.comments).toHaveLength(1)
      expect(result?.comments[0].file).toBe('test.ts')
    })

    it('should extract from ```json format', () => {
      const content = `\`\`\`json
{"summary":"Needs work","comments":[],"verdict":"request_changes"}
\`\`\``
      const result = extractReviewJson(content)
      expect(result).not.toBeNull()
      expect(result?.summary).toBe('Needs work')
      expect(result?.verdict).toBe('request_changes')
    })

    it('should extract from raw JSON', () => {
      const content = `The review is: {"summary":"OK","comments":[],"verdict":"comment"} - done`
      const result = extractReviewJson(content)
      expect(result).not.toBeNull()
      expect(result?.summary).toBe('OK')
      expect(result?.verdict).toBe('comment')
    })

    it('should return null for incomplete JSON', () => {
      const content = `{"summary":"Test","comments":[{"file":"a.ts"`
      expect(extractReviewJson(content)).toBeNull()
    })

    it('should validate comment structure', () => {
      const content = `{"summary":"Test","comments":[{"file":"a.ts","line":5,"body":"Fix this"}],"verdict":"approve"}`
      const result = extractReviewJson(content)
      expect(result?.comments).toHaveLength(1)
      expect(result?.comments[0]).toEqual({
        file: 'a.ts',
        line: 5,
        body: 'Fix this'
      })
    })

    it('should filter invalid comments', () => {
      const content = `{"summary":"Test","comments":[{"invalid":"data"},{"file":"a.ts","line":5,"body":"Valid"}],"verdict":"approve"}`
      const result = extractReviewJson(content)
      expect(result?.comments).toHaveLength(1)
      expect(result?.comments[0].file).toBe('a.ts')
    })

    it('should return null for invalid verdict', () => {
      const content = `{"summary":"Test","comments":[],"verdict":"invalid"}`
      expect(extractReviewJson(content)).toBeNull()
    })

    it('should return null for missing summary', () => {
      const content = `{"comments":[],"verdict":"approve"}`
      expect(extractReviewJson(content)).toBeNull()
    })

    it('should return null for non-array comments', () => {
      const content = `{"summary":"Test","comments":"invalid","verdict":"approve"}`
      expect(extractReviewJson(content)).toBeNull()
    })
  })

  describe('rawToReviewData', () => {
    it('should convert raw data to ReviewData with IDs', () => {
      const raw = {
        summary: 'Test summary',
        verdict: 'approve' as const,
        comments: [
          { file: 'test.ts', line: 10, body: 'Comment 1' },
          { file: 'other.ts', line: 20, body: 'Comment 2' }
        ]
      }

      const result = rawToReviewData(raw)

      expect(result.summary).toBe('Test summary')
      expect(result.verdict).toBe('approve')
      expect(result.comments).toHaveLength(2)
      expect(result.comments[0].id).toMatch(/^review-comment-0-/)
      expect(result.comments[1].id).toMatch(/^review-comment-1-/)
      expect(result.comments[0].file).toBe('test.ts')
    })

    it('should handle empty comments array', () => {
      const raw = {
        summary: 'All good',
        verdict: 'approve' as const,
        comments: []
      }

      const result = rawToReviewData(raw)

      expect(result.comments).toHaveLength(0)
    })
  })

  describe('parseReviewFromMessage', () => {
    it('should parse review from message content', () => {
      const content = `Here's my review:
\`\`\`json
{"summary":"Looks good","comments":[{"file":"app.ts","line":15,"body":"Nice"}],"verdict":"approve"}
\`\`\``
      const result = parseReviewFromMessage(content)

      expect(result).not.toBeNull()
      expect(result?.summary).toBe('Looks good')
      expect(result?.comments[0].id).toBeDefined()
    })

    it('should return null for message without review', () => {
      expect(parseReviewFromMessage('Just a regular message')).toBeNull()
    })
  })

  describe('getDisplayContentWithoutReview', () => {
    it('should remove ```json:review block', () => {
      const content = `Some text before
\`\`\`json:review
{"summary":"Test","comments":[],"verdict":"approve"}
\`\`\`
Some text after`

      const result = getDisplayContentWithoutReview(content)

      expect(result).toBe('Some text before\n\nSome text after')
      expect(result).not.toContain('json:review')
    })

    it('should remove ```json block with review', () => {
      const content = `Analysis:
\`\`\`json
{"summary":"OK","comments":[],"verdict":"comment"}
\`\`\`
Done.`

      const result = getDisplayContentWithoutReview(content)

      expect(result).toContain('Analysis')
      expect(result).toContain('Done')
      expect(result).not.toContain('"summary"')
    })

    it('should remove raw JSON review', () => {
      const content = `Review: {"summary":"Test","comments":[],"verdict":"approve"} End.`

      const result = getDisplayContentWithoutReview(content)

      expect(result).toBe('Review:  End.')
    })

    it('should collapse multiple newlines', () => {
      const content = `Before


\`\`\`json:review
{"summary":"Test","comments":[],"verdict":"approve"}
\`\`\`


After`

      const result = getDisplayContentWithoutReview(content)

      expect(result).not.toMatch(/\n{3,}/)
    })

    it('should handle content without review', () => {
      const content = 'Just regular content here'
      expect(getDisplayContentWithoutReview(content)).toBe('Just regular content here')
    })
  })

  describe('formatVerdict', () => {
    it('should format approve verdict', () => {
      expect(formatVerdict('approve')).toBe('Approve')
    })

    it('should format request_changes verdict', () => {
      expect(formatVerdict('request_changes')).toBe('Request Changes')
    })

    it('should format comment verdict', () => {
      expect(formatVerdict('comment')).toBe('Comment')
    })
  })

  describe('getVerdictColor', () => {
    it('should return green for approve', () => {
      expect(getVerdictColor('approve')).toBe('text-green-500')
    })

    it('should return orange for request_changes', () => {
      expect(getVerdictColor('request_changes')).toBe('text-orange-500')
    })

    it('should return blue for comment', () => {
      expect(getVerdictColor('comment')).toBe('text-blue-500')
    })
  })
})
