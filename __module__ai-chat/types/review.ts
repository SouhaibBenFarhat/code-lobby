/**
 * Review Types - For Claude-generated PR reviews
 */

/**
 * A single review comment on a specific file and line
 */
export interface ReviewComment {
  id: string // Generated client-side for tracking
  file: string
  line: number
  body: string
}

/**
 * Review verdict options (matching GitHub's review event types)
 */
export type ReviewVerdict = 'approve' | 'request_changes' | 'comment'

/**
 * The complete review data structure that Claude generates
 */
export interface ReviewData {
  summary: string
  comments: ReviewComment[]
  verdict: ReviewVerdict
}

/**
 * Raw review data from Claude (without client-side IDs)
 */
export interface RawReviewData {
  summary: string
  comments: Array<{
    file: string
    line: number
    body: string
  }>
  verdict: ReviewVerdict
}

/**
 * Review state for the preview modal
 */
export interface ReviewPreviewState {
  isOpen: boolean
  review: ReviewData | null
  messageId: string | null // Which message contains the review
}

/**
 * File with its associated review comments
 */
export interface ReviewFileGroup {
  file: string
  comments: ReviewComment[]
  patch?: string // The diff content for this file
}
