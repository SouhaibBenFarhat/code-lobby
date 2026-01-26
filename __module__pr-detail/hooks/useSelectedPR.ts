/**
 * useSelectedPR - Hook to get the selected PR from TanStack Query.
 */

import {
  keys,
  type PRIdentifier,
  type PullRequest,
  useQueryClient,
  useSelectedPR as useSelectedPRFromData,
  useSelectedPRId,
  useUser
} from '@data'
import { useCallback } from 'react'

export interface UseSelectedPRResult {
  pr: PullRequest | null
  refresh: () => void
  isLoading: boolean
  isRefreshing: boolean
  selectedPRId: PRIdentifier | null
}

export function useSelectedPR(): UseSelectedPRResult {
  const { data: selectedPRId } = useSelectedPRId()
  const { data: pr, isLoading, isFetching } = useSelectedPRFromData()
  const queryClient = useQueryClient()

  // Refresh ALL PR-related queries at once using the shared prefix
  // This invalidates: detail, files, and any future PR queries
  const refresh = useCallback(() => {
    if (selectedPRId) {
      queryClient.invalidateQueries({
        queryKey: keys.pr(selectedPRId.repoFullName, selectedPRId.prNumber)
      })
    }
  }, [selectedPRId, queryClient])

  return {
    pr: pr ?? null,
    refresh,
    isLoading,
    isRefreshing: isFetching && !isLoading, // Fetching but not initial load
    selectedPRId: selectedPRId ?? null
  }
}

export function useCurrentUser(): string | null {
  const { data: authData } = useUser()
  return authData?.user?.login ?? null
}
