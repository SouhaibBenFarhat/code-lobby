/**
 * @codelobby/queries - TanStack Query Definitions
 *
 * This module defines all the queries used in the app.
 * Benefits:
 * - Automatic caching with configurable staleTime/gcTime
 * - Background refetching on window focus
 * - Automatic persistence to disk via electron persister
 * - Standardized error handling and loading states
 *
 * All API calls go through @codelobby/api for automatic logging.
 */

import { api } from '@codelobby/api'
import type { PullRequest, RateLimit, Repository } from '@codelobby/shared-store'
import {
  QueryClient,
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

// ═══════════════════════════════════════════════════════════════════════════
// QUERY KEYS
// ═══════════════════════════════════════════════════════════════════════════
// Centralized query keys for cache management

export const queryKeys = {
  // GitHub data
  repos: ['repos'] as const,
  prs: (repoNames: string[]): readonly ['prs', ...string[]] => ['prs', ...repoNames] as const,
  allPrs: ['prs'] as const,
  prDetails: (prId: string): readonly ['pr', string] => ['pr', prId] as const,
  prFiles: (
    owner: string,
    repo: string,
    prNumber: number
  ): readonly ['pr-files', string, string, number] => ['pr-files', owner, repo, prNumber] as const,
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
export function useRepos(): UseQueryResult<Repository[], Error> {
  return useQuery({
    queryKey: queryKeys.repos,
    queryFn: async () => {
      const result = await api.github.fetchContributedRepos()
      if (!result.success) throw new Error(result.error || 'Failed to fetch repos')
      return (result.data || []) as Repository[]
    },
    staleTime: 5 * 60 * 1000, // Fresh for 5 minutes
    gcTime: 30 * 60 * 1000 // Keep in cache for 30 minutes
  })
}

/**
 * Fetch PRs for a SINGLE repo (lazy loading).
 * Each repo's PRs are cached separately.
 */
export function usePRsForRepo(repoFullName: string | null): UseQueryResult<PullRequest[], Error> {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: repoFullName ? queryKeys.prs([repoFullName]) : ['prs', 'none'],
    queryFn: async () => {
      if (!repoFullName) return [] as PullRequest[]

      const result = await api.github.fetchAllPRsForRepos([repoFullName])
      if (!result.success) throw new Error(result.error || 'Failed to fetch PRs')

      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }

      return (result.data || []) as PullRequest[]
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!repoFullName
  })
}

/**
 * PR File type for changed files
 */
export interface PRFile {
  path: string
  additions: number
  deletions: number
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAMED' | 'COPIED'
  /** The unified diff patch content for this file */
  patch: string | null
}

/**
 * Fetch changed files for a specific PR.
 * Files are cached per PR (owner/repo#number).
 */
export function usePRFiles(
  owner: string | null,
  repo: string | null,
  prNumber: number | null
): UseQueryResult<PRFile[], Error> {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey:
      owner && repo && prNumber ? queryKeys.prFiles(owner, repo, prNumber) : ['pr-files', 'none'],
    queryFn: async () => {
      if (!owner || !repo || !prNumber) return [] as PRFile[]

      const result = await api.github.fetchPRFiles(owner, repo, prNumber)
      if (!result.success) throw new Error(result.error || 'Failed to fetch PR files')

      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }

      return (result.data || []) as PRFile[]
    },
    staleTime: 10 * 60 * 1000, // Files don't change often, 10 min stale
    gcTime: 60 * 60 * 1000, // Keep in cache for 1 hour
    enabled: !!owner && !!repo && !!prNumber
  })
}

/**
 * Fetch PRs for SELECTED repos only (lazy loading).
 * - null selection = NO PRs fetched (initial state, fast app load)
 * - empty array = NO PRs (user deselected all)
 * - array of repos = fetch PRs for ONLY those repos
 * - Per-repo caching: already-fetched repos are instant
 */
export function usePRs(): UseQueryResult<
  { prs: PullRequest[]; rateLimit: RateLimit | null },
  Error
