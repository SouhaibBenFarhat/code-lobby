import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { cn, formatRelativeTime } from '@/lib/utils'
import { useMyPRsFilter, usePRContext } from '../App'
import { PRDetail } from './PRDetail'
import type { PullRequest, Repository } from './types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { ScrollArea } from './ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

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
  onReload
}: TreeItemProps) {
  const { isMyPRsFilterEnabled, toggleMyPRsFilter } = useMyPRsFilter()
  const [isReloading, setIsReloading] = useState(false)
  const showOnlyMyPRs = isMyPRsFilterEnabled(repo.full_name)

  // Filter PRs based on "My PRs" toggle for this repo
  const filteredPRs = useMemo(() => {
    if (!showOnlyMyPRs || !currentUser) return prs
    return prs.filter((pr) => pr.user.login === currentUser)
  }, [prs, showOnlyMyPRs, currentUser])

  const hasPRs = prs.length > 0
  const hasFilteredPRs = filteredPRs.length > 0

  return (
    <div className="select-none">
      {/* Repo folder - using div with role for compound interactive element */}
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
                  toggleMyPRsFilter(repo.full_name)
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
  const { selectedPR, setSelectedPR } = usePRContext()
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set())
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const hasAutoExpanded = useRef(false)
  // Refs for smooth resize (avoid React re-renders during drag)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const currentWidthRef = useRef(280)
  const rafRef = useRef<number | null>(null)

  // Load IDE settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await window.electron.getIDEViewSettings()
        setSidebarWidth(settings.sidebarWidth || 280)
        const savedExpanded = settings.expandedRepos || []
        setExpandedRepos(new Set(savedExpanded))
        // If we had saved expanded repos, mark auto-expand as done
        if (savedExpanded.length > 0) {
          hasAutoExpanded.current = true
        }
      } catch (_e) {
        // Use defaults
      }
      setSettingsLoaded(true)
    }
    loadSettings()
  }, [])

  // Save settings when they change (only after initial load)
  useEffect(() => {
    if (!settingsLoaded) return
    window.electron.setIDEViewSettings({
      sidebarWidth,
      expandedRepos: Array.from(expandedRepos)
    })
  }, [sidebarWidth, expandedRepos, settingsLoaded])

  // Fetch selected repos filter (null = no explicit selection = show all)
  const { data: selectedReposFilter } = useQuery({
    queryKey: ['selected-repos'],
    queryFn: async () => {
      const repos = await window.electron.getSelectedRepos()
      return repos // Keep null as null (means "show all")
    },
    staleTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  // Fetch all contributed repos
  const { data: reposData, isLoading: reposLoading } = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const result = await window.electron.fetchContributedRepos()
      if (!result.success) throw new Error(result.error || 'Failed to fetch repos')
      return result.data as Repository[]
    },
    refetchOnWindowFocus: true,
    staleTime: 60000
  })

  // Filter repos based on selection
  // Filter repos based on selection
  // - null/undefined: Show all repos (first time use, default behavior)
  // - empty array []: Show NO repos (user explicitly clicked "None")
  // - array with items: Show only those repos
  const filteredRepos = useMemo(() => {
    if (!reposData) return []
    // null/undefined means "no explicit selection" → show all (default)
    if (selectedReposFilter === null || selectedReposFilter === undefined) {
      return reposData
    }
    // Empty array means user explicitly selected "None" → show nothing
    if (selectedReposFilter.length === 0) {
      return []
    }
    // Filter to only selected repos
    const selectedSet = new Set(selectedReposFilter)
    return reposData.filter((repo) => selectedSet.has(repo.full_name))
  }, [reposData, selectedReposFilter])

  // Get list of repos to fetch PRs for
  const reposToFetch = useMemo(() => {
    if (!filteredRepos || filteredRepos.length === 0) return []
    return filteredRepos.map((r) => r.full_name)
  }, [filteredRepos])

  // Fetch all PRs for selected repos
  const { data: prsResult, isLoading: prsLoading } = useQuery({
    queryKey: ['all-prs-for-repos', reposToFetch],
    queryFn: async () => {
      if (reposToFetch.length === 0) return { prs: [] as PullRequest[], currentUser: '' }
      const result = await window.electron.fetchAllPRsForRepos(reposToFetch)
      if (!result.success) throw new Error(result.error || 'Failed to fetch PRs')
      return { prs: result.data as PullRequest[], currentUser: result.currentUser || '' }
    },
    enabled: reposToFetch.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 60000
  })

  // Combined loading state
  const isLoading = reposLoading || prsLoading

  const prsData = prsResult?.prs || []
  const fetchedCurrentUser = prsResult?.currentUser || currentUser

  // Group PRs by repo, sorted by created_at
  const prsByRepo = useMemo(() => {
    const grouped: Record<string, PullRequest[]> = {}
    for (const pr of prsData) {
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
  }, [prsData])

  // Total PR count for display
  const totalPRCount = prsData.length

  // Repos map for quick lookup
  const _reposMap = useMemo(() => {
    return new Map((filteredRepos || []).map((r) => [r.full_name, r]))
  }, [filteredRepos])

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

  const toggleRepo = useCallback((repoName: string) => {
    setExpandedRepos((prev) => {
      const next = new Set(prev)
      if (next.has(repoName)) {
        next.delete(repoName)
      } else {
        next.add(repoName)
      }
      return next
    })
  }, [])

  // Handle reload for single repo
  const queryClient = useQueryClient()
  const handleReload = useCallback(
    async (repoFullName: string) => {
      const result = await window.electron.refreshRepoPRs(repoFullName)
      if (result.success && result.data) {
        // Update the PR data for this repo in the query cache
        const currentData = prsResult
        if (currentData) {
          // Remove old PRs for this repo and add new ones
          const otherPRs = currentData.prs.filter((pr) => pr.base.repo.full_name !== repoFullName)
          const newPRs = [...otherPRs, ...(result.data as PullRequest[])]
          queryClient.setQueryData(['all-prs-for-repos', reposToFetch], {
            ...currentData,
            prs: newPRs
          })
        }
        // Update rate limit display with fresh data
        if (result.rateLimit) {
          queryClient.setQueryData(['rate-limit'], result.rateLimit)
        }
      }
    },
    [prsResult, queryClient, reposToFetch]
  )

  // Handle resize (smooth - no React re-renders during drag)
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      currentWidthRef.current = sidebarWidth
    },
    [sidebarWidth]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      // Cancel previous animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      // Use requestAnimationFrame for smooth 60fps updates
      rafRef.current = requestAnimationFrame(() => {
        const newWidth = Math.min(500, Math.max(200, e.clientX))
        // Update DOM directly - NO React re-render!
        if (sidebarRef.current) {
          sidebarRef.current.style.width = `${newWidth}px`
        }
        currentWidthRef.current = newWidth
      })
    }

    const handleMouseUp = () => {
      // Cancel any pending animation frame
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      // Sync final width to React state (only ONE re-render)
      if (isResizing) {
        setSidebarWidth(currentWidthRef.current)
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

  // Auto-expand repos with PRs on first load (only once, only if no saved state)
  useEffect(() => {
    if (!settingsLoaded) return
    if (hasAutoExpanded.current) return
    if (Object.keys(prsByRepo).length === 0) return

    // Only auto-expand if we have no saved expanded repos
    if (expandedRepos.size === 0) {
      const reposWithPRs = Object.keys(prsByRepo).slice(0, 5) // Expand first 5
      setExpandedRepos(new Set(reposWithPRs))
    }
    hasAutoExpanded.current = true
  }, [settingsLoaded, prsByRepo, expandedRepos.size])

  return (
    <div className="flex h-full">
      {/* Sidebar - File tree */}
      <div
        ref={sidebarRef}
        className="flex-shrink-0 apple-sidebar flex flex-col"
        style={{
          width: sidebarWidth,
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
                  isExpanded={expandedRepos.has(repo.full_name)}
                  onToggle={() => toggleRepo(repo.full_name)}
                  selectedPRId={selectedPR?.id || null}
                  onSelectPR={setSelectedPR}
                  currentUser={fetchedCurrentUser}
                  onReload={() => handleReload(repo.full_name)}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Resize handle */}
      <div
        role="slider"
        aria-orientation="horizontal"
        aria-label="Resize sidebar"
        aria-valuemin={200}
        aria-valuemax={500}
        aria-valuenow={sidebarWidth}
        tabIndex={0}
        className={cn(
          'w-1 cursor-col-resize hover:bg-primary/50 transition-colors flex-shrink-0',
          isResizing && 'bg-primary'
        )}
        onMouseDown={handleResizeStart}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            setSidebarWidth((w) => Math.max(200, w - 20))
          }
          if (e.key === 'ArrowRight') {
            setSidebarWidth((w) => Math.min(500, w + 20))
          }
        }}
      />

      {/* Main content - PR Detail */}
      <div className="flex-1 overflow-hidden">
        {selectedPR ? (
          <PRDetail pr={selectedPR} onClose={() => setSelectedPR(null)} />
        ) : (
          <div className="h-full flex items-center justify-center bg-muted/10">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center">
                <GitPullRequest className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-muted-foreground">Select a Pull Request</p>
                <p className="text-sm text-muted-foreground/70 max-w-[300px]">
                  Click on a PR in the explorer to view its details, CI status, comments, and
                  reviews
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
