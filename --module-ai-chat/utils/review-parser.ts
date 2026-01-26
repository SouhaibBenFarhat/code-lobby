/**
 * Review Parser - Extract and validate Claude's review JSON from messages
 */

import type { RawReviewData, ReviewData, ReviewVerdict } from '../types'

// Markers for review JSON in Claude's response
const REVIEW_JSON_START = '```json:review'
const REVIEW_JSON_END = '```'

// Alternative markers (in case Claude uses slightly different format)
const ALT_REVIEW_MARKERS = [
  { start: '```json\n{"summary"', end: '```' },
  { start: '{"summary":', end: '}' }
]

/**
 * Check if content contains a review JSON
 */
export function containsReviewJson(content: string): boolean {
  if (content.includes(REVIEW_JSON_START)) return true

  // Check alternative formats
  for (const marker of ALT_REVIEW_MARKERS) {
    if (content.includes(marker.start)) return true
  }

  // Try to find JSON object with required fields
  try {
    const jsonMatch = content.match(/\{[\s\S]*"summary"[\s\S]*"comments"[\s\S]*"verdict"[\s\S]*\}/m)
    return !!jsonMatch
  } catch {
    return false
  }
}

/**
 * Extract review JSON from Claude's response
 * Returns null if no valid review JSON found
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

  // Try raw JSON object
  if (!jsonStr) {
    const jsonMatch = content.match(
      /(\{[\s\S]*"summary"[\s\S]*"comments"[\s\S]*"verdict"[\s\S]*\})/m
    )
    if (jsonMatch?.[1]) {
      jsonStr = jsonMatch[1].trim()
    }
  }

  if (!jsonStr) return null

  try {
    const parsed = JSON.parse(jsonStr)
    return validateRawReviewData(parsed)
  } catch (e) {
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
