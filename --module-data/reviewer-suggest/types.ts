/**
 * Reviewer Suggestion Types
 *
 * Types for the agentic PR reviewer suggestion feature.
 * Claude analyzes git blame data to suggest optimal reviewers.
 */

export interface SuggestedReviewer {
  /** GitHub login (from blame email mapping) */
  login: string | null
  /** Git author name */
  name: string
  /** Git author email */
  email: string
  /** Total lines authored across changed files */
  linesOwned: number
  /** Number of changed files they authored */
  filesOwned: number
  /** Recency weight (higher = more recent activity) */
  recencyScore: number
  /** Combined ranking score */
  totalScore: number
}

export interface ReviewerSuggestionResult {
  reviewers: SuggestedReviewer[]
  analyzedFiles: number
  timestamp: string
}

export interface ReviewerSuggestRequest {
  repoFullName: string
  prNumber: number
  branch: string
  baseBranch: string
  changedFiles: string[]
  prAuthor: string
  githubToken: string
}
