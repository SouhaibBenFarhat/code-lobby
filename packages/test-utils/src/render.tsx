/**
 * Test Render Utilities
 *
 * Provides wrapper components and utilities for testing React components
 * with all necessary providers (React Query, Tooltip, shared-store).
 */

import type { GitHubUser, PullRequest, Repository } from '@codelobby/shared-store'
import { resetStore, Store } from '@codelobby/shared-store'
import { TooltipProvider } from '@codelobby/ui-kit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RenderOptions, RenderResult, render } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'

// Create a new QueryClient for each test
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity, // Data never goes stale in tests - prevents auto-refetching
        refetchOnMount: false, // Don't auto-fetch on mount
        refetchOnWindowFocus: false, // Don't auto-fetch on focus
        refetchOnReconnect: false // Don't auto-fetch on reconnect
      },
      mutations: {
        retry: false
      }
    }
  })
}

interface WrapperProps {
  children: ReactNode
}

interface LinkedPRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  // Store initialization options
  initialSelectedPR?: PullRequest | null
  initialUser?: GitHubUser | null
  initialRepos?: Repository[]
  initialPRs?: PullRequest[]
  initialMyPRsRepos?: string[]
  initialViewMode?: 'canvas' | 'ide'
  initialAIPanelOpen?: boolean
  initialPRDetailOpen?: boolean
  initialLinkedPRChat?: LinkedPRChat | null
}

/**
 * Initialize the store with test values
 */
export function initializeStore(options: CustomRenderOptions): void {
  // Reset store to clean state first
  resetStore()

  // Set auth loading to false for tests
  Store.loading.auth.value = false

  // Apply custom values
  if (options.initialSelectedPR !== undefined) {
    Store.selectedPR.value = options.initialSelectedPR
  }
  if (options.initialUser !== undefined) {
    Store.user.value = options.initialUser
    Store.isAuthenticated.value = options.initialUser !== null
  }
  if (options.initialRepos !== undefined) {
    Store.repos.value = options.initialRepos
  }
  if (options.initialPRs !== undefined) {
    Store.prs.value = options.initialPRs
  }
  if (options.initialMyPRsRepos !== undefined) {
    Store.myPRsRepos.value = options.initialMyPRsRepos
  }
  if (options.initialViewMode !== undefined) {
    Store.viewMode.value = options.initialViewMode
  }
  if (options.initialAIPanelOpen !== undefined) {
    Store.aiPanelOpen.value = options.initialAIPanelOpen
  }
  if (options.initialPRDetailOpen !== undefined) {
    Store.prDetailOpen.value = options.initialPRDetailOpen
  }
  if (options.initialLinkedPRChat !== undefined) {
    Store.linkedPRChat.value = options.initialLinkedPRChat
  }
}

/**
 * Custom render function that wraps component with all providers
 */
export function customRender(ui: ReactElement, options?: CustomRenderOptions): RenderResult {
  const queryClient = options?.queryClient || createTestQueryClient()

  // Initialize store with test values
  if (options) {
    initializeStore(options)
  } else {
    resetStore()
    Store.loading.auth.value = false
  }

  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Legacy context exports for backward compatibility (tests that haven't been migrated)
// These are no-ops now since components use shared-store
export const usePRContext = () => ({
  selectedPR: Store.selectedPR.value,
  setSelectedPR: (pr: PullRequest | null) => {
    Store.selectedPR.value = pr
  }
})

export const useMyPRsFilter = () => ({
  myPRsRepos: new Set(Store.myPRsRepos.value),
  toggleMyPRsFilter: (repo: string) => {
    const current = Store.myPRsRepos.value
    if (current.includes(repo)) {
      Store.myPRsRepos.value = current.filter((r) => r !== repo)
    } else {
      Store.myPRsRepos.value = [...current, repo]
    }
  },
  isMyPRsFilterEnabled: (repo: string) => Store.myPRsRepos.value.includes(repo)
})

export const usePRChat = () => ({
  linkedPRChat: Store.linkedPRChat.value,
  openPRInChat: (pr: PullRequest) => {
    Store.linkedPRChat.value = {
      prId: `${pr.base.repo.full_name}#${pr.number}`,
      prNumber: pr.number,
      prTitle: pr.title,
      repoFullName: pr.base.repo.full_name
    }
  },
  closePRChat: () => {
    Store.linkedPRChat.value = null
  }
})

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render, resetStore, Store }
