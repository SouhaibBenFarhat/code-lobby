/**
 * Shared types for the AI Chat module
 */

import type {
  CheckStatus as CheckStatusType,
  PRComment as PRCommentType,
  PRReview as PRReviewType,
  ReviewThread as ReviewThreadType
} from '@data'

// Re-export types from @data for compatibility
export type {
  ChatMessage,
  CheckStatus,
  ClaudeModel,
  PRComment,
  PRReview,
  ReviewThread
} from '@data'

// GitHub user for avatar display
export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

// Selected PR details - includes all fields needed for AI context
export interface SelectedPR {
  id: string // GraphQL node ID for mutations
  number: number
  title: string
  body?: string
  // Author
  user?: {
    login: string
    avatar_url: string
  }
  // Branch info
  head: {
    ref?: string
    sha: string
  }
  base: {
    ref?: string
    repo: {
      full_name: string
      owner: {
        login: string
      }
      name: string
    }
  }
  // PR metadata
  draft?: boolean
  labels?: Array<{ name: string; color: string }>
  // Stats
  additions?: number
  deletions?: number
  changed_files?: number
  // Review status
  reviewDecision?: 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null
  // CI status
  checks?: CheckStatusType
  // PR discussion and reviews (for AI context)
  commentsList?: PRCommentType[]
  reviews?: PRReviewType[]
  reviewThreads?: ReviewThreadType[]
}

// Streaming state for the current assistant message being generated
export type StreamingStatus = 'idle' | 'thinking' | 'tool_use' | 'writing' | 'composing'

export interface ToolActivity {
  toolName: string
  input: string
}

export interface ToolHistoryEntry {
  id: string
  toolName: string
  input: string
  output?: string
  startedAt: number
  completedAt?: number
  duration?: number
  status: 'running' | 'completed' | 'error'
}

export interface StreamingState {
  content: string
  thinking: string
  isStreaming: boolean
  status: StreamingStatus
  activity: ToolActivity | null
  toolHistory: ToolHistoryEntry[]
}

// Queued message waiting to be sent
export interface QueuedMessage {
  id: string
  content: string
  displayLabel?: string // Short label to show instead of full content (for quick actions)
}

// Pre-defined prompt structure
export interface QuickPrompt {
  id: string
  label: string
  icon: React.ReactNode
  prompt: string
}

// PR context for determining which quick actions to show
export interface PRContext {
  hasCIFailures?: boolean
  hasReviews?: boolean
  isApproved?: boolean
}

// Custom prompt from storage (re-export from @codelobby/data for compatibility)
export type { CustomPrompt } from '@data'

// Linked PR chat info (used for posting comments)
export interface LinkedPRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
}

// Review types (for Claude-generated PR reviews)
export type {
  RawReviewData,
  ReviewComment,
  ReviewData,
  ReviewFileGroup,
  ReviewPreviewState,
  ReviewVerdict
} from './review'

// Main AIChat panel props - simplified
export interface AIChatPanelProps {
  onClose: () => void
  user?: GitHubUser | null
  selectedPR?: SelectedPR | null
}
