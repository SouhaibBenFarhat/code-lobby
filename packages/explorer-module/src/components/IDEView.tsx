/**
 * IDEView - A file-tree style explorer of repositories and their PRs.
 * Uses TanStack Query for data fetching with automatic caching.
 *
 * This component renders ONLY the explorer tree (left sidebar).
 * PRDetail is rendered via the slot system in the main area.
 */

import { usePRs, useRefreshRepoPRs, useRepos, useSelectedRepos } from '@codelobby/queries'
import type { PullRequest, Repository } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  cn,
  formatRelativeTime,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@codelobby/ui-kit'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  FileText,
  Folder,
  FolderOpen,
  GitPullRequest,
  Loader2,
  RefreshCw,
  User,
  Users,
  XCircle
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface IDEViewProps {
  currentUser: string | null
}

interface TreeItemProps {
  repo: Repository
  prs: PullRequest[]
  isExpanded: boolean
  onToggle: () => void
  selectedPRId: string | null
  onSelectPR: (pr: PullRequest) => void
  currentUser: string | null
  showOnlyMyPRs: boolean
  onToggleMyPRsFilter: () => void
  onReload?: () => Promise<void>
}

function TreeItem({
  repo,
  prs,
  isExpanded,
  onToggle,
  selectedPRId,
  onSelectPR,
  currentUser,
  showOnlyMyPRs,
  onToggleMyPRsFilter,
  onReload
}: TreeItemProps) {
  const [isReloading, setIsReloading] = useState(false)

  // Filter PRs based on "My PRs" toggle for this repo
  const filteredPRs = useMemo(() => {
    if (!showOnlyMyPRs || !currentUser) return prs
    return prs.filter((pr) => pr.user.login === currentUser)
  }, [prs, showOnlyMyPRs, currentUser])

  const hasPRs = prs.length > 0
  const hasFilteredPRs = filteredPRs.length > 0

  return (
    <div className="select-none">
      {/* Repo folder */}
      <div
        role="treeitem"
        aria-expanded={isExpanded}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded transition-colors group w-full text-left',
          isExpanded && 'bg-muted/30'
        )}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
          {hasPRs ? (
            isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </span>
        {isExpanded ? (
          <FolderOpen className="w-4 h-4 text-yellow-500" />
        ) : (
          <Folder className="w-4 h-4 text-yellow-500/70" />
        )}
        <span className="text-sm font-medium truncate flex-1">{repo.name}</span>

        {/* Reload button */}
        {onReload && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled={isReloading}
                onClick={async (e) => {
                  e.stopPropagation()
                  setIsReloading(true)
                  try {
                    await onReload()
                  } finally {
                    setIsReloading(false)
                  }
                }}
                className={cn(
                  'p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100',
                  'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50'
                )}
              >
                {isReloading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Reload PRs</TooltipContent>
          </Tooltip>
        )}

        {/* My PRs toggle - only show if repo has PRs */}
        {hasPRs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleMyPRsFilter()
                }}
                className={cn(
                  'p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100',
                  showOnlyMyPRs
                    ? 'bg-primary/20 text-primary opacity-100'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {showOnlyMyPRs ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{showOnlyMyPRs ? 'My PRs' : 'All PRs'}</TooltipContent>
          </Tooltip>
        )}

        {hasPRs && (
          <span
            className={cn(
              'text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded',
              showOnlyMyPRs && filteredPRs.length !== prs.length && 'text-primary'
            )}
          >
            {showOnlyMyPRs && filteredPRs.length !== prs.length
              ? `${filteredPRs.length}/${prs.length}`
              : prs.length}
          </span>
        )}
      </div>

      {/* PR files */}
      {isExpanded && hasFilteredPRs && (
        <div className="ml-4 border-l border-border/50">
          {filteredPRs.map((pr) => (
            <PRTreeItem
              key={pr.id}
              pr={pr}
              isSelected={selectedPRId === pr.id}
              onSelect={() => onSelectPR(pr)}
            />
          ))}
        </div>
      )}

      {/* Empty state when filtering */}
      {isExpanded && hasPRs && !hasFilteredPRs && showOnlyMyPRs && (
        <div className="ml-8 py-2 text-xs text-muted-foreground italic">No PRs by you</div>
      )}
    </div>
  )
}

