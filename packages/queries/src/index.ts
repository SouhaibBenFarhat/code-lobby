/**
 * @codelobby/queries - TanStack Query Definitions
 *
 * This module defines all the queries used in the app.
 * Benefits:
 * - Automatic caching with configurable staleTime/gcTime
 * - Background refetching on window focus
 * - Automatic persistence to disk via electron persister
 * - Standardized error handling and loading states
 */

/// <reference path="../../../src/preload/electron-api.d.ts" />

import type { PullRequest, RateLimit, Repository } from '@codelobby/shared-store'
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════
// Centralized query keys for cache management

export const queryKeys = {
  // GitHub data
  repos: ['repos'] as const,
  prs: (repoNames: string[]) => ['prs', ...repoNames] as const,
  allPrs: ['prs'] as const,
  prDetails: (prId: string) => ['pr', prId] as const,
  prEvents: ['pr-events'] as const,
  rateLimit: ['rate-limit'] as const,
  user: ['user'] as const,

  // Settings (persisted)
  selectedRepos: ['selected-repos'] as const,
  cardLayouts: ['card-layouts'] as const,
  repoColors: ['repo-colors'] as const,
  minimizedRepos: ['minimized-repos'] as const,
  viewMode: ['view-mode'] as const,
  ideSettings: ['ide-settings'] as const,
  aiPanel: ['ai-panel'] as const,
  prDetailPanel: ['pr-detail-panel'] as const,

  // AI related
  claudeApiKey: ['claude-api-key'] as const,
  selectedModel: ['selected-model'] as const,
  enableThinking: ['enable-thinking'] as const,
  chatHistory: ['chat-history'] as const,
  prChats: ['pr-chats'] as const,
  activePrChatId: ['active-pr-chat-id'] as const,
  prAnalyses: ['pr-analyses'] as const,
  prAnalysisPanelStates: ['pr-analysis-panel-states'] as const
}

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all contributed repositories
 */
export function useRepos() {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: async () => {
      const result = await window.electron.fetchContributedRepos()
      if (!result.success) throw new Error(result.error || 'Failed to fetch repos')
      return (result.data || []) as Repository[]
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
    gcTime: 30 * 60 * 1000 // Keep in cache for 30 minutes
  })
}

/**
 * Fetch PRs for selected repositories
 */
export function usePRs(repoNames: string[] | null) {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: repoNames ? queryKeys.prs(repoNames) : queryKeys.allPrs,
    queryFn: async () => {
      if (!repoNames || repoNames.length === 0) {
        // If no repos selected, fetch all repos first then their PRs
        const reposResult = await window.electron.fetchContributedRepos()
        if (!reposResult.success) throw new Error(reposResult.error || 'Failed to fetch repos')
        const repos = (reposResult.data || []) as Array<{ full_name: string }>
        const allRepoNames = repos.map((r) => r.full_name)

        if (allRepoNames.length === 0) return { prs: [] as PullRequest[], rateLimit: null }

        const result = await window.electron.fetchAllPRsForRepos(allRepoNames)
        if (!result.success) throw new Error(result.error || 'Failed to fetch PRs')
        return { prs: (result.data || []) as PullRequest[], rateLimit: result.rateLimit || null }
      }

      const result = await window.electron.fetchAllPRsForRepos(repoNames)
      if (!result.success) throw new Error(result.error || 'Failed to fetch PRs')

      // Update rate limit in a separate query for easy access
      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }

      return { prs: (result.data || []) as PullRequest[], rateLimit: result.rateLimit || null }
    },
    staleTime: 2 * 60 * 1000, // Fresh for 2 minutes (PRs change more often)
    gcTime: 30 * 60 * 1000,
    enabled: true // Always enabled, will fetch all if repoNames is null
  })
}

/**
 * Fetch rate limit information
 */
export function useRateLimit() {
  return useQuery({
    queryKey: queryKeys.rateLimit,
    queryFn: async () => {
      const result = await window.electron.getRateLimit()
      if (!result.success) throw new Error(result.error || 'Failed to fetch rate limit')
      return result.data
    },
    staleTime: 30 * 1000, // Fresh for 30 seconds
    gcTime: 5 * 60 * 1000
  })
}

/**
 * Fetch PR events for activity stream
 */
