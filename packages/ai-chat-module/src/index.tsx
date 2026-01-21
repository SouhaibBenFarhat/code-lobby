/**
 * @codelobby/ai-chat-module
 *
 * AI chat panel powered by Claude.
 * Fully self-contained using shared-store.
 */

/// <reference path="../../../src/preload/electron-api.d.ts" />

import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { registerToSlot } from '@codelobby/slot-system'
import { AIChatPanel } from './components/AIChat'

// Re-export components
export { AIChatPanel } from './components/AIChat'

/**
 * AIChatWrapper connects AIChatPanel to the shared store.
 */
function AIChatWrapper() {
  const user = useSignal(Store.user)
  const linkedPRChat = useSignal(Store.linkedPRChat)
  const selectedPR = useSignal(Store.selectedPR)
  const aiPanelOpen = useSignal(Store.aiPanelOpen)

  // Don't render if panel is closed
  if (!aiPanelOpen) {
    return null
  }

  const handleClose = () => {
    Actions.toggleAIPanel()
  }

  const handleClosePRChat = async () => {
    if (linkedPRChat) {
      await window.electron.deletePRChat(linkedPRChat.prId)
      Store.activePRChatId.value = null
      Store.linkedPRChat.value = null
    }
  }

  const handleSwitchToPRChat = async (prId: string) => {
    const chat = await window.electron.getPRChat(prId)
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

  const handleStartPRChat = async () => {
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
