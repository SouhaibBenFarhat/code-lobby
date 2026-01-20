/**
 * @codelobby/shared-store - Actions
 *
 * Actions are event emitters that UI modules use to request data operations.
 * The Data Module listens for these events and updates the store.
 *
 * UI Modules → emit Actions → Data Module listens → Updates Store → UI reacts
 */

import type { PullRequest, ViewMode } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// ACTION EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActionEvents = {
  // GitHub Actions
  'action:fetch-repos': void
  'action:fetch-prs': { repos: string[] }
  'action:fetch-pr-details': { prId: string }
  'action:refresh-repo': { repoFullName: string }
  'action:select-pr': { pr: PullRequest | null }
  'action:select-repos': { repos: string[] | null }

  // AI Actions
  'action:send-ai-message': { message: string; systemContext?: string }
  'action:analyze-pr': { pr: PullRequest }
  'action:find-preview-url': { pr: PullRequest }
  'action:find-jira-ticket': { pr: PullRequest }
  'action:create-pr-chat': { pr: PullRequest }
  'action:clear-chat-history': void

  // Auth Actions
  'action:sign-in': { token: string }
  'action:sign-out': void
  'action:validate-token': void

  // Layout Actions
  'action:set-view-mode': { mode: ViewMode }
  'action:toggle-pr-detail': void
  'action:toggle-ai-panel': void
  'action:resize-pr-detail': { width: number }
  'action:resize-ai-panel': { width: number }
  'action:resize-explorer': { width: number }

  // Data Actions
  'action:clear-cache': void
  'action:factory-reset': void
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTION EMITTER HELPER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Emit an action event.
 * Data Module listens for these and performs the actual work.
 */
function emit<K extends keyof ActionEvents>(
  action: K,
  ...args: ActionEvents[K] extends void ? [] : [ActionEvents[K]]
): void {
  const detail = args[0]
  window.dispatchEvent(new CustomEvent(action, { detail }))
}

/**
 * Listen for an action event.
 * Used by Data Module to handle actions.
 */
export function onAction<K extends keyof ActionEvents>(
  action: K,
  handler: (payload: ActionEvents[K]) => void
): () => void {
  const listener = ((e: CustomEvent) => {
    handler(e.detail)
  }) as EventListener
  window.addEventListener(action, listener)
  return () => window.removeEventListener(action, listener)
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC ACTIONS API
// ═══════════════════════════════════════════════════════════════════════════

export const Actions = {
  // ─────────────────────────────────────────────────────────────────────────
  // GitHub Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Fetch all contributed repositories */
  fetchRepos: () => emit('action:fetch-repos'),

  /** Fetch PRs for specific repositories */
  fetchPRs: (repos: string[]) => emit('action:fetch-prs', { repos }),

  /** Fetch detailed PR data */
  fetchPRDetails: (prId: string) => emit('action:fetch-pr-details', { prId }),

  /** Refresh a single repository's PRs */
  refreshRepo: (repoFullName: string) => emit('action:refresh-repo', { repoFullName }),

  /** Select a PR (opens detail panel) */
  selectPR: (pr: PullRequest | null) => emit('action:select-pr', { pr }),

  /** Set which repos are visible (null = all) */
  selectRepos: (repos: string[] | null) => emit('action:select-repos', { repos }),

  // ─────────────────────────────────────────────────────────────────────────
  // AI Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Send a message to the AI */
  sendAIMessage: (message: string, systemContext?: string) =>
    emit('action:send-ai-message', { message, systemContext }),

  /** Analyze why a PR is still open */
  analyzePR: (pr: PullRequest) => emit('action:analyze-pr', { pr }),

  /** Find preview URL for a PR */
  findPreviewURL: (pr: PullRequest) => emit('action:find-preview-url', { pr }),

  /** Find Jira ticket for a PR */
  findJiraTicket: (pr: PullRequest) => emit('action:find-jira-ticket', { pr }),

  /** Create a new PR-specific chat */
  createPRChat: (pr: PullRequest) => emit('action:create-pr-chat', { pr }),

  /** Clear general chat history */
  clearChatHistory: () => emit('action:clear-chat-history'),

  // ─────────────────────────────────────────────────────────────────────────
  // Auth Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Sign in with GitHub token */
  signIn: (token: string) => emit('action:sign-in', { token }),

  /** Sign out and clear data */
  signOut: () => emit('action:sign-out'),

  /** Validate current token */
  validateToken: () => emit('action:validate-token'),

  // ─────────────────────────────────────────────────────────────────────────
  // Layout Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Switch between canvas and IDE view */
  setViewMode: (mode: ViewMode) => emit('action:set-view-mode', { mode }),

  /** Toggle PR detail panel */
  togglePRDetail: () => emit('action:toggle-pr-detail'),

  /** Toggle AI chat panel */
  toggleAIPanel: () => emit('action:toggle-ai-panel'),

  /** Resize PR detail panel */
  resizePRDetail: (width: number) => emit('action:resize-pr-detail', { width }),

  /** Resize AI panel */
  resizeAIPanel: (width: number) => emit('action:resize-ai-panel', { width }),

  /** Resize explorer panel */
  resizeExplorer: (width: number) => emit('action:resize-explorer', { width }),

  // ─────────────────────────────────────────────────────────────────────────
  // Data Actions
  // ─────────────────────────────────────────────────────────────────────────

  /** Clear all cached data */
  clearCache: () => emit('action:clear-cache'),

  /** Factory reset - clear ALL data */
  factoryReset: () => emit('action:factory-reset')
}
