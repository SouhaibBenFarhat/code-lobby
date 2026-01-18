import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  FolderGit2,
  LayoutGrid,
  Loader2,
  Lock,
  Maximize2,
  RefreshCw,
  Unlock
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { groupBy } from '@/lib/utils'
import { RepoCard } from './RepoCard'
import type { PullRequest, Repository } from './types'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface CardLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
}

const DEFAULT_CARD_W = 400
const DEFAULT_CARD_H = 350
const MIN_CARD_W = 280
const MIN_CARD_H = 200
const CARD_GAP = 16

interface PRGridProps {
  currentUser: string | null
}

export function PRGrid({ currentUser }: PRGridProps) {
  const queryClient = useQueryClient()
  const containerRef = useRef<HTMLDivElement>(null)
  const [layouts, setLayouts] = useState<CardLayout[]>([])
  const [isLayoutLocked, setIsLayoutLocked] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 })

  // Fetch saved card layouts
  const { data: savedLayouts, isLoading: layoutsLoading } = useQuery({
    queryKey: ['card-layouts'],
    queryFn: async () => {
      const layouts = await window.electron.getCardLayouts()
      return layouts || []
    },
    staleTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  // Fetch saved repo colors
  const { data: repoColors } = useQuery({
    queryKey: ['repo-colors'],
    queryFn: async () => {
      const colors = await window.electron.getRepoColors()
      return colors || {}
    },
    staleTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

  // Fetch minimized repos
  const { data: minimizedRepos } = useQuery({
    queryKey: ['minimized-repos'],
    queryFn: async () => {
      const repos = await window.electron.getMinimizedRepos()
      return new Set(repos || [])
    },
    staleTime: Infinity,
    refetchOnMount: true,
    refetchOnWindowFocus: false
  })

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

  // Fetch all contributed repos (no polling - refresh on window focus or manual)
  const {
    data: reposData,
    isLoading: reposLoading,
    error: reposError
  } = useQuery({
    queryKey: ['repos'],
    queryFn: async () => {
      const result = await window.electron.fetchContributedRepos()
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch repos')
      }
      return result.data as Repository[]
    },
    refetchOnWindowFocus: true,
    staleTime: 60000 // Consider data stale after 1 minute
  })

  // Filter repos based on selection
  const filteredRepos = useMemo(() => {
    if (!reposData) return []
    // If no selection saved or empty array, show all repos
    if (!selectedReposFilter || selectedReposFilter.length === 0) {
      return reposData
    }
    // Filter to only selected repos
    const selectedSet = new Set(selectedReposFilter)
    return reposData.filter((repo) => selectedSet.has(repo.full_name))
  }, [reposData, selectedReposFilter])

  // Handle closing/hiding a repo card
  const handleCloseRepo = useCallback(
    async (repoFullName: string) => {
      // Get current selection
      const currentSelection = selectedReposFilter || []

      // If no selection exists, we need to select all EXCEPT the one being closed
      let newSelection: string[]
      if (currentSelection.length === 0 && reposData) {
        // Currently showing all - select all except the one being closed
        newSelection = reposData.map((r) => r.full_name).filter((name) => name !== repoFullName)
      } else {
        // Remove from current selection
        newSelection = currentSelection.filter((name) => name !== repoFullName)
      }

      // Save to store and update query cache
      await window.electron.setSelectedRepos(newSelection)
      queryClient.setQueryData(['selected-repos'], newSelection)
    },
    [selectedReposFilter, reposData, queryClient]
  )

  // Get list of repos to fetch PRs for
  const reposToFetch = useMemo(() => {
    if (!filteredRepos || filteredRepos.length === 0) return []
    return filteredRepos.map((r) => r.full_name)
  }, [filteredRepos])

  // Fetch ALL PRs for selected repos (not just user's PRs)
  const {
    data: prsResult,
    isLoading: prsLoading,
    error: prsError,
    refetch
  } = useQuery({
    queryKey: ['all-prs-for-repos', reposToFetch],
    queryFn: async () => {
      if (reposToFetch.length === 0) return { prs: [] as PullRequest[], currentUser: '' }
      const result = await window.electron.fetchAllPRsForRepos(reposToFetch)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch PRs')
      }
      return { prs: result.data as PullRequest[], currentUser: result.currentUser || '' }
    },
    enabled: reposToFetch.length > 0,
    refetchOnWindowFocus: true,
    staleTime: 60000 // Consider data stale after 1 minute
  })

  const prsData = prsResult?.prs
  const fetchedCurrentUser = prsResult?.currentUser

  // Track container size
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        })
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Generate default layout for repos (scattered nicely)
  const generateDefaultLayout = useCallback(
    (repos: Repository[], existingLayouts: CardLayout[]): CardLayout[] => {
      const layoutMap = new Map(existingLayouts.map((l) => [l.i, l]))
      const newLayouts: CardLayout[] = []

      // Calculate how many cards can fit per row
      const cardsPerRow = Math.max(
        1,
        Math.floor((containerSize.width - CARD_GAP) / (DEFAULT_CARD_W + CARD_GAP))
      )

      repos.forEach((repo, index) => {
        const existing = layoutMap.get(repo.full_name)
        if (existing) {
          newLayouts.push(existing)
        } else {
          // Calculate position in a grid-like pattern for new cards
          const col = index % cardsPerRow
          const row = Math.floor(index / cardsPerRow)

          newLayouts.push({
            i: repo.full_name,
            x: col * (DEFAULT_CARD_W + CARD_GAP) + CARD_GAP,
            y: row * (DEFAULT_CARD_H + CARD_GAP) + CARD_GAP,
            w: DEFAULT_CARD_W,
            h: DEFAULT_CARD_H
          })
        }
      })

      return newLayouts
    },
    [containerSize.width]
  )

  // Apply saved layouts when data loads
  useEffect(() => {
    if (!filteredRepos || filteredRepos.length === 0 || layoutsLoading) return

    const existingLayouts = savedLayouts || []
    const newLayouts = generateDefaultLayout(filteredRepos, existingLayouts)
    setLayouts(newLayouts)
  }, [filteredRepos, savedLayouts, layoutsLoading, generateDefaultLayout])

  // Save layouts to store
  const saveLayouts = useCallback(
    async (newLayouts: CardLayout[]) => {
      await window.electron.setCardLayouts(newLayouts)
      queryClient.setQueryData(['card-layouts'], newLayouts)
    },
    [queryClient]
  )

  // Handle repo color change
  const handleColorChange = useCallback(
    async (repoFullName: string, color: string | null) => {
      await window.electron.setRepoColor(repoFullName, color)
      const currentColors = repoColors || {}
      const newColors = { ...currentColors }
      if (color === null) {
        delete newColors[repoFullName]
      } else {
        newColors[repoFullName] = color
      }
      queryClient.setQueryData(['repo-colors'], newColors)
    },
    [repoColors, queryClient]
  )

  // Handle minimize change
  const handleMinimizeChange = useCallback(
    async (repoFullName: string, isMinimized: boolean) => {
      await window.electron.setRepoMinimized(repoFullName, isMinimized)
      const currentSet = minimizedRepos || new Set()
      const newSet = new Set(currentSet)
      if (isMinimized) {
        newSet.add(repoFullName)
      } else {
        newSet.delete(repoFullName)
      }
      queryClient.setQueryData(['minimized-repos'], newSet)

      // Update layout height when minimizing/expanding
      const MINIMIZED_HEIGHT = 85 // Height when minimized (just header)
      const newLayouts = layouts.map((l) => {
        if (l.i === repoFullName) {
          return {
            ...l,
            h: isMinimized ? MINIMIZED_HEIGHT : DEFAULT_CARD_H
          }
        }
        return l
      })
      setLayouts(newLayouts)
      saveLayouts(newLayouts)
    },
    [minimizedRepos, queryClient, layouts, saveLayouts]
  )

  // Handle reload for single repo
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
      }
    },
    [prsResult, queryClient, reposToFetch]
  )

  // Handle drag/resize end
  const handleDragStop = useCallback(
    (id: string, x: number, y: number) => {
      const newLayouts = layouts.map((l) => (l.i === id ? { ...l, x, y } : l))
      setLayouts(newLayouts)
      saveLayouts(newLayouts)
    },
    [layouts, saveLayouts]
  )

  const handleResizeStop = useCallback(
    (id: string, w: number, h: number, x: number, y: number) => {
      const newLayouts = layouts.map((l) => (l.i === id ? { ...l, w, h, x, y } : l))
      setLayouts(newLayouts)
      saveLayouts(newLayouts)
    },
    [layouts, saveLayouts]
  )

  // Auto-arrange cards in a grid
  const autoArrange = useCallback(() => {
    if (!filteredRepos || filteredRepos.length === 0) return

    const cardsPerRow = Math.max(
      1,
      Math.floor((containerSize.width - CARD_GAP) / (DEFAULT_CARD_W + CARD_GAP))
    )

    const newLayouts = filteredRepos.map((repo, index) => {
      const col = index % cardsPerRow
      const row = Math.floor(index / cardsPerRow)

      return {
        i: repo.full_name,
        x: col * (DEFAULT_CARD_W + CARD_GAP) + CARD_GAP,
        y: row * (DEFAULT_CARD_H + CARD_GAP) + CARD_GAP,
        w: DEFAULT_CARD_W,
        h: DEFAULT_CARD_H
      }
    })

    setLayouts(newLayouts)
    saveLayouts(newLayouts)
  }, [filteredRepos, containerSize.width, saveLayouts])

  // Fill container with equal-sized cards
  const fillContainer = useCallback(() => {
    if (!filteredRepos || filteredRepos.length === 0) return

    const count = filteredRepos.length
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)

    const cardW = Math.floor((containerSize.width - CARD_GAP * (cols + 1)) / cols)
    const cardH = Math.floor((containerSize.height - CARD_GAP * (rows + 1)) / rows)

    const newLayouts = filteredRepos.map((repo, index) => {
      const col = index % cols
      const row = Math.floor(index / cols)

      return {
        i: repo.full_name,
        x: col * (cardW + CARD_GAP) + CARD_GAP,
        y: row * (cardH + CARD_GAP) + CARD_GAP,
        w: Math.max(MIN_CARD_W, cardW),
        h: Math.max(MIN_CARD_H, cardH)
      }
    })

    setLayouts(newLayouts)
    saveLayouts(newLayouts)
  }, [filteredRepos, containerSize, saveLayouts])

  const isLoading = reposLoading || prsLoading || layoutsLoading
  const error = reposError || prsError

  // Memoize PRs grouped by repo, sorted by created_at (newest first)
  const prsByRepo = useMemo(() => {
    const grouped = groupBy(prsData || [], (pr) => pr.base.repo.full_name)
    // Sort PRs within each repo by created_at descending (newest first)
    for (const repoName of Object.keys(grouped)) {
      grouped[repoName].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return grouped
  }, [prsData])

  // Memoize repos map for quick lookup (use filtered repos for rendering)
  const reposMap = useMemo(() => {
    return new Map((filteredRepos || []).map((r) => [r.full_name, r]))
  }, [filteredRepos])

  // Calculate canvas size (extends beyond container if cards are placed outside)
  const canvasSize = useMemo(() => {
    let maxX = containerSize.width
    let maxY = containerSize.height

    for (const layout of layouts) {
      maxX = Math.max(maxX, layout.x + layout.w + CARD_GAP)
      maxY = Math.max(maxY, layout.y + layout.h + CARD_GAP)
    }

    return { width: maxX, height: maxY }
  }, [layouts, containerSize])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading your repositories...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!reposData || reposData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FolderGit2 className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">No repositories found</p>
            <p className="text-sm text-muted-foreground">
              We couldn't find any repositories you've contributed to.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (filteredRepos.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <FolderGit2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">No repositories selected</p>
            <p className="text-sm text-muted-foreground">
              Use the "Repos" dropdown in the header to select which repositories to display.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      {/* Toolbar - positioned at bottom right of container */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={autoArrange}
              className="h-8 gap-1.5"
              disabled={isLayoutLocked}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-xs">Grid</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto-arrange cards in a grid</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={fillContainer}
              className="h-8 gap-1.5"
              disabled={isLayoutLocked}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="text-xs">Fill</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fill container with equal-sized cards</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isLayoutLocked ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIsLayoutLocked(!isLayoutLocked)}
              className="h-8 gap-1.5"
            >
              {isLayoutLocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span className="text-xs">Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span className="text-xs">Unlocked</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLayoutLocked ? 'Unlock to move and resize cards' : 'Lock layout to prevent changes'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Scrollable canvas area */}
      <div ref={containerRef} className="h-full w-full overflow-auto bg-muted/20">
        {/* Canvas - extends if cards go beyond viewport */}
        <div
          className="relative"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          {/* Grid pattern background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />

          {layouts.map((layout) => {
            const repo = reposMap.get(layout.i)
            if (!repo) return null
            const isMinimized = minimizedRepos?.has(repo.full_name) || false
            const MINIMIZED_HEIGHT = 85

            return (
              <Rnd
                key={layout.i}
                position={{ x: layout.x, y: layout.y }}
                size={{ width: layout.w, height: layout.h }}
                minWidth={MIN_CARD_W}
                minHeight={isMinimized ? MINIMIZED_HEIGHT : MIN_CARD_H}
                maxHeight={isMinimized ? MINIMIZED_HEIGHT : undefined}
                bounds="parent"
                disableDragging={isLayoutLocked}
                enableResizing={!isLayoutLocked && !isMinimized}
                onDragStop={(_, d) => handleDragStop(layout.i, d.x, d.y)}
                onResizeStop={(_, __, ref, ___, pos) => {
                  handleResizeStop(
                    layout.i,
                    parseInt(ref.style.width, 10),
                    parseInt(ref.style.height, 10),
                    pos.x,
                    pos.y
                  )
                }}
                dragHandleClassName="drag-handle"
                resizeHandleStyles={{
                  top: { cursor: 'n-resize' },
                  bottom: { cursor: 's-resize' },
                  left: { cursor: 'w-resize' },
                  right: { cursor: 'e-resize' },
                  topLeft: { cursor: 'nw-resize' },
                  topRight: { cursor: 'ne-resize' },
                  bottomLeft: { cursor: 'sw-resize' },
                  bottomRight: { cursor: 'se-resize' }
                }}
                resizeHandleClasses={{
                  top: 'resize-handle resize-handle-n',
                  bottom: 'resize-handle resize-handle-s',
                  left: 'resize-handle resize-handle-w',
                  right: 'resize-handle resize-handle-e',
                  topLeft: 'resize-handle resize-handle-nw',
                  topRight: 'resize-handle resize-handle-ne',
                  bottomLeft: 'resize-handle resize-handle-sw',
                  bottomRight: 'resize-handle resize-handle-se'
                }}
                className={`
                  transition-shadow duration-200
                  ${!isLayoutLocked ? 'hover:shadow-xl hover:z-10' : ''}
                `}
              >
                <RepoCard
                  repo={repo}
                  prs={prsByRepo[repo.full_name] || []}
                  className="h-full w-full"
                  isDraggable={!isLayoutLocked}
                  onClose={() => handleCloseRepo(repo.full_name)}
                  color={repoColors?.[repo.full_name] || null}
                  onColorChange={(color) => handleColorChange(repo.full_name, color)}
                  currentUser={currentUser || fetchedCurrentUser}
                  isMinimized={minimizedRepos?.has(repo.full_name) || false}
                  onMinimizeChange={(isMinimized) =>
                    handleMinimizeChange(repo.full_name, isMinimized)
                  }
                  onReload={() => handleReload(repo.full_name)}
                />
              </Rnd>
            )
          })}
        </div>
      </div>
    </div>
  )
}
