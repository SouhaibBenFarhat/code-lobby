/**
 * @codelobby/data-module
 *
 * The "Kitchen" - fetches data from APIs and updates the shared store.
 *
 * This module:
 * - Listens for action events from UI modules
 * - Calls Electron IPC APIs via @codelobby/api (with automatic logging)
 * - Updates the shared store with results
 *
 * UI Modules never call APIs directly - they emit actions, and this module handles them.
 */

import { api } from '@codelobby/api'
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
        const result = await api.github.validateToken()
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
        await api.github.setToken(token)
        const result = await api.github.validateToken()
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
      await api.github.clearToken()
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
        const result = await api.github.fetchContributedRepos()
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
        const result = await api.github.fetchAllPRsForRepos(repos)
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
        const result = await api.github.refreshRepoPRs(repoFullName)
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
    onAction('action:refresh-pr-detail', async ({ repoFullName, prNumber }) => {
      Store.loading.prDetail.value = true
      try {
        const result = await api.github.refreshRepoPRs(repoFullName)
        if (result.success && result.data) {
          const newPRs = result.data as PullRequest[]

          // Update PRs for this repo
          const otherPRs = Store.prs.value.filter((pr) => pr.base.repo.full_name !== repoFullName)
          Store.prs.value = [...otherPRs, ...newPRs]

          // Update selectedPR if it matches the refreshed PR
          const currentSelectedPR = Store.selectedPR.value
          if (
            currentSelectedPR &&
            currentSelectedPR.base.repo.full_name === repoFullName &&
            currentSelectedPR.number === prNumber
          ) {
            const refreshedPR = newPRs.find((pr) => pr.number === prNumber)
            if (refreshedPR) {
              Store.selectedPR.value = refreshedPR
            }
          }

          if (result.rateLimit) {
            Store.rateLimit.value = result.rateLimit
          }
        }
      } catch (error) {
        console.error('[data-module] Failed to refresh PR detail:', error)
      } finally {
        Store.loading.prDetail.value = false
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
      await api.settings.setSelectedRepos(repos ?? [])
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
        const result = await api.ai.sendChatMessageStreaming(message, systemContext)

        if (!result.success || !result.streamId) {
          throw new Error(result.error || 'Failed to start chat stream')
        }

        let assistantContent = ''
        let thinkingContent = ''

        // Subscribe to stream chunks
        const unsubscribe = api.ai.onChatStreamChunk((chunk) => {
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

  // Track in-progress chat creations to prevent duplicates
  const creatingChats = new Set<string>()

  cleanupFunctions.push(
    onAction('action:create-pr-chat', async ({ pr }) => {
      const prId = `${pr.base.repo.full_name}#${pr.number}`

      // Prevent duplicate creation if already in progress
      if (creatingChats.has(prId)) {
        return
      }

      // Check if chat already exists
      const existing = Store.prChats.value.find((c) => c.prId === prId)
      if (existing) {
        Store.activePRChatId.value = existing.prId
        Store.linkedPRChat.value = {
          prId: existing.prId,
          prNumber: existing.prNumber,
          prTitle: existing.prTitle,
          repoFullName: existing.repoFullName
        }
        return
      }

      // Mark as in-progress to prevent duplicate clicks
      creatingChats.add(prId)

      try {
        // Fetch changed files with diffs for richer AI context
        let changedFiles: ChangedFile[] | undefined
        try {
          const filesResult = await api.github.fetchPRFiles(
            pr.base.repo.owner.login,
            pr.base.repo.name,
            pr.number
          )
          if (filesResult.success && filesResult.data) {
            changedFiles = filesResult.data as ChangedFile[]
          }
        } catch (error) {
          console.warn('Failed to fetch PR files for chat context:', error)
        }

        // Build PR system context for AI (with file diffs if available)
        const systemContext = buildPRSystemPrompt(pr, changedFiles)

        // Create the chat in storage with system context
        const prChat = await api.ai.createPRChat(
          prId,
          pr.number,
          pr.title,
          pr.base.repo.full_name,
          systemContext
        )

        // Update store with the created chat
        Store.prChats.value = [...Store.prChats.value, prChat as PRChat]
        await api.ai.setActivePRChatId(prChat.prId)

        // NOW switch UI to the chat AFTER it's fully created with systemContext
        // This prevents the race condition where AIChatPanel.loadData() runs
        // before the chat exists in storage
        Store.linkedPRChat.value = {
          prId: prChat.prId,
          prNumber: prChat.prNumber,
          prTitle: prChat.prTitle,
          repoFullName: prChat.repoFullName
        }
        Store.activePRChatId.value = prChat.prId
      } finally {
        // Always remove from in-progress set
        creatingChats.delete(prId)
      }
    })
  )

  cleanupFunctions.push(
    onAction('action:switch-to-pr-chat', async ({ prId }) => {
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
    })
  )

  // CI Failure Analysis Handler (with streaming)
  // Track active stream subscriptions
  let ciAnalysisUnsubscribe: (() => void) | null = null

  cleanupFunctions.push(
    onAction('action:analyze-ci-failure', async ({ owner, repo, checkRunId, checkName }) => {
      // Set streaming state for this check
      Store.ciFailureAnalyses.value = {
        ...Store.ciFailureAnalyses.value,
        [checkRunId]: {
          checkRunId,
          checkName,
          summary: '',
          failureReason: '',
          streamingThinking: '',
          streamingContent: '',
          analyzedAt: Date.now(),
          isLoading: true,
          isStreaming: true
        }
      }

      // Unsubscribe from any previous stream
      if (ciAnalysisUnsubscribe) {
        ciAnalysisUnsubscribe()
        ciAnalysisUnsubscribe = null
      }

      try {
        // Start streaming analysis
        const result = await api.ai.streamCIFailureAnalysis({
          owner,
          repo,
          checkRunId,
          checkName
        })

        if (!result.success || !result.streamId) {
          Store.ciFailureAnalyses.value = {
            ...Store.ciFailureAnalyses.value,
            [checkRunId]: {
              ...Store.ciFailureAnalyses.value[checkRunId],
              isLoading: false,
              isStreaming: false,
              error: result.error || 'Failed to start analysis'
            }
          }
          return
        }

        const streamId = result.streamId

        // Subscribe to stream chunks
        ciAnalysisUnsubscribe = api.ai.onCIAnalysisStreamChunk((chunk) => {
          // Only process chunks for our stream
          if (chunk.streamId !== streamId) return

          const current = Store.ciFailureAnalyses.value[checkRunId]
          if (!current) return

          if (chunk.type === 'thinking' && chunk.thinking) {
            // Update streaming thinking in real-time
            Store.ciFailureAnalyses.value = {
              ...Store.ciFailureAnalyses.value,
              [checkRunId]: {
                ...current,
                streamingThinking: (current.streamingThinking || '') + chunk.thinking
              }
            }
          } else if (chunk.type === 'text' && chunk.content) {
            // Update streaming content
            Store.ciFailureAnalyses.value = {
              ...Store.ciFailureAnalyses.value,
              [checkRunId]: {
                ...current,
                streamingContent: (current.streamingContent || '') + chunk.content
              }
            }
          } else if (chunk.type === 'done' && chunk.fullResponse) {
            // Finalize the analysis
            Store.ciFailureAnalyses.value = {
              ...Store.ciFailureAnalyses.value,
              [checkRunId]: {
                checkRunId,
                checkName,
                summary: chunk.fullResponse.summary || 'Analysis completed',
                failureReason: chunk.fullResponse.failureReason || '',
                suggestedFix: chunk.fullResponse.suggestedFix,
                thinking: chunk.fullResponse.thinking,
                analyzedAt: Date.now(),
                isLoading: false,
                isStreaming: false
              }
            }
            // Cleanup subscription
            if (ciAnalysisUnsubscribe) {
              ciAnalysisUnsubscribe()
              ciAnalysisUnsubscribe = null
            }
          } else if (chunk.type === 'error') {
            Store.ciFailureAnalyses.value = {
              ...Store.ciFailureAnalyses.value,
              [checkRunId]: {
                ...current,
                isLoading: false,
                isStreaming: false,
                error: chunk.error || 'Analysis failed'
              }
            }
            // Cleanup subscription
            if (ciAnalysisUnsubscribe) {
              ciAnalysisUnsubscribe()
              ciAnalysisUnsubscribe = null
            }
          }
        })
      } catch (error) {
        Store.ciFailureAnalyses.value = {
          ...Store.ciFailureAnalyses.value,
          [checkRunId]: {
            checkRunId,
            checkName,
            summary: '',
            failureReason: '',
            analyzedAt: Date.now(),
            isLoading: false,
            isStreaming: false,
            error: (error as Error).message || 'Failed to analyze CI failure'
          }
        }
      }
    })
  )

  // Cleanup CI analysis subscription on module cleanup
  cleanupFunctions.push(() => {
    if (ciAnalysisUnsubscribe) {
      ciAnalysisUnsubscribe()
      ciAnalysisUnsubscribe = null
    }
  })

  // ─────────────────────────────────────────────────────────────────────────
  // LAYOUT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:set-view-mode', async ({ mode }) => {
      Store.viewMode.value = mode
      await api.settings.setViewMode(mode)
    })
  )

  cleanupFunctions.push(
    onAction('action:toggle-pr-detail', async () => {
      const newState = !Store.prDetailOpen.value
      Store.prDetailOpen.value = newState
      await api.settings.setPRDetailPanel({ isOpen: newState })
    })
  )

  cleanupFunctions.push(
    onAction('action:toggle-ai-panel', async () => {
      const newState = !Store.aiPanelOpen.value
      Store.aiPanelOpen.value = newState
      await api.settings.setAIPanel({ isOpen: newState })
    })
  )

  cleanupFunctions.push(
    onAction('action:resize-pr-detail', async ({ width }) => {
      Store.prDetailWidth.value = width
      await api.settings.setPRDetailPanel({ width })
    })
  )

  cleanupFunctions.push(
    onAction('action:resize-ai-panel', async ({ width }) => {
      Store.aiPanelWidth.value = width
      await api.settings.setAIPanel({ width })
    })
  )

  cleanupFunctions.push(
    onAction('action:resize-explorer', async ({ width }) => {
      Store.explorerWidth.value = width
      await api.settings.setIDEViewSettings({ sidebarWidth: width })
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
      await api.settings.setIDEViewSettings({ expandedRepos: newExpanded })
    })
  )

  cleanupFunctions.push(
    onAction('action:set-expanded-repos', async ({ repos }) => {
      Store.expandedRepos.value = repos
      await api.settings.setIDEViewSettings({ expandedRepos: repos })
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
      await api.settings.setCardLayouts(layouts)
    })
  )

  cleanupFunctions.push(
    onAction('action:set-repo-color', async ({ repoFullName, color }) => {
      Store.repoColors.value = { ...Store.repoColors.value, [repoFullName]: color }
      await api.settings.setRepoColor(repoFullName, color)
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
      await api.settings.setRepoMinimized(repoFullName, minimized)
    })
  )

  // ─────────────────────────────────────────────────────────────────────────
  // DATA MANAGEMENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  cleanupFunctions.push(
    onAction('action:clear-cache', async () => {
      await api.settings.clearAllData()
      Store.repos.value = []
      Store.prs.value = []
    })
  )

  cleanupFunctions.push(
    onAction('action:factory-reset', async () => {
      await api.settings.factoryReset()
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
    const viewMode = await api.settings.getViewMode()
    Store.viewMode.value = viewMode

    // Load panel states
    const aiPanel = await api.settings.getAIPanel()
    Store.aiPanelOpen.value = aiPanel.isOpen
    Store.aiPanelWidth.value = aiPanel.width

    const prDetailPanel = await api.settings.getPRDetailPanel()
    Store.prDetailOpen.value = prDetailPanel.isOpen
    Store.prDetailWidth.value = prDetailPanel.width

    // Load IDE view settings
    const ideSettings = await api.settings.getIDEViewSettings()
    Store.explorerWidth.value = ideSettings.sidebarWidth
    Store.expandedRepos.value = ideSettings.expandedRepos

    // Load selected repos
    const selectedRepos = await api.settings.getSelectedRepos()
    Store.selectedRepos.value = selectedRepos

    // Load canvas settings
    const cardLayouts = await api.settings.getCardLayouts()
    Store.cardLayouts.value = cardLayouts || []

    const repoColors = await api.settings.getRepoColors()
    Store.repoColors.value = repoColors || {}

    const minimizedRepos = await api.settings.getMinimizedRepos()
    Store.minimizedRepos.value = minimizedRepos || []

    // Load PR chats
    const prChats = await api.ai.getPRChats()
    Store.prChats.value = prChats

    // Load active chat ID
    const activePRChatId = await api.ai.getActivePRChatId()
    Store.activePRChatId.value = activePRChatId

    // Load Claude API key and AI settings
    const claudeApiKey = await api.ai.getClaudeApiKey()
    Store.claudeApiKey.value = claudeApiKey

    const selectedModel = await api.ai.getSelectedModel()
    Store.selectedModel.value = selectedModel

    const enableThinking = await api.ai.getEnableThinking()
    Store.enableThinking.value = enableThinking

    // Load general chat history
    const chatHistory = await api.ai.getChatHistory()
    Store.chatHistory.value = chatHistory

    // If authenticated, fetch repos and PRs
    if (Store.isAuthenticated.value) {
      console.log('[data-module] User authenticated, fetching repos...')
      Store.loading.repos.value = true
      try {
        const reposResult = await api.github.fetchContributedRepos()
        if (reposResult.success && reposResult.data) {
          const repos = reposResult.data as Repository[]
          Store.repos.value = repos

          // Fetch PRs for selected repos (or all if none selected)
          const reposToFetch = selectedRepos || repos.map((r) => r.full_name)
          if (reposToFetch.length > 0) {
            Store.loading.prs.value = true
            const prsResult = await api.github.fetchAllPRsForRepos(reposToFetch)
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
