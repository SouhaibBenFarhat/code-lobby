/**
 * Network Mutations
 * Add, update, and clear network requests
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'
import type { NetworkRequest } from '../types'

/**
 * Add a new network request
 */
export function useAddNetworkRequest(): UseMutationResult<NetworkRequest, Error, NetworkRequest> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (request: NetworkRequest) => request,
    onSuccess: (request) => {
      const current = qc.getQueryData<NetworkRequest[]>(keys.networkRequests) ?? []
      qc.setQueryData(keys.networkRequests, [...current, request])
    }
  })
}

/**
 * Update an existing network request
 */
export function useUpdateNetworkRequest(): UseMutationResult<
  Partial<NetworkRequest> & { id: string },
  Error,
  Partial<NetworkRequest> & { id: string }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (update: Partial<NetworkRequest> & { id: string }) => update,
    onSuccess: (update) => {
      const current = qc.getQueryData<NetworkRequest[]>(keys.networkRequests) ?? []
      const updated = current.map((req) => (req.id === update.id ? { ...req, ...update } : req))
      qc.setQueryData(keys.networkRequests, updated)
    }
  })
}

/**
 * Clear all network requests
 */
export function useClearNetworkRequests(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {},
    onSuccess: () => {
      qc.setQueryData(keys.networkRequests, [])
    }
  })
}

/**
 * Toggle network panel visibility
 */
export function useToggleNetworkPanel(): UseMutationResult<boolean, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const current = qc.getQueryData<boolean>(keys.local.networkPanelOpen) ?? false
      return !current
    },
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.local.networkPanelOpen, isOpen)
      localStorage.setItem('networkPanelOpen', String(isOpen))
    }
  })
}

/**
 * Set network panel visibility
 */
export function useSetNetworkPanelOpen(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (isOpen: boolean) => isOpen,
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.local.networkPanelOpen, isOpen)
      localStorage.setItem('networkPanelOpen', String(isOpen))
    }
  })
}
