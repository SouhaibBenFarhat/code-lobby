/**
 * IDEView - A file-tree style explorer of repositories and their PRs.
 * Uses TanStack Query for all data.
 */

import {
  type PullRequest,
  type Repository,
  useIDESettings,
  useMyPRsRepos,
  usePRsForRepo,
  useRepos,
  useSelectedPRId,
  useSelectedRepos,
  useSelectPR,
  useSetIDESettings,
  useToggleMyPRsFilter,
  useToggleRepoExpanded
} from '@data'
import {
  Button,
  cn,
  formatRelativeTime,
  MatchedAvatars,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
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
  isExpanded: boolean
  onToggle: () => void
  selectedPRId: { repoFullName: string; prNumber: number } | null
  onSelectPR: (pr: PullRequest) => void
  currentUser: string | null
  showOnlyMyPRs: boolean
  onToggleMyPRsFilter: () => void
}

function TreeItem({
  repo,
  isExpanded,
  onToggle,
  selectedPRId,
  onSelectPR,
  currentUser,
  showOnlyMyPRs,
  onToggleMyPRsFilter
}: TreeItemProps) {
  // Fetch PRs for this repo directly (per-repo caching)
  const { data: prs = [], isFetching, refetch } = usePRsForRepo(repo.full_name)

  const filteredPRs = useMemo(() => {
    if (!showOnlyMyPRs || !currentUser) return prs
    return prs.filter((pr) => pr.user.login === currentUser)
  }, [prs, showOnlyMyPRs, currentUser])

  const hasPRs = prs.length > 0
  const hasFilteredPRs = filteredPRs.length > 0

  return (
    <div className="select-none">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="unstyled"
              size="none"
              disabled={isFetching}
              onClick={(e) => {
                e.stopPropagation()
                refetch()
              }}
              className={cn(
                'p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100',
                'text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50'
              )}
            >
              {isFetching ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Reload PRs</TooltipContent>
        </Tooltip>

        {hasPRs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="unstyled"
                size="none"
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
              </Button>
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

      {isExpanded && hasFilteredPRs && (
        <div className="ml-4 border-l border-border/50">
          {filteredPRs.map((pr) => (
            <PRTreeItem
              key={pr.id}
              pr={pr}
              isSelected={
                selectedPRId?.repoFullName === pr.base.repo.full_name &&
                selectedPRId?.prNumber === pr.number
              }
              onSelect={() => onSelectPR(pr)}
            />
          ))}
        </div>
      )}

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
    <Button
      variant="unstyled"
      size="none"
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
      <MatchedAvatars
        author={{ login: pr.user.login, avatar_url: pr.user.avatar_url }}
        assignees={pr.assignees}
        size="sm"
        className="flex-shrink-0"
      />
      <div className="flex-1 min-w-0 flex items-center">
        <span className="text-xs font-mono text-muted-foreground">#{pr.number}</span>
        <span className={cn('text-sm truncate ml-1.5', isSelected && 'font-medium')}>
          {pr.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(pr.created_at)}
        </span>
        {getStatusIcon()}
      </div>
    </Button>
  )
}

export function IDEView({ currentUser }: IDEViewProps): React.JSX.Element {
  // TanStack Query hooks
  const { data: repos = [], isLoading: reposLoading } = useRepos()
  const { data: selectedReposData = [] } = useSelectedRepos()
  const { data: selectedPRId } = useSelectedPRId()
  const { data: ideSettings } = useIDESettings()
  const { data: myPRsRepos = [] } = useMyPRsRepos()

  const expandedRepos: string[] = ideSettings?.expandedRepos || []
  const explorerWidth = ideSettings?.sidebarWidth || 280

  // Mutations
  const selectPR = useSelectPR()
  const setIDESettings = useSetIDESettings()
  const toggleRepoExpanded = useToggleRepoExpanded()
  const toggleMyPRsFilter = useToggleMyPRsFilter()

  const [isResizing, setIsResizing] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const hasAutoExpanded = useRef(false)

  const sidebarRef = useRef<HTMLDivElement>(null)
  const currentWidthRef = useRef(explorerWidth)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setSettingsLoaded(true)
  }, [])

  const filteredRepos = useMemo(() => {
    if (!repos || repos.length === 0) return []
    if (!selectedReposData || selectedReposData.length === 0) return []
    const selectedSet = new Set(selectedReposData)
    return repos.filter((repo) => selectedSet.has(repo.full_name))
  }, [repos, selectedReposData])

  // Sort repos alphabetically (each TreeItem tracks its own PR count now)
  const sortedRepos = useMemo(() => {
    return [...filteredRepos].sort((a, b) => a.name.localeCompare(b.name))
  }, [filteredRepos])

  const isLoading = reposLoading

  const handleToggleRepo = useCallback(
    (repoFullName: string) => {
      toggleRepoExpanded.mutate(repoFullName)
    },
    [toggleRepoExpanded]
  )

  const handleSelectPR = useCallback(
    (pr: PullRequest) => {
      selectPR.mutate({
        repoFullName: pr.base.repo.full_name,
        prNumber: pr.number
      })
    },
    [selectPR]
  )

  const handleToggleMyPRsFilter = useCallback(
    (repoFullName: string) => {
      toggleMyPRsFilter.mutate(repoFullName)
    },
    [toggleMyPRsFilter]
  )

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
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
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
        setIDESettings.mutate({ sidebarWidth: currentWidthRef.current })
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
  }, [isResizing, setIDESettings])

  // Auto-expand first few repos on first load
  useEffect(() => {
    if (!settingsLoaded) return
    if (hasAutoExpanded.current) return
    if (sortedRepos.length === 0) return

    if (expandedRepos.length === 0) {
      const reposToExpand = sortedRepos.slice(0, 5).map((r) => r.full_name)
      setIDESettings.mutate({ expandedRepos: reposToExpand })
    }
    hasAutoExpanded.current = true
  }, [settingsLoaded, sortedRepos, expandedRepos.length, setIDESettings])

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
      <div className="flex items-center h-10 px-3 py-2 border-b border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-sm">Explorer</span>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {sortedRepos.length} repo{sortedRepos.length !== 1 ? 's' : ''}
          </span>
        </div>
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
                isExpanded={expandedRepos.includes(repo.full_name)}
                onToggle={() => handleToggleRepo(repo.full_name)}
                selectedPRId={selectedPRId ?? null}
                onSelectPR={handleSelectPR}
                currentUser={currentUser}
                showOnlyMyPRs={myPRsRepos.includes(repo.full_name)}
                onToggleMyPRsFilter={() => handleToggleMyPRsFilter(repo.full_name)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div
        role="slider"
        aria-orientation="horizontal"
        aria-label="Resize sidebar"
        aria-valuemin={200}
        aria-valuemax={500}
        aria-valuenow={explorerWidth}
        tabIndex={0}
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 z-20 cursor-col-resize hover:bg-primary/50 transition-colors',
          isResizing && 'bg-primary'
        )}
        onMouseDown={handleResizeStart}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setIDESettings.mutate({ sidebarWidth: Math.max(200, explorerWidth - 20) })
          }
          if (e.key === 'ArrowRight') {
            setIDESettings.mutate({ sidebarWidth: Math.min(500, explorerWidth + 20) })
          }
        }}
      />
    </div>
  )
}
