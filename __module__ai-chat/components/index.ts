/**
 * Component exports for AI Chat module
 */

// UI Components
export { AddCustomPromptModal, type AddCustomPromptModalProps } from './AddCustomPromptModal'
// Main component
export { AIChatPanel } from './AIChat'
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
export { ContextIndicator, type ContextIndicatorProps } from './ContextIndicator'
export { MessageBubble, type MessageBubbleProps } from './MessageBubble'
export { MessageErrorBoundary } from './MessageErrorBoundary'
export { QuickActions, type QuickActionsProps } from './QuickActions'
export { ReviewPreviewModal, type ReviewPreviewModalProps } from './ReviewPreviewModal'
export { StreamingBubble, type StreamingBubbleProps } from './StreamingBubble'

// Note: VirtualizedMessageList, QueuedMessageBubble are not exported (unused).
// They remain in the codebase for potential future use.
