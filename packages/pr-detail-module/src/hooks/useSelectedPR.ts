/**
 * useSelectedPR - Hook to get the selected PR from TanStack Query.
 */

import {
  type PRIdentifier,
  type PullRequest,
  useSelectedPR as useSelectedPRFromData,
  useSelectedPRId,
  useUser
} from '@codelobby/data'

export interface UseSelectedPRResult {
  pr: PullRequest | null
  refresh: () => void
  isLoading: boolean
  isRefreshing: boolean
  selectedPRId: PRIdentifier | null
}

export function useSelectedPR(): UseSelectedPRResult {
  const { data: selectedPRId } = useSelectedPRId()
  const { data: pr, isLoading, isFetching, refetch } = useSelectedPRFromData()

  return {
    pr: pr ?? null,
    refresh: refetch,
    isLoading,
    isRefreshing: isFetching && !isLoading, // Fetching but not initial load
    selectedPRId: selectedPRId ?? null
  }
}

export function useCurrentUser(): string | null {
  const { data: authData } = useUser()
  return authData?.user?.login ?? null
}
