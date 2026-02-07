/**
 * IDEView - A file-tree style explorer of repositories and their PRs.
 * Uses TanStack Query for all data.
 * When a repo is expanded, PRs are grouped by author.
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
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  cn,
  formatRelativeTime,
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

/** Group of PRs belonging to the same author within a repo */
interface AuthorGroup {
  login: string
  avatarUrl: string
  prs: PullRequest[]
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
  expandedAuthors: string[]
  onToggleAuthor: (authorKey: string) => void
}

function TreeItem({
  repo,
  isExpanded,
  onToggle,
  selectedPRId,
  onSelectPR,
  currentUser,
  showOnlyMyPRs,
  onToggleMyPRsFilter,
  expandedAuthors,
  onToggleAuthor
}: TreeItemProps) {
  // Fetch PRs for this repo directly (per-repo caching)
  const { data: prs = [], isFetching, refetch } = usePRsForRepo(repo.full_name)

  const filteredPRs = useMemo(() => {
    if (!showOnlyMyPRs || !currentUser) return prs
    return prs.filter((pr) => pr.user.login === currentUser)
  }, [prs, showOnlyMyPRs, currentUser])

  // Group PRs by author
  const authorGroups = useMemo(() => {
    const groups: Map<string, AuthorGroup> = new Map()

    for (const pr of filteredPRs) {
      const login = pr.user.login
      const existing = groups.get(login)

      if (existing) {
        existing.prs.push(pr)
      } else {
        groups.set(login, {
          login,
          avatarUrl: pr.user.avatar_url,
          prs: [pr]
        })
      }
    }

    // Sort: current user first, then alphabetically
    return Array.from(groups.values()).sort((a, b) => {
      if (a.login === currentUser) return -1
      if (b.login === currentUser) return 1
      return a.login.localeCompare(b.login)
    })
  }, [filteredPRs, currentUser])

  const hasPRs = prs.length > 0
  const hasFilteredPRs = filteredPRs.length > 0

  return (
    <div className="select-none">
      <div
        role="treeitem"
        aria-expanded={isExpanded}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-interactive-hover rounded transition-colors group w-full text-left',
          isExpanded && 'bg-surface'
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
                'text-muted-foreground hover:text-foreground hover:bg-interactive-hover disabled:opacity-50'
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
                    ? 'bg-info-subtle text-primary opacity-100'
                    : 'text-muted-foreground hover:text-foreground hover:bg-interactive-hover'
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
              'text-[10px] text-muted-foreground bg-surface px-1.5 py-0.5 rounded',
              showOnlyMyPRs && filteredPRs.length !== prs.length && 'text-primary'
            )}
          >
            {showOnlyMyPRs && filteredPRs.length !== prs.length
              ? `${filteredPRs.length}/${prs.length}`
              : prs.length}
          </span>
        )}
      </div>

      {/* PRs grouped by author */}
      {isExpanded && hasFilteredPRs && (
        <div className="ml-4 border-l border-border-muted">
          {authorGroups.map((group) => {
            // Use repo:author as the key for expanded state
            const authorKey = `${repo.full_name}:${group.login}`
            return (
              <AuthorSection
                key={group.login}
                authorGroup={group}
                isExpanded={expandedAuthors.includes(authorKey)}
                onToggle={() => onToggleAuthor(authorKey)}
                selectedPRId={selectedPRId}
                onSelectPR={onSelectPR}
                isCurrentUser={group.login === currentUser}
              />
            )
          })}
        </div>
      )}

      {isExpanded && hasPRs && !hasFilteredPRs && showOnlyMyPRs && (
        <div className="ml-8 py-2 text-xs text-muted-foreground italic">No PRs by you</div>
      )}
    </div>
  )
}

interface AuthorSectionProps {
  authorGroup: AuthorGroup
  isExpanded: boolean
  onToggle: () => void
  selectedPRId: { repoFullName: string; prNumber: number } | null
  onSelectPR: (pr: PullRequest) => void
  isCurrentUser: boolean
}

