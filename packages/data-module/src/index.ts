/**
 * @codelobby/data-module
 *
 * The "Kitchen" - fetches data from APIs and updates the shared store.
 *
 * This module:
 * - Listens for action events from UI modules
 * - Calls Electron IPC APIs
 * - Updates the shared store with results
 *
 * UI Modules never call APIs directly - they emit actions, and this module handles them.
 */

/// <reference path="../../../src/preload/electron-api.d.ts" />

import type {
  ChatMessage,
  GitHubUser,
  PRChat,
  PullRequest,
  Repository
} from '@codelobby/shared-store'
import { onAction, Store } from '@codelobby/shared-store'
import { buildPRSystemPrompt, type ChangedFile } from './prompts/pr-system-prompt'

// ═══════════════════════════════════════════════════════════════════════════
// CLEANUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const cleanupFunctions: Array<() => void> = []

/**
 * Initialize the data module.
 * Call this once at app startup.
 */
export function initDataModule(): void {
  console.log('[data-module] Initializing...')

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:validate-token', async () => {
      Store.loading.auth.value = true
      try {
        const result = await window.electron.validateToken()
        if (result.valid && result.user) {
          Store.user.value = result.user as GitHubUser
          Store.isAuthenticated.value = true
        } else {
          Store.user.value = null
          Store.isAuthenticated.value = false
        }
      } catch (error) {
        Store.errors.auth.value = error as Error
        Store.isAuthenticated.value = false
      } finally {
        Store.loading.auth.value = false
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:sign-in', async ({ token }) => {
      Store.loading.auth.value = true
      try {
        await window.electron.setToken(token)
        const result = await window.electron.validateToken()
        if (result.valid && result.user) {
          Store.user.value = result.user as GitHubUser
          Store.isAuthenticated.value = true
        }
      } catch (error) {
        Store.errors.auth.value = error as Error
      } finally {
        Store.loading.auth.value = false
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:sign-out', async () => {
      await window.electron.clearToken()
      Store.user.value = null
      Store.isAuthenticated.value = false
      Store.repos.value = []
      Store.prs.value = []
      Store.chatHistory.value = []
      Store.prChats.value = []
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // GITHUB HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:fetch-repos', async () => {
      Store.loading.repos.value = true
      Store.errors.github.value = null
      try {
        const result = await window.electron.fetchContributedRepos()
        if (result.success && result.data) {
          Store.repos.value = result.data as Repository[]
        } else {
          Store.errors.github.value = new Error(result.error || 'Failed to fetch repos')
        }
      } catch (error) {
        Store.errors.github.value = error as Error
      } finally {
        Store.loading.repos.value = false
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:fetch-prs', async ({ repos }) => {
      Store.loading.prs.value = true
      Store.errors.github.value = null
      try {
        const result = await window.electron.fetchAllPRsForRepos(repos)
        if (result.success && result.data) {
          Store.prs.value = result.data as PullRequest[]
          if (result.rateLimit) {
            Store.rateLimit.value = result.rateLimit
          }
        } else {
          Store.errors.github.value = new Error(result.error || 'Failed to fetch PRs')
        }
      } catch (error) {
        Store.errors.github.value = error as Error
      } finally {
        Store.loading.prs.value = false
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:refresh-repo', async ({ repoFullName }) => {
      try {
        const result = await window.electron.refreshRepoPRs(repoFullName)
        if (result.success && result.data) {
          // Update PRs for this repo only
          const otherPRs = Store.prs.value.filter((pr) => pr.base.repo.full_name !== repoFullName)
          Store.prs.value = [...otherPRs, ...(result.data as PullRequest[])]
          if (result.rateLimit) {
            Store.rateLimit.value = result.rateLimit
          }
        }
      } catch (error) {
        console.error('[data-module] Failed to refresh repo:', error)
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:select-pr', async ({ pr }) => {
      Store.selectedPR.value = pr
      Store.prDetailOpen.value = pr !== null
    })
  )

  cleanupFunctions.push(
    onAction('action:select-repos', async ({ repos }) => {
      Store.selectedRepos.value = repos
      await window.electron.setSelectedRepos(repos ?? [])
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // AI HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:send-ai-message', async ({ message, systemContext }) => {
      Store.isAILoading.value = true
      Store.aiThinking.value = ''
      Store.errors.ai.value = null

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
      Store.chatHistory.value = [...Store.chatHistory.value, userMessage]

      try {
        const result = await window.electron.sendChatMessageStreaming(message, systemContext)

        if (!result.success || !result.streamId) {
          throw new Error(result.error || 'Failed to start chat stream')
        }

        let assistantContent = ''
        let thinkingContent = ''

        // Subscribe to stream chunks
        const unsubscribe = window.electron.onChatStreamChunk((chunk) => {
          if (chunk.streamId !== result.streamId) return

          if (chunk.type === 'thinking' && chunk.thinking) {
            thinkingContent += chunk.thinking
            Store.aiThinking.value = thinkingContent
          } else if (chunk.type === 'text' && chunk.content) {
            assistantContent += chunk.content
          } else if (chunk.type === 'done') {
            // Add assistant message
            const assistantMessage: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: assistantContent,
              timestamp: new Date().toISOString(),
              thinking: thinkingContent || undefined
            }
            Store.chatHistory.value = [...Store.chatHistory.value, assistantMessage]
            Store.isAILoading.value = false
            unsubscribe()
          } else if (chunk.type === 'error') {
            Store.errors.ai.value = new Error(chunk.error || 'AI streaming error')
            Store.isAILoading.value = false
            unsubscribe()
          }
        })
      } catch (error) {
        Store.errors.ai.value = error as Error
        Store.isAILoading.value = false
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:create-pr-chat', async ({ pr }) => {
      const prId = `${pr.base.repo.full_name}#${pr.number}`

      // Check if chat already exists
      const existing = Store.prChats.value.find((c) => c.prId === prId)
      if (existing) {
        Store.activePRChatId.value = existing.prId
        return
      }

      // Fetch changed files with diffs for richer AI context
      let changedFiles: ChangedFile[] | undefined
      try {
        const filesResult = await window.electron.fetchPRFiles(
          pr.base.repo.owner.login,
          pr.base.repo.name,
          pr.number
        )
        if (filesResult.success && filesResult.data) {
          changedFiles = filesResult.data as ChangedFile[]
        }
      } catch (error) {
        // Log but don't fail chat creation if files can't be fetched
        console.warn('Failed to fetch PR files for chat context:', error)
      }

      // Build PR system context for AI (with file diffs if available)
      const systemContext = buildPRSystemPrompt(pr, changedFiles)

      // Create new PR chat with system context
      const prChat = await window.electron.createPRChat(
        prId,
        pr.number,
        pr.title,
        pr.base.repo.full_name,
        systemContext
      )
      Store.prChats.value = [...Store.prChats.value, prChat as PRChat]
      Store.activePRChatId.value = prChat.prId
      await window.electron.setActivePRChatId(prChat.prId)
    })
  )

  cleanupFunctions.push(
    onAction('action:clear-chat-history', async () => {
      Store.chatHistory.value = []
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // LAYOUT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:set-view-mode', async ({ mode }) => {
      Store.viewMode.value = mode
      await window.electron.setViewMode(mode)
    })
  )

  cleanupFunctions.push(
    onAction('action:toggle-pr-detail', async () => {
      const newState = !Store.prDetailOpen.value
      Store.prDetailOpen.value = newState
      await window.electron.setPRDetailPanel({ isOpen: newState })
    })
  )

  cleanupFunctions.push(
    onAction('action:toggle-ai-panel', async () => {
      const newState = !Store.aiPanelOpen.value
      Store.aiPanelOpen.value = newState
      await window.electron.setAIPanel({ isOpen: newState })
    })
  )

  cleanupFunctions.push(
    onAction('action:resize-pr-detail', async ({ width }) => {
      Store.prDetailWidth.value = width
      await window.electron.setPRDetailPanel({ width })
    })
  )

  cleanupFunctions.push(
    onAction('action:resize-ai-panel', async ({ width }) => {
      Store.aiPanelWidth.value = width
      await window.electron.setAIPanel({ width })
    })
  )

  cleanupFunctions.push(
    onAction('action:resize-explorer', async ({ width }) => {
      Store.explorerWidth.value = width
      await window.electron.setIDEViewSettings({ sidebarWidth: width })
    })
  )

  cleanupFunctions.push(
    onAction('action:toggle-repo-expanded', async ({ repoFullName }) => {
      const current = Store.expandedRepos.value
      const isExpanded = current.includes(repoFullName)
      const newExpanded = isExpanded
        ? current.filter((r) => r !== repoFullName)
        : [...current, repoFullName]
      Store.expandedRepos.value = newExpanded
      await window.electron.setIDEViewSettings({ expandedRepos: newExpanded })
    })
  )

  cleanupFunctions.push(
    onAction('action:set-expanded-repos', async ({ repos }) => {
      Store.expandedRepos.value = repos
      await window.electron.setIDEViewSettings({ expandedRepos: repos })
    })
  )

  cleanupFunctions.push(
    onAction('action:toggle-my-prs-filter', async ({ repoFullName }) => {
      const current = Store.myPRsRepos.value
      const isEnabled = current.includes(repoFullName)
      Store.myPRsRepos.value = isEnabled
        ? current.filter((r) => r !== repoFullName)
        : [...current, repoFullName]
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // CANVAS HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:set-card-layouts', async ({ layouts }) => {
      Store.cardLayouts.value = layouts
      await window.electron.setCardLayouts(layouts)
    })
  )

  cleanupFunctions.push(
    onAction('action:set-repo-color', async ({ repoFullName, color }) => {
      Store.repoColors.value = { ...Store.repoColors.value, [repoFullName]: color }
      await window.electron.setRepoColor(repoFullName, color)
    })
  )

  cleanupFunctions.push(
    onAction('action:set-repo-minimized', async ({ repoFullName, minimized }) => {
      const current = Store.minimizedRepos.value
      if (minimized) {
        if (!current.includes(repoFullName)) {
          Store.minimizedRepos.value = [...current, repoFullName]
        }
      } else {
        Store.minimizedRepos.value = current.filter((r) => r !== repoFullName)
      }
      await window.electron.setRepoMinimized(repoFullName, minimized)
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // DATA MANAGEMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:clear-cache', async () => {
      await window.electron.clearAllData()
      Store.repos.value = []
      Store.prs.value = []
    })
  )

  cleanupFunctions.push(
    onAction('action:factory-reset', async () => {
      await window.electron.factoryReset()
      // Reset all store values to defaults
      Store.user.value = null
      Store.isAuthenticated.value = false
      Store.repos.value = []
      Store.prs.value = []
      Store.selectedRepos.value = null
      Store.selectedPR.value = null
      Store.chatHistory.value = []
      Store.prChats.value = []
      Store.activePRChatId.value = null
      Store.viewMode.value = 'canvas'
      Store.prDetailOpen.value = false
      Store.aiPanelOpen.value = false
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // INITIAL DATA LOAD
  // ─────────────────────────────────────────────────────────────────────────

  loadInitialData()

  console.log('[data-module] Initialized')
}

/**
 * Wait for window.electron to be available (preload script)
 */
async function waitForElectron(): Promise<void> {
  if (typeof window !== 'undefined' && window.electron) {
    return
  }
  // Wait up to 5 seconds for electron to be available
  for (let i = 0; i < 50; i++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    if (typeof window !== 'undefined' && window.electron) {
      return
    }
  }
  throw new Error('window.electron not available after 5 seconds')
}

/**
 * Load initial data from persisted storage.
 */
async function loadInitialData(): Promise<void> {
  try {
    await waitForElectron()

    // Load view mode
    const viewMode = await window.electron.getViewMode()
    Store.viewMode.value = viewMode

    // Load panel states
    const aiPanel = await window.electron.getAIPanel()
    Store.aiPanelOpen.value = aiPanel.isOpen
    Store.aiPanelWidth.value = aiPanel.width

    const prDetailPanel = await window.electron.getPRDetailPanel()
    Store.prDetailOpen.value = prDetailPanel.isOpen
    Store.prDetailWidth.value = prDetailPanel.width

    // Load IDE view settings
    const ideSettings = await window.electron.getIDEViewSettings()
    Store.explorerWidth.value = ideSettings.sidebarWidth
    Store.expandedRepos.value = ideSettings.expandedRepos

    // Load selected repos
    const selectedRepos = await window.electron.getSelectedRepos()
    Store.selectedRepos.value = selectedRepos

    // Load canvas settings
    const cardLayouts = await window.electron.getCardLayouts()
    Store.cardLayouts.value = cardLayouts || []

    const repoColors = await window.electron.getRepoColors()
    Store.repoColors.value = repoColors || {}

    const minimizedRepos = await window.electron.getMinimizedRepos()
    Store.minimizedRepos.value = minimizedRepos || []

    // Load PR chats
    const prChats = await window.electron.getPRChats()
    Store.prChats.value = prChats

    // Load active chat ID
    const activePRChatId = await window.electron.getActivePRChatId()
    Store.activePRChatId.value = activePRChatId

    // Load Claude API key and AI settings
    const claudeApiKey = await window.electron.getClaudeApiKey()
    Store.claudeApiKey.value = claudeApiKey

    const selectedModel = await window.electron.getSelectedModel()
    Store.selectedModel.value = selectedModel

    const enableThinking = await window.electron.getEnableThinking()
    Store.enableThinking.value = enableThinking

    // Load general chat history
    const chatHistory = await window.electron.getChatHistory()
    Store.chatHistory.value = chatHistory

    // If authenticated, fetch repos and PRs
    if (Store.isAuthenticated.value) {
      console.log('[data-module] User authenticated, fetching repos...')
      Store.loading.repos.value = true
      try {
        const reposResult = await window.electron.fetchContributedRepos()
        if (reposResult.success && reposResult.data) {
          const repos = reposResult.data as Repository[]
          Store.repos.value = repos

          // Fetch PRs for selected repos (or all if none selected)
          const reposToFetch = selectedRepos || repos.map((r) => r.full_name)
          if (reposToFetch.length > 0) {
            Store.loading.prs.value = true
            const prsResult = await window.electron.fetchAllPRsForRepos(reposToFetch)
            if (prsResult.success && prsResult.data) {
              Store.prs.value = prsResult.data as PullRequest[]
              if (prsResult.rateLimit) {
                Store.rateLimit.value = prsResult.rateLimit
              }
            }
            Store.loading.prs.value = false
          }
        }
      } catch (error) {
        console.error('[data-module] Failed to fetch repos:', error)
      } finally {
        Store.loading.repos.value = false
      }
    }

    console.log('[data-module] Initial data loaded')
  } catch (error) {
    console.error('[data-module] Failed to load initial data:', error)
  }
}

/**
 * Cleanup the data module.
 * Call this when the app is shutting down.
 */
export function destroyDataModule(): void {
  cleanupFunctions.forEach((cleanup) => {
    cleanup()
  })
  cleanupFunctions.length = 0
  console.log('[data-module] Destroyed')
}
