/**
 * System Mutations
 *
 * TanStack mutations for system/OS operations like fullscreen, theme, shell, etc.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '../keys'

/**
 * Toggle fullscreen mode
 */
export function useToggleFullscreen() {
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
 * Set theme (dark/light mode)
 */
export function useSetTheme() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (theme: 'dark' | 'light') => {
      localStorage.setItem('codelobby-theme', theme)
      document.documentElement.classList.toggle('dark', theme === 'dark')
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
export function useOpenExternal() {
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
export function useSetNetworkPanel() {
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
export function useSetNetworkPanelHeight() {
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
export function useShowNotification() {
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
