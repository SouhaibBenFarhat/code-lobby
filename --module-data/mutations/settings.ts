/**
 * Settings Mutations - Just update the query cache (persisted automatically)
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'
import type {
  AgenticPrompts,
  CardLayout,
  CodeVisualizerState,
  DailySpeech,
  PRWebviewTab,
  ViewMode
} from '../types'

export function useSetSelectedRepos(): UseMutationResult<string[], Error, string[]> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (repos: string[]) => Promise.resolve(repos),
    onSuccess: (repos) => {
      qc.setQueryData(keys.selectedRepos, repos)
    }
  })
}

export function useSetViewMode(): UseMutationResult<ViewMode, Error, ViewMode> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (mode: ViewMode) => Promise.resolve(mode),
    onSuccess: (mode) => {
      qc.setQueryData(keys.viewMode, mode)
    }
  })
}

interface AIPanel {
  isOpen?: boolean
  width?: number
}

export function useSetAIPanel(): UseMutationResult<AIPanel, Error, AIPanel> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (s: AIPanel) => Promise.resolve(s),
    onSuccess: (s) => {
      const current = qc.getQueryData<{ isOpen: boolean; width: number }>(keys.aiPanel) || {
        isOpen: false,
        width: 400
      }
      qc.setQueryData(keys.aiPanel, { ...current, ...s })
    }
  })
}

interface PRDetailPanel {
  isOpen?: boolean
  width?: number
}

export function useSetPRDetailPanel(): UseMutationResult<PRDetailPanel, Error, PRDetailPanel> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (s: PRDetailPanel) => Promise.resolve(s),
    onSuccess: (s) => {
      const current = qc.getQueryData<{ isOpen: boolean; width: number }>(keys.prDetailPanel) || {
        isOpen: false,
        width: 400
      }
      qc.setQueryData(keys.prDetailPanel, { ...current, ...s })
    }
  })
}

interface IDESettings {
  sidebarWidth?: number
  expandedRepos?: string[]
  expandedOwners?: string[]
}

export function useSetIDESettings(): UseMutationResult<IDESettings, Error, IDESettings> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (s: IDESettings) => Promise.resolve(s),
    onSuccess: (s) => {
      const current = qc.getQueryData<{
        sidebarWidth: number
        expandedRepos: string[]
        expandedOwners: string[]
      }>(keys.ideSettings) || { sidebarWidth: 280, expandedRepos: [], expandedOwners: [] }
      qc.setQueryData(keys.ideSettings, { ...current, ...s })
    }
  })
}

export function useSetCardLayouts(): UseMutationResult<CardLayout[], Error, CardLayout[]> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (layouts: CardLayout[]) => Promise.resolve(layouts),
    onSuccess: (layouts) => {
      qc.setQueryData(keys.cardLayouts, layouts)
    }
  })
}

interface RepoColorParams {
  repoFullName: string
  color: string | null
}

export function useSetRepoColor(): UseMutationResult<RepoColorParams, Error, RepoColorParams> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName, color }: RepoColorParams) =>
      Promise.resolve({ repoFullName, color }),
    onSuccess: ({ repoFullName, color }) => {
      const current = qc.getQueryData<Record<string, string>>(keys.repoColors) || {}
      const updated = { ...current }
      if (color === null) {
        delete updated[repoFullName]
      } else {
        updated[repoFullName] = color
      }
      qc.setQueryData(keys.repoColors, updated)
    }
  })
}

interface RepoMinimizedParams {
  repoFullName: string
  isMinimized: boolean
}

export function useSetRepoMinimized(): UseMutationResult<
  RepoMinimizedParams,
  Error,
  RepoMinimizedParams
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ repoFullName, isMinimized }: RepoMinimizedParams) =>
      Promise.resolve({ repoFullName, isMinimized }),
    onSuccess: ({ repoFullName, isMinimized }) => {
      const current = qc.getQueryData<string[]>(keys.minimizedRepos) || []
      if (isMinimized && !current.includes(repoFullName)) {
        qc.setQueryData(keys.minimizedRepos, [...current, repoFullName])
      } else if (!isMinimized) {
        qc.setQueryData(
          keys.minimizedRepos,
          current.filter((r) => r !== repoFullName)
        )
      }
    }
  })
}

export function useToggleMyPRsFilter(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (repoFullName: string) => Promise.resolve(repoFullName),
    onSuccess: (repoFullName) => {
      const current = qc.getQueryData<string[]>(keys.myPRsRepos) || []
      if (current.includes(repoFullName)) {
        qc.setQueryData(
          keys.myPRsRepos,
          current.filter((r) => r !== repoFullName)
        )
      } else {
        qc.setQueryData(keys.myPRsRepos, [...current, repoFullName])
      }
    }
  })
}

export function useToggleRepoExpanded(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (repoFullName: string) => Promise.resolve(repoFullName),
    onSuccess: (repoFullName) => {
      const current = qc.getQueryData<{
        sidebarWidth: number
        expandedRepos: string[]
        expandedOwners: string[]
      }>(keys.ideSettings) || { sidebarWidth: 280, expandedRepos: [], expandedOwners: [] }
      const expandedRepos = current.expandedRepos.includes(repoFullName)
        ? current.expandedRepos.filter((r) => r !== repoFullName)
        : [...current.expandedRepos, repoFullName]
      qc.setQueryData(keys.ideSettings, { ...current, expandedRepos })
    }
  })
}

export function useClearCache(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      qc.clear()
      localStorage.clear()
    }
  })
}

export function useFactoryReset(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      qc.clear()
      localStorage.clear()
    }
  })
}

interface UserProfilePanel {
  isOpen?: boolean
  height?: number
}

export function useSetUserProfilePanel(): UseMutationResult<
  UserProfilePanel,
  Error,
  UserProfilePanel
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (s: UserProfilePanel) => Promise.resolve(s),
    onSuccess: (s) => {
      const current = qc.getQueryData<{ isOpen: boolean; height: number }>(
        keys.local.userProfilePanel
      ) || {
        isOpen: false,
        height: 250
      }
      qc.setQueryData(keys.local.userProfilePanel, { ...current, ...s })
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// AGENTIC SETTINGS - Custom prompts for AI-powered actions
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_AGENTIC_PROMPTS: AgenticPrompts = {
  ciFailureAnalysis: '',
  prStatusAnalysis: '',
  jiraTicketExtraction: '',
  previewUrlExtraction: ''
}

export function useSetAgenticPrompts(): UseMutationResult<
  Partial<AgenticPrompts>,
  Error,
  Partial<AgenticPrompts>
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (prompts: Partial<AgenticPrompts>) => Promise.resolve(prompts),
    onSuccess: (prompts) => {
      const current =
        qc.getQueryData<AgenticPrompts>(keys.agenticPrompts) || DEFAULT_AGENTIC_PROMPTS
      qc.setQueryData(keys.agenticPrompts, { ...current, ...prompts })
    }
  })
}

export function useSetAgenticSettingsOpen(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (isOpen: boolean) => Promise.resolve(isOpen),
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.agenticSettingsOpen, isOpen)
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// DAILY SPEECHES - AI-generated standup summaries
// ═══════════════════════════════════════════════════════════════════════════

export function useSaveDailySpeech(): UseMutationResult<DailySpeech, Error, DailySpeech> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (speech: DailySpeech) => Promise.resolve(speech),
    onSuccess: (speech) => {
      const current = qc.getQueryData<DailySpeech[]>(keys.dailySpeeches) || []
      // Check if this speech already exists (by id)
      const existingIndex = current.findIndex((s) => s.id === speech.id)
      if (existingIndex >= 0) {
        // Update existing
        const updated = [...current]
        updated[existingIndex] = speech
        qc.setQueryData(keys.dailySpeeches, updated)
      } else {
        // Add new (prepend to keep newest first)
        qc.setQueryData(keys.dailySpeeches, [speech, ...current])
      }
    }
  })
}

export function useDeleteDailySpeech(): UseMutationResult<string, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (speechId: string) => Promise.resolve(speechId),
    onSuccess: (speechId) => {
      const current = qc.getQueryData<DailySpeech[]>(keys.dailySpeeches) || []
      qc.setQueryData(
        keys.dailySpeeches,
        current.filter((s) => s.id !== speechId)
      )
    }
  })
}

export function useSetDailySpeechModalOpen(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (isOpen: boolean) => Promise.resolve(isOpen),
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.dailySpeechModalOpen, isOpen)
    }
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

export function useSetCodeVisualizer(): UseMutationResult<
  Partial<CodeVisualizerState>,
  Error,
  Partial<CodeVisualizerState>
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (state: Partial<CodeVisualizerState>) => Promise.resolve(state),
    onSuccess: (state) => {
      const current =
        qc.getQueryData<CodeVisualizerState>(keys.local.codeVisualizer) ||
        DEFAULT_CODE_VISUALIZER_STATE
      qc.setQueryData(keys.local.codeVisualizer, { ...current, ...state })
    }
  })
}

/** Convenience mutation to open the code visualizer with specific params */
export function useOpenCodeVisualizer(): UseMutationResult<
  { repoFullName: string; prNumber: number; headRef: string; initialFilePath?: string },
  Error,
  { repoFullName: string; prNumber: number; headRef: string; initialFilePath?: string }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params) => Promise.resolve(params),
    onSuccess: ({ repoFullName, prNumber, headRef, initialFilePath }) => {
      qc.setQueryData<CodeVisualizerState>(keys.local.codeVisualizer, {
        isOpen: true,
        repoFullName,
        prNumber,
        headRef,
        initialFilePath: initialFilePath || null
      })
    }
  })
}

