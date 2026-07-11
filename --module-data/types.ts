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
  /** GraphQL node id of the review submission this comment belongs to (if available) */
  reviewId?: string | null
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

export interface PRCommit {
  oid: string
  messageHeadline: string
  message: string
  committedDate: string
  author: {
    name: string
    email: string
    user: {
      login: string
      avatar_url: string
    } | null
  }
  additions: number
  deletions: number
  changedFilesCount: number
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
  assignees: Array<{
    login: string
    avatar_url: string
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
  commits?: PRCommit[]
  totalCommits?: number
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
  createdAt?: string
}

export interface ClaudeModel {
  id: string
  display_name: string
  created_at?: string
  type?: string
}

export interface AIUsage {
  inputTokens: number
  outputTokens: number
  inputCostUsd: number
  outputCostUsd: number
  costUsd: number
  /** Number of messages sent in CLI subscription mode */
  cliMessageCount?: number
  /** ISO timestamp of when tracking session started */
  sessionStartedAt?: string
}

/** CLI usage stats from ~/.claude/stats-cache.json */
export interface CliUsageStats {
  /** Today's activity */
  today: {
    messages: number
    sessions: number
    toolCalls: number
  }
  /** Token usage by model (all time) */
  modelUsage: Record<
    string,
    {
      inputTokens: number
      outputTokens: number
      cacheReadInputTokens: number
      cacheCreationInputTokens: number
    }
  >
  /** Total sessions all time */
  totalSessions: number
  /** Total messages all time */
  totalMessages: number
  /** Timestamp when this data was read */
  fetchedAt: string
}

/**
 * Daily Speech - AI-generated standup summary
 */
export interface DailySpeech {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  content: string // Markdown content
  metadata: {
    generatedAt: string // ISO timestamp
    eventCount: number
    prsFetched: number
  }
  createdAt: string
  updatedAt: string
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ViewMode = 'canvas' | 'ide'

/** Code Visualizer panel state */
export interface CodeVisualizerState {
  isOpen: boolean
  repoFullName: string | null
  prNumber: number | null
  headRef: string | null
  initialFilePath: string | null
}

/** Webview tab associated with a PR */
export interface PRWebviewTab {
  id: string
  url: string
  title: string
}

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
