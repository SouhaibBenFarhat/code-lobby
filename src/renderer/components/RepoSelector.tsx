import { useState, useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, FolderGit2, Search, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'
import { cn } from '@/lib/utils'
import type { Repository } from './types'

export function RepoSelector() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set())

  // Fetch all repos
  const { data: allRepos } = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const result = await window.electron.fetchContributedRepos()
      if (!result.success) return []
      return result.data as Repository[]
    }
  })

  // Load saved selection
  const { data: savedSelection } = useQuery({
    queryKey: ['selected-repos'],
    queryFn: async () => {
      const repos = await window.electron.getSelectedRepos()
      return repos || []
    },
    staleTime: Infinity
  })

  // Apply saved selection on load
  useEffect(() => {
    if (savedSelection && savedSelection.length > 0) {
      setSelectedRepos(new Set(savedSelection))
    } else if (allRepos && savedSelection && savedSelection.length === 0) {
      // If no saved selection, default to all repos selected
      setSelectedRepos(new Set(allRepos.map(r => r.full_name)))
    }
  }, [savedSelection, allRepos])

  // Filter repos by search
  const filteredRepos = useMemo(() => {
    if (!allRepos) return []
    if (!search.trim()) return allRepos
    
    const searchLower = search.toLowerCase()
    return allRepos.filter(repo =>
      repo.full_name.toLowerCase().includes(searchLower) ||
      repo.name.toLowerCase().includes(searchLower) ||
      repo.owner.login.toLowerCase().includes(searchLower)
    )
  }, [allRepos, search])

  // Save selection
  const saveSelection = async (newSelection: Set<string>) => {
    const reposArray = Array.from(newSelection)
    await window.electron.setSelectedRepos(reposArray)
    queryClient.setQueryData(['selected-repos'], reposArray)
  }

  // Toggle single repo
  const toggleRepo = (repoName: string) => {
    const newSelection = new Set(selectedRepos)
    if (newSelection.has(repoName)) {
      newSelection.delete(repoName)
    } else {
      newSelection.add(repoName)
    }
    setSelectedRepos(newSelection)
    saveSelection(newSelection)
  }

  // Select all
  const selectAll = () => {
    if (!allRepos) return
    const newSelection = new Set(allRepos.map(r => r.full_name))
    setSelectedRepos(newSelection)
    saveSelection(newSelection)
  }

  // Deselect all
  const deselectAll = () => {
    const newSelection = new Set<string>()
    setSelectedRepos(newSelection)
    saveSelection(newSelection)
  }

  const totalCount = allRepos?.length || 0
  const selectedCount = selectedRepos.size

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={selectAll}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={deselectAll}
              >
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
                    <button
                      key={repo.id}
                      onClick={() => toggleRepo(repo.full_name)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                        isSelected 
                          ? "bg-primary/10 hover:bg-primary/20" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                        isSelected 
                          ? "bg-primary border-primary" 
                          : "border-muted-foreground/30"
                      )}>
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
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-2 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {selectedCount === 0 
              ? "No repos selected - all hidden" 
              : `${selectedCount} repo${selectedCount !== 1 ? 's' : ''} will be displayed`}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