interface PRTreeItemProps {
  pr: PullRequest
  isSelected: boolean
  onSelect: () => void
}

function PRTreeItem({ pr, isSelected, onSelect }: PRTreeItemProps) {
  const getStatusIcon = () => {
    if (!pr.checks) return <Circle className="w-3 h-3 text-muted-foreground" />

    const hasRunning = pr.checks.check_runs.some(
      (cr) => cr.status === 'in_progress' || cr.status === 'queued'
    )
    if (hasRunning) return <Loader2 className="w-3 h-3 text-warning animate-spin" />

    switch (pr.checks.state) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-success" />
      case 'failure':
      case 'error':
        return <XCircle className="w-3 h-3 text-destructive" />
      default:
        return <Circle className="w-3 h-3 text-warning" />
    }
  }

  return (
    <button
      type="button"
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-r transition-colors w-full text-left border-l-2',
        isSelected
          ? 'bg-primary/20 text-primary border-primary'
          : 'hover:bg-muted/50 border-transparent'
      )}
      onClick={onSelect}
    >
      <GitPullRequest
        className={cn(
          'w-4 h-4 flex-shrink-0',
          pr.draft ? 'text-muted-foreground' : isSelected ? 'text-primary' : 'text-blue-500'
        )}
      />
      <Avatar className="w-4 h-4 flex-shrink-0">
        <AvatarImage src={pr.user.avatar_url} alt={pr.user.login} />
        <AvatarFallback className="text-[6px]">
          <User className="w-2.5 h-2.5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-muted-foreground">#{pr.number}</span>
          <span className={cn('text-sm truncate', isSelected && 'font-medium')}>{pr.title}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(pr.created_at)}
        </span>
        {getStatusIcon()}
      </div>
    </button>
  )
}

