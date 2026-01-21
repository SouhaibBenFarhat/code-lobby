/**
 * ChatEmptyStates - Loading skeleton, PR empty state, and default empty state components
 */

import { Button, ClaudeIcon, cn } from '@codelobby/ui-kit'
import { GitPullRequest, Loader2, MessageSquare } from 'lucide-react'
import React from 'react'
import type { SelectedPR } from '../types'

// ═══════════════════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════════════════

export function ChatLoadingSkeleton(): React.JSX.Element {
  const skeletons = [
    { id: 'skeleton-1', isUser: false, width: 65, height: 55 },
    { id: 'skeleton-2', isUser: true, width: 50, height: 45 },
    { id: 'skeleton-3', isUser: false, width: 75, height: 60 },
    { id: 'skeleton-4', isUser: true, width: 45, height: 50 },
    { id: 'skeleton-5', isUser: false, width: 60, height: 48 }
  ]

  return (
    <div className="absolute inset-0 z-10 bg-background p-3 space-y-3 overflow-hidden">
      {skeletons.map((skeleton) => (
        <div
          key={skeleton.id}
          className={cn('flex gap-2', skeleton.isUser ? 'justify-end' : 'justify-start')}
        >
          {!skeleton.isUser && (
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
          )}
          <div
            className={cn(
              'rounded-lg animate-pulse',
              skeleton.isUser ? 'bg-primary/20' : 'bg-muted'
            )}
            style={{ width: `${skeleton.width}%`, height: `${skeleton.height}px` }}
          />
          {skeleton.isUser && (
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
          )}
        </div>
      ))}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading conversation...</span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PR Empty State
// ═══════════════════════════════════════════════════════════════════════════

export interface PREmptyStateProps {
  selectedPR: SelectedPR
  apiKey: string | null
  onStartPRChat?: (pr: SelectedPR) => void
}

export function PREmptyState({
  selectedPR,
  apiKey,
  onStartPRChat
}: PREmptyStateProps): React.JSX.Element {
  return (
    <div className="h-full flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-4 px-6 max-w-md">
        <GitPullRequest className="w-12 h-12 mx-auto text-blue-500/40" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            #{selectedPR.number} {selectedPR.title.slice(0, 50)}
            {selectedPR.title.length > 50 ? '...' : ''}
          </p>
          <p className="text-xs text-muted-foreground">{selectedPR.base.repo.full_name}</p>
        </div>
        <p className="text-sm text-muted-foreground">No conversation yet for this PR</p>
        {onStartPRChat && apiKey && (
          <Button size="sm" onClick={() => onStartPRChat(selectedPR)} className="mt-2">
            <MessageSquare className="w-4 h-4 mr-2" />
            Start chatting about this PR
          </Button>
        )}
        {!apiKey && (
          <p className="text-xs text-muted-foreground mt-2">
            Enter your API key below to start chatting
          </p>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Default Empty State
// ═══════════════════════════════════════════════════════════════════════════

export interface DefaultEmptyStateProps {
  apiKey: string | null
  chatStarted: boolean
  onStartChat: () => void
}

export function DefaultEmptyState({
  apiKey,
  chatStarted,
  onStartChat
}: DefaultEmptyStateProps): React.JSX.Element {
  return (
    <div className="h-full flex items-center justify-center min-h-[200px]">
      <div className="text-center space-y-4">
        <ClaudeIcon className="w-10 h-10 mx-auto text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {apiKey ? 'Start a conversation with Claude' : 'Enter your API key below to start'}
        </p>
        {apiKey && !chatStarted && (
          <Button onClick={onStartChat} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Start Chat
          </Button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PR Context Banner
// ═══════════════════════════════════════════════════════════════════════════

export interface PRContextBannerProps {
  prNumber: number
  prTitle: string
  repoFullName: string
}

export function PRContextBanner({
  prNumber,
  prTitle,
  repoFullName
}: PRContextBannerProps): React.JSX.Element {
  return (
    <div className="px-3 py-2 border-b border-border bg-primary/5">
      <div className="flex items-center gap-2">
        <GitPullRequest className="w-4 h-4 text-primary flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium truncate">
            #{prNumber} {prTitle}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">{repoFullName}</div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Status Banners
// ═══════════════════════════════════════════════════════════════════════════

export interface ContextSyncBannerProps {
  isVisible: boolean
}

export function ContextSyncBanner({ isVisible }: ContextSyncBannerProps): React.JSX.Element | null {
  if (!isVisible) return null

  return (
    <div className="px-3 py-2 bg-warning/10 border-t border-warning/20">
      <div className="flex items-center gap-2 text-xs text-warning">
        <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
        <span className="truncate">Syncing PR context...</span>
      </div>
    </div>
  )
}

export interface ErrorBannerProps {
  error: string | null
}

export function ErrorBanner({ error }: ErrorBannerProps): React.JSX.Element | null {
  if (!error) return null

  return (
    <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20">
      <div className="flex items-center gap-2 text-xs text-destructive">
        <span className="w-3.5 h-3.5 flex-shrink-0">⚠️</span>
        <span className="truncate">{error}</span>
      </div>
    </div>
  )
}
