/**
 * @codelobby/ai-chat-module
 *
 * AI Chat Module - Main entry point
 * AI chat panel powered by Claude, fully self-contained using shared-store.
 *
 * Architecture:
 * - types/         - Shared TypeScript interfaces
 * - constants/     - Configuration constants and prompt definitions
 * - utils/         - Utility functions (postable parsing, token estimation)
 * - hooks/         - Custom React hooks (useThrottledValue)
 * - components/    - UI components (split for better testing/extensibility)
 */

import { api } from '@codelobby/api'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { AIChatPanel } from './components/AIChat'

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS - Components, Types, Utils for external consumers
// ═══════════════════════════════════════════════════════════════════════════

// Component building blocks - for custom implementations
export type {
  AddCustomPromptModalProps,
  ContextIndicatorProps,
  MessageBubbleProps,
  QueuedMessageBubbleProps,
  QuickActionsProps,
  StreamingBubbleProps,
  VirtualizedMessageListProps
} from './components'
export {
  AddCustomPromptModal,
  ContextIndicator,
  MessageBubble,
  MessageErrorBoundary,
  QueuedMessageBubble,
  QuickActions,
  StreamingBubble,
  VirtualizedMessageList
} from './components'
// Main component export
export { AIChatPanel } from './components/AIChat'

// Constants - for external consumers who want to customize prompts
export {
  CONTEXT_WINDOWS,
  DEFAULT_CONTEXT_WINDOW,
  GENERAL_QUICK_PROMPTS,
  getPRQuickPrompts,
  POSTABLE_END,
  POSTABLE_START
} from './constants'

// Hooks - for external consumers
export { useThrottledValue } from './hooks'

// Types - for external consumers
export type {
  AIChatPanelProps,
  ChatMessage,
  ClaudeModel,
  ContentSection,
  CustomPrompt,
  GitHubUser,
  LinkedPRChat,
  PostableComment,
  PostingState,
  PRChatInfo,
  PRContext,
  QueuedMessage,
  QuickPrompt,
  SelectedPR,
  StreamingState
} from './types'

// Utils - for external consumers who need postable parsing
export {
  extractPostable,
  extractPRComment,
  parseContentSections,
  parsePostableComments,
  stripPostableMetadata
} from './utils'
export { calculateTotalTokens, estimateTokens } from './utils/tokens'

// ═══════════════════════════════════════════════════════════════════════════
// SLOT SYSTEM INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * AIChatWrapper connects AIChatPanel to the shared store.
 * This wrapper allows the stateful AIChatPanel to be used with the slot system.
 */
function AIChatWrapper(): React.JSX.Element | null {
  const user = useSignal(Store.user)
  const linkedPRChat = useSignal(Store.linkedPRChat)
  const selectedPR = useSignal(Store.selectedPR)
  const aiPanelOpen = useSignal(Store.aiPanelOpen)

  // Don't render if panel is closed
  if (!aiPanelOpen) {
    return null
  }

  const handleClose = (): void => {
    Actions.toggleAIPanel()
  }

  const handleClosePRChat = async (): Promise<void> => {
    if (linkedPRChat) {
      await api.ai.deletePRChat(linkedPRChat.prId)
      Store.activePRChatId.value = null
      Store.linkedPRChat.value = null
    }
  }

  const handleSwitchToPRChat = async (prId: string): Promise<void> => {
    const chat = await api.ai.getPRChat(prId)
    if (chat) {
      Store.activePRChatId.value = chat.prId
      Store.linkedPRChat.value = {
        prId: chat.prId,
        prNumber: chat.prNumber,
        prTitle: chat.prTitle,
        repoFullName: chat.repoFullName
      }
    }
  }

  const handleStartPRChat = async (): Promise<void> => {
    if (selectedPR) {
      Actions.createPRChat(selectedPR)
    }
  }

  return (
    <AIChatPanel
      onClose={handleClose}
      user={user}
      linkedPRChat={linkedPRChat}
      onClosePRChat={handleClosePRChat}
      onSwitchToPRChat={handleSwitchToPRChat}
      selectedPR={selectedPR}
      onStartPRChat={handleStartPRChat}
    />
  )
}

// Self-register to the ai-panel slot
registerToSlot({
  id: 'ai-chat',
  slot: 'ai-panel',
  component: AIChatWrapper,
  order: 0,
  visible: () => {
    const aiPanelOpen = Store.aiPanelOpen.value
    const isAuthenticated = Store.isAuthenticated.value
    return aiPanelOpen && isAuthenticated
  }
})