export function usePREvents() {
  return useQuery({
    queryKey: queryKeys.prEvents,
    queryFn: async () => {
      const result = await window.electron.fetchPREvents()
      if (!result.success) throw new Error(result.error || 'Failed to fetch PR events')
      return result.data || []
    },
    staleTime: 60 * 1000, // Fresh for 1 minute
    gcTime: 10 * 60 * 1000
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// SETTINGS QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get selected repositories
 */
export function useSelectedRepos() {
  return useQuery({
    queryKey: queryKeys.selectedRepos,
    queryFn: () => window.electron.getSelectedRepos(),
    staleTime: Infinity, // Settings don't go stale
    gcTime: Infinity
  })
}

/**
 * Get card layouts for canvas view
 */
export function useCardLayouts() {
  return useQuery({
    queryKey: queryKeys.cardLayouts,
    queryFn: () => window.electron.getCardLayouts(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get repo colors
 */
export function useRepoColors() {
  return useQuery({
    queryKey: queryKeys.repoColors,
    queryFn: () => window.electron.getRepoColors(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get minimized repos
 */
export function useMinimizedRepos() {
  return useQuery({
    queryKey: queryKeys.minimizedRepos,
    queryFn: () => window.electron.getMinimizedRepos(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get view mode
 */
export function useViewMode() {
  return useQuery({
    queryKey: queryKeys.viewMode,
    queryFn: () => window.electron.getViewMode(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get IDE view settings
 */
export function useIDESettings() {
  return useQuery({
    queryKey: queryKeys.ideSettings,
    queryFn: () => window.electron.getIDEViewSettings(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get AI panel settings
 */
export function useAIPanel() {
  return useQuery({
    queryKey: queryKeys.aiPanel,
    queryFn: () => window.electron.getAIPanel(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get PR detail panel settings
 */
export function usePRDetailPanel() {
  return useQuery({
    queryKey: queryKeys.prDetailPanel,
    queryFn: () => window.electron.getPRDetailPanel(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AI QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get Claude API key
 */
export function useClaudeApiKey() {
  return useQuery({
    queryKey: queryKeys.claudeApiKey,
    queryFn: () => window.electron.getClaudeApiKey(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get selected AI model
 */
export function useSelectedModel() {
  return useQuery({
    queryKey: queryKeys.selectedModel,
    queryFn: () => window.electron.getSelectedModel(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get enable thinking setting
 */
export function useEnableThinking() {
  return useQuery({
    queryKey: queryKeys.enableThinking,
    queryFn: () => window.electron.getEnableThinking(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get chat history
 */
export function useChatHistory() {
  return useQuery({
    queryKey: queryKeys.chatHistory,
    queryFn: () => window.electron.getChatHistory(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get PR chats
 */
export function usePRChats() {
  return useQuery({
    queryKey: queryKeys.prChats,
    queryFn: () => window.electron.getPRChats(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get active PR chat ID
 */
export function useActivePRChatId() {
  return useQuery({
    queryKey: queryKeys.activePrChatId,
    queryFn: () => window.electron.getActivePRChatId(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mutation to set selected repos
 */
export function useSetSelectedRepos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repos: string[]) => window.electron.setSelectedRepos(repos),
    onSuccess: (_, repos) => {
      queryClient.setQueryData(queryKeys.selectedRepos, repos)
      // Invalidate PRs to refetch for new selection
      queryClient.invalidateQueries({ queryKey: queryKeys.allPrs })
    }
  })
}

/**
 * Mutation to set card layouts
 */
export function useSetCardLayouts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) =>
      window.electron.setCardLayouts(layouts),
    onSuccess: (_, layouts) => {
      queryClient.setQueryData(queryKeys.cardLayouts, layouts)
    }
  })
}

/**
 * Mutation to set repo color
 */
export function useSetRepoColor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName, color }: { repoFullName: string; color: string | null }) =>
      window.electron.setRepoColor(repoFullName, color),
    onSuccess: (_, { repoFullName, color }) => {
      queryClient.setQueryData(queryKeys.repoColors, (old: Record<string, string> | undefined) => {
        const newColors = { ...(old || {}) }
        if (color === null) {
          delete newColors[repoFullName]
        } else {
          newColors[repoFullName] = color
        }
        return newColors
      })
    }
  })
}

/**
 * Mutation to set repo minimized state
 */
export function useSetRepoMinimized() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName, isMinimized }: { repoFullName: string; isMinimized: boolean }) =>
      window.electron.setRepoMinimized(repoFullName, isMinimized),
    onSuccess: (_, { repoFullName, isMinimized }) => {
      queryClient.setQueryData(queryKeys.minimizedRepos, (old: string[] | undefined) => {
        const current = old || []
        if (isMinimized) {
          return [...current, repoFullName]
        }
        return current.filter((r) => r !== repoFullName)
      })
    }
  })
}

/**
 * Mutation to set view mode
 */
export function useSetViewMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mode: 'canvas' | 'ide') => window.electron.setViewMode(mode),
    onSuccess: (_, mode) => {
      queryClient.setQueryData(queryKeys.viewMode, mode)
    }
  })
}

/**
 * Mutation to set AI panel
 */
export function useSetAIPanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: { isOpen?: boolean; width?: number }) =>
      window.electron.setAIPanel(settings),
    onSuccess: (_, settings) => {
      queryClient.setQueryData(
        queryKeys.aiPanel,
        (old: { isOpen: boolean; width: number } | undefined) => ({
          isOpen: settings.isOpen ?? old?.isOpen ?? false,
          width: settings.width ?? old?.width ?? 400
        })
      )
    }
  })
}

/**
 * Mutation to set PR detail panel
 */
export function useSetPRDetailPanel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: { isOpen?: boolean; width?: number }) =>
      window.electron.setPRDetailPanel(settings),
    onSuccess: (_, settings) => {
      queryClient.setQueryData(
        queryKeys.prDetailPanel,
        (old: { isOpen: boolean; width: number } | undefined) => ({
          isOpen: settings.isOpen ?? old?.isOpen ?? false,
          width: settings.width ?? old?.width ?? 400
        })
      )
    }
  })
}

/**
 * Mutation to refresh a specific repo's PRs
 */
export function useRefreshRepoPRs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repoFullName: string) => window.electron.refreshRepoPRs(repoFullName),
    onSuccess: (result) => {
      // Invalidate all PR queries to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.allPrs })

      // Update rate limit if returned
      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }
    }
  })
}

/**
 * Mutation to clear all cache and refetch
 */
export function useClearCacheAndRefresh() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await window.electron.clearAllData()
    },
    onSuccess: () => {
      // Invalidate all queries to force refetch
      queryClient.invalidateQueries()
    }
  })
}

/**
 * Mutation to set Claude API key
 */
export function useSetClaudeApiKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (apiKey: string) => window.electron.setClaudeApiKey(apiKey),
    onSuccess: (_, apiKey) => {
      queryClient.setQueryData(queryKeys.claudeApiKey, apiKey)
    }
  })
}

/**
 * Mutation to set selected model
 */
export function useSetSelectedModel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (model: string) => window.electron.setSelectedModel(model),
    onSuccess: (_, model) => {
      queryClient.setQueryData(queryKeys.selectedModel, model)
    }
  })
}

/**
 * Mutation to set enable thinking
 */
export function useSetEnableThinking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) => window.electron.setEnableThinking(enabled),
    onSuccess: (_, enabled) => {
      queryClient.setQueryData(queryKeys.enableThinking, enabled)
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY: Prefetch queries on app start
// ═══════════════════════════════════════════════════════════════════════════

export async function prefetchInitialData(queryClient: QueryClient): Promise<void> {
  // Check if user is authenticated first
  const token = await window.electron.getToken()
  if (!token) return

  // Prefetch in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.repos,
      queryFn: async () => {
        const result = await window.electron.fetchContributedRepos()
        if (!result.success) throw new Error(result.error)
        return result.data || []
      }
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.selectedRepos,
      queryFn: () => window.electron.getSelectedRepos()
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.viewMode,
      queryFn: () => window.electron.getViewMode()
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.aiPanel,
      queryFn: () => window.electron.getAIPanel()
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.prDetailPanel,
      queryFn: () => window.electron.getPRDetailPanel()
    })
  ])
}

// Re-export QueryClient types for convenience
export { useQueryClient, QueryClient }
