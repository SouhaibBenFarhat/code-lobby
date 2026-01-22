/**
 * Settings API namespace
 *
 * All settings-related API calls with automatic logging
 */

/// <reference path="../../../../src/preload/electron-api.d.ts" />

import { call } from '../call'
import { LogCategory } from '../logger'

export const settings = {
  // ═══════════════════════════════════════════════════════════════════════════
  // APP SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettings(): Promise<{
    notifications: boolean
    pollInterval: number
    theme: string
  }> {
    return call('settings.getSettings', () => window.electron.getSettings(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setSettings(settings: Record<string, unknown>): Promise<{ success: boolean }> {
    return call('settings.setSettings', () => window.electron.setSettings(settings), settings, {
      category: LogCategory.SETTINGS
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE
  // ═══════════════════════════════════════════════════════════════════════════

  async getViewMode(): Promise<'canvas' | 'ide'> {
    return call('settings.getViewMode', () => window.electron.getViewMode(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setViewMode(mode: 'canvas' | 'ide'): Promise<{ success: boolean }> {
    return call(
      'settings.setViewMode',
      () => window.electron.setViewMode(mode),
      { mode },
      {
        category: LogCategory.SETTINGS
      }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SELECTED REPOS
  // ═══════════════════════════════════════════════════════════════════════════

  async getSelectedRepos(): Promise<string[] | null> {
    return call('settings.getSelectedRepos', () => window.electron.getSelectedRepos(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setSelectedRepos(repos: string[]): Promise<{ success: boolean }> {
    return call(
      'settings.setSelectedRepos',
      () => window.electron.setSelectedRepos(repos),
      { count: repos.length },
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CARD LAYOUTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getCardLayouts(): Promise<
    Array<{ i: string; x: number; y: number; w: number; h: number }>
  > {
    return call('settings.getCardLayouts', () => window.electron.getCardLayouts(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setCardLayouts(
    layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>
  ): Promise<{ success: boolean }> {
    return call(
      'settings.setCardLayouts',
      () => window.electron.setCardLayouts(layouts),
      { count: layouts.length },
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPO COLORS
  // ═══════════════════════════════════════════════════════════════════════════

  async getRepoColors(): Promise<Record<string, string>> {
    return call('settings.getRepoColors', () => window.electron.getRepoColors(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setRepoColor(repoFullName: string, color: string | null): Promise<{ success: boolean }> {
    return call(
      'settings.setRepoColor',
      () => window.electron.setRepoColor(repoFullName, color),
      { repo: repoFullName, color },
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MINIMIZED REPOS
  // ═══════════════════════════════════════════════════════════════════════════

  async getMinimizedRepos(): Promise<string[]> {
    return call(
      'settings.getMinimizedRepos',
      () => window.electron.getMinimizedRepos(),
      undefined,
      { category: LogCategory.SETTINGS }
    )
  },

  async setRepoMinimized(
    repoFullName: string,
    isMinimized: boolean
  ): Promise<{ success: boolean }> {
    return call(
      'settings.setRepoMinimized',
      () => window.electron.setRepoMinimized(repoFullName, isMinimized),
      { repo: repoFullName, isMinimized },
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPO ORDER
  // ═══════════════════════════════════════════════════════════════════════════

  async getRepoOrder(): Promise<string[]> {
    return call('settings.getRepoOrder', () => window.electron.getRepoOrder(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setRepoOrder(order: string[]): Promise<{ success: boolean }> {
    return call(
      'settings.setRepoOrder',
      () => window.electron.setRepoOrder(order),
      { count: order.length },
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MY PRS FILTER
  // ═══════════════════════════════════════════════════════════════════════════

  async getMyPRsRepos(): Promise<string[]> {
    return call('settings.getMyPRsRepos', () => window.electron.getMyPRsRepos(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setMyPRsRepos(repos: string[]): Promise<{ success: boolean }> {
    return call(
      'settings.setMyPRsRepos',
      () => window.electron.setMyPRsRepos(repos),
      { count: repos.length },
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PANELS
  // ═══════════════════════════════════════════════════════════════════════════

  async getPRDetailPanel(): Promise<{ isOpen: boolean; width: number }> {
    return call('settings.getPRDetailPanel', () => window.electron.getPRDetailPanel(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setPRDetailPanel(settings: {
    isOpen?: boolean
    width?: number
  }): Promise<{ success: boolean }> {
    return call(
      'settings.setPRDetailPanel',
      () => window.electron.setPRDetailPanel(settings),
      settings,
      { category: LogCategory.SETTINGS }
    )
  },

  async getAIPanel(): Promise<{ isOpen: boolean; width: number }> {
    return call('settings.getAIPanel', () => window.electron.getAIPanel(), undefined, {
      category: LogCategory.SETTINGS
    })
  },

  async setAIPanel(settings: { isOpen?: boolean; width?: number }): Promise<{ success: boolean }> {
    return call('settings.setAIPanel', () => window.electron.setAIPanel(settings), settings, {
      category: LogCategory.SETTINGS
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // IDE VIEW SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async getIDEViewSettings(): Promise<{
    sidebarWidth: number
    expandedRepos: string[]
  }> {
    return call(
      'settings.getIDEViewSettings',
      () => window.electron.getIDEViewSettings(),
      undefined,
      { category: LogCategory.SETTINGS }
    )
  },

  async setIDEViewSettings(settings: {
    sidebarWidth?: number
    expandedRepos?: string[]
  }): Promise<{ success: boolean }> {
    return call(
      'settings.setIDEViewSettings',
      () => window.electron.setIDEViewSettings(settings),
      settings,
      { category: LogCategory.SETTINGS }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async clearAllData(): Promise<{ success: boolean }> {
    return call('settings.clearAllData', () => window.electron.clearAllData(), undefined, {
      category: LogCategory.APP
    })
  },

  async factoryReset(): Promise<{ success: boolean }> {
    return call('settings.factoryReset', () => window.electron.factoryReset(), undefined, {
      category: LogCategory.APP
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY CACHE (silent to avoid log spam - these are called very frequently)
  // ═══════════════════════════════════════════════════════════════════════════

  async getQueryCache(): Promise<string | null> {
    return call('settings.getQueryCache', () => window.electron.getQueryCache(), undefined, {
      category: LogCategory.CACHE,
      silent: true // High frequency operation
    })
  },

  async setQueryCache(cache: string): Promise<{ success: boolean }> {
    return call(
      'settings.setQueryCache',
      () => window.electron.setQueryCache(cache),
      undefined,
      { category: LogCategory.CACHE, silent: true } // High frequency operation
    )
  },

  async clearQueryCache(): Promise<{ success: boolean }> {
    return call('settings.clearQueryCache', () => window.electron.clearQueryCache(), undefined, {
      category: LogCategory.CACHE
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async showNotification(title: string, body: string): Promise<{ success: boolean }> {
    return call(
      'settings.showNotification',
      () => window.electron.showNotification(title, body),
      { title, bodyLength: body.length },
      { category: LogCategory.APP }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WINDOW STATE
  // ═══════════════════════════════════════════════════════════════════════════

  async isFullscreen(): Promise<boolean> {
    return call('settings.isFullscreen', () => window.electron.isFullscreen(), undefined, {
      category: LogCategory.APP
    })
  },

  /**
   * Subscribe to fullscreen changes
   * Note: This returns a cleanup function, not a promise
   */
  onFullscreenChange(callback: (isFullscreen: boolean) => void): () => void {
    // For event subscriptions, we just log once and delegate
    console.log('[Settings] Subscribing to fullscreen changes')
    return window.electron.onFullscreenChange(callback)
  }
}
