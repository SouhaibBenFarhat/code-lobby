/**
 * @codelobby/shared-store - Type Definitions
 *
 * All shared types used across modules.
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
}

export interface PREvent {
  id: number
  event: string
  created_at: string
  actor?: {
    login: string
    avatar_url: string
  }
  body?: string
  state?: string
  commit_id?: string
  submitted_at?: string
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

export interface LinkedPRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
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
}

// ═══════════════════════════════════════════════════════════════════════════
// CI FAILURE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export interface CIFailureAnalysis {
  checkRunId: string
  checkName: string
  summary: string
  failureReason: string
  suggestedFix?: string
  thinking?: string // Claude's final reasoning (complete)
  streamingThinking?: string // Claude's reasoning as it streams in real-time
  streamingContent?: string // Claude's response as it streams
  analyzedAt: number
  isLoading?: boolean
  isStreaming?: boolean // Currently streaming response
  error?: string
}
