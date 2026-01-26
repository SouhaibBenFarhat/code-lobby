/**
 * Shared types for the AI Chat module
 */

// Chat message structure (re-export from @codelobby/data for compatibility)
// Claude model info (re-export from @codelobby/data for compatibility)
export type { ChatMessage, ClaudeModel } from '@codelobby/data'

// GitHub user for avatar display
export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

// Selected PR details
export interface SelectedPR {
  id: string // GraphQL node ID for mutations
  number: number
  title: string
  body?: string
  changed_files?: number
  head: {
    sha: string
  }
  base: {
    repo: {
      full_name: string
      owner: {
        login: string
      }
      name: string
    }
  }
  checks?: {
    state: 'pending' | 'success' | 'failure' | 'error'
    total_count: number
  }
}

// Streaming state for the current assistant message being generated
export interface StreamingState {
  content: string
  thinking: string
  isStreaming: boolean
}

// Queued message waiting to be sent
export interface QueuedMessage {
  id: string
  content: string
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
export type { CustomPrompt } from '@codelobby/data'

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
