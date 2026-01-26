/**
 * Test Render Utilities
 *
 * Provides wrapper components and utilities for testing React components
 * with all necessary providers (React Query, Tooltip).
 */

import type { GitHubUser, PullRequest, Repository } from '@data'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RenderOptions, RenderResult, render } from '@testing-library/react'
import { TooltipProvider } from '@ui-kit'
import { ReactElement, ReactNode } from 'react'

// Create a new QueryClient for each test
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity, // Keep data in cache for tests
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
  // Store initialization options - now uses localStorage
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
 * Reset localStorage and clear test state
 */
export function resetTestState(): void {
  localStorage.clear()
}

/**
 * Initialize localStorage with test values
 */
export function initializeTestState(options: CustomRenderOptions): void {
  // Reset localStorage first
  localStorage.clear()

  // Set initial values in localStorage
  if (options.initialSelectedPR) {
    localStorage.setItem(
      'selectedPRId',
      JSON.stringify({
        repoFullName: options.initialSelectedPR.base.repo.full_name,
        prNumber: options.initialSelectedPR.number
      })
    )
  }
  if (options.initialUser) {
    localStorage.setItem('github_token', 'test-token')
  }
  if (options.initialMyPRsRepos) {
    localStorage.setItem('myPRsRepos', JSON.stringify(options.initialMyPRsRepos))
  }
  if (options.initialViewMode) {
    localStorage.setItem('viewMode', JSON.stringify(options.initialViewMode))
  }
  if (options.initialAIPanelOpen !== undefined) {
    localStorage.setItem(
      'aiPanel',
      JSON.stringify({ isOpen: options.initialAIPanelOpen, width: 400 })
    )
  }
  if (options.initialPRDetailOpen !== undefined) {
    localStorage.setItem(
      'prDetailPanel',
      JSON.stringify({ isOpen: options.initialPRDetailOpen, width: 400 })
    )
  }
  if (options.initialLinkedPRChat) {
    localStorage.setItem('activePRChatId', JSON.stringify(options.initialLinkedPRChat.prId))
  }
}

/**
 * Custom render function that wraps component with all providers
 */
export function customRender(ui: ReactElement, options?: CustomRenderOptions): RenderResult {
  const queryClient = options?.queryClient || createTestQueryClient()

  // Initialize test state with localStorage
  if (options) {
    initializeTestState(options)

    // Pre-populate query cache with initial data
    if (options.initialUser) {
      queryClient.setQueryData(['github', 'user'], options.initialUser)
    }
    if (options.initialRepos) {
      queryClient.setQueryData(['repos'], options.initialRepos)
    }
    if (options.initialPRs) {
      queryClient.setQueryData(['prs'], { prs: options.initialPRs, rateLimit: null })
    }
    if (options.initialSelectedPR) {
      // Use correct query keys from @data/keys
      queryClient.setQueryData(
        [
          'github',
          'pr',
          options.initialSelectedPR.base.repo.full_name,
          options.initialSelectedPR.number,
          'detail'
        ],
        options.initialSelectedPR
      )
      queryClient.setQueryData(['local', 'selected-pr-id'], {
        repoFullName: options.initialSelectedPR.base.repo.full_name,
        prNumber: options.initialSelectedPR.number
      })
    }
  } else {
    resetTestState()
  }

  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )

  return render(ui, { wrapper: Wrapper, ...options })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
