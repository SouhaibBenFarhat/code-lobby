/**
 * Header Component
 *
 * This is a proof-of-concept showing how the Header would work
 * with the modular architecture. In a full refactoring:
 * - UI primitives (Button, Avatar, etc.) would come from @codelobby/ui-kit
 * - Sub-components (RepoSelector, LogsViewer, etc.) would be in this module
 *
 * For now, this demonstrates:
 * - Reading from shared store (no props drilling)
 * - Triggering actions (no direct API calls)
 * - Self-contained module with no cross-imports
 */

import { Store, useSignal, Actions } from '@codelobby/shared-store'
import type { ViewMode } from '@codelobby/shared-store'

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS (would be in @codelobby/ui-kit)
// ═══════════════════════════════════════════════════════════════════════════

function Button({
  children,
  onClick,
  variant = 'default',
  className = ''
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'ghost' | 'secondary'
  className?: string
}) {
  const baseClass = 'px-3 py-1.5 rounded-md text-sm font-medium transition-colors'
  const variantClass = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
  }[variant]

  return (
    <button type="button" className={`${baseClass} ${variantClass} ${className}`} onClick={onClick}>
      {children}
    </button>
  )
}

function Avatar({ src, alt, fallback }: { src?: string; alt: string; fallback: string }) {
  return (
    <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center">
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-medium">{fallback}</span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Header() {
  // ─────────────────────────────────────────────────────────────────────────
  // Read from shared store (the buffet)
  // ─────────────────────────────────────────────────────────────────────────
  const user = useSignal(Store.user)
  const viewMode = useSignal(Store.viewMode)
  const isAIPanelOpen = useSignal(Store.aiPanelOpen)
  const isLoading = useSignal(Store.loading.repos)

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (emit events, never call APIs directly)
  // ─────────────────────────────────────────────────────────────────────────
  const handleViewModeChange = (mode: ViewMode) => {
    Actions.setViewMode(mode)
  }

  const handleToggleAIPanel = () => {
    Actions.toggleAIPanel()
  }

  const handleRefresh = () => {
    Actions.clearCache()
    Actions.fetchRepos()
  }

  const handleSignOut = () => {
    Actions.signOut()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-4 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
          CL
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">CodeLobby</span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            Real-time PR monitoring
          </span>
        </div>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* View Mode Switcher */}
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
        <button
          type="button"
          className={`p-1.5 rounded-md transition-all ${
            viewMode === 'canvas'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleViewModeChange('canvas')}
          title="Canvas View"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </button>
        <button
          type="button"
          className={`p-1.5 rounded-md transition-all ${
            viewMode === 'ide'
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => handleViewModeChange('ide')}
          title="IDE View"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </button>
      </div>

      <div className="h-6 w-px bg-border" />

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span>Live</span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </div>
        )}

        <Button variant="ghost" onClick={handleRefresh} className="h-8 w-8 p-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </Button>

        <Button
          variant={isAIPanelOpen ? 'secondary' : 'ghost'}
          onClick={handleToggleAIPanel}
          className="h-8 w-8 p-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </Button>

        <div className="h-6 w-px bg-border" />

        {user && (
          <div className="flex items-center gap-2">
            <Avatar
              src={user.avatar_url}
              alt={user.login}
              fallback={user.login.slice(0, 2).toUpperCase()}
            />
            <span className="text-sm font-medium">{user.login}</span>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </Button>
      </div>
    </header>
  )
}
