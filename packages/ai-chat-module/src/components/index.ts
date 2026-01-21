/**
 * Component exports for AI Chat module
 */

// Message Components
export type { AddCustomPromptModalProps } from './AddCustomPromptModal'
export { AddCustomPromptModal } from './AddCustomPromptModal'
// Main component
export { AIChatPanel } from './AIChat'
export {
  ChatLoadingSkeleton,
  ContextSyncBanner,
  type ContextSyncBannerProps,
  DefaultEmptyState,
  type DefaultEmptyStateProps,
  ErrorBanner,
  type ErrorBannerProps,
  PRContextBanner,
  type PRContextBannerProps,
  PREmptyState,
  type PREmptyStateProps
} from './ChatEmptyStates'
// Chat UI Components
export type { ChatHeaderProps } from './ChatHeader'
export { ChatHeader } from './ChatHeader'
export type { ChatInputProps } from './ChatInput'
export { ChatInput } from './ChatInput'
export type { ChatSettingsProps } from './ChatSettings'
export { ChatSettings } from './ChatSettings'
export type { ContextIndicatorProps } from './ContextIndicator'
export { ContextIndicator } from './ContextIndicator'
export type { MessageBubbleProps } from './MessageBubble'
export { MessageBubble } from './MessageBubble'
export { MessageErrorBoundary } from './MessageErrorBoundary'
export type { QueuedMessageBubbleProps } from './QueuedMessageBubble'
export { QueuedMessageBubble } from './QueuedMessageBubble'
export type { QuickActionsProps } from './QuickActions'
export { QuickActions } from './QuickActions'
export type { StreamingBubbleProps } from './StreamingBubble'
export { StreamingBubble } from './StreamingBubble'
export type { VirtualizedMessageListProps } from './VirtualizedMessageList'
export { VirtualizedMessageList } from './VirtualizedMessageList'
