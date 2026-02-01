/**
 * Persistence Module - Shared Types
 *
 * Types shared between main process and renderer process.
 * These are the types used for IPC communication.
 */

// =============================================================================
// Database Result Types (all IPC handlers return this wrapper)
// =============================================================================

export interface DbResult<T> {
  success: boolean
  data?: T
  error?: string
}

// =============================================================================
// Conversation Types
// =============================================================================

export interface Conversation {
  id: string
  sessionType: 'pr' | 'general'
  repoFullName: string | null
  prNumber: number | null
  prTitle: string | null
  createdAt: number
  updatedAt: number
}

export interface NewConversation {
  id: string
  sessionType: 'pr' | 'general'
  repoFullName?: string | null
  prNumber?: number | null
  prTitle?: string | null
  createdAt?: number
  updatedAt?: number
}

// =============================================================================
// Message Types
// =============================================================================

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  thinking: string | null
  displayLabel: string | null
  createdAt: number
}

export interface NewMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string | null
  displayLabel?: string | null
  createdAt?: number
}

// =============================================================================
// Custom Prompt Types
// =============================================================================

export interface CustomPrompt {
  id: string
  label: string
  prompt: string
  createdAt: number
}

export interface NewCustomPrompt {
  id: string
  label: string
  prompt: string
  createdAt?: number
}

// =============================================================================
// AI Usage Types
// =============================================================================

export interface AIUsageRecord {
  id: number
  model: string
  inputTokens: number
  outputTokens: number
  inputCostUsd: number
  outputCostUsd: number
  createdAt: number
}

export interface NewAIUsageRecord {
  model: string
  inputTokens: number
  outputTokens: number
  inputCostUsd: number
  outputCostUsd: number
}

export interface AIUsageStats {
  totalInputTokens: number
  totalOutputTokens: number
  totalInputCostUsd: number
  totalOutputCostUsd: number
  totalCostUsd: number
  recordCount: number
}

// =============================================================================
// Conversation with Messages (eager load)
// =============================================================================

export interface ConversationWithMessages {
  conversation: Conversation
  messages: Message[]
}
