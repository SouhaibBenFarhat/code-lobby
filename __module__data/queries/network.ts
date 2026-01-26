/**
 * Network Queries
 * Tracks API requests for the network panel
 */

import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'
import type { NetworkRequest } from '../types'

/**
 * Get all network requests
 */
export function useNetworkRequests(): UseQueryResult<NetworkRequest[]> {
  const qc = useQueryClient()

  return useQuery({
    queryKey: keys.networkRequests,
    queryFn: (): NetworkRequest[] => {
      return qc.getQueryData<NetworkRequest[]>(keys.networkRequests) ?? []
    },
    initialData: [],
    staleTime: Infinity
  })
}
