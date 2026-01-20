/**
 * Explorer Component
 *
 * IDE-style sidebar showing repositories and PRs in a tree view.
 * Demonstrates reading complex derived state from the shared store.
 */

import { useState, useMemo } from 'react'
import {
  Store,
  useSignal,
  Actions,
  getPRsByRepo,
  getFilteredRepos,
  type Repository,
  type PullRequest
} from '@codelobby/shared-store'

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function FolderIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2H4v8h16l-1 2z" />
    </svg>
  ) : (
    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
    </svg>
  )
}

function PRIcon({ draft, merged }: { draft: boolean; merged: boolean }) {
  if (merged) {
    return (
      <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z" />
      </svg>
    )
  }
  if (draft) {
    return (
      <svg className="w-4 h-4 text-muted-foreground" fill="currentColor" viewBox="0 0 16 16">
        <path d="M3.25 1A2.25 2.25 0 011 3.25v9.5A2.25 2.25 0 003.25 15h9.5A2.25 2.25 0 0015 12.75v-9.5A2.25 2.25 0 0012.75 1h-9.5zM2.5 3.25a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v9.5a.75.75 0 01-.75.75h-9.5a.75.75 0 01-.75-.75v-9.5z" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1.5 3.25a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zm5.677-.177L9.573.677A.25.25 0 0110 .854v2.396h2.25a2.25 2.25 0 012.25 2.25v5.128a2.251 2.251 0 11-1.5 0V5.5a.75.75 0 00-.75-.75H10v2.396a.25.25 0 01-.427.177L7.177 4.927a.25.25 0 010-.354zM2.25 12a.75.75 0 100-1.5.75.75 0 000 1.5zm12 0a.75.75 0 100-1.5.75.75 0 000 1.5z" />
    </svg>
  )
}

function RepoFolder({
  repo,
  prs,
  expanded,
  onToggle,
  selectedPRId,
  onSelectPR
}: {
  repo: Repository
  prs: PullRequest[]
  expanded: boolean
  onToggle: () => void
  selectedPRId: string | null
  onSelectPR: (pr: PullRequest) => void
}) {
  return (
    <div>
      {/* Repo Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded transition-colors text-left"
      >
        <ChevronIcon expanded={expanded} />
        <FolderIcon open={expanded} />
        <span className="text-sm truncate flex-1">{repo.name}</span>
        <span className="text-xs text-muted-foreground">{prs.length}</span>
      </button>

      {/* PRs List */}
      {expanded && (
        <div className="ml-6 border-l border-border">
          {prs.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No open PRs</div>
          ) : (
            prs.map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => onSelectPR(pr)}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors ${
                  selectedPRId === pr.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <PRIcon draft={pr.draft} merged={pr.merged_at !== null} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{pr.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    #{pr.number} by {pr.user.login}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function Explorer() {
  // ─────────────────────────────────────────────────────────────────────────
  // Read from shared store
  // ─────────────────────────────────────────────────────────────────────────
  const repos = useSignal(Store.repos)
  const prs = useSignal(Store.prs)
  const selectedPR = useSignal(Store.selectedPR)
  const selectedRepos = useSignal(Store.selectedRepos)
  const explorerWidth = useSignal(Store.explorerWidth)
  const isLoading = useSignal(Store.loading.repos)
  const expandedReposFromStore = useSignal(Store.expandedRepos)

  // ─────────────────────────────────────────────────────────────────────────
  // Local state for expanded folders
  // ─────────────────────────────────────────────────────────────────────────
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(
    new Set(expandedReposFromStore)
  )

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
  const toggleRepo = (repoFullName: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev)
      if (next.has(repoFullName)) {
        next.delete(repoFullName)
      } else {
        next.add(repoFullName)
      }
      return next
    })
  }

  const handleSelectPR = (pr: PullRequest) => {
    Actions.selectPR(pr)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background" style={{ width: explorerWidth }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Explorer
        </h3>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <svg className="w-5 h-5 animate-spin mb-2" viewBox="0 0 24 24" fill="none">
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
            <p className="text-xs">Loading repositories...</p>
          </div>
        ) : filteredRepos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="text-xs">No repositories selected</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredRepos.map((repo) => (
              <RepoFolder
                key={repo.id}
                repo={repo}
                prs={prsByRepo[repo.full_name] || []}
                expanded={expandedRepos.has(repo.full_name)}
                onToggle={() => toggleRepo(repo.full_name)}
                selectedPRId={selectedPR?.id ?? null}
                onSelectPR={handleSelectPR}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          {filteredRepos.length} repos • {prs.length} PRs
        </p>
      </div>
    </div>
  )
}
