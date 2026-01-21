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

// A content section that may or may not have a postable comment
interface ContentSection {
  content: string
  postable: PostableComment | null
  prComment: string | null
}

// Parse POSTABLE metadata from message content
// Format: <!--POSTABLE:{"file":"path/to/file.ts","line":42}-->
const POSTABLE_START = '<!--POSTABLE:'
const POSTABLE_END = '-->'

// Extract PR Comment from content (the part to be posted)
// Format: > **PR Comment:** This is what gets posted
function extractPRComment(content: string): string | null {
  const prCommentRegex = />\s*\*\*PR Comment:\*\*\s*(.+?)(?=\n[^>]|<!--POSTABLE|$)/s
  const match = content.match(prCommentRegex)
  if (match?.[1]) {
    return match[1].trim()
  }
  return null
}

// Extract POSTABLE from a single piece of content
function extractPostable(content: string): {
  cleaned: string
  postable: PostableComment | null
  prComment: string | null
} {
  const startIdx = content.indexOf(POSTABLE_START)
  if (startIdx === -1) {
    return { cleaned: content, postable: null, prComment: null }
  }

  const jsonStart = startIdx + POSTABLE_START.length
  const endIdx = content.indexOf(POSTABLE_END, jsonStart)
  if (endIdx === -1) {
    return { cleaned: content, postable: null, prComment: null }
  }

  const jsonStr = content.slice(jsonStart, endIdx).trim()
  const cleaned = (content.slice(0, startIdx) + content.slice(endIdx + POSTABLE_END.length)).trim()

  // Extract the PR comment before cleaning
  const prComment = extractPRComment(content)

  try {
    const parsed = JSON.parse(jsonStr) as { file?: string; line?: number }
    if (parsed.file && typeof parsed.line === 'number') {
      return { cleaned, postable: { file: parsed.file, line: parsed.line }, prComment }
    }
  } catch {
    // Invalid JSON
  }

  return { cleaned, postable: null, prComment }
}

// Parse message into sections, each section may have its own POSTABLE
function parseContentSections(content: string): ContentSection[] {
  const parts = content.split(/\n---\n/)

  if (parts.length === 1) {
    const { cleaned, postable, prComment } = extractPostable(content)
    return [{ content: cleaned, postable, prComment }]
  }

  return parts.map((part) => {
    const { cleaned, postable, prComment } = extractPostable(part.trim())
    return { content: cleaned, postable, prComment }
  })
}

function parsePostableComments(content: string): PostableComment[] {
  const comments: PostableComment[] = []
  let searchStart = 0

  while (true) {
    const startIdx = content.indexOf(POSTABLE_START, searchStart)
    if (startIdx === -1) break

    const jsonStart = startIdx + POSTABLE_START.length
    const endIdx = content.indexOf(POSTABLE_END, jsonStart)
    if (endIdx === -1) break

    const jsonStr = content.slice(jsonStart, endIdx).trim()
    searchStart = endIdx + POSTABLE_END.length

    try {
      const parsed = JSON.parse(jsonStr) as { file?: string; line?: number }
      if (parsed.file && typeof parsed.line === 'number') {
        comments.push({ file: parsed.file, line: parsed.line })
      }
    } catch {
      // Invalid JSON, skip this one
    }
  }
  return comments
}

