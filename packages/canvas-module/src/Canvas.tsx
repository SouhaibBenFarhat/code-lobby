/**
 * Canvas Component
 *
 * Free-form canvas view showing repository cards.
 * Demonstrates complex state management with the shared store.
 */

import { useMemo } from 'react'
import { Store, useSignal, Actions, type Repository, type PullRequest } from '@codelobby/shared-store'

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function PRCard({ pr, onClick }: { pr: PullRequest; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
    >
      <div className="flex items-start gap-2">
        {/* PR Icon */}
        <svg
          className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
            pr.draft ? 'text-muted-foreground' : pr.merged_at ? 'text-purple-500' : 'text-green-500'
          }`}
          fill="currentColor"
          viewBox="0 0 16 16"
        >
          <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854v2.396h2.25a2.25 2.25 0 012.25 2.25v5.128a2.251 2.251 0 11-1.5 0V5.5a.75.75 0 00-.75-.75H10v2.396a.25.25 0 01-.427.177L7.177 4.927a.25.25 0 010-.354zM2.25 12a.75.75 0 100-1.5.75.75 0 000 1.5zm12 0a.75.75 0 100-1.5.75.75 0 000 1.5z" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{pr.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <img
              src={pr.user.avatar_url}
              alt={pr.user.login}
              className="w-4 h-4 rounded-full"
            />
            <span className="text-xs text-muted-foreground">
              #{pr.number} • {pr.user.login}
            </span>
            {pr.draft && (
              <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">
                Draft
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        <span className="text-green-500">+{pr.additions}</span>
        <span className="text-red-500">-{pr.deletions}</span>
        <span>{pr.changed_files} files</span>
      </div>
    </button>
  )
}

function RepoCard({
  repo,
  prs,
  onSelectPR
}: {
  repo: Repository
  prs: PullRequest[]
  onSelectPR: (pr: PullRequest) => void
}) {
  const minimizedRepos = useSignal(Store.minimizedRepos)
  const isMinimized = minimizedRepos.includes(repo.full_name)

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <img
          src={repo.owner.avatar_url}
          alt={repo.owner.login}
          className="w-8 h-8 rounded-full"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{repo.name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {repo.owner.login} • {prs.length} PRs
          </p>
        </div>
      </div>

      {/* PRs List */}
      {!isMinimized && (
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {prs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No open PRs</p>
          ) : (
            prs.map((pr) => <PRCard key={pr.id} pr={pr} onClick={() => onSelectPR(pr)} />)
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Canvas() {
  // ─────────────────────────────────────────────────────────────────────────
  // Read from shared store
  // ─────────────────────────────────────────────────────────────────────────
  const repos = useSignal(Store.repos)
  const prs = useSignal(Store.prs)
  const selectedRepos = useSignal(Store.selectedRepos)
  const isLoading = useSignal(Store.loading.repos)

  // ─────────────────────────────────────────────────────────────────────────
  // Derived state
  // ─────────────────────────────────────────────────────────────────────────
  const filteredRepos = useMemo(() => {
    if (selectedRepos === null) return repos
    if (selectedRepos.length === 0) return []
    return repos.filter((r) => selectedRepos.includes(r.full_name))
  }, [repos, selectedRepos])

  const prsByRepo = useMemo(() => {
    return prs.reduce(
      (acc, pr) => {
        const repoName = pr.base.repo.full_name
        if (!acc[repoName]) acc[repoName] = []
        acc[repoName].push(pr)
        return acc
      },
      {} as Record<string, PullRequest[]>
    )
  }, [prs])

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleSelectPR = (pr: PullRequest) => {
    Actions.selectPR(pr)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
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
          <p className="text-sm text-muted-foreground">Loading repositories...</p>
        </div>
      </div>
    )
  }

  if (filteredRepos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <svg
            className="w-12 h-12 text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
          <div>
            <h3 className="font-medium">No repositories</h3>
            <p className="text-sm text-muted-foreground">
              Select some repositories to see their PRs here
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredRepos.map((repo) => (
          <RepoCard
            key={repo.id}
            repo={repo}
            prs={prsByRepo[repo.full_name] || []}
            onSelectPR={handleSelectPR}
          />
        ))}
      </div>
    </div>
  )
}