> {
  const { data: selectedRepos } = useSelectedRepos()
  const queryClient = useQueryClient()

  // Only fetch if user has explicitly selected repos
  // null = initial state, don't fetch anything yet
  const reposToFetch = selectedRepos || []

  return useQuery({
    queryKey:
      reposToFetch.length > 0 ? ['prs', 'combined', ...reposToFetch.sort()] : ['prs', 'none'],
    queryFn: async () => {
      if (reposToFetch.length === 0) {
        return { prs: [] as PullRequest[], rateLimit: null }
      }

      // Check which repos already have cached PRs
      const cachedPRs: PullRequest[] = []
      const uncachedRepos: string[] = []

      for (const repoName of reposToFetch) {
        const cached = queryClient.getQueryData<PullRequest[]>(queryKeys.prs([repoName]))
        if (cached) {
          cachedPRs.push(...cached)
        } else {
          uncachedRepos.push(repoName)
        }
      }

      // If all repos are cached, return immediately (INSTANT)
      if (uncachedRepos.length === 0) {
        return { prs: cachedPRs, rateLimit: null }
      }

      // Fetch ONLY the repos we don't have cached
      const result = await api.github.fetchAllPRsForRepos(uncachedRepos)
      if (!result.success) throw new Error(result.error || 'Failed to fetch PRs')

      const fetchedPRs = (result.data || []) as PullRequest[]

      // Cache each repo's PRs separately for future instant access
      const prsByRepo = new Map<string, PullRequest[]>()
      for (const pr of fetchedPRs) {
        const repo = pr.base.repo.full_name
        if (!prsByRepo.has(repo)) prsByRepo.set(repo, [])
        prsByRepo.get(repo)?.push(pr)
      }
      for (const [repo, prs] of prsByRepo) {
        queryClient.setQueryData(queryKeys.prs([repo]), prs)
      }
      // Cache empty array for repos with no PRs
      for (const repo of uncachedRepos) {
        if (!prsByRepo.has(repo)) {
          queryClient.setQueryData(queryKeys.prs([repo]), [])
        }
      }

      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }

      return {
        prs: [...cachedPRs, ...fetchedPRs],
        rateLimit: result.rateLimit || null
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: reposToFetch.length > 0 // Don't run query if no repos selected
  })
}

/**
 * Fetch rate limit information
 */
export function useRateLimit(): UseQueryResult<RateLimit | undefined, Error> {
  return useQuery({
    queryKey: queryKeys.rateLimit,
    queryFn: async () => {
      const result = await api.github.getRateLimit()
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
export function usePREvents(): UseQueryResult<unknown[], Error> {
  return useQuery({
    queryKey: queryKeys.prEvents,
    queryFn: async () => {
      const result = await api.github.fetchPREvents()
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
export function useSelectedRepos(): UseQueryResult<string[] | null, Error> {
  return useQuery({
    queryKey: queryKeys.selectedRepos,
    queryFn: () => api.settings.getSelectedRepos(),
    staleTime: Infinity, // Settings don't go stale
    gcTime: Infinity
  })
}

/**
 * Get card layouts for canvas view
 */
export function useCardLayouts(): UseQueryResult<
  Array<{ i: string; x: number; y: number; w: number; h: number }>,
  Error
> {
  return useQuery({
    queryKey: queryKeys.cardLayouts,
    queryFn: () => api.settings.getCardLayouts(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get repo colors
 */
export function useRepoColors(): UseQueryResult<Record<string, string>, Error> {
  return useQuery({
    queryKey: queryKeys.repoColors,
    queryFn: () => api.settings.getRepoColors(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get minimized repos
 */
export function useMinimizedRepos(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: queryKeys.minimizedRepos,
    queryFn: () => api.settings.getMinimizedRepos(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get view mode
 */
export function useViewMode(): UseQueryResult<'canvas' | 'ide', Error> {
  return useQuery({
    queryKey: queryKeys.viewMode,
    queryFn: () => api.settings.getViewMode(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get IDE view settings
 */
export function useIDESettings(): UseQueryResult<
  { sidebarWidth: number; expandedRepos: string[] },
  Error
> {
  return useQuery({
    queryKey: queryKeys.ideSettings,
    queryFn: () => api.settings.getIDEViewSettings(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get AI panel settings
 */
export function useAIPanel(): UseQueryResult<{ isOpen: boolean; width: number } | null, Error> {
  return useQuery({
    queryKey: queryKeys.aiPanel,
    queryFn: () => api.settings.getAIPanel(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get PR detail panel settings
 */
export function usePRDetailPanel(): UseQueryResult<
  { isOpen: boolean; width: number } | null,
  Error
> {
  return useQuery({
    queryKey: queryKeys.prDetailPanel,
    queryFn: () => api.settings.getPRDetailPanel(),
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
export function useClaudeApiKey(): UseQueryResult<string | null, Error> {
  return useQuery({
    queryKey: queryKeys.claudeApiKey,
    queryFn: () => api.ai.getClaudeApiKey(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get selected AI model
 */
export function useSelectedModel(): UseQueryResult<string | null, Error> {
  return useQuery({
    queryKey: queryKeys.selectedModel,
    queryFn: () => api.ai.getSelectedModel(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get enable thinking setting
 */
export function useEnableThinking(): UseQueryResult<boolean, Error> {
  return useQuery({
    queryKey: queryKeys.enableThinking,
    queryFn: () => api.ai.getEnableThinking(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get chat history
 */
export function useChatHistory(): UseQueryResult<
  Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    thinking?: string
    timestamp: string
  }>,
  Error
> {
  return useQuery({
    queryKey: queryKeys.chatHistory,
    queryFn: () => api.ai.getChatHistory(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get PR chats
 */
export function usePRChats(): UseQueryResult<
  Array<{
    prId: string
    prNumber: number
    prTitle: string
    repoFullName: string
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
    createdAt: string
    updatedAt: string
    systemContext?: string
  }>,
  Error
> {
  return useQuery({
    queryKey: queryKeys.prChats,
    queryFn: () => api.ai.getPRChats(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get active PR chat ID
 */
export function useActivePRChatId(): UseQueryResult<string | null, Error> {
  return useQuery({
    queryKey: queryKeys.activePrChatId,
    queryFn: () => api.ai.getActivePRChatId(),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mutation to set selected repos
 * - Optimistic update for instant UI response
 * - Selection is UI-only filtering, no API calls
 * - PRs are fetched once via usePRs(), TanStack Query handles caching
 */
export function useSetSelectedRepos(): UseMutationResult<
  { success: boolean },
  Error,
  string[],
  { previousRepos: string[] | null | undefined }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repos: string[]) => api.settings.setSelectedRepos(repos),
    // Optimistic update: Update UI immediately (synchronous)
    onMutate: (repos) => {
      // Cancel queries is not needed - we're not refetching
      const previousRepos = queryClient.getQueryData<string[] | null>(queryKeys.selectedRepos)
      queryClient.setQueryData(queryKeys.selectedRepos, repos)
      return { previousRepos }
    },
    onError: (_err, _repos, context) => {
      // Rollback on error
      if (context?.previousRepos !== undefined) {
        queryClient.setQueryData(queryKeys.selectedRepos, context.previousRepos)
      }
    }
  })
}

/** Layout type for card positions */
type CardLayout = { i: string; x: number; y: number; w: number; h: number }

/**
 * Mutation to set card layouts
 */
export function useSetCardLayouts(): UseMutationResult<
  { success: boolean },
  Error,
  CardLayout[],
  { previousLayouts: CardLayout[] | undefined }
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (layouts: CardLayout[]) => api.settings.setCardLayouts(layouts),
    // CRITICAL: Optimistic update to prevent "snap back" on drag & drop
    // Without this, the card snaps to old position while waiting for API
    onMutate: (layouts) => {
      const previousLayouts = queryClient.getQueryData<CardLayout[]>(queryKeys.cardLayouts)
      queryClient.setQueryData(queryKeys.cardLayouts, layouts)
      return { previousLayouts }
    },
    onError: (_err, _layouts, context) => {
      // Rollback on error
      if (context?.previousLayouts !== undefined) {
        queryClient.setQueryData(queryKeys.cardLayouts, context.previousLayouts)
      }
    }
  })
}

/**
 * Mutation to set repo color
 */
export function useSetRepoColor(): UseMutationResult<
  { success: boolean },
  Error,
  { repoFullName: string; color: string | null },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName, color }: { repoFullName: string; color: string | null }) =>
      api.settings.setRepoColor(repoFullName, color),
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
export function useSetRepoMinimized(): UseMutationResult<
  { success: boolean },
  Error,
  { repoFullName: string; isMinimized: boolean },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName, isMinimized }: { repoFullName: string; isMinimized: boolean }) =>
      api.settings.setRepoMinimized(repoFullName, isMinimized),
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
export function useSetViewMode(): UseMutationResult<
  { success: boolean },
  Error,
  'canvas' | 'ide',
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mode: 'canvas' | 'ide') => api.settings.setViewMode(mode),
    onSuccess: (_, mode) => {
      queryClient.setQueryData(queryKeys.viewMode, mode)
    }
  })
}

/**
 * Mutation to set AI panel
 */
export function useSetAIPanel(): UseMutationResult<
  { success: boolean },
  Error,
  { isOpen?: boolean; width?: number },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: { isOpen?: boolean; width?: number }) =>
      api.settings.setAIPanel(settings),
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
export function useSetPRDetailPanel(): UseMutationResult<
  { success: boolean },
  Error,
  { isOpen?: boolean; width?: number },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: { isOpen?: boolean; width?: number }) =>
      api.settings.setPRDetailPanel(settings),
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
 * Mutation to refresh/fetch PRs for a specific repo.
 * Updates the cached allPrs data without full refetch.
 */
export function useRefreshRepoPRs(): UseMutationResult<
  {
    success: boolean
    data?: unknown[]
    currentUser?: string
    rateLimit?: RateLimit
    error?: string
  },
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (repoFullName: string) => api.github.refreshRepoPRs(repoFullName),
    onSuccess: (result, repoFullName) => {
      // Update the allPrs cache by replacing PRs for this specific repo
      queryClient.setQueryData<{ prs: PullRequest[]; rateLimit: RateLimit | null }>(
        queryKeys.allPrs,
        (old) => {
          if (!old) return old
          const newPRs = (result.data || []) as PullRequest[]
          // Remove old PRs for this repo, add new ones
          const filteredPRs = old.prs.filter((pr) => pr.base.repo.full_name !== repoFullName)
          return {
            prs: [...filteredPRs, ...newPRs],
            rateLimit: result.rateLimit || old.rateLimit
          }
        }
      )

      // Update rate limit
      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }
    }
  })
}

/**
 * Mutation to refresh a specific PR's detail view.
 * Refreshes the PR data from the repo and invalidates PR files cache.
 */
export function useRefreshPRDetail(): UseMutationResult<
  {
    success: boolean
    data?: unknown[]
    currentUser?: string
    rateLimit?: RateLimit
    error?: string
  },
  Error,
  { owner: string; repo: string; prNumber: number; repoFullName: string },
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName }) => api.github.refreshRepoPRs(repoFullName),
    onSuccess: (result, { owner, repo, prNumber, repoFullName }) => {
      // Update the allPrs cache by replacing PRs for this specific repo
      queryClient.setQueryData<{ prs: PullRequest[]; rateLimit: RateLimit | null }>(
        queryKeys.allPrs,
        (old) => {
          if (!old) return old
          const newPRs = (result.data || []) as PullRequest[]
          // Remove old PRs for this repo, add new ones
          const filteredPRs = old.prs.filter((pr) => pr.base.repo.full_name !== repoFullName)
          return {
            prs: [...filteredPRs, ...newPRs],
            rateLimit: result.rateLimit || old.rateLimit
          }
        }
      )

      // Invalidate PR files cache to force refetch of changed files
      queryClient.invalidateQueries({
        queryKey: queryKeys.prFiles(owner, repo, prNumber)
      })

      // Update rate limit
      if (result.rateLimit) {
        queryClient.setQueryData(queryKeys.rateLimit, result.rateLimit)
      }
    }
  })
}

/**
 * Mutation to clear all cache and refetch
 */
export function useClearCacheAndRefresh(): UseMutationResult<void, Error, void, unknown> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.settings.clearAllData()
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
export function useSetClaudeApiKey(): UseMutationResult<
  { success: boolean; error?: string },
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (apiKey: string) => api.ai.setClaudeApiKey(apiKey),
    onSuccess: (_, apiKey) => {
      queryClient.setQueryData(queryKeys.claudeApiKey, apiKey)
    }
  })
}

/**
 * Mutation to set selected model
 */
export function useSetSelectedModel(): UseMutationResult<
  { success: boolean },
  Error,
  string,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (model: string) => api.ai.setSelectedModel(model),
    onSuccess: (_, model) => {
      queryClient.setQueryData(queryKeys.selectedModel, model)
    }
  })
}

/**
 * Mutation to set enable thinking
 */
export function useSetEnableThinking(): UseMutationResult<
  { success: boolean },
  Error,
  boolean,
  unknown
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (enabled: boolean) => api.ai.setEnableThinking(enabled),
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
  const token = await api.github.getToken()
  if (!token) return

  // Prefetch in parallel
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.repos,
      queryFn: async () => {
        const result = await api.github.fetchContributedRepos()
        if (!result.success) throw new Error(result.error)
        return result.data || []
      }
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.selectedRepos,
      queryFn: () => api.settings.getSelectedRepos()
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.viewMode,
      queryFn: () => api.settings.getViewMode()
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.aiPanel,
      queryFn: () => api.settings.getAIPanel()
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.prDetailPanel,
      queryFn: () => api.settings.getPRDetailPanel()
    })
  ])
}

// Re-export QueryClient types for convenience
export { useQueryClient, QueryClient }
