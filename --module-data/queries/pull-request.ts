/**
 * Pull Request Queries
 *
 * Uses per-repo caching: each repo has its own cache entry.
 * When a new repo is added, only that repo's PRs are fetched.
 */

import { type UseQueryResult, useQueries, useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import * as github from '../github'
import { keys } from '../keys'
import type { PRFile, PRIdentifier, PullRequest } from '../types'
import { useGitHubToken, useSelectedRepos } from './settings'

// 15 minutes in milliseconds
const PR_CACHE_TIME = 15 * 60 * 1000

/**
 * Fetch PRs for a single repo (per-repo cache)
 * PRs are sorted by created_at (newest first) via GraphQL orderBy
 */
export function usePRsForRepo(repoFullName: string): UseQueryResult<PullRequest[]> {
  const { data: token } = useGitHubToken()

  return useQuery({
    queryKey: keys.prsForRepo(repoFullName),
    queryFn: async () => {
      if (!token) return []
      const prs = await github.fetchPRsForRepos(token, [repoFullName])
      return prs as PullRequest[]
    },
    enabled: !!token && !!repoFullName,
    staleTime: PR_CACHE_TIME
  })
}

/**
 * Fetch PRs for all selected repos (per-repo caching)
 * Each repo has its own cache entry - adding a new repo only fetches that repo's PRs
 */
export function usePRs(): {
  data: PullRequest[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
  /** Loading status per repo - only true for repos actively fetching */
  loadingRepos: string[]
} {
  const { data: token } = useGitHubToken()
  const { data: selectedRepos } = useSelectedRepos()
  const reposToFetch = selectedRepos || []

  // Create a query for each selected repo
  const queries = useQueries({
    queries: reposToFetch.map((repoFullName) => ({
      queryKey: keys.prsForRepo(repoFullName),
      queryFn: async () => {
        if (!token) return []
        const prs = await github.fetchPRsForRepos(token, [repoFullName])
        return prs as PullRequest[]
      },
      enabled: !!token,
      staleTime: PR_CACHE_TIME
    }))
  })

  // Combine results from all queries (each repo's PRs are already sorted by GraphQL)
  const allPRs = queries.flatMap((q) => q.data || [])

  // Only show as loading if ALL queries are loading (initial load)
  // If some queries have data, we're not in a "loading" state
  const hasAnyData = queries.some((q) => q.data && q.data.length > 0)
  const allLoading = queries.every((q) => q.isLoading)
  const isLoading = allLoading && !hasAnyData

  const isFetching = queries.some((q) => q.isFetching)
  const isError = queries.some((q) => q.isError)
  const error = queries.find((q) => q.error)?.error as Error | null

  // Track which repos are currently loading
  const loadingRepos = reposToFetch.filter((_, i) => queries[i]?.isFetching)

  // Refetch all queries
  const refetch = (): void => {
    queries.forEach((q) => {
      q.refetch()
    })
  }

  return {
    data: allPRs,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    loadingRepos
  }
}

export function useSelectedPRId(): UseQueryResult<PRIdentifier | null> {
  return useQuery({
    queryKey: keys.selectedPRId,
    queryFn: (): PRIdentifier | null => queryClient.getQueryData(keys.selectedPRId) ?? null,
    staleTime: Infinity
  })
}

export function useSelectedPR(): UseQueryResult<PullRequest | null> {
  const { data: token } = useGitHubToken()
  const { data: selectedPRId } = useSelectedPRId()

  return useQuery({
    queryKey: selectedPRId
      ? keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
      : ['github', 'pr-detail', 'none'],
    queryFn: async () => {
      if (!token || !selectedPRId) return null
      const pr = await github.fetchSinglePR(token, selectedPRId.repoFullName, selectedPRId.prNumber)
      return pr as PullRequest
    },
    enabled: !!token && !!selectedPRId,
    // Poll every 3 seconds while GitHub is computing merge status (returns UNKNOWN)
    // Stop polling once we get an actual status
    refetchInterval: (query) => {
      const pr = query.state.data
      if (pr?.mergeable === 'UNKNOWN' || pr?.mergeStateStatus === 'UNKNOWN') {
        return 3000 // Poll every 3 seconds
      }
      return false // Stop polling
    }
  })
}

export function usePRFiles(
  repoFullName: string | null,
  prNumber: number | null,
  /** Total file count from PR metadata - enables parallel fetching for large PRs */
  totalFiles?: number
): UseQueryResult<PRFile[]> {
  const { data: token } = useGitHubToken()

  return useQuery({
    queryKey:
      repoFullName && prNumber
        ? keys.prFiles(repoFullName, prNumber)
        : ['github', 'pr', 'none', 'files'],
    queryFn: async () => {
      if (!token || !repoFullName || !prNumber) return []
      const [owner, repo] = repoFullName.split('/')
      const files = await github.fetchPRFiles(token, owner, repo, prNumber, totalFiles)
      return files as PRFile[]
    },
    enabled: !!token && !!repoFullName && !!prNumber
  })
}
