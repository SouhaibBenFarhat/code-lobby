/**
 * Shared types for the AI Chat module
 */

// Chat message structure (re-export from @codelobby/data for compatibility)
export type { ChatMessage } from '@codelobby/data'

// Postable comment metadata that Claude can embed in responses
export interface PostableComment {
  file: string
  line: number
}

// A content section that may or may not have a postable comment
export interface ContentSection {
  content: string // The displayable content (POSTABLE stripped)
  postable: PostableComment | null // If this section has a postable finding
  prComment: string | null // The extracted PR comment to post (if any)
}

// Claude model info (re-export from @codelobby/data for compatibility)
export type { ClaudeModel } from '@codelobby/data'

// GitHub user for avatar display
export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

// Linked PR chat info (kept for backwards compatibility)
export interface LinkedPRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
}

// Selected PR details
export interface SelectedPR {
  number: number
  title: string
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

// State for tracking posted comments and posting in progress
export interface PostingState {
  [key: string]: 'posting' | 'posted' | 'error'
}

// Main AIChat panel props - simplified
export interface AIChatPanelProps {
  onClose: () => void
  user?: GitHubUser | null
  selectedPR?: SelectedPR | null
}
