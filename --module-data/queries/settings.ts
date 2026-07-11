/**
 * Settings Queries - Data persisted via TanStack Query persistence
 */

import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import { queryClient } from '../client'
import { keys } from '../keys'
import type { CardLayout, CodeVisualizerState, DailySpeech, PRWebviewTab, ViewMode } from '../types'
import { useActiveAccountId } from './accounts'

// Helper to get persisted data with default
function getPersisted<T>(key: readonly string[], defaultValue: T): T {
  return queryClient.getQueryData(key) ?? defaultValue
}

/**
 * Get the GitHub token from cache
 * This is THE source of truth for the token - used by all API calls
 */
export function useGitHubToken(): UseQueryResult<string | null, Error> {
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

/**
 * Selected repos for the ACTIVE account. Each account remembers its own set;
 * the queryKey includes the active account id so switching accounts swaps the
 * value automatically and consumers keep calling `useSelectedRepos()` unchanged.
 */
export function useSelectedRepos(): UseQueryResult<string[] | null, Error> {
  const { data: activeAccountId = null } = useActiveAccountId()
  const key = activeAccountId
    ? keys.selectedReposFor(activeAccountId)
    : (['settings', 'selected-repos', 'none'] as const)
  return useQuery({
    queryKey: key,
    queryFn: (): string[] | null => getPersisted(key, null),
    staleTime: Infinity
  })
}

export function useViewMode(): UseQueryResult<ViewMode, Error> {
  return useQuery({
    queryKey: keys.viewMode,
    queryFn: (): ViewMode => getPersisted(keys.viewMode, 'canvas'),
    staleTime: Infinity
  })
}

export function useAIPanel(): UseQueryResult<{ isOpen: boolean; width: number }, Error> {
  return useQuery({
    queryKey: keys.aiPanel,
    queryFn: () => getPersisted(keys.aiPanel, { isOpen: false, width: 400 }),
    staleTime: Infinity
  })
}

export function usePRDetailPanel(): UseQueryResult<{ isOpen: boolean; width: number }, Error> {
  return useQuery({
    queryKey: keys.prDetailPanel,
    queryFn: () => getPersisted(keys.prDetailPanel, { isOpen: false, width: 400 }),
    staleTime: Infinity
  })
}

export function useIDESettings(): UseQueryResult<
  { sidebarWidth: number; expandedRepos: string[]; expandedOwners: string[] },
  Error
> {
  return useQuery({
    queryKey: keys.ideSettings,
    queryFn: () =>
      getPersisted(keys.ideSettings, { sidebarWidth: 280, expandedRepos: [], expandedOwners: [] }),
    staleTime: Infinity
  })
}

export function useCardLayouts(): UseQueryResult<CardLayout[], Error> {
  return useQuery({
    queryKey: keys.cardLayouts,
    queryFn: (): CardLayout[] => getPersisted(keys.cardLayouts, []),
    staleTime: Infinity
  })
}

export function useRepoColors(): UseQueryResult<Record<string, string>, Error> {
  return useQuery({
    queryKey: keys.repoColors,
    queryFn: () => getPersisted<Record<string, string>>(keys.repoColors, {}),
    staleTime: Infinity
  })
}

export function useMinimizedRepos(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: keys.minimizedRepos,
    queryFn: () => getPersisted<string[]>(keys.minimizedRepos, []),
    staleTime: Infinity
  })
}

export function useMyPRsRepos(): UseQueryResult<string[], Error> {
  return useQuery({
    queryKey: keys.myPRsRepos,
    queryFn: () => getPersisted<string[]>(keys.myPRsRepos, []),
    staleTime: Infinity
  })
}

export interface UserProfilePanel {
  isOpen: boolean
  height: number
}

export function useUserProfilePanel(): UseQueryResult<UserProfilePanel, Error> {
  return useQuery({
    queryKey: keys.local.userProfilePanel,
    queryFn: () =>
      getPersisted<UserProfilePanel>(keys.local.userProfilePanel, { isOpen: false, height: 250 }),
    staleTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY SPEECHES - AI-generated standup summaries
// ═══════════════════════════════════════════════════════════════════════════

export function useDailySpeeches(): UseQueryResult<DailySpeech[], Error> {
  return useQuery({
    queryKey: keys.dailySpeeches,
    queryFn: () => getPersisted<DailySpeech[]>(keys.dailySpeeches, []),
    staleTime: Infinity
  })
}

export function useDailySpeechModalOpen(): UseQueryResult<boolean, Error> {
  return useQuery({
    queryKey: keys.dailySpeechModalOpen,
    queryFn: () => getPersisted<boolean>(keys.dailySpeechModalOpen, false),
    staleTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// CODE VISUALIZER - Floating code viewer panel
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CODE_VISUALIZER_STATE: CodeVisualizerState = {
  isOpen: false,
  repoFullName: null,
  prNumber: null,
  headRef: null,
  initialFilePath: null
}

export function useCodeVisualizer(): UseQueryResult<CodeVisualizerState, Error> {
  return useQuery({
    queryKey: keys.local.codeVisualizer,
    queryFn: () =>
      getPersisted<CodeVisualizerState>(keys.local.codeVisualizer, DEFAULT_CODE_VISUALIZER_STATE),
    staleTime: Infinity
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PR WEBVIEW TABS - Browser tabs associated with PRs
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get webview tabs for a specific PR
 */
export function usePRWebviewTabs(prId: string | null): UseQueryResult<PRWebviewTab[], Error> {
  return useQuery({
    queryKey: prId ? keys.local.prWebviewTabs(prId) : ['local', 'pr-webview-tabs', 'none'],
    queryFn: () => (prId ? getPersisted<PRWebviewTab[]>(keys.local.prWebviewTabs(prId), []) : []),
    enabled: !!prId,
    staleTime: Infinity
  })
}

/**
 * Get active tab for a specific PR (null = PR detail view, string = webview tab id)
 */
export function usePRActiveTab(prId: string | null): UseQueryResult<string | null, Error> {
  return useQuery({
    queryKey: prId ? keys.local.prActiveTab(prId) : ['local', 'pr-active-tab', 'none'],
    queryFn: () => (prId ? getPersisted<string | null>(keys.local.prActiveTab(prId), null) : null),
    enabled: !!prId,
    staleTime: Infinity
  })
}