export function IDEView({ currentUser }: IDEViewProps) {
  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERY - Data fetching with automatic caching
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: reposData, isLoading: reposLoading } = useRepos()
  const { data: selectedReposData } = useSelectedRepos()
  const { data: prsResult, isLoading: prsLoading } = usePRs(selectedReposData || null)
  const refreshRepoPRsMutation = useRefreshRepoPRs()

  // Cast to proper types
  const repos = (reposData as Repository[]) || []
  const prs = prsResult?.prs || []

  // ═══════════════════════════════════════════════════════════════════════════
  // UI STATE FROM STORE (non-API data)
  // ═══════════════════════════════════════════════════════════════════════════
  const selectedPR = useSignal(Store.selectedPR)
  const expandedRepos = useSignal(Store.expandedRepos)
  const myPRsRepos = useSignal(Store.myPRsRepos)
  const explorerWidth = useSignal(Store.explorerWidth)

  const [isResizing, setIsResizing] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const hasAutoExpanded = useRef(false)

  // Refs for smooth resize
  const sidebarRef = useRef<HTMLDivElement>(null)
  const currentWidthRef = useRef(explorerWidth)
  const rafRef = useRef<number | null>(null)

  // Mark settings as loaded after first render
  useEffect(() => {
    setSettingsLoaded(true)
  }, [])

  // Filter repos based on selection
  const filteredRepos = useMemo(() => {
    if (!repos || repos.length === 0) return []
    if (selectedReposData === null || selectedReposData === undefined) {
      return repos
    }
    if (selectedReposData.length === 0) {
      return []
    }
    const selectedSet = new Set(selectedReposData)
    return repos.filter((repo) => selectedSet.has(repo.full_name))
  }, [repos, selectedReposData])

  // Group PRs by repo
  const prsByRepo = useMemo(() => {
    const grouped: Record<string, PullRequest[]> = {}
    for (const pr of prs) {
      const repoName = pr.base.repo.full_name
      if (!grouped[repoName]) grouped[repoName] = []
      grouped[repoName].push(pr)
    }
    // Sort PRs by created_at descending
    for (const repoName of Object.keys(grouped)) {
      grouped[repoName].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return grouped
  }, [prs])

  const totalPRCount = prs.length

  // Sort repos: those with PRs first, then alphabetically
  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) => {
      const aPRs = prsByRepo[a.full_name]?.length || 0
      const bPRs = prsByRepo[b.full_name]?.length || 0
      if (aPRs > 0 && bPRs === 0) return -1
      if (bPRs > 0 && aPRs === 0) return 1
      return a.name.localeCompare(b.name)
    })
  }, [filteredRepos, prsByRepo])

  const isLoading = reposLoading || prsLoading

  // Handle repo toggle via action
  const toggleRepo = useCallback((repoFullName: string) => {
    Actions.toggleRepoExpanded(repoFullName)
  }, [])

  // Handle PR selection via action
  const handleSelectPR = useCallback((pr: PullRequest) => {
    Actions.selectPR(pr)
  }, [])

  // Handle "My PRs" filter toggle
  const handleToggleMyPRsFilter = useCallback((repoFullName: string) => {
    Actions.toggleMyPRsFilter(repoFullName)
  }, [])

  // Handle reload via mutation
  const handleReload = useCallback(
    async (repoFullName: string) => {
      refreshRepoPRsMutation.mutate(repoFullName)
    },
    [refreshRepoPRsMutation]
  )

  // Handle resize (smooth - no React re-renders during drag)
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      currentWidthRef.current = explorerWidth
    },
    [explorerWidth]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(() => {
        const newWidth = Math.min(500, Math.max(200, e.clientX))
        if (sidebarRef.current) {
          sidebarRef.current.style.width = `${newWidth}px`
        }
        currentWidthRef.current = newWidth
      })
    }

    const handleMouseUp = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (isResizing) {
        Actions.resizeExplorer(currentWidthRef.current)
      }
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Auto-expand repos with PRs on first load
  useEffect(() => {
    if (!settingsLoaded) return
    if (hasAutoExpanded.current) return
    if (Object.keys(prsByRepo).length === 0) return

    if (expandedRepos.length === 0) {
      const reposWithPRs = Object.keys(prsByRepo).slice(0, 5)
      Actions.setExpandedRepos(reposWithPRs)
    }
    hasAutoExpanded.current = true
  }, [settingsLoaded, prsByRepo, expandedRepos.length])

  return (
    <div
      ref={sidebarRef}
      className="flex-shrink-0 apple-sidebar flex flex-col h-full"
      style={{
        width: explorerWidth,
        willChange: isResizing ? 'width' : 'auto',
        contain: 'layout style'
      }}
    >
      <div className="p-2 border-b border-border bg-muted/20">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5" />
          Explorer
          <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded">
            {totalPRCount} PR{totalPRCount !== 1 ? 's' : ''}
          </span>
        </h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
              <span className="text-sm">Loading repositories...</span>
            </div>
          ) : sortedRepos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No repositories</p>
              <p className="text-xs mt-1">Select repos from the header</p>
            </div>
          ) : (
            sortedRepos.map((repo) => (
              <TreeItem
                key={repo.full_name}
                repo={repo}
                prs={prsByRepo[repo.full_name] || []}
                isExpanded={expandedRepos.includes(repo.full_name)}
                onToggle={() => toggleRepo(repo.full_name)}
                selectedPRId={selectedPR?.id || null}
                onSelectPR={handleSelectPR}
                currentUser={currentUser}
                showOnlyMyPRs={myPRsRepos.includes(repo.full_name)}
                onToggleMyPRsFilter={() => handleToggleMyPRsFilter(repo.full_name)}
                onReload={() => handleReload(repo.full_name)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Resize handle */}
      <div
        role="slider"
        aria-orientation="horizontal"
        aria-label="Resize sidebar"
        aria-valuemin={200}
        aria-valuemax={500}
        aria-valuenow={explorerWidth}
        tabIndex={0}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors',
          isResizing && 'bg-primary'
        )}
        onMouseDown={handleResizeStart}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            Actions.resizeExplorer(Math.max(200, explorerWidth - 20))
          }
          if (e.key === 'ArrowRight') {
            Actions.resizeExplorer(Math.min(500, explorerWidth + 20))
          }
        }}
      />
    </div>
  )
}
