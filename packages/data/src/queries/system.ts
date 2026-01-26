/**
 * System Queries
 *
 * TanStack queries for system/OS state like fullscreen, theme, etc.
 */

import { type UseQueryResult, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { keys } from '../keys'

/**
 * Query for fullscreen state
 * Subscribes to fullscreen changes via window.electron
 */
export function useIsFullscreen(): UseQueryResult<boolean, Error> {
  const qc = useQueryClient()

  // Subscribe to fullscreen changes
  useEffect(() => {
    if (!window.electron?.onFullscreenChange) return

    const cleanup = window.electron.onFullscreenChange((fullscreen: boolean) => {
      qc.setQueryData(keys.system.fullscreen, fullscreen)
    })

    return cleanup
  }, [qc])

  return useQuery({
    queryKey: keys.system.fullscreen,
    queryFn: async () => {
      if (!window.electron?.isFullscreen) return false
      return window.electron.isFullscreen()
    },
    staleTime: Infinity // Only updates via subscription
  })
}

/**
 * Query for theme (dark/light mode)
 */
export function useTheme(): UseQueryResult<'dark' | 'light', Error> {
  return useQuery({
    queryKey: keys.system.theme,
    queryFn: () => {
      const saved = localStorage.getItem('codelobby-theme')
      return saved === 'light' ? 'light' : 'dark' // Default to dark
    },
    staleTime: Infinity
  })
}

/**
 * Query for network panel state
 */
export function useNetworkPanel(): UseQueryResult<boolean, Error> {
  return useQuery({
    queryKey: keys.local.networkPanelOpen,
    queryFn: () => {
      const saved = localStorage.getItem('networkPanelOpen')
      return saved === 'true'
    },
    staleTime: Infinity
  })
}

/**
 * Query for network panel height
 */
export function useNetworkPanelHeight(): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: keys.local.networkPanelHeight,
    queryFn: () => {
      const saved = localStorage.getItem('networkPanelHeight')
      return saved ? parseInt(saved, 10) : 200
    },
    staleTime: Infinity
  })
}
