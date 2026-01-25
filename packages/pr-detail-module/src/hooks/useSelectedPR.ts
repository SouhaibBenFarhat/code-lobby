/**
 * useSelectedPR - Hook to get the selected PR from TanStack Query.
 */

import {
  type PRIdentifier,
  type PullRequest,
  useRefreshPRDetail,
  useSelectedPR as useSelectedPRFromData,
  useSelectedPRId,
  useUser
} from '@codelobby/data'
import { useCallback } from 'react'

export interface UseSelectedPRResult {
  pr: PullRequest | null
  refresh: () => void
  isLoading: boolean
  selectedPRId: PRIdentifier | null
}

export function useSelectedPR(): UseSelectedPRResult {
  const { data: selectedPRId } = useSelectedPRId()
  const { data: pr, isLoading } = useSelectedPRFromData()
  const refreshPRDetail = useRefreshPRDetail()

  const refresh = useCallback((): void => {
    if (selectedPRId) {
      refreshPRDetail.mutate({
        repoFullName: selectedPRId.repoFullName,
        prNumber: selectedPRId.prNumber
      })
    }
  }, [selectedPRId, refreshPRDetail])

  return {
    pr: pr ?? null,
    refresh,
    isLoading,
    selectedPRId: selectedPRId ?? null
  }
}

export function useCurrentUser(): string | null {
  const { data: authData } = useUser()
  return authData?.user?.login ?? null
}
