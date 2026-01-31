/**
 * Memory Usage Queries
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'

export interface MemoryUsage {
  heapUsed: number
  heapTotal: number
  rss: number // Resident Set Size - total memory allocated
  external: number
  arrayBuffers: number
  // Computed fields
  heapUsedMB: number
  heapTotalMB: number
  rssMB: number
  heapPercentage: number
}

const MEMORY_KEY = ['system', 'memory'] as const

/**
 * Fetch Electron app memory usage
 */
export function useMemoryUsage(): UseQueryResult<MemoryUsage, Error> {
  return useQuery({
    queryKey: MEMORY_KEY,
    queryFn: async (): Promise<MemoryUsage> => {
      const raw = await window.electron?.getMemoryUsage()
      if (!raw) throw new Error('Electron API not available')

      const heapUsedMB = Math.round(raw.heapUsed / 1024 / 1024)
      const heapTotalMB = Math.round(raw.heapTotal / 1024 / 1024)
      const rssMB = Math.round(raw.rss / 1024 / 1024)
      const heapPercentage = Math.round((raw.heapUsed / raw.heapTotal) * 100)

      return {
        ...raw,
        heapUsedMB,
        heapTotalMB,
        rssMB,
        heapPercentage
      }
    },
    staleTime: 5 * 1000, // Refresh every 5 seconds
    refetchInterval: 10 * 1000 // Auto-refresh every 10 seconds
  })
}