function AuthorSection({
  authorGroup,
  isExpanded,
  onToggle,
  selectedPRId,
  onSelectPR,
  isCurrentUser
}: AuthorSectionProps) {
  const { login, avatarUrl, prs } = authorGroup

  // Sort PRs by created_at (newest first)
  const sortedPRs = useMemo(() => {
    return [...prs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [prs])

  return (
    <div className="select-none">
      {/* Author header - collapsible */}
      <div
        role="treeitem"
        aria-expanded={isExpanded}
        tabIndex={0}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 text-xs cursor-pointer hover:bg-interactive-hover rounded transition-colors',
          isCurrentUser && 'text-primary'
        )}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
      >
        <span className="w-3 h-3 flex items-center justify-center text-muted-foreground">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </span>
        <Avatar className="w-4 h-4">
          <AvatarImage src={avatarUrl} alt={login} />
          <AvatarFallback className="text-[8px]">
            <User className="w-2.5 h-2.5" />
          </AvatarFallback>
        </Avatar>
        <span className={cn('font-medium truncate flex-1', isCurrentUser && 'text-primary')}>
          {login}
          {isCurrentUser && <span className="text-muted-foreground ml-1">(you)</span>}
        </span>
        <span className="text-[10px] text-muted-foreground bg-surface px-1 py-0.5 rounded">
          {prs.length} PR{prs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* PRs by this author */}
      {isExpanded && (
        <div className="ml-8 border-l border-border-subtle">
          {sortedPRs.map((pr) => (
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
          ? 'bg-info-subtle text-primary border-primary'
          : 'hover:bg-interactive-hover border-transparent'
      )}
      onClick={onSelect}
    >
      <GitPullRequest
        className={cn(
          'w-4 h-4 flex-shrink-0',
          pr.draft ? 'text-muted-foreground' : isSelected ? 'text-primary' : 'text-info'
        )}
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
  const expandedAuthors: string[] = ideSettings?.expandedOwners || [] // Reuse expandedOwners for authors

  // Mutations
  const selectPR = useSelectPR()
  const setIDESettings = useSetIDESettings()
  const toggleRepoExpanded = useToggleRepoExpanded()
  const toggleMyPRsFilter = useToggleMyPRsFilter()

  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const hasAutoExpanded = useRef(false)

  useEffect(() => {
    setSettingsLoaded(true)
  }, [])

  const filteredRepos = useMemo(() => {
    if (!repos || repos.length === 0) return []
    if (!selectedReposData || selectedReposData.length === 0) return []
    const selectedSet = new Set(selectedReposData)
    return repos.filter((repo) => selectedSet.has(repo.full_name))
  }, [repos, selectedReposData])

  // Sort repos alphabetically
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

  const handleToggleAuthor = useCallback(
    (authorKey: string) => {
      const newExpandedAuthors = expandedAuthors.includes(authorKey)
        ? expandedAuthors.filter((a) => a !== authorKey)
        : [...expandedAuthors, authorKey]
      setIDESettings.mutate({ expandedOwners: newExpandedAuthors })
    },
    [expandedAuthors, setIDESettings]
  )

  // Auto-expand first few repos on first load
  useEffect(() => {
    if (!settingsLoaded) return
    if (hasAutoExpanded.current) return
    if (sortedRepos.length === 0) return

    if (expandedRepos.length === 0) {
      const reposToExpand = sortedRepos.slice(0, 5).map((r) => r.full_name)
      setIDESettings.mutate({ expandedRepos: reposToExpand })

      // Auto-expand current user's author section in each expanded repo
      if (currentUser) {
        const authorsToExpand = reposToExpand.map((repo) => `${repo}:${currentUser}`)
        setIDESettings.mutate({ expandedOwners: authorsToExpand })
      }
    }
    hasAutoExpanded.current = true
  }, [settingsLoaded, sortedRepos, expandedRepos.length, currentUser, setIDESettings])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center h-10 px-3 py-2 section-header">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-semibold text-sm">Explorer</span>
          <span className="text-xs text-muted-foreground bg-surface px-1.5 py-0.5 rounded">
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
                expandedAuthors={expandedAuthors}
                onToggleAuthor={handleToggleAuthor}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
