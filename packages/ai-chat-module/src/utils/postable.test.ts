/**
 * Tests for POSTABLE parsing utilities
 */

import { describe, expect, it } from 'vitest'
import {
  extractPostable,
  extractPRComment,
  parseContentSections,
  parsePostableComments,
  stripPostableMetadata
} from './postable'

describe('extractPRComment', () => {
  it('should extract PR comment from blockquote', () => {
    const content = `Some text
> **PR Comment:** This is the comment to post
More text`
    expect(extractPRComment(content)).toBe('This is the comment to post')
  })

  it('should handle multi-line PR comments', () => {
    const content = `> **PR Comment:** First line
> Second line
> Third line`
    const result = extractPRComment(content)
    expect(result).toContain('First line')
  })

  it('should return null if no PR comment found', () => {
    const content = 'Just some regular content without PR Comment'
    expect(extractPRComment(content)).toBeNull()
  })

  it('should handle PR comment with code block', () => {
    const content = `> **PR Comment:** Fix the null check
> \`\`\`typescript
> user?.profile?.name
> \`\`\``
    const result = extractPRComment(content)
    expect(result).toContain('Fix the null check')
  })
})

describe('extractPostable', () => {
  it('should extract valid POSTABLE metadata', () => {
    const content = 'Some content <!--POSTABLE:{"file":"test.ts","line":42}-->'
    const result = extractPostable(content)

    expect(result.postable).toEqual({ file: 'test.ts', line: 42 })
    expect(result.cleaned).toBe('Some content')
  })

  it('should return null for content without POSTABLE', () => {
    const content = 'Just regular content'
    const result = extractPostable(content)

    expect(result.postable).toBeNull()
    expect(result.cleaned).toBe('Just regular content')
  })

  it('should handle malformed JSON gracefully', () => {
    const content = 'Content <!--POSTABLE:invalid json-->'
    const result = extractPostable(content)

    expect(result.postable).toBeNull()
  })

  it('should extract PR comment along with postable', () => {
    const content = `Finding: Bug here
> **PR Comment:** Fix this bug
<!--POSTABLE:{"file":"bug.ts","line":10}-->`
    const result = extractPostable(content)

    expect(result.postable).toEqual({ file: 'bug.ts', line: 10 })
    expect(result.prComment).toBe('Fix this bug')
  })

  it('should handle missing file or line', () => {
    const content = '<!--POSTABLE:{"file":"test.ts"}-->'
    const result = extractPostable(content)
    expect(result.postable).toBeNull()

    const content2 = '<!--POSTABLE:{"line":42}-->'
    const result2 = extractPostable(content2)
    expect(result2.postable).toBeNull()
  })
})

describe('parseContentSections', () => {
  it('should treat content without separators as single section', () => {
    const content = 'Just one section of content'
    const sections = parseContentSections(content)

    expect(sections).toHaveLength(1)
    expect(sections[0].content).toBe('Just one section of content')
  })

  it('should split content by horizontal rule', () => {
    const content = `Section 1
---
Section 2
---
Section 3`
    const sections = parseContentSections(content)

    expect(sections).toHaveLength(3)
    expect(sections[0].content).toBe('Section 1')
    expect(sections[1].content).toBe('Section 2')
    expect(sections[2].content).toBe('Section 3')
  })

  it('should extract POSTABLE from each section', () => {
    const content = `Bug 1
<!--POSTABLE:{"file":"a.ts","line":1}-->
---
Bug 2
<!--POSTABLE:{"file":"b.ts","line":2}-->`
    const sections = parseContentSections(content)

    expect(sections).toHaveLength(2)
    expect(sections[0].postable).toEqual({ file: 'a.ts', line: 1 })
    expect(sections[1].postable).toEqual({ file: 'b.ts', line: 2 })
  })

  it('should handle sections with no POSTABLE', () => {
    const content = `Section with postable
<!--POSTABLE:{"file":"test.ts","line":1}-->
---
Section without postable`
    const sections = parseContentSections(content)

    expect(sections).toHaveLength(2)
    expect(sections[0].postable).not.toBeNull()
    expect(sections[1].postable).toBeNull()
  })
})

describe('parsePostableComments', () => {
  it('should parse multiple POSTABLE comments', () => {
    const content = `First <!--POSTABLE:{"file":"a.ts","line":1}-->
Second <!--POSTABLE:{"file":"b.ts","line":2}-->
Third <!--POSTABLE:{"file":"c.ts","line":3}-->`
    const comments = parsePostableComments(content)

    expect(comments).toHaveLength(3)
    expect(comments[0]).toEqual({ file: 'a.ts', line: 1 })
    expect(comments[1]).toEqual({ file: 'b.ts', line: 2 })
    expect(comments[2]).toEqual({ file: 'c.ts', line: 3 })
  })

  it('should return empty array for content without POSTABLE', () => {
    const content = 'No postable comments here'
    const comments = parsePostableComments(content)

    expect(comments).toHaveLength(0)
  })

  it('should skip invalid JSON', () => {
    const content = `Valid <!--POSTABLE:{"file":"a.ts","line":1}-->
Invalid <!--POSTABLE:not json-->
Valid <!--POSTABLE:{"file":"b.ts","line":2}-->`
    const comments = parsePostableComments(content)

    expect(comments).toHaveLength(2)
  })
})

describe('stripPostableMetadata', () => {
  it('should remove all POSTABLE metadata', () => {
    const content = `Content <!--POSTABLE:{"file":"a.ts","line":1}--> more <!--POSTABLE:{"file":"b.ts","line":2}-->`
    const result = stripPostableMetadata(content)

    expect(result).toBe('Content  more')
    expect(result).not.toContain('POSTABLE')
  })

  it('should handle content without metadata', () => {
    const content = 'No metadata here'
    const result = stripPostableMetadata(content)

    expect(result).toBe('No metadata here')
  })

  it('should trim the result', () => {
    const content = '  Content <!--POSTABLE:{"file":"a.ts","line":1}-->  '
    const result = stripPostableMetadata(content)

    expect(result).toBe('Content')
  })
})
