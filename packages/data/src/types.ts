/**
 * @codelobby/data - Type Definitions
 *
 * All shared types used across the app.
 */

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Repository {
  id: string
  name: string
  full_name: string
  html_url: string
  description: string | null
  owner: {
    login: string
    avatar_url: string
  }
  stargazers_count: number
  language: string | null
  updated_at: string
}

export interface PRComment {
  id: string
  body: string
  created_at: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
}

export interface PRReview {
  id: string
  state: string
  created_at: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  body: string | null
}

export interface ReviewComment {
  id: string
  body: string
  created_at: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  path: string
  line: number | null
  diffHunk?: string
}

export interface ReviewThread {
  id: string
  isResolved: boolean
  path: string
  line: number | null
  comments: ReviewComment[]
}

export interface PRFile {
  path: string
  additions: number
  deletions: number
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAMED' | 'COPIED'
  patch?: string
}

export interface CheckStatus {
  state: 'pending' | 'success' | 'failure' | 'error'
  total_count: number
  check_runs: Array<{
    id: string
    name: string
    status: string
    conclusion: string | null
    html_url: string
  }>
}

export type MergeableState = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
export type MergeStateStatus =
  | 'BEHIND'
  | 'BLOCKED'
  | 'CLEAN'
  | 'DIRTY'
  | 'DRAFT'
  | 'HAS_HOOKS'
  | 'UNKNOWN'
  | 'UNSTABLE'
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
export type MergeMethod = 'MERGE' | 'SQUASH' | 'REBASE'
export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'

export interface PullRequest {
  id: string
  number: number
  title: string
  body: string | null
  html_url: string
  state: string
  created_at: string
  updated_at: string
  draft: boolean
  merged_at: string | null
  user: {
    login: string
    avatar_url: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    repo: {
      name: string
      full_name: string
      owner: {
        login: string
        avatar_url: string
      }
    }
  }
  labels: Array<{
    name: string
    color: string
  }>
  comments: number
  review_comments: number
  additions: number
  deletions: number
  changed_files: number
  checks?: CheckStatus
  commentsList?: PRComment[]
  reviews?: PRReview[]
  reviewThreads?: ReviewThread[]
  mergeable?: MergeableState
  mergeStateStatus?: MergeStateStatus
  reviewDecision?: ReviewDecision
}

export interface PRIdentifier {
  repoFullName: string
  prNumber: number
}

// ═══════════════════════════════════════════════════════════════════════════
// USER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

// ═══════════════════════════════════════════════════════════════════════════
// AI CHAT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  thinking?: string
}

export interface PRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  systemContext?: string
}

export interface CustomPrompt {
  id: string
  label: string
  prompt: string
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ViewMode = 'canvas' | 'ide'

export interface CardLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMIT
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimit {
  limit: number
  remaining: number
  used: number
  resetAt: string
  percentage: number
  cost?: number
}

// ═══════════════════════════════════════════════════════════════════════════
// NETWORK REQUEST TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export interface NetworkRequest {
  id: string
  method: string
  status: 'pending' | 'success' | 'error'
  startTime: number
  endTime?: number
  durationMs?: number
  httpMethod?: string
  url?: string
  statusCode?: number
  cost?: number
  rateLimit?: {
    remaining: number
    limit: number
    used: number
    resetAt: string
  }
  params?: unknown
  error?: string
  requestBody?: string
  responseBody?: string
  responseSize?: number
}
