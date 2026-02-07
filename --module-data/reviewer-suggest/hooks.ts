/**
 * Reviewer Suggestion TanStack Query Hooks
 *
 * Hooks for managing the agentic reviewer suggestion feature:
 * - useSuggestReviewers: reads cached result
 * - useTriggerReviewerSuggestion: sends IPC request to start analysis
 * - useReviewerSuggestListener: listens for IPC events from main process
 */

import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { keys } from '../keys'
import type { ReviewerSuggestionResult, ReviewerSuggestRequest, SuggestedReviewer } from './types'

// =============================================================================
// useSuggestReviewers - Read cached reviewer suggestions
// =============================================================================

/**
 * Query hook that reads cached reviewer suggestion results.
 * Enabled: false - only populated via IPC listener or manual cache set.
 * staleTime: 10 min - don't re-run if recently analyzed.
 */
export function useSuggestReviewers(
  repoFullName: string | undefined,
  prNumber: number | undefined
): UseQueryResult<ReviewerSuggestionResult, Error> {
  return useQuery({
    queryKey: keys.prReviewerSuggestions(repoFullName || '', prNumber || 0),
    queryFn: () => {
      // This query is cache-only - data comes from IPC listener
      throw new Error('No cached reviewer suggestions')
    },
    enabled: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: false
  })
}

// =============================================================================
// useTriggerReviewerSuggestion - Start analysis via IPC
// =============================================================================

/**
 * Mutation hook that triggers the reviewer suggestion analysis.
 * Sends the request to the main process via IPC.
 */
export function useTriggerReviewerSuggestion(): UseMutationResult<
  { success: boolean; error?: string },
  Error,
  ReviewerSuggestRequest
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: ReviewerSuggestRequest) => {
      if (!window.electron?.startReviewerSuggestion) {
        throw new Error('Electron API not available')
      }

      const result = await window.electron.startReviewerSuggestion({
        repoFullName: request.repoFullName,
        prNumber: request.prNumber,
        branch: request.branch,
        baseBranch: request.baseBranch,
        changedFiles: request.changedFiles,
        prAuthor: request.prAuthor,
        githubToken: request.githubToken
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to start reviewer suggestion')
      }

      return result
    },
    onMutate: (request) => {
      // Set a loading placeholder in cache so the UI can show loading state
      queryClient.setQueryData(
        keys.prReviewerSuggestions(request.repoFullName, request.prNumber),
        undefined
      )
    }
  })
}

// =============================================================================
// useReviewerSuggestListener - IPC event listener
// =============================================================================

/**
 * Listens for IPC events from the main process and updates TanStack cache.
 * Must be initialized once in the App root.
 *
 * Note: We store the result globally and match it back to the correct cache
 * key using the repoFullName and prNumber from the pending mutation context.
 */

// Module-level state to track which PR is currently being analyzed
let pendingRequest: { repoFullName: string; prNumber: number } | null = null

export function setPendingReviewerRequest(
  request: { repoFullName: string; prNumber: number } | null
): void {
  pendingRequest = request
}

export function useReviewerSuggestListener(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!window.electron?.onReviewerSuggestDone || !window.electron?.onReviewerSuggestError) {
      return
    }

    const removeDoneListener = window.electron.onReviewerSuggestDone((data) => {
      if (!pendingRequest) return

      const result: ReviewerSuggestionResult = {
        reviewers: data.reviewers as SuggestedReviewer[],
        analyzedFiles: data.analyzedFiles,
        timestamp: data.timestamp
      }

      queryClient.setQueryData(
        keys.prReviewerSuggestions(pendingRequest.repoFullName, pendingRequest.prNumber),
        result
      )

      pendingRequest = null
    })

    const removeErrorListener = window.electron.onReviewerSuggestError((data) => {
      if (!pendingRequest) return

      // Set an error state in the cache
      queryClient.setQueryData(
        keys.prReviewerSuggestions(pendingRequest.repoFullName, pendingRequest.prNumber),
        {
          reviewers: [],
          analyzedFiles: 0,
          timestamp: new Date().toISOString(),
          error: data.error
        }
      )

      pendingRequest = null
    })

    return () => {
      removeDoneListener()
      removeErrorListener()
    }
  }, [queryClient])
}
