/**
 * @codelobby/shared-store - Reactive Store
 *
 * The "Buffet Table" - all application state lives here.
 * UI modules read from here, Data module writes here.
 */

import { useSyncExternalStore } from 'react'
import type {
  CardLayout,
  ChatMessage,
  CIFailureAnalysis,
  GitHubUser,
  LinkedPRChat,
  NetworkRequest,
  PRChat,
  PullRequest,
  RateLimit,
  Repository,
  ViewMode
} from './types'

// ═══════════════════════════════════════════════════════════════════════════
// SIMPLE SIGNAL IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

type Subscriber = () => void

/**
 * A simple reactive signal that notifies subscribers on change.
 */
/** A reactive signal that can be subscribed to */
export interface Signal<T> {
  value: T
  subscribe(fn: Subscriber): () => boolean
  getSnapshot(): T
}

export function createSignal<T>(initialValue: T): Signal<T> {
  let value = initialValue
  const subscribers = new Set<Subscriber>()

  return {
    get value(): T {
      return value
    },
    set value(newValue: T) {
      if (newValue !== value) {
        value = newValue
        for (const fn of subscribers) {
          fn()
        }
      }
    },
    subscribe(fn: Subscriber): () => boolean {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    getSnapshot(): T {
      return value
    }
  }
}

/**
 * Hook to use a signal in React components.
 * Automatically re-renders when the signal value changes.
 */
export function useSignal<T>(signal: Signal<T>): T {
  return useSyncExternalStore(signal.subscribe, signal.getSnapshot, signal.getSnapshot)
}

// ═══════════════════════════════════════════════════════════════════════════
// THE STORE (The Buffet Table)
// ═══════════════════════════════════════════════════════════════════════════

/** Type definition for the Store object */
export interface StoreType {
  // Authentication
  user: Signal<GitHubUser | null>
  isAuthenticated: Signal<boolean>
  // GitHub Data
  repos: Signal<Repository[]>
  prs: Signal<PullRequest[]>
  selectedRepos: Signal<string[] | null>
  selectedPR: Signal<PullRequest | null>
  rateLimit: Signal<RateLimit | null>
  // AI Chat
  chatHistory: Signal<ChatMessage[]>
  prChats: Signal<PRChat[]>
  activePRChatId: Signal<string | null>
  linkedPRChat: Signal<LinkedPRChat | null>
  isAILoading: Signal<boolean>
  aiThinking: Signal<string>
  claudeApiKey: Signal<string | null>
  selectedModel: Signal<string | null>
  enableThinking: Signal<boolean>
  // Layout & UI State
  viewMode: Signal<ViewMode>
  prDetailOpen: Signal<boolean>
  prDetailWidth: Signal<number>
  aiPanelOpen: Signal<boolean>
  aiPanelWidth: Signal<number>
  explorerWidth: Signal<number>
  expandedRepos: Signal<string[]>
  cardLayouts: Signal<CardLayout[]>
  repoColors: Signal<Record<string, string>>
  minimizedRepos: Signal<string[]>
  myPRsRepos: Signal<string[]>
  // PR Analysis
  prAnalyses: Signal<Array<{ prId: string; analysis: string }>>
  prAnalysisPanelStates: Signal<Record<string, boolean>>
  // CI Failure Analysis (keyed by checkRunId)
  ciFailureAnalyses: Signal<Record<string, CIFailureAnalysis>>
  // Network Request Tracking
  networkRequests: Signal<NetworkRequest[]>
  networkPanelOpen: Signal<boolean>
  networkPanelHeight: Signal<number> // Height percentage (0-100) when sharing with AI panel
  // Loading States
  loading: {
    repos: Signal<boolean>
    prs: Signal<boolean>
    prDetail: Signal<boolean>
    auth: Signal<boolean>
  }
  // Errors
  errors: {
    github: Signal<Error | null>
    ai: Signal<Error | null>
    auth: Signal<Error | null>
  }
}

export const Store: StoreType = {
  // ─────────────────────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────────────────────
  user: createSignal<GitHubUser | null>(null),
  isAuthenticated: createSignal<boolean>(false),

  // ─────────────────────────────────────────────────────────────────────────
  // GitHub Data
  // ─────────────────────────────────────────────────────────────────────────
  repos: createSignal<Repository[]>([]),
  prs: createSignal<PullRequest[]>([]),
  selectedRepos: createSignal<string[] | null>(null), // null = all, [] = none
  selectedPR: createSignal<PullRequest | null>(null),
  rateLimit: createSignal<RateLimit | null>(null),

  // ─────────────────────────────────────────────────────────────────────────
  // AI Chat
  // ─────────────────────────────────────────────────────────────────────────
  chatHistory: createSignal<ChatMessage[]>([]),
  prChats: createSignal<PRChat[]>([]),
  activePRChatId: createSignal<string | null>(null),
  linkedPRChat: createSignal<LinkedPRChat | null>(null),
  isAILoading: createSignal<boolean>(false),
  aiThinking: createSignal<string>(''),
  claudeApiKey: createSignal<string | null>(null),
  selectedModel: createSignal<string | null>(null),
  enableThinking: createSignal<boolean>(true),

  // ─────────────────────────────────────────────────────────────────────────
  // Layout & UI State
  // ─────────────────────────────────────────────────────────────────────────
  viewMode: createSignal<ViewMode>('canvas'),
  prDetailOpen: createSignal<boolean>(false),
  prDetailWidth: createSignal<number>(400),
  aiPanelOpen: createSignal<boolean>(false),
  aiPanelWidth: createSignal<number>(400),
  explorerWidth: createSignal<number>(280),
  expandedRepos: createSignal<string[]>([]),
  cardLayouts: createSignal<CardLayout[]>([]),
  repoColors: createSignal<Record<string, string>>({}),
  minimizedRepos: createSignal<string[]>([]),
  myPRsRepos: createSignal<string[]>([]),

  // ─────────────────────────────────────────────────────────────────────────
  // PR Analysis
  // ─────────────────────────────────────────────────────────────────────────
  prAnalyses: createSignal<Array<{ prId: string; analysis: string }>>([]),
  prAnalysisPanelStates: createSignal<Record<string, boolean>>({}),
  ciFailureAnalyses: createSignal<Record<string, CIFailureAnalysis>>({}),

  // ─────────────────────────────────────────────────────────────────────────
  // Network Request Tracking
  // ─────────────────────────────────────────────────────────────────────────
  networkRequests: createSignal<NetworkRequest[]>([]),
  networkPanelOpen: createSignal<boolean>(false),
  networkPanelHeight: createSignal<number>(40), // 40% of the sidebar height by default

  // ─────────────────────────────────────────────────────────────────────────
  // Loading States
  // ─────────────────────────────────────────────────────────────────────────
  loading: {
    repos: createSignal<boolean>(false),
    prs: createSignal<boolean>(false),
    prDetail: createSignal<boolean>(false),
    auth: createSignal<boolean>(true)
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Errors
  // ─────────────────────────────────────────────────────────────────────────
  errors: {
    github: createSignal<Error | null>(null),
    ai: createSignal<Error | null>(null),
    auth: createSignal<Error | null>(null)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPUTED VALUES (Derived State)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get PRs grouped by repository.
 */
export function getPRsByRepo(): Record<string, PullRequest[]> {
  const prs = Store.prs.value
  return prs.reduce(
    (acc, pr) => {
      const repo = pr.base.repo.full_name
      if (!acc[repo]) acc[repo] = []
      acc[repo].push(pr)
      return acc
    },
    {} as Record<string, PullRequest[]>
  )
}

/**
 * Get filtered repos based on selection.
 */
export function getFilteredRepos(): Repository[] {
  const all = Store.repos.value
  const selected = Store.selectedRepos.value

  if (selected === null) return all // null = show all
  if (selected.length === 0) return [] // empty = show none
  return all.filter((r) => selected.includes(r.full_name))
}

/**
 * Get the current PR's chat (if any).
 */
export function getCurrentPRChat(): PRChat | null {
  const pr = Store.selectedPR.value
  if (!pr) return null
  const prId = `${pr.base.repo.full_name}#${pr.number}`
  return Store.prChats.value.find((c) => c.prId === prId) ?? null
}

/**
 * Get the active chat (PR-specific or general).
 */
export function getActiveChat(): { messages: ChatMessage[]; isPRChat: boolean } {
  const activePRChatId = Store.activePRChatId.value
  if (activePRChatId) {
    const prChat = Store.prChats.value.find((c) => c.prId === activePRChatId)
    if (prChat) {
      return { messages: prChat.messages, isPRChat: true }
    }
  }
  return { messages: Store.chatHistory.value, isPRChat: false }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reset the store to initial state. For testing only.
 */
export function resetStore(): void {
  Store.user.value = null
  Store.isAuthenticated.value = false
  Store.repos.value = []
  Store.prs.value = []
  Store.selectedRepos.value = null
  Store.selectedPR.value = null
  Store.rateLimit.value = null
  Store.chatHistory.value = []
  Store.prChats.value = []
  Store.activePRChatId.value = null
  Store.linkedPRChat.value = null
  Store.isAILoading.value = false
  Store.aiThinking.value = ''
  Store.claudeApiKey.value = null
  Store.selectedModel.value = null
  Store.enableThinking.value = true
  Store.viewMode.value = 'canvas'
  Store.prDetailOpen.value = false
  Store.prDetailWidth.value = 400
  Store.aiPanelOpen.value = false
  Store.aiPanelWidth.value = 400
  Store.explorerWidth.value = 280
  Store.expandedRepos.value = []
  Store.cardLayouts.value = []
  Store.repoColors.value = {}
  Store.minimizedRepos.value = []
  Store.myPRsRepos.value = []
  Store.prAnalyses.value = []
  Store.prAnalysisPanelStates.value = {}
  Store.ciFailureAnalyses.value = {}
  Store.networkRequests.value = []
  Store.networkPanelOpen.value = false
  Store.loading.repos.value = false
  Store.loading.prs.value = false
  Store.loading.prDetail.value = false
  Store.loading.auth.value = true
  Store.errors.github.value = null
  Store.errors.ai.value = null
  Store.errors.auth.value = null
}