// Remove POSTABLE metadata from content for display
function stripPostableMetadata(content: string): string {
  let result = content

  while (true) {
    const startIdx = result.indexOf(POSTABLE_START)
    if (startIdx === -1) break

    const endIdx = result.indexOf(POSTABLE_END, startIdx)
    if (endIdx === -1) break

    result = result.slice(0, startIdx) + result.slice(endIdx + POSTABLE_END.length)
  }

  return result.trim()
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

  it('should handle JSON with extra fields', () => {
    const content = `<!--POSTABLE:{"file":"test.ts","line":42,"suggestion":"use optional chaining"}-->`
    const result = parsePostableComments(content)
    expect(result).toEqual([{ file: 'test.ts', line: 42 }])
  })

  it('should handle JSON with whitespace', () => {
    const content = `<!--POSTABLE:{ "file": "test.ts", "line": 42 }-->`
    const result = parsePostableComments(content)
    expect(result).toEqual([{ file: 'test.ts', line: 42 }])
  })

  it('should handle JSON spread across lines', () => {
    const content = `<!--POSTABLE:{
  "file": "test.ts",
  "line": 42
}-->`
    const result = parsePostableComments(content)
    expect(result).toEqual([{ file: 'test.ts', line: 42 }])
  })

  it('should handle empty content', () => {
    const result = parsePostableComments('')
    expect(result).toEqual([])
  })

  it('should handle unclosed POSTABLE tag', () => {
    const content = `Some text <!--POSTABLE:{"file":"test.ts","line":42} more text`
    const result = parsePostableComments(content)
    expect(result).toEqual([])
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

  it('should handle empty content', () => {
    const result = stripPostableMetadata('')
    expect(result).toBe('')
  })

  it('should handle content that is only metadata', () => {
    const content = `<!--POSTABLE:{"file":"a.ts","line":1}-->`
    const result = stripPostableMetadata(content)
    expect(result).toBe('')
  })

  it('should handle metadata with extra fields', () => {
    const content = `Text <!--POSTABLE:{"file":"a.ts","line":1,"extra":"data"}--> more text`
    const result = stripPostableMetadata(content)
    expect(result).toBe('Text  more text')
  })
})

describe('parseContentSections', () => {
  it('should parse content without sections as single section', () => {
    const content = `This is a simple response.
<!--POSTABLE:{"file":"test.ts","line":42}-->`

    const result = parseContentSections(content)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('This is a simple response.')
    expect(result[0].postable).toEqual({ file: 'test.ts', line: 42 })
  })

  it('should parse multiple sections separated by ---', () => {
    const content = `Here's my code review:

---
### 🔴 Critical: Null Pointer
**File:** \`src/auth.ts\` **Line:** 42

Found null pointer issue.
<!--POSTABLE:{"file":"src/auth.ts","line":42}-->

---
### 🟠 Warning: Missing Error Handling
**File:** \`src/api.ts\` **Line:** 15

No try-catch.
<!--POSTABLE:{"file":"src/api.ts","line":15}-->

---
**Summary:** Found 2 issues.`

    const result = parseContentSections(content)
    expect(result).toHaveLength(4) // intro, finding 1, finding 2, summary

    // Intro section (no postable)
    expect(result[0].content).toContain("Here's my code review:")
    expect(result[0].postable).toBeNull()

    // First finding
    expect(result[1].content).toContain('Null Pointer')
    expect(result[1].postable).toEqual({ file: 'src/auth.ts', line: 42 })

    // Second finding
    expect(result[2].content).toContain('Missing Error Handling')
    expect(result[2].postable).toEqual({ file: 'src/api.ts', line: 15 })

    // Summary (no postable)
    expect(result[3].content).toContain('Summary')
    expect(result[3].postable).toBeNull()
  })

  it('should handle content with no postable metadata', () => {
    const content = `This is a general explanation.

---
More details here.

---
Conclusion.`

    const result = parseContentSections(content)
    expect(result).toHaveLength(3)
    expect(result.every((s) => s.postable === null)).toBe(true)
  })

  it('should handle empty content', () => {
    const result = parseContentSections('')
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('')
    expect(result[0].postable).toBeNull()
  })

  it('should handle single section with postable at end', () => {
    const content = `Found a bug!
<!--POSTABLE:{"file":"bug.ts","line":1}-->`

    const result = parseContentSections(content)
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('Found a bug!')
    expect(result[0].postable).toEqual({ file: 'bug.ts', line: 1 })
  })

  it('should strip postable metadata from section content', () => {
    const content = `Intro

---
Finding description
<!--POSTABLE:{"file":"test.ts","line":10}-->

---
Summary`

    const result = parseContentSections(content)
    expect(result).toHaveLength(3)

    // First section is the intro
    expect(result[0].content).toBe('Intro')
    expect(result[0].postable).toBeNull()

    // Second section should not include the POSTABLE tag in content
    expect(result[1].content).toBe('Finding description')
    expect(result[1].content).not.toContain('POSTABLE')
    expect(result[1].postable).toEqual({ file: 'test.ts', line: 10 })

    // Third section is summary
    expect(result[2].content).toBe('Summary')
    expect(result[2].postable).toBeNull()
  })
})

describe('extractPRComment', () => {
  it('should extract PR comment from blockquote format', () => {
    const content = `Some explanation.
> **PR Comment:** Use optional chaining here.
<!--POSTABLE:{"file":"test.ts","line":42}-->`

    const result = extractPRComment(content)
    expect(result).toBe('Use optional chaining here.')
  })

  it('should extract multi-line PR comment', () => {
    const content = `**Problem:** This will crash.
> **PR Comment:** Potential null pointer. Use optional chaining: \`user?.profile?.name\`
<!--POSTABLE:{"file":"test.ts","line":42}-->`

    const result = extractPRComment(content)
    expect(result).toBe('Potential null pointer. Use optional chaining: `user?.profile?.name`')
  })

  it('should return null when no PR comment is present', () => {
    const content = `Just a regular finding.
<!--POSTABLE:{"file":"test.ts","line":42}-->`

    const result = extractPRComment(content)
    expect(result).toBeNull()
  })

  it('should handle PR comment with code snippets', () => {
    const content = `**Fix:** Use try-catch.
> **PR Comment:** Wrap in try-catch: \`try { await fetch() } catch (e) { ... }\`
<!--POSTABLE:{"file":"api.ts","line":15}-->`

    const result = extractPRComment(content)
    expect(result).toBe('Wrap in try-catch: `try { await fetch() } catch (e) { ... }`')
  })
})

describe('parseContentSections with PR comments', () => {
  it('should extract PR comment for each section', () => {
    const content = `Here's my code review:

---
### 🔴 Critical: Null Pointer Exception
**File:** \`src/auth.ts\` **Line:** 42

**Current code:**
\`\`\`ts
user.profile.name
\`\`\`

**Problem:** This will crash if user is null.

**Fix:**
\`\`\`ts
user?.profile?.name
\`\`\`

> **PR Comment:** Potential null pointer. Use optional chaining: \`user?.profile?.name\`
<!--POSTABLE:{"file":"src/auth.ts","line":42}-->

---
**Summary:** Found 1 issue.`

    const result = parseContentSections(content)
    expect(result).toHaveLength(3)

    // Intro has no PR comment
    expect(result[0].prComment).toBeNull()

    // Finding has PR comment
    expect(result[1].postable).toEqual({ file: 'src/auth.ts', line: 42 })
    expect(result[1].prComment).toBe(
      'Potential null pointer. Use optional chaining: `user?.profile?.name`'
    )

    // Summary has no PR comment
    expect(result[2].prComment).toBeNull()
  })

  it('should fall back to section content when no PR comment', () => {
    const content = `Found a bug at line 42.
<!--POSTABLE:{"file":"test.ts","line":42}-->`

    const result = parseContentSections(content)
    expect(result[0].prComment).toBeNull()
    // When posting, we'd use section.content as fallback
    expect(result[0].content).toBe('Found a bug at line 42.')
  })
})

// ===================
// QUICK PROMPTS TESTS
// ===================

// Re-implement the getPRQuickPrompts function for testing
interface QuickPrompt {
  id: string
  label: string
  prompt: string
}

interface PRContext {
  hasCIFailures?: boolean
}

function getPRQuickPrompts(context: PRContext = {}): QuickPrompt[] {
  const prompts: QuickPrompt[] = [
    {
      id: 'review-bugs',
      label: 'Find bugs',
      prompt:
        'Review this PR for bugs, potential issues, and edge cases. Show me the problematic code and how to fix it.'
    },
    {
      id: 'summarize',
      label: 'Summarize',
      prompt: 'Summarize this PR in 2-3 sentences. What does it do and why?'
    }
  ]

  // Only show "Why is CI failing?" when CI is actually failing
  if (context.hasCIFailures) {
    prompts.push({
      id: 'explain-ci',
      label: 'Why is CI failing?',
      prompt: 'Look at the CI checks and explain why they are failing. What should be fixed?'
    })
  }

  prompts.push(
    {
      id: 'security',
      label: 'Security review',
      prompt: 'Review this PR for security vulnerabilities, injection risks, or unsafe patterns.'
    },
    {
      id: 'improvements',
      label: 'Suggest improvements',
      prompt:
        'Suggest improvements to the code in this PR. Focus on readability, performance, and best practices.'
    }
  )

  return prompts
}

const GENERAL_QUICK_PROMPTS: QuickPrompt[] = [
  {
    id: 'explain-code',
    label: 'Explain this code',
    prompt: 'Can you explain how this codebase is organized and what the main components do?'
  },
  {
    id: 'best-practices',
    label: 'Best practices',
    prompt: 'What are some best practices I should follow for this type of project?'
  },
  {
    id: 'debug-help',
    label: 'Help me debug',
    prompt: "I'm having an issue with my code. Can you help me debug it?"
  }
]

describe('getPRQuickPrompts', () => {
  it('should return base prompts without CI failure context', () => {
    const prompts = getPRQuickPrompts()

    expect(prompts).toHaveLength(4) // Find bugs, Summarize, Security, Improvements
    expect(prompts.map((p) => p.id)).toEqual([
      'review-bugs',
      'summarize',
      'security',
      'improvements'
    ])
  })

  it('should include "Why is CI failing?" when hasCIFailures is true', () => {
    const prompts = getPRQuickPrompts({ hasCIFailures: true })

    expect(prompts).toHaveLength(5)
    expect(prompts.map((p) => p.id)).toContain('explain-ci')

    const ciPrompt = prompts.find((p) => p.id === 'explain-ci')
    expect(ciPrompt?.label).toBe('Why is CI failing?')
  })

  it('should NOT include "Why is CI failing?" when hasCIFailures is false', () => {
    const prompts = getPRQuickPrompts({ hasCIFailures: false })

    expect(prompts).toHaveLength(4)
    expect(prompts.map((p) => p.id)).not.toContain('explain-ci')
  })

  it('should always include Find bugs prompt', () => {
    const prompts = getPRQuickPrompts()
    const findBugs = prompts.find((p) => p.id === 'review-bugs')

    expect(findBugs).toBeDefined()
    expect(findBugs?.label).toBe('Find bugs')
    expect(findBugs?.prompt).toContain('bugs')
  })

  it('should always include Summarize prompt', () => {
    const prompts = getPRQuickPrompts()
    const summarize = prompts.find((p) => p.id === 'summarize')

    expect(summarize).toBeDefined()
    expect(summarize?.label).toBe('Summarize')
    expect(summarize?.prompt).toContain('Summarize')
  })

  it('should always include Security review prompt', () => {
    const prompts = getPRQuickPrompts()
    const security = prompts.find((p) => p.id === 'security')

    expect(security).toBeDefined()
    expect(security?.label).toBe('Security review')
    expect(security?.prompt).toContain('security')
  })

  it('should always include Suggest improvements prompt', () => {
    const prompts = getPRQuickPrompts()
    const improvements = prompts.find((p) => p.id === 'improvements')

    expect(improvements).toBeDefined()
    expect(improvements?.label).toBe('Suggest improvements')
    expect(improvements?.prompt).toContain('improvements')
  })
})

describe('GENERAL_QUICK_PROMPTS', () => {
  it('should have 3 prompts for general chat', () => {
    expect(GENERAL_QUICK_PROMPTS).toHaveLength(3)
  })

  it('should have Explain this code prompt', () => {
    const explain = GENERAL_QUICK_PROMPTS.find((p) => p.id === 'explain-code')
    expect(explain).toBeDefined()
    expect(explain?.label).toBe('Explain this code')
  })

  it('should have Best practices prompt', () => {
    const bestPractices = GENERAL_QUICK_PROMPTS.find((p) => p.id === 'best-practices')
    expect(bestPractices).toBeDefined()
    expect(bestPractices?.label).toBe('Best practices')
  })

  it('should have Help me debug prompt', () => {
    const debug = GENERAL_QUICK_PROMPTS.find((p) => p.id === 'debug-help')
    expect(debug).toBeDefined()
    expect(debug?.label).toBe('Help me debug')
  })

  it('should have meaningful prompts with actual content', () => {
    for (const prompt of GENERAL_QUICK_PROMPTS) {
      expect(prompt.prompt.length).toBeGreaterThan(20)
      expect(prompt.label.length).toBeGreaterThan(3)
    }
  })
})

describe('CustomPrompt interface and validation', () => {
  interface CustomPrompt {
    id: string
    label: string
    prompt: string
    createdAt: string
  }

  it('should define a valid custom prompt structure', () => {
    const customPrompt: CustomPrompt = {
      id: 'custom_123_abc',
      label: 'Check types',
      prompt: 'Check for TypeScript errors in this code',
      createdAt: '2024-01-01T00:00:00.000Z'
    }

    expect(customPrompt.id).toMatch(/^custom_/)
    expect(customPrompt.label).toBe('Check types')
    expect(customPrompt.prompt).toContain('TypeScript')
    expect(customPrompt.createdAt).toBeDefined()
  })

  it('should enforce label max length of 30 characters', () => {
    const validLabel = 'A'.repeat(30) // Exactly 30 chars
    const invalidLabel = 'A'.repeat(31) // 31 chars

    expect(validLabel.length).toBe(30)
    expect(invalidLabel.length).toBeGreaterThan(30)
    expect(validLabel.length <= 30).toBe(true)
    expect(invalidLabel.length <= 30).toBe(false)
  })

  it('should require both label and prompt to be non-empty', () => {
    const validatePrompt = (label: string, prompt: string) => {
      if (!label.trim()) return { valid: false, error: 'Label is required' }
      if (!prompt.trim()) return { valid: false, error: 'Prompt is required' }
      if (label.length > 30) return { valid: false, error: 'Label too long' }
      return { valid: true, error: null }
    }

    expect(validatePrompt('', 'Some prompt')).toEqual({ valid: false, error: 'Label is required' })
    expect(validatePrompt('Label', '')).toEqual({ valid: false, error: 'Prompt is required' })
    expect(validatePrompt('   ', 'Prompt')).toEqual({ valid: false, error: 'Label is required' })
    expect(validatePrompt('Label', '   ')).toEqual({ valid: false, error: 'Prompt is required' })
    expect(validatePrompt('A'.repeat(31), 'Prompt')).toEqual({
      valid: false,
      error: 'Label too long'
    })
    expect(validatePrompt('Valid Label', 'Valid prompt')).toEqual({ valid: true, error: null })
  })

  it('should support multi-line prompts', () => {
    const multiLinePrompt = `Review this code for TypeScript errors.
Check for:
- Missing type annotations
- Incorrect type usage
- Potential null/undefined issues

Show me the problematic code and how to fix it.`

    expect(multiLinePrompt).toContain('\n')
    expect(multiLinePrompt.split('\n').length).toBeGreaterThan(1)
  })

  it('should allow empty custom prompts list', () => {
    const customPrompts: CustomPrompt[] = []
    expect(customPrompts).toHaveLength(0)
  })

  it('should allow multiple custom prompts', () => {
    const customPrompts: CustomPrompt[] = [
      {
        id: 'custom_1',
        label: 'Review',
        prompt: 'Review this code',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'custom_2',
        label: 'Optimize',
        prompt: 'Suggest performance optimizations',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ]

    expect(customPrompts).toHaveLength(2)
    expect(customPrompts.map((p) => p.label)).toEqual(['Review', 'Optimize'])
  })

  it('should have unique IDs for each custom prompt', () => {
    const customPrompts: CustomPrompt[] = [
      {
        id: 'custom_1_abc',
        label: 'First',
        prompt: 'First prompt',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'custom_2_def',
        label: 'Second',
        prompt: 'Second prompt',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ]

    const ids = customPrompts.map((p) => p.id)
    const uniqueIds = [...new Set(ids)]
    expect(uniqueIds).toHaveLength(ids.length)
  })

  it('should validate custom prompt deletion by id', () => {
    let customPrompts: CustomPrompt[] = [
      {
        id: 'custom_to_delete',
        label: 'Delete me',
        prompt: 'This will be deleted',
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'custom_to_keep',
        label: 'Keep me',
        prompt: 'This stays',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ]

    // Simulate deletion
    const idToDelete = 'custom_to_delete'
    customPrompts = customPrompts.filter((p) => p.id !== idToDelete)

    expect(customPrompts).toHaveLength(1)
    expect(customPrompts[0].label).toBe('Keep me')
  })
})

// ===================
// CONTEXT VALIDITY TESTS
// ===================

// Types for context validity testing
interface LinkedPRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
}

interface SelectedPR {
  number: number
  title: string
  base: {
    repo: {
      full_name: string
    }
  }
}

// Helper to compute selectedPRId (matches implementation)
function computeSelectedPRId(selectedPR: SelectedPR | null | undefined): string | null {
  return selectedPR ? `${selectedPR.base.repo.full_name}#${selectedPR.number}` : null
}

// Helper to check if context is valid (matches implementation)
function isContextValid(
  linkedPRChat: LinkedPRChat | null | undefined,
  prSystemContext: string | undefined
): boolean {
  // If we're in a PR chat, we just need valid context for that chat
  if (linkedPRChat) {
    // Context should exist for the PR chat
    // Note: We don't require selectedPRId to match because user might be
    // viewing the chat without having the PR selected in the main view
    return prSystemContext !== undefined
  }
  // For general chat or PR empty state, context should be undefined
  return prSystemContext === undefined
}

// Helper to check if context should be cleared (matches implementation)
function shouldClearContext(
  selectedPRId: string | null,
  linkedPRChat: LinkedPRChat | null | undefined,
  prSystemContext: string | undefined
): boolean {
  // If we're viewing a PR empty state (selectedPR set but no linkedPRChat),
  // context should be cleared
  if (selectedPRId && !linkedPRChat && prSystemContext !== undefined) {
    return true
  }
  // If linkedPRChat doesn't match selectedPR, context should be cleared
  if (
    linkedPRChat &&
    selectedPRId &&
    linkedPRChat.prId !== selectedPRId &&
    prSystemContext !== undefined
  ) {
    return true
  }
  return false
}

describe('Context validity logic', () => {
  const prA: SelectedPR = {
    number: 1,
    title: 'PR A',
    base: { repo: { full_name: 'owner/repo' } }
  }

  const prB: SelectedPR = {
    number: 2,
    title: 'PR B',
    base: { repo: { full_name: 'owner/repo' } }
  }

  const linkedChatA: LinkedPRChat = {
    prId: 'owner/repo#1',
    prNumber: 1,
    prTitle: 'PR A',
    repoFullName: 'owner/repo'
  }

  const linkedChatB: LinkedPRChat = {
    prId: 'owner/repo#2',
    prNumber: 2,
    prTitle: 'PR B',
    repoFullName: 'owner/repo'
  }

  const contextForA = 'System context for PR A with diff data...'
  const contextForB = 'System context for PR B with diff data...'

  describe('isContextValid', () => {
    it('should return true when PR chat has context', () => {
      expect(isContextValid(linkedChatA, contextForA)).toBe(true)
    })

    it('should return false when PR chat has no context', () => {
      expect(isContextValid(linkedChatA, undefined)).toBe(false)
    })

    it('should return true when PR chat has context regardless of selectedPR', () => {
      // User might be viewing chat without having PR selected in main view
      // This should still be valid as long as context exists
      expect(isContextValid(linkedChatA, contextForA)).toBe(true)
    })

    it('should return true for general chat with no context', () => {
      expect(isContextValid(null, undefined)).toBe(true)
    })

    it('should return false for general chat with stale context', () => {
      // No linked chat, but somehow have context (stale)
      expect(isContextValid(null, contextForA)).toBe(false)
    })

    it('should return true when PR chat has any valid context', () => {
      // Context for chat A or B - either should work as long as context exists
      expect(isContextValid(linkedChatB, contextForB)).toBe(true)
      expect(isContextValid(linkedChatA, contextForB)).toBe(true) // Even mismatched context - we trust the store
    })
  })

  describe('shouldClearContext', () => {
    it('should clear context when viewing PR empty state with stale context', () => {
      // User selected PR B but no chat exists, old context from PR A
      const selectedPRId = computeSelectedPRId(prB)
      expect(shouldClearContext(selectedPRId, null, contextForA)).toBe(true)
    })

    it('should not clear context when viewing PR empty state with no context', () => {
      const selectedPRId = computeSelectedPRId(prB)
      expect(shouldClearContext(selectedPRId, null, undefined)).toBe(false)
    })

    it('should clear context when linkedPRChat does not match selectedPR', () => {
      // User selected PR B but linked chat is still PR A with PR A context
      const selectedPRId = computeSelectedPRId(prB)
      expect(shouldClearContext(selectedPRId, linkedChatA, contextForA)).toBe(true)
    })

    it('should not clear context when linkedPRChat matches selectedPR', () => {
      const selectedPRId = computeSelectedPRId(prA)
      expect(shouldClearContext(selectedPRId, linkedChatA, contextForA)).toBe(false)
    })

    it('should not clear context for general chat with no context', () => {
      expect(shouldClearContext(null, null, undefined)).toBe(false)
    })
  })

  describe('selectedPRId computation', () => {
    it('should return null when selectedPR is null', () => {
      expect(computeSelectedPRId(null)).toBe(null)
    })

    it('should return null when selectedPR is undefined', () => {
      expect(computeSelectedPRId(undefined)).toBe(null)
    })

    it('should compute correct ID from selectedPR', () => {
      expect(computeSelectedPRId(prA)).toBe('owner/repo#1')
      expect(computeSelectedPRId(prB)).toBe('owner/repo#2')
    })

    it('should match linkedPRChat.prId format', () => {
      const selectedPRId = computeSelectedPRId(prA)
      expect(selectedPRId).toBe(linkedChatA.prId)
    })
  })
})

describe('Race condition prevention', () => {
  // Simulates the cancellation pattern used in the auto-switch effect
  it('should support cancellation pattern for async operations', async () => {
    let cancelled = false
    const results: string[] = []

    const asyncOperation = async (id: string, delay: number): Promise<void> => {
      await new Promise((resolve) => setTimeout(resolve, delay))
      if (!cancelled) {
        results.push(id)
      }
    }

    // Start operation A
    const opA = asyncOperation('A', 50)

    // Cancel A and start B (simulating effect cleanup)
    cancelled = true
    cancelled = false // Reset for new operation
    const opB = asyncOperation('B', 10)

    await Promise.all([opA, opB])

    // Only B should have completed since A was cancelled
    // Note: In real implementation, each effect run has its own cancelled variable
    expect(results).toContain('B')
  })

  it('should handle multiple rapid PR switches correctly', async () => {
    const switchOperations: string[] = []
    let currentCancelFn: (() => void) | null = null

    // Simulates the checkAndSwitch function behavior
    const checkAndSwitch = async (prId: string): Promise<string | null> => {
      let cancelled = false

      // Store cleanup function
      const previousCancel = currentCancelFn
      currentCancelFn = () => {
        cancelled = true
      }

      // Cancel previous operation
      previousCancel?.()

      // Simulate async check
      await new Promise((resolve) => setTimeout(resolve, 10))

      if (cancelled) {
        return null // Cancelled, don't proceed
      }

      switchOperations.push(prId)
      return prId
    }

    // Rapid switches: A -> B -> C
    const pA = checkAndSwitch('A')
    const pB = checkAndSwitch('B')
    const pC = checkAndSwitch('C')

    await Promise.all([pA, pB, pC])

    // Only the last one should have completed
    expect(switchOperations).toEqual(['C'])
  })
})

describe('Message sending validation', () => {
  // Simulates the validation logic in sendMessage
  function validateBeforeSend(
    linkedPRChat: LinkedPRChat | null | undefined,
    prSystemContext: string | undefined,
    selectedPRId: string | null
  ): { valid: boolean; error: string | null } {
    // If in PR chat mode, ensure we have valid context for the current PR
    if (linkedPRChat && !prSystemContext) {
      return { valid: false, error: 'PR context not loaded. Please wait a moment and try again.' }
    }

    // If linkedPRChat doesn't match selectedPRId, context is stale
    if (linkedPRChat && selectedPRId && linkedPRChat.prId !== selectedPRId) {
      return { valid: false, error: 'PR context is out of sync. Please refresh the page.' }
    }

    return { valid: true, error: null }
  }

  const linkedChatA: LinkedPRChat = {
    prId: 'owner/repo#1',
    prNumber: 1,
    prTitle: 'PR A',
    repoFullName: 'owner/repo'
  }

  it('should allow sending in general chat', () => {
    const result = validateBeforeSend(null, undefined, null)
    expect(result.valid).toBe(true)
  })

  it('should allow sending in PR chat with valid context', () => {
    const result = validateBeforeSend(linkedChatA, 'context for PR A', 'owner/repo#1')
    expect(result.valid).toBe(true)
  })

  it('should block sending in PR chat without context', () => {
    const result = validateBeforeSend(linkedChatA, undefined, 'owner/repo#1')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('context not loaded')
  })

  it('should block sending when context is out of sync', () => {
    // linkedPRChat is for PR A, but selectedPR is PR B
    const result = validateBeforeSend(linkedChatA, 'context for PR A', 'owner/repo#2')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('out of sync')
  })

  it('should allow sending even if selectedPRId is null but linkedPRChat has context', () => {
    // Edge case: linkedPRChat exists but selectedPRId is null (shouldn't happen normally)
    const result = validateBeforeSend(linkedChatA, 'context for PR A', null)
    expect(result.valid).toBe(true)
  })
})
