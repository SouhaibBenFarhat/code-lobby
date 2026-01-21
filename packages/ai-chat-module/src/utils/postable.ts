/**
 * Utilities for parsing POSTABLE metadata from Claude responses
 */

import { POSTABLE_END, POSTABLE_START } from '../constants'
import type { ContentSection, PostableComment } from '../types'

// Extract PR Comment from content (the part to be posted)
// Format: > **PR Comment:** This is what gets posted
export function extractPRComment(content: string): string | null {
  // Look for blockquote with "PR Comment:" marker
  const prCommentRegex = />\s*\*\*PR Comment:\*\*\s*(.+?)(?=\n[^>]|<!--POSTABLE|$)/s
  const match = content.match(prCommentRegex)
  if (match?.[1]) {
    return match[1].trim()
  }
  return null
}

// Extract POSTABLE from a single piece of content
export function extractPostable(content: string): {
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
    console.warn('Failed to parse POSTABLE metadata:', jsonStr)
  }

  return { cleaned, postable: null, prComment }
}

// Parse message into sections, each section may have its own POSTABLE
// Sections are delimited by "---" (horizontal rules)
export function parseContentSections(content: string): ContentSection[] {
  // Split by horizontal rule pattern (--- at start of line, possibly with whitespace)
  const parts = content.split(/\n---\n/)

  if (parts.length === 1) {
    // No sections, treat entire content as one
    const { cleaned, postable, prComment } = extractPostable(content)
    return [{ content: cleaned, postable, prComment }]
  }

  return parts.map((part) => {
    const { cleaned, postable, prComment } = extractPostable(part.trim())
    return { content: cleaned, postable, prComment }
  })
}

// Parse all POSTABLE comments from content (for backward compat)
export function parsePostableComments(content: string): PostableComment[] {
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
      // Invalid JSON, skip
    }
  }
  return comments
}

// Remove all POSTABLE metadata from content for display
export function stripPostableMetadata(content: string): string {
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