/** Convenience mutation to close the code visualizer */
export function useCloseCodeVisualizer(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => Promise.resolve(),
    onSuccess: () => {
      qc.setQueryData<CodeVisualizerState>(keys.local.codeVisualizer, DEFAULT_CODE_VISUALIZER_STATE)
    }
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// PR WEBVIEW TABS - Browser tabs associated with PRs
// ═══════════════════════════════════════════════════════════════════════════

interface AddWebviewTabParams {
  prId: string
  tab: PRWebviewTab
}

/** Add a new webview tab to a PR */
export function useAddWebviewTab(): UseMutationResult<
  AddWebviewTabParams,
  Error,
  AddWebviewTabParams
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: AddWebviewTabParams) => Promise.resolve(params),
    onSuccess: ({ prId, tab }) => {
      const current = qc.getQueryData<PRWebviewTab[]>(keys.local.prWebviewTabs(prId)) || []
      qc.setQueryData(keys.local.prWebviewTabs(prId), [...current, tab])
      // Auto-switch to the new tab
      qc.setQueryData(keys.local.prActiveTab(prId), tab.id)
    }
  })
}

interface RemoveWebviewTabParams {
  prId: string
  tabId: string
}

/** Remove a webview tab from a PR */
export function useRemoveWebviewTab(): UseMutationResult<
  RemoveWebviewTabParams,
  Error,
  RemoveWebviewTabParams
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: RemoveWebviewTabParams) => Promise.resolve(params),
    onSuccess: ({ prId, tabId }) => {
      const current = qc.getQueryData<PRWebviewTab[]>(keys.local.prWebviewTabs(prId)) || []
      const updated = current.filter((t) => t.id !== tabId)
      qc.setQueryData(keys.local.prWebviewTabs(prId), updated)

      // If we closed the active tab, switch to PR detail view
      const activeTab = qc.getQueryData<string | null>(keys.local.prActiveTab(prId))
      if (activeTab === tabId) {
        qc.setQueryData(keys.local.prActiveTab(prId), null)
      }
    }
  })
}

interface UpdateWebviewTabParams {
  prId: string
  tabId: string
  updates: Partial<Omit<PRWebviewTab, 'id'>>
}

/** Update a webview tab (e.g., change URL or title) */
export function useUpdateWebviewTab(): UseMutationResult<
  UpdateWebviewTabParams,
  Error,
  UpdateWebviewTabParams
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: UpdateWebviewTabParams) => Promise.resolve(params),
    onSuccess: ({ prId, tabId, updates }) => {
      const current = qc.getQueryData<PRWebviewTab[]>(keys.local.prWebviewTabs(prId)) || []
      const updated = current.map((t) => (t.id === tabId ? { ...t, ...updates } : t))
      qc.setQueryData(keys.local.prWebviewTabs(prId), updated)
    }
  })
}

interface SetActiveTabParams {
  prId: string
  tabId: string | null // null = PR detail view
}

/** Set the active tab for a PR */
export function useSetPRActiveTab(): UseMutationResult<
  SetActiveTabParams,
  Error,
  SetActiveTabParams
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (params: SetActiveTabParams) => Promise.resolve(params),
    onSuccess: ({ prId, tabId }) => {
      qc.setQueryData(keys.local.prActiveTab(prId), tabId)
    }
  })
}
