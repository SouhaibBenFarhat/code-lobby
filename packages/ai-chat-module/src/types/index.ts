/**
 * Shared types for the AI Chat module
 */

// Chat message structure
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
}

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

// Claude model info
export interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
}

// GitHub user for avatar display
export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

// Linked PR chat info
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

// Custom prompt from storage
export interface CustomPrompt {
  id: string
  label: string
  prompt: string
  createdAt: string
}

// State for tracking posted comments and posting in progress
export interface PostingState {
  [key: string]: 'posting' | 'posted' | 'error'
}

// Main AIChat panel props
export interface AIChatPanelProps {
  onClose: () => void
  user?: GitHubUser | null
  linkedPRChat?: LinkedPRChat | null
  onClearLinkedPRChat?: () => void
  selectedPR?: SelectedPR | null
  onStartPRChat?: (pr: SelectedPR) => void
}
