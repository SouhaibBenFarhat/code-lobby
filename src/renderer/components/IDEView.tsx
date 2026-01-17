import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ChevronRight, 
  ChevronDown, 
  GitPullRequest, 
  Folder, 
  FolderOpen,
  Circle,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Users,
  User
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ScrollArea } from './ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { PRDetail } from './PRDetail'
import { usePRContext } from '../App'
import type { PullRequest, Repository } from './types'

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
  showOnlyMyPRs: boolean
  onToggleMyPRs: () => void
  currentUser: string | null
}

function TreeItem({ repo, prs, isExpanded, onToggle, selectedPRId, onSelectPR, showOnlyMyPRs, onToggleMyPRs, currentUser }: TreeItemProps) {
  // Filter PRs based on "My PRs" toggle for this repo
  const filteredPRs = useMemo(() => {
    if (!showOnlyMyPRs || !currentUser) return prs
    return prs.filter(pr => pr.user.login === currentUser)
  }, [prs, showOnlyMyPRs, currentUser])
  
  const hasPRs = prs.length > 0
  const hasFilteredPRs = filteredPRs.length > 0
  
  return (
    <div className="select-none">
      {/* Repo folder */}
      <div 
        className={cn(
          "flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded transition-colors group",
          isExpanded && "bg-muted/30"
        )}
        onClick={onToggle}
      >
        <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">
          {hasPRs ? (
            isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
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
        
        {/* My PRs toggle - only show if repo has PRs */}
        {hasPRs && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleMyPRs()
                }}
                className={cn(
                  "p-0.5 rounded transition-colors opacity-0 group-hover:opacity-100",
                  showOnlyMyPRs 
                    ? "bg-primary/20 text-primary opacity-100" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {showOnlyMyPRs ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Users className="w-3 h-3" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {showOnlyMyPRs ? 'My PRs' : 'All PRs'}
            </TooltipContent>
          </Tooltip>
        )}
        
        {hasPRs && (
          <span className={cn(
            "text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded",
            showOnlyMyPRs && filteredPRs.length !== prs.length && "text-primary"
          )}>
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
        <div className="ml-8 py-2 text-xs text-muted-foreground italic">
          No PRs by you
        </div>
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
    
    const hasRunning = pr.checks.check_runs.some(cr => cr.status === 'in_progress' || cr.status === 'queued')
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
    <div 
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-r transition-colors ml-2",
        isSelected 
          ? "bg-primary/20 text-primary border-l-2 border-primary -ml-[1px]" 
          : "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      <GitPullRequest className={cn(
        "w-4 h-4 flex-shrink-0",
        pr.draft ? "text-muted-foreground" : isSelected ? "text-primary" : "text-blue-500"
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono text-muted-foreground">#{pr.number}</span>
          <span className={cn(
            "text-sm truncate",
            isSelected && "font-medium"
          )}>
            {pr.title}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {getStatusIcon()}
        <span className="text-[10px] text-muted-foreground">
          {formatRelativeTime(pr.created_at)}
        </span>
      </div>
    </div>
  )
}

export function IDEView({ currentUser }: IDEViewProps) {
  const { selectedPR, setSelectedPR } = usePRContext()
  const [expandedRepos, setExpandedRepos] = useState<Set<string>>(new Set())
  const [myPRsRepos, setMyPRsRepos] = useState<Set<string>>(new Set()) // Track which repos show only my PRs
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const hasAutoExpanded = useRef(false)

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
      } catch (e) {
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

  // Fetch selected repos filter
  const { data: selectedReposFilter } = useQuery({
    queryKey: ['selected-repos'],
    queryFn: async () => {
      const repos = await window.electron.getSelectedRepos()
      return repos || []
    },
    staleTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  // Fetch all contributed repos
  const { data: reposData } = useQuery({
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
  const filteredRepos = useMemo(() => {
    if (!reposData) return []
    if (!selectedReposFilter || selectedReposFilter.length === 0) return reposData
    const selectedSet = new Set(selectedReposFilter)
    return reposData.filter(repo => selectedSet.has(repo.full_name))
  }, [reposData, selectedReposFilter])

  // Get list of repos to fetch PRs for
  const reposToFetch = useMemo(() => {
    if (!filteredRepos || filteredRepos.length === 0) return []
    return filteredRepos.map(r => r.full_name)
  }, [filteredRepos])

  // Fetch all PRs for selected repos
  const { data: prsResult } = useQuery({
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
      grouped[repoName].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return grouped
  }, [prsData])

  // Total PR count for display
  const totalPRCount = prsData.length

  // Repos map for quick lookup
  const reposMap = useMemo(() => {
    return new Map((filteredRepos || []).map(r => [r.full_name, r]))
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
    setExpandedRepos(prev => {
      const next = new Set(prev)
      if (next.has(repoName)) {
        next.delete(repoName)
      } else {
        next.add(repoName)
      }
      return next
    })
  }, [])

  const toggleMyPRsForRepo = useCallback((repoName: string) => {
    setMyPRsRepos(prev => {
      const next = new Set(prev)
      if (next.has(repoName)) {
        next.delete(repoName)
      } else {
        next.add(repoName)
      }
      return next
    })
  }, [])

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = Math.min(500, Math.max(200, e.clientX))
      setSidebarWidth(newWidth)
    }

    const handleMouseUp = () => {
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
        className="flex-shrink-0 apple-sidebar flex flex-col"
        style={{ width: sidebarWidth }}
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
            {sortedRepos.map((repo) => (
              <TreeItem
                key={repo.full_name}
                repo={repo}
                prs={prsByRepo[repo.full_name] || []}
                isExpanded={expandedRepos.has(repo.full_name)}
                onToggle={() => toggleRepo(repo.full_name)}
                selectedPRId={selectedPR?.id || null}
                onSelectPR={setSelectedPR}
                showOnlyMyPRs={myPRsRepos.has(repo.full_name)}
                onToggleMyPRs={() => toggleMyPRsForRepo(repo.full_name)}
                currentUser={fetchedCurrentUser}
              />
            ))}
            {sortedRepos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No repositories</p>
                <p className="text-xs mt-1">Select repos from the header</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Resize handle */}
      <div
        className={cn(
          "w-1 cursor-col-resize hover:bg-primary/50 transition-colors flex-shrink-0",
          isResizing && "bg-primary"
        )}
        onMouseDown={handleResizeStart}
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
                  Click on a PR in the explorer to view its details, CI status, comments, and reviews
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
