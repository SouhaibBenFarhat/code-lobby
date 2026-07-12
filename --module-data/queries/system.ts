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
 * Query for the About modal open state.
 *
 * The modal is opened from the native "About CodeLobby" menu item (on macOS the
 * App menu → About CodeLobby; on other platforms the Help menu), which sends a
 * `menu:open-about` IPC event. State lives under the `system` prefix so it is
 * NOT persisted — the modal never auto-reopens on launch.
 */
export function useAboutModalOpen(): UseQueryResult<boolean, Error> {
  const qc = useQueryClient()

  // Open the modal when the native "About" menu item is clicked
  useEffect(() => {
    if (!window.electron?.onOpenAbout) return

    const cleanup = window.electron.onOpenAbout(() => {
      qc.setQueryData(keys.system.aboutModalOpen, true)
    })

    return cleanup
  }, [qc])

  return useQuery({
    queryKey: keys.system.aboutModalOpen,
    queryFn: () => qc.getQueryData<boolean>(keys.system.aboutModalOpen) ?? false,
    staleTime: Infinity // Only updates via the menu subscription / mutation
  })
}

/**
 * Query for the Database Viewer open state.
 *
 * Opened from the native "Database Viewer" menu item (View menu), which sends a
 * `menu:open-database-viewer` IPC event. State lives under the `system` prefix
 * so it is NOT persisted — the viewer never auto-reopens on launch.
 */
export function useDatabaseViewerOpen(): UseQueryResult<boolean, Error> {
  const qc = useQueryClient()

  // Open the viewer when the native "Database Viewer" menu item is clicked
  useEffect(() => {
    if (!window.electron?.onOpenDatabaseViewer) return

    const cleanup = window.electron.onOpenDatabaseViewer(() => {
      qc.setQueryData(keys.system.databaseViewerOpen, true)
    })

    return cleanup
  }, [qc])

  return useQuery({
    queryKey: keys.system.databaseViewerOpen,
    queryFn: () => qc.getQueryData<boolean>(keys.system.databaseViewerOpen) ?? false,
    staleTime: Infinity // Only updates via the menu subscription / mutation
  })
}

/**
 * Theme mode:
 * - 'light'   — light color scheme
 * - 'dark'    — dark color scheme
 * - 'system'  — follow the OS `prefers-color-scheme` setting
 */
export type ThemeVariant = 'light' | 'dark' | 'system'

const VALID_THEMES: ThemeVariant[] = ['light', 'dark', 'system']

/** Whether the OS currently prefers a dark color scheme. */
function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/**
 * Apply the resolved color scheme to the <html> element.
 * 'system' resolves to dark/light via the OS preference.
 */
export function applyThemeClasses(theme: ThemeVariant): void {
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark())
  document.documentElement.classList.toggle('dark', isDark)
}

/**
 * Query for the current theme mode.
 *
 * Also owns theme application: it writes the resolved `.dark` class to <html>
 * on mount and whenever the mode changes, and — while in 'system' mode —
 * subscribes to OS color-scheme changes so the app follows the system live.
 */
export function useTheme(): UseQueryResult<ThemeVariant, Error> {
  const query = useQuery({
    queryKey: keys.system.theme,
    queryFn: (): ThemeVariant => {
      const saved = localStorage.getItem('codelobby-theme')
      if (saved && VALID_THEMES.includes(saved as ThemeVariant)) {
        return saved as ThemeVariant
      }
      return 'dark' // Default to dark
    },
    staleTime: Infinity
  })

  const theme = query.data
  useEffect(() => {
    if (!theme) return
    applyThemeClasses(theme)
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (): void => applyThemeClasses('system')
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [theme])

  return query
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

/**
 * Claude Code CLI status
 */
export interface ClaudeCodeStatus {
  installed: boolean
  version: string | null
  checkedAt: number
}

/**
 * Query for Claude Code CLI installation status
 * Checks if the CLI is available on the user's machine
 */
export function useClaudeCodeStatus(): UseQueryResult<ClaudeCodeStatus, Error> {
  return useQuery({
    queryKey: ['system', 'claude-code-status'],
    queryFn: async (): Promise<ClaudeCodeStatus> => {
      if (!window.electron?.checkClaudeCodeInstalled) {
        return { installed: false, version: null, checkedAt: Date.now() }
      }

      try {
        const result = await window.electron.checkClaudeCodeInstalled()
        return {
          installed: result.installed,
          version: result.version,
          checkedAt: Date.now()
        }
      } catch {
        return { installed: false, version: null, checkedAt: Date.now() }
      }
    },
    staleTime: 5 * 60 * 1000, // Check every 5 minutes
    refetchOnWindowFocus: false
  })
}

/**
 * Claude API Key status (from Electron store)
 */
export interface ClaudeApiKeyStatus {
  hasKey: boolean
  checkedAt: number
}

/**
 * Query for Claude API key status
 * Returns whether an API key is configured (not the key itself for security)
 */
export function useClaudeApiKeyStatus(): UseQueryResult<ClaudeApiKeyStatus, Error> {
  return useQuery({
    queryKey: ['system', 'claude-api-key-status'],
    queryFn: async (): Promise<ClaudeApiKeyStatus> => {
      if (!window.electron?.getClaudeApiKey) {
        return { hasKey: false, checkedAt: Date.now() }
      }

      try {
        const key = await window.electron.getClaudeApiKey()
        return {
          hasKey: !!key,
          checkedAt: Date.now()
        }
      } catch {
        return { hasKey: false, checkedAt: Date.now() }
      }
    },
    staleTime: Infinity, // Only invalidated manually
    refetchOnWindowFocus: false
  })
}
