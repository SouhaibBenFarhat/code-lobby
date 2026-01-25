/**
 * Settings Queries - Data persisted via TanStack Query persistence
 */

import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import { keys } from '../keys'
import type { CardLayout, ViewMode } from '../types'

// Helper to get persisted data with default
function getPersisted<T>(key: readonly string[], defaultValue: T): T {
  return queryClient.getQueryData(key) ?? defaultValue
}

/**
 * Get the GitHub token from cache
 * This is THE source of truth for the token - used by all API calls
 */
export function useGitHubToken() {
  return useQuery({
    queryKey: keys.githubToken,
    queryFn: (): string | null => getPersisted(keys.githubToken, null),
    staleTime: Infinity,
    gcTime: Infinity
  })
}

/**
 * Get the token synchronously from cache (for non-hook contexts)
 */
export function getGitHubToken(): string | null {
  return queryClient.getQueryData<string>(keys.githubToken) ?? null
}

export function useSelectedRepos() {
  return useQuery({
    queryKey: keys.selectedRepos,
    queryFn: (): string[] | null => getPersisted(keys.selectedRepos, null),
    staleTime: Infinity
  })
}

export function useViewMode() {
  return useQuery({
    queryKey: keys.viewMode,
    queryFn: (): ViewMode => getPersisted(keys.viewMode, 'canvas'),
    staleTime: Infinity
  })
}

export function useAIPanel() {
  return useQuery({
    queryKey: keys.aiPanel,
    queryFn: () => getPersisted(keys.aiPanel, { isOpen: false, width: 400 }),
    staleTime: Infinity
  })
}

export function usePRDetailPanel() {
  return useQuery({
    queryKey: keys.prDetailPanel,
    queryFn: () => getPersisted(keys.prDetailPanel, { isOpen: false, width: 400 }),
    staleTime: Infinity
  })
}

export function useIDESettings() {
  return useQuery({
    queryKey: keys.ideSettings,
    queryFn: () => getPersisted(keys.ideSettings, { sidebarWidth: 280, expandedRepos: [] }),
    staleTime: Infinity
  })
}

export function useCardLayouts() {
  return useQuery({
    queryKey: keys.cardLayouts,
    queryFn: (): CardLayout[] => getPersisted(keys.cardLayouts, []),
    staleTime: Infinity
  })
}

export function useRepoColors() {
  return useQuery({
    queryKey: keys.repoColors,
    queryFn: () => getPersisted<Record<string, string>>(keys.repoColors, {}),
    staleTime: Infinity
  })
}

export function useMinimizedRepos() {
  return useQuery({
    queryKey: keys.minimizedRepos,
    queryFn: () => getPersisted<string[]>(keys.minimizedRepos, []),
    staleTime: Infinity
  })
}

export function useMyPRsRepos() {
  return useQuery({
    queryKey: keys.myPRsRepos,
    queryFn: () => getPersisted<string[]>(keys.myPRsRepos, []),
    staleTime: Infinity
  })
}
