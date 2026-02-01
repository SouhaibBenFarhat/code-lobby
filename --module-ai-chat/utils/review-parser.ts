/**
 * Review Parser - Extract and validate Claude's review JSON from messages
 *
 * This parser is designed to handle streaming content - it will only attempt
 * to parse JSON when it detects a complete structure (balanced braces/brackets).
 */

import type { RawReviewData, ReviewData, ReviewVerdict } from '../types'

// Markers for review JSON in Claude's response
const REVIEW_JSON_START = '```json:review'
const REVIEW_JSON_END = '```'

/**
 * Check if a JSON string appears to be complete (balanced braces and brackets)
 * This is a heuristic check to avoid parsing incomplete JSON during streaming.
 */
function isJsonComplete(jsonStr: string): boolean {
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') braceCount++
    else if (char === '}') braceCount--
    else if (char === '[') bracketCount++
    else if (char === ']') bracketCount--
  }

  // JSON is complete if all braces and brackets are balanced and we're not in a string
  return braceCount === 0 && bracketCount === 0 && !inString
}

/**
 * Check if content contains a COMPLETE review JSON
 * Returns false for incomplete/streaming JSON to avoid parse errors
 */
export function containsReviewJson(content: string): boolean {
  // Check for markdown code block format (must have both opening AND closing)
  if (content.includes(REVIEW_JSON_START)) {
    const startIdx = content.indexOf(REVIEW_JSON_START) + REVIEW_JSON_START.length
    const endIdx = content.indexOf(REVIEW_JSON_END, startIdx)
    // Only return true if we have a closing marker
    if (endIdx > startIdx) {
      const jsonStr = content.slice(startIdx, endIdx).trim()
      return isJsonComplete(jsonStr)
    }
    return false
  }

  // Check for ```json ... ``` format (must have closing ```)
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/m)
  if (jsonBlockMatch?.[1]) {
    const jsonStr = jsonBlockMatch[1].trim()
    // Must have review fields AND be complete
    if (jsonStr.includes('"summary"') && jsonStr.includes('"verdict"')) {
      return isJsonComplete(jsonStr)
    }
  }

  // Check for raw JSON object (more strict - must be complete)
  // Look for a JSON object that starts with { and contains our required fields
  const jsonStart = content.indexOf('{"')
  if (jsonStart !== -1) {
    const extracted = extractBalancedJson(content, jsonStart)
    if (
      extracted?.includes('"summary"') &&
      extracted.includes('"comments"') &&
      extracted.includes('"verdict"')
    ) {
      return isJsonComplete(extracted)
    }
  }

  return false
}

/**
 * Extract a balanced JSON object starting from a given position
 * Returns null if braces are not balanced (incomplete JSON during streaming)
 */
function extractBalancedJson(content: string, startIdx: number): string | null {
  if (content[startIdx] !== '{') return null

  let braceCount = 0
  let inString = false
  let escaped = false

  for (let i = startIdx; i < content.length; i++) {
    const char = content[i]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') braceCount++
    else if (char === '}') {
      braceCount--
      if (braceCount === 0) {
        // Found matching closing brace
        return content.slice(startIdx, i + 1)
      }
    }
  }

  // No matching closing brace found (incomplete)
  return null
}

/**
 * Extract review JSON from Claude's response
 * Returns null if no valid review JSON found OR if JSON is incomplete (during streaming)
 */
