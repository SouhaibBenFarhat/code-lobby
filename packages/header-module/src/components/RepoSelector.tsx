/**
 * RepoSelector - Repository filter dropdown.
 * Uses TanStack Query for data fetching with automatic caching.
 * Selection state lives ONLY in query cache - optimistic updates make it instant.
 */

import { useRepos, useSelectedRepos, useSetSelectedRepos } from '@codelobby/queries'
import type { Repository } from '@codelobby/shared-store'
import {
  Badge,
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea
} from '@codelobby/ui-kit'
import { Check, ChevronDown, FolderGit2, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

export function RepoSelector(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  // Snapshot of selected repos when dropdown opens - used for stable sorting
  const [sortSnapshot, setSortSnapshot] = useState<Set<string>>(new Set())

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERY - Single source of truth for selection
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: allReposData } = useRepos()
  const { data: savedSelection } = useSelectedRepos()
  const setSelectedReposMutation = useSetSelectedRepos()

  const allRepos = (allReposData as Repository[]) || []

  // Derive selected repos from query cache
  // - null/undefined = no selection yet (show none selected)
  // - [] = user explicitly deselected all
  // - [...] = user selected specific repos
  const selectedRepos = useMemo(() => {
    return new Set(savedSelection || [])
  }, [savedSelection])

  // Handle dropdown open/close - snapshot selection for stable sorting
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Take snapshot of current selection when opening
      // This determines sort order while dropdown is open
      setSortSnapshot(new Set(savedSelection || []))
    }
    setOpen(isOpen)
  }

  // Filter repos by search and sort: SELECTED FIRST, then alphabetically
  // Uses sortSnapshot (captured on open) so list doesn't jump while selecting
  const filteredRepos = useMemo(() => {
    if (!allRepos || allRepos.length === 0) return []

    let repos = [...allRepos]

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      repos = repos.filter(
        (repo) =>
          repo.full_name.toLowerCase().includes(searchLower) ||
          repo.name.toLowerCase().includes(searchLower) ||
          repo.owner.login.toLowerCase().includes(searchLower)
      )
    }

    // Sort using snapshot (stable while dropdown is open)
    // Selected repos (at time of opening) come first, then alphabetically
    return repos.sort((a, b) => {
      const aSelected = sortSnapshot.has(a.full_name)
      const bSelected = sortSnapshot.has(b.full_name)

      // Selected repos come first
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1

      // Within same group, sort alphabetically
      return a.name.localeCompare(b.name)
    })
  }, [allRepos, search, sortSnapshot])

  // Toggle single repo - mutation has optimistic update for instant UI
  const toggleRepo = (repoName: string) => {
    const newSelection = new Set(selectedRepos)
    if (newSelection.has(repoName)) {
      newSelection.delete(repoName)
    } else {
      newSelection.add(repoName)
    }
    setSelectedReposMutation.mutate(Array.from(newSelection))
  }

  // Select all
  const selectAll = () => {
    if (!allRepos || allRepos.length === 0) return
    setSelectedReposMutation.mutate(allRepos.map((r) => r.full_name))
  }

  // Deselect all
  const deselectAll = () => {
    setSelectedReposMutation.mutate([])
  }

  const totalCount = allRepos?.length || 0
  const selectedCount = selectedRepos.size

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <FolderGit2 className="w-3.5 h-3.5" />
          <span className="text-xs">Repos</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
            {selectedCount}/{totalCount}
          </Badge>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">Select Repositories</h4>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={selectAll}>
                All
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={deselectAll}>
                None
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search repos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearch('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {filteredRepos.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {search ? `No repos matching "${search}"` : 'No repositories found'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredRepos.map((repo) => {
                  const isSelected = selectedRepos.has(repo.full_name)
                  return (
                    <Button
                      variant="unstyled"
                      size="none"
                      key={repo.id}
                      onClick={() => toggleRepo(repo.full_name)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors',
                        isSelected ? 'bg-primary/10 hover:bg-primary/20' : 'hover:bg-muted/50'
                      )}
                    >
                      <div
                        className={cn(
                          'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                          isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <img
                        src={repo.owner.avatar_url}
                        alt={repo.owner.login}
                        className="w-6 h-6 rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{repo.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{repo.owner.login}</p>
                      </div>
                      {repo.language && (
                        <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0">
                          {repo.language}
                        </Badge>
                      )}
                    </Button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {selectedCount === 0
              ? 'No repos selected - all hidden'
              : `${selectedCount} repo${selectedCount !== 1 ? 's' : ''} will be displayed`}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
