/**
 * @codelobby/ai-chat-module
 *
 * AI Chat Module - Automatically follows selected PR
 */

import { useIsAuthenticated, useSelectedPR, useSetAIPanel, useUser } from '@data'
import { registerToSlot } from '@slot-system'
import { AIChatPanel } from './components/AIChat'
import type { SelectedPR } from './types'

export {
  AddCustomPromptModal,
  type AddCustomPromptModalProps,
  ChatLoadingSkeleton,
  ContextIndicator,
  type ContextIndicatorProps,
  ContextSyncBanner,
  type ContextSyncBannerProps,
  ErrorBanner,
  type ErrorBannerProps,
  MessageBubble,
  type MessageBubbleProps,
  MessageErrorBoundary,
  NoPRSelectedState,
  type NoPRSelectedStateProps,
  PRContextBanner,
  type PRContextBannerProps,
  PREmptyState,
  type PREmptyStateProps,
  QuickActions,
  type QuickActionsProps,
  StreamingBubble,
  type StreamingBubbleProps
} from './components'
// Component exports
export { AIChatPanel } from './components/AIChat'

export { CONTEXT_WINDOWS, DEFAULT_CONTEXT_WINDOW } from './constants'

export { useThrottledValue } from './hooks'

export type {
  AIChatPanelProps,
  ChatMessage,
  ClaudeModel,
  CustomPrompt,
  GitHubUser,
  LinkedPRChat,
  PRContext,
  QueuedMessage,
  QuickPrompt,
  ReviewComment,
  ReviewData,
  ReviewFileGroup,
  ReviewPreviewState,
  ReviewVerdict,
  SelectedPR,
  StreamingState
} from './types'

export { calculateTotalTokens, estimateTokens } from './utils/tokens'

/**
 * AIChatWrapper - Connects AI Chat to the slot system
 *
 * The chat automatically follows the currently selected PR:
 * - When you select a PR in IDE View or Canvas, the chat switches to that PR's conversation
 * - If there's an existing conversation, it loads those messages
 * - If not, it shows the empty state to start a new chat
 */
function AIChatWrapper(): React.JSX.Element | null {
  const { data: authData } = useUser()
  const { data: selectedPR } = useSelectedPR()
  const { isAuthenticated } = useIsAuthenticated()
  const setAIPanel = useSetAIPanel()

  // Visibility and the open/close slide lifecycle are owned by App.tsx (same as
  // the network module). Keeping this mounted regardless of the open flag lets
  // the content ride the shell's slide-out instead of vanishing on dismiss.
  if (!isAuthenticated) {
    return null
  }

  const handleClose = (): void => {
    setAIPanel.mutate({ isOpen: false })
  }

  return (
    <AIChatPanel
      onClose={handleClose}
      user={authData?.user ?? null}
      selectedPR={selectedPR as SelectedPR | null}
    />
  )
}

// Self-register to the ai-panel slot
registerToSlot({
  id: 'ai-chat',
  slot: 'ai-panel',
  component: AIChatWrapper,
  order: 0
})
