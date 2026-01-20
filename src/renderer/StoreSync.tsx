/**
 * Store Sync Provider
 *
 * This component syncs the existing App state with the shared store.
 * It allows the modular architecture to coexist with the legacy app
 * while we gradually migrate.
 *
 * Usage: Wrap the App with this provider to keep the shared store in sync.
 */

import { Store } from '@codelobby/shared-store'
import { useEffect } from 'react'
import type { ViewMode } from './components/Header'
import type { PullRequest } from './components/types'

interface StoreSyncProps {
  children: React.ReactNode
  // User
  user: { login: string; avatar_url: string; name: string | null } | null
  isAuthenticated: boolean
  // View mode
  viewMode: ViewMode
  // Selected PR
  selectedPR: PullRequest | null
  // Panel states
  isPanelOpen: boolean
  panelWidth: number
  isAIPanelOpen: boolean
  aiPanelWidth: number
  // Linked PR chat
  linkedPRChat: {
    prId: string
    prNumber: number
    prTitle: string
    repoFullName: string
  } | null
}

export function StoreSync({
  children,
  user,
  isAuthenticated,
  viewMode,
  selectedPR,
  isPanelOpen,
  panelWidth,
  isAIPanelOpen,
  aiPanelWidth,
  linkedPRChat
}: StoreSyncProps) {
  // Sync user to store
  useEffect(() => {
    Store.user.value = user
      ? { login: user.login, avatar_url: user.avatar_url, name: user.name, html_url: '' }
      : null
    Store.isAuthenticated.value = isAuthenticated
  }, [user, isAuthenticated])

  // Sync view mode
  useEffect(() => {
    Store.viewMode.value = viewMode
  }, [viewMode])

  // Sync selected PR
  useEffect(() => {
    Store.selectedPR.value = selectedPR
  }, [selectedPR])

  // Sync panel states
  useEffect(() => {
    Store.prDetailOpen.value = isPanelOpen
    Store.prDetailWidth.value = panelWidth
  }, [isPanelOpen, panelWidth])

  useEffect(() => {
    Store.aiPanelOpen.value = isAIPanelOpen
    Store.aiPanelWidth.value = aiPanelWidth
  }, [isAIPanelOpen, aiPanelWidth])

  // Sync linked PR chat
  useEffect(() => {
    Store.linkedPRChat.value = linkedPRChat
  }, [linkedPRChat])

  return <>{children}</>
}
