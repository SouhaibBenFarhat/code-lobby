/**
 * @codelobby/ai-chat-module
 *
 * AI Chat Module - Uses TanStack Query
 */

import {
  useAIPanel,
  useCreatePRChat,
  useIsAuthenticated,
  useSelectedPR,
  useSetAIPanel,
  useUser
} from '@codelobby/data'
import { registerToSlot } from '@codelobby/slot-system'
import { AIChatPanel } from './components/AIChat'

// Component exports
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
export { AIChatPanel } from './components/AIChat'

export {
  CONTEXT_WINDOWS,
  DEFAULT_CONTEXT_WINDOW,
  getPRQuickPrompts,
  POSTABLE_END,
  POSTABLE_START
} from './constants'

export { useThrottledValue } from './hooks'

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
  PRContext,
  QueuedMessage,
  QuickPrompt,
  SelectedPR,
  StreamingState
} from './types'

export {
  extractPostable,
  extractPRComment,
  parseContentSections,
  parsePostableComments,
  stripPostableMetadata
} from './utils'
export { calculateTotalTokens, estimateTokens } from './utils/tokens'

function AIChatWrapper(): React.JSX.Element | null {
  const { data: authData } = useUser()
  const { data: aiPanelData } = useAIPanel()
  const { data: selectedPR } = useSelectedPR()
  const { isAuthenticated } = useIsAuthenticated()
  const setAIPanel = useSetAIPanel()
  const createPRChat = useCreatePRChat()

  const aiPanelOpen = aiPanelData?.isOpen ?? false

  // Don't render if panel is closed or not authenticated
  if (!aiPanelOpen || !isAuthenticated) {
    return null
  }

  const handleClose = (): void => {
    setAIPanel.mutate({ isOpen: false })
  }

  const handleClearLinkedPRChat = (): void => {
    // TODO: implement clear linked PR chat
  }

  const handleStartPRChat = async (): Promise<void> => {
    if (selectedPR) {
      createPRChat.mutate({
        prId: `${selectedPR.base.repo.full_name}#${selectedPR.number}`,
        prNumber: selectedPR.number,
        prTitle: selectedPR.title,
        repoFullName: selectedPR.base.repo.full_name
      })
    }
  }

  return (
    <AIChatPanel
      onClose={handleClose}
      user={authData?.user ?? null}
      linkedPRChat={null}
      onClearLinkedPRChat={handleClearLinkedPRChat}
      selectedPR={selectedPR ?? null}
      onStartPRChat={handleStartPRChat}
    />
  )
}

// Self-register to the ai-panel slot (visibility handled in component)
registerToSlot({
  id: 'ai-chat',
  slot: 'ai-panel',
  component: AIChatWrapper,
  order: 0
})