export function extractReviewJson(content: string): RawReviewData | null {
  let jsonStr: string | null = null

  // Try primary format: ```json:review ... ```
  if (content.includes(REVIEW_JSON_START)) {
    const startIdx = content.indexOf(REVIEW_JSON_START) + REVIEW_JSON_START.length
    const endIdx = content.indexOf(REVIEW_JSON_END, startIdx)
    if (endIdx > startIdx) {
      jsonStr = content.slice(startIdx, endIdx).trim()
    }
  }

  // Try alternative format: ```json ... ```
  if (!jsonStr) {
    const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)```/m)
    if (jsonBlockMatch?.[1]) {
      jsonStr = jsonBlockMatch[1].trim()
    }
  }

  // Try raw JSON object - use balanced brace extraction for reliability
  if (!jsonStr) {
    const jsonStart = content.indexOf('{"')
    if (jsonStart !== -1) {
      const extracted = extractBalancedJson(content, jsonStart)
      if (
        extracted?.includes('"summary"') &&
        extracted.includes('"comments"') &&
        extracted.includes('"verdict"')
      ) {
        jsonStr = extracted
      }
    }
  }

  if (!jsonStr) return null

  // IMPORTANT: Check if JSON is complete before parsing (handles streaming)
  if (!isJsonComplete(jsonStr)) {
    // Don't log error during streaming - this is expected behavior
    return null
  }

  try {
    const parsed = JSON.parse(jsonStr)
    return validateRawReviewData(parsed)
  } catch (e) {
    // Only log if JSON appeared complete but still failed
    console.error('Failed to parse review JSON:', e)
    return null
  }
}

/**
 * Validate that parsed JSON has required review structure
 */
function validateRawReviewData(data: unknown): RawReviewData | null {
  if (typeof data !== 'object' || data === null) return null

  const obj = data as Record<string, unknown>

  // Check required fields
  if (typeof obj.summary !== 'string') return null
  if (!Array.isArray(obj.comments)) return null
  if (!isValidVerdict(obj.verdict)) return null

  // Validate each comment
  const validComments: RawReviewData['comments'] = []
  for (const comment of obj.comments) {
    if (
      typeof comment === 'object' &&
      comment !== null &&
      typeof (comment as Record<string, unknown>).file === 'string' &&
      typeof (comment as Record<string, unknown>).line === 'number' &&
      typeof (comment as Record<string, unknown>).body === 'string'
    ) {
      validComments.push({
        file: (comment as Record<string, unknown>).file as string,
        line: (comment as Record<string, unknown>).line as number,
        body: (comment as Record<string, unknown>).body as string
      })
    }
  }

  return {
    summary: obj.summary,
    comments: validComments,
    verdict: obj.verdict as ReviewVerdict
  }
}

/**
 * Check if a value is a valid review verdict
 */
function isValidVerdict(value: unknown): value is ReviewVerdict {
  return value === 'approve' || value === 'request_changes' || value === 'comment'
}

/**
 * Convert raw review data to ReviewData with generated IDs
 */
export function rawToReviewData(raw: RawReviewData): ReviewData {
  return {
    summary: raw.summary,
    verdict: raw.verdict,
    comments: raw.comments.map((comment, index) => ({
      id: `review-comment-${index}-${Date.now()}`,
      file: comment.file,
      line: comment.line,
      body: comment.body
    }))
  }
}

/**
 * Parse a message and extract review data if present
 */
export function parseReviewFromMessage(content: string): ReviewData | null {
  const raw = extractReviewJson(content)
  if (!raw) return null
  return rawToReviewData(raw)
}

/**
 * Get the display content (content without the JSON block)
 */
export function getDisplayContentWithoutReview(content: string): string {
  // Remove ```json:review ... ``` block
  let result = content.replace(/```json:review[\s\S]*?```/gm, '')

  // Remove ```json ... ``` blocks that look like review JSON
  result = result.replace(
    /```json\s*\{[\s\S]*?"summary"[\s\S]*?"comments"[\s\S]*?"verdict"[\s\S]*?\}[\s\S]*?```/gm,
    ''
  )

  // Remove raw JSON objects that look like review JSON (use balanced extraction)
  const jsonStart = result.indexOf('{"')
  if (jsonStart !== -1) {
    const extracted = extractBalancedJson(result, jsonStart)
    if (
      extracted?.includes('"summary"') &&
      extracted.includes('"comments"') &&
      extracted.includes('"verdict"')
    ) {
      result = result.slice(0, jsonStart) + result.slice(jsonStart + extracted.length)
    }
  }

  // Clean up extra whitespace
  result = result.replace(/\n{3,}/g, '\n\n').trim()

  return result
}

/**
 * Format verdict for display
 */
export function formatVerdict(verdict: ReviewVerdict): string {
  switch (verdict) {
    case 'approve':
      return 'Approve'
    case 'request_changes':
      return 'Request Changes'
    case 'comment':
      return 'Comment'
  }
}

/**
 * Get verdict color class
 */
export function getVerdictColor(verdict: ReviewVerdict): string {
  switch (verdict) {
    case 'approve':
      return 'text-green-500'
    case 'request_changes':
      return 'text-orange-500'
    case 'comment':
      return 'text-blue-500'
  }
}
