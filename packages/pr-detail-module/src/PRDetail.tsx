/**
 * PR Detail Component
 *
 * Shows detailed information about the selected PR.
 * Demonstrates complex data rendering from the shared store.
 */

import { Store, useSignal, Actions, type PullRequest } from '@codelobby/shared-store'

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function LabelBadge({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `#${color}20`,
        color: `#${color}`,
        border: `1px solid #${color}40`
      }}
    >
      {name}
    </span>
  )
}

function StatItem({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
      <span className={`text-lg font-semibold ${color || ''}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
    </div>
  )
}

function CheckStatusBadge({ status }: { status: string }) {
  const styles = {
    success: 'bg-green-500/10 text-green-500 border-green-500/30',
    failure: 'bg-red-500/10 text-red-500 border-red-500/30',
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    error: 'bg-red-500/10 text-red-500 border-red-500/30'
  }

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PRDetail() {
  // ─────────────────────────────────────────────────────────────────────────
  // Read from shared store
  // ─────────────────────────────────────────────────────────────────────────
  const pr = useSignal(Store.selectedPR)
  const prDetailWidth = useSignal(Store.prDetailWidth)

  // Should not render if no PR selected (handled by visibility function)
  if (!pr) return null

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleClose = () => {
    Actions.selectPR(null)
  }

  const handleOpenInGitHub = () => {
    window.open(pr.html_url, '_blank')
  }

  const handleStartChat = () => {
    Actions.createPRChat(pr)
    Actions.toggleAIPanel()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background border-l border-border" style={{ width: prDetailWidth }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854v2.396h2.25a2.25 2.25 0 012.25 2.25v5.128a2.251 2.251 0 11-1.5 0V5.5a.75.75 0 00-.75-.75H10v2.396a.25.25 0 01-.427.177L7.177 4.927a.25.25 0 010-.354zM2.25 12a.75.75 0 100-1.5.75.75 0 000 1.5zm12 0a.75.75 0 100-1.5.75.75 0 000 1.5z" />
          </svg>
          <span className="text-sm font-semibold">PR #{pr.number}</span>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title & Meta */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold leading-tight mb-2">{pr.title}</h2>

          <div className="flex items-center gap-2 mb-3">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className="w-5 h-5 rounded-full"
            />
            <span className="text-sm text-muted-foreground">
              {pr.user.login} opened {formatRelativeTime(pr.created_at)}
            </span>
          </div>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pr.labels.map((label) => (
                <LabelBadge key={label.name} name={label.name} color={label.color} />
              ))}
            </div>
          )}

          {/* Status badges */}
          <div className="flex items-center gap-2 mt-3">
            {pr.draft && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground border border-border">
                Draft
              </span>
            )}
            {pr.checks && <CheckStatusBadge status={pr.checks.state} />}
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-4 gap-2">
            <StatItem label="Added" value={`+${pr.additions}`} color="text-green-500" />
            <StatItem label="Removed" value={`-${pr.deletions}`} color="text-red-500" />
            <StatItem label="Files" value={pr.changed_files} />
            <StatItem label="Comments" value={pr.comments + pr.review_comments} />
          </div>
        </div>

        {/* Branch Info */}
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Branch</h3>
          <div className="flex items-center gap-2 text-sm">
            <code className="px-2 py-1 bg-muted rounded text-xs">{pr.head.ref}</code>
            <span className="text-muted-foreground">→</span>
            <code className="px-2 py-1 bg-muted rounded text-xs">{pr.base.ref}</code>
          </div>
        </div>

        {/* Description */}
        {pr.body && (
          <div className="p-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Description</h3>
            <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
              {pr.body}
            </div>
          </div>
        )}

        {/* Checks */}
        {pr.checks && pr.checks.check_runs.length > 0 && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Checks ({pr.checks.check_runs.length})
            </h3>
            <div className="space-y-2">
              {pr.checks.check_runs.slice(0, 5).map((check) => (
                <div key={check.id} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      check.conclusion === 'success'
                        ? 'bg-green-500'
                        : check.conclusion === 'failure'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                    }`}
                  />
                  <span className="truncate flex-1">{check.name}</span>
                </div>
              ))}
              {pr.checks.check_runs.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{pr.checks.check_runs.length - 5} more checks
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <button
          type="button"
          onClick={handleStartChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Chat about this PR
        </button>
        <button
          type="button"
          onClick={handleOpenInGitHub}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          Open in GitHub
        </button>
      </div>
    </div>
  )
}
