/**
 * System Mutations
 *
 * TanStack mutations for system/OS operations like fullscreen, theme, shell, etc.
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'

/**
 * Toggle fullscreen mode
 */
export function useToggleFullscreen(): UseMutationResult<boolean, Error, void> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!window.electron?.toggleFullscreen) {
        throw new Error('Fullscreen not available')
      }
      return window.electron.toggleFullscreen()
    },
    onSuccess: () => {
      // Fullscreen state will be updated via the subscription in useIsFullscreen
      qc.invalidateQueries({ queryKey: keys.system.fullscreen })
    }
  })
}

/**
 * Set the About modal open state.
 *
 * Used to close the modal (the native menu item opens it via the subscription
 * in useAboutModalOpen).
 */
export function useSetAboutModalOpen(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (isOpen: boolean) => Promise.resolve(isOpen),
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.system.aboutModalOpen, isOpen)
    }
  })
}

/**
 * Set the Database Viewer open state.
 *
 * Used to close the viewer (the native menu item opens it via the subscription
 * in useDatabaseViewerOpen).
 */
export function useSetDatabaseViewerOpen(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (isOpen: boolean) => Promise.resolve(isOpen),
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.system.databaseViewerOpen, isOpen)
    }
  })
}

/**
 * Set the theme mode ('light' | 'dark' | 'system') and apply it to <html>.
 * 'system' follows the OS color-scheme preference.
 */
import { applyThemeClasses, type ThemeVariant } from '../queries/system'

export function useSetTheme(): UseMutationResult<ThemeVariant, Error, ThemeVariant> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (theme: ThemeVariant) => {
      localStorage.setItem('codelobby-theme', theme)
      applyThemeClasses(theme)
      return theme
    },
    onSuccess: (theme) => {
      qc.setQueryData(keys.system.theme, theme)
    }
  })
}

/**
 * Open external URL in default browser
 */
export function useOpenExternal(): UseMutationResult<void, Error, string> {
  return useMutation({
    mutationFn: async (url: string) => {
      if (window.electron?.shell?.openExternal) {
        return window.electron.shell.openExternal(url)
      }
      // Fallback for web
      window.open(url, '_blank')
    }
  })
}

/**
 * Set network panel open state
 */
export function useSetNetworkPanel(): UseMutationResult<boolean, Error, boolean> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (isOpen: boolean) => {
      localStorage.setItem('networkPanelOpen', String(isOpen))
      return isOpen
    },
    onSuccess: (isOpen) => {
      qc.setQueryData(keys.local.networkPanelOpen, isOpen)
    }
  })
}

/**
 * Set network panel height
 */
export function useSetNetworkPanelHeight(): UseMutationResult<number, Error, number> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (height: number) => {
      localStorage.setItem('networkPanelHeight', String(height))
      return height
    },
    onSuccess: (height) => {
      qc.setQueryData(keys.local.networkPanelHeight, height)
    }
  })
}

/**
 * Show native notification
 */
export function useShowNotification(): UseMutationResult<
  { success: boolean } | undefined,
  Error,
  { title: string; body: string }
> {
  return useMutation({
    mutationFn: async ({ title, body }: { title: string; body: string }) => {
      if (window.electron?.showNotification) {
        return window.electron.showNotification(title, body)
      }
      // Fallback to web notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body })
      }
    }
  })
}
