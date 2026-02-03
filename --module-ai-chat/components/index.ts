/**
 * Component exports for AI Chat module
 */

// Re-export ThinkingSection from UI kit for backwards compatibility
export { ThinkingSection, type ThinkingSectionProps, type ToolActivity } from '@ui-kit'
// UI Components
export { AddCustomPromptModal, type AddCustomPromptModalProps } from './AddCustomPromptModal'
// Main component
export { AIChatPanel } from './AIChat'
// API Key Input
export { ApiKeyInput } from './ApiKeyInput'
export {
  ChatLoadingSkeleton,
  ContextSyncBanner,
  type ContextSyncBannerProps,
  ErrorBanner,
  type ErrorBannerProps,
  NoPRSelectedState,
  type NoPRSelectedStateProps,
  PRContextBanner,
  type PRContextBannerProps,
  PREmptyState,
  type PREmptyStateProps
} from './ChatEmptyStates'
export { ChatHeader, type ChatHeaderProps } from './ChatHeader'
export { ChatInput, type ChatInputProps } from './ChatInput'
export { ChatSettings, type ChatSettingsProps } from './ChatSettings'
// Claude Code components
export { ClaudeCodeBanner } from './ClaudeCodeBanner'
export { ContextIndicator, type ContextIndicatorProps } from './ContextIndicator'
export { MessageBubble, type MessageBubbleProps } from './MessageBubble'
export { MessageErrorBoundary } from './MessageErrorBoundary'
export { QuickActions, type QuickActionsProps } from './QuickActions'
export { ReviewPreviewModal, type ReviewPreviewModalProps } from './ReviewPreviewModal'
export { StreamingBubble, type StreamingBubbleProps } from './StreamingBubble'
export {
  StreamingStateIndicator,
  type StreamingStateIndicatorProps
} from './StreamingStateIndicator'
export { ToolActivityIndicator } from './ToolActivityIndicator'

// Note: VirtualizedMessageList, QueuedMessageBubble are not exported (unused).
// They remain in the codebase for potential future use.
