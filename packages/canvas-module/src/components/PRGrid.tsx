/**
 * PRGrid - Canvas view with draggable repository cards.
 * Uses TanStack Query for data fetching with automatic caching and persistence.
 */

import {
  useCardLayouts,
  useMinimizedRepos,
  usePRs,
  useRefreshRepoPRs,
  useRepoColors,
  useRepos,
  useSelectedRepos,
  useSetCardLayouts,
  useSetRepoColor,
  useSetRepoMinimized,
  useSetSelectedRepos
} from '@codelobby/queries'
import type { CardLayout, Repository } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { Button, groupBy, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
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
import { RepoCard } from './RepoCard'

const DEFAULT_CARD_W = 400
const DEFAULT_CARD_H = 350
const MIN_CARD_W = 280
const MIN_CARD_H = 200
const CARD_GAP = 16

interface PRGridProps {
  currentUser: string | null
}

export function PRGrid({ currentUser }: PRGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [layouts, setLayouts] = useState<CardLayout[]>([])
  const [isLayoutLocked, setIsLayoutLocked] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 })

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERY - Data fetching with automatic caching
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: reposData, isLoading: reposLoading, error: reposError } = useRepos()
  const { data: selectedReposData } = useSelectedRepos()
  const { data: prsResult, isLoading: prsLoading } = usePRs(selectedReposData || null)
  const { data: savedLayouts } = useCardLayouts()
  const { data: repoColors } = useRepoColors()
  const { data: minimizedReposArray } = useMinimizedRepos()

  // Mutations for updating data
  const setCardLayoutsMutation = useSetCardLayouts()
  const setRepoColorMutation = useSetRepoColor()
  const setRepoMinimizedMutation = useSetRepoMinimized()
  const refreshRepoPRsMutation = useRefreshRepoPRs()
  const setSelectedReposMutation = useSetSelectedRepos()

  // UI state from Store (non-API data)
  const user = useSignal(Store.user)

  // Extract PRs from query result
  const prsData = prsResult?.prs || []

  // Convert minimizedRepos array to Set for O(1) lookup
  const minimizedRepos = useMemo(() => new Set(minimizedReposArray || []), [minimizedReposArray])

  // Filter repos based on selection
  const filteredRepos = useMemo(() => {
    if (!reposData || reposData.length === 0) return []
    if (selectedReposData === null || selectedReposData === undefined) {
      return reposData as Repository[]
    }
    if (selectedReposData.length === 0) {
      return []
    }
    const selectedSet = new Set(selectedReposData)
    return (reposData as Repository[]).filter((repo) => selectedSet.has(repo.full_name))
  }, [reposData, selectedReposData])

  // Handle closing/hiding a repo card
  const handleCloseRepo = useCallback(
    (repoFullName: string) => {
      let newSelection: string[]
      if (selectedReposData === null || selectedReposData === undefined) {
        if (reposData) {
          newSelection = (reposData as Repository[])
            .map((r) => r.full_name)
            .filter((name) => name !== repoFullName)
        } else {
          newSelection = []
        }
      } else {
        newSelection = selectedReposData.filter((name) => name !== repoFullName)
      }
      setSelectedReposMutation.mutate(newSelection)
    },
    [selectedReposData, reposData, setSelectedReposMutation]
  )

  // Get current user from store
  const fetchedCurrentUser = user?.login || null

  // Track container size using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current
        setContainerSize((prev) => {
          if (prev.width === offsetWidth && prev.height === offsetHeight) {
            return prev
          }
          return { width: offsetWidth, height: offsetHeight }
        })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(() => {
      updateSize()
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  // Generate default layout for repos
  const generateDefaultLayout = useCallback(
    (repos: Repository[], existingLayouts: CardLayout[]): CardLayout[] => {
      const layoutMap = new Map(existingLayouts.map((l) => [l.i, l]))
      const newLayouts: CardLayout[] = []

      const cardsPerRow = Math.max(
        1,
        Math.floor((containerSize.width - CARD_GAP) / (DEFAULT_CARD_W + CARD_GAP))
      )

      repos.forEach((repo, index) => {
        const existing = layoutMap.get(repo.full_name)
        if (existing) {
          newLayouts.push(existing)
        } else {
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
    if (!filteredRepos || filteredRepos.length === 0) return

    const existingLayouts = (savedLayouts as CardLayout[]) || []
    const newLayouts = generateDefaultLayout(filteredRepos, existingLayouts)
    setLayouts(newLayouts)
  }, [filteredRepos, savedLayouts, generateDefaultLayout])

  // Save layouts via mutation
  const saveLayouts = useCallback(
    (newLayouts: CardLayout[]) => {
      setCardLayoutsMutation.mutate(newLayouts)
    },
    [setCardLayoutsMutation]
  )

  // Handle repo color change via mutation
  const handleColorChange = useCallback(
    (repoFullName: string, color: string | null) => {
      setRepoColorMutation.mutate({ repoFullName, color })
    },
    [setRepoColorMutation]
  )

  // Handle minimize change via mutation
  const handleMinimizeChange = useCallback(
    (repoFullName: string, isMinimized: boolean) => {
      setRepoMinimizedMutation.mutate({ repoFullName, isMinimized })

      const MINIMIZED_HEIGHT = 85
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
    [layouts, saveLayouts, setRepoMinimizedMutation]
  )

  // Handle reload via mutation
  const handleReload = useCallback(
    (repoFullName: string) => {
      refreshRepoPRsMutation.mutate(repoFullName)
    },
    [refreshRepoPRsMutation]
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

  const isLoading = reposLoading || prsLoading
  const error = reposError

  // Memoize PRs grouped by repo, sorted by created_at (newest first)
  const prsByRepo = useMemo(() => {
    const grouped = groupBy(prsData || [], (pr) => pr.base.repo.full_name)
    for (const repoName of Object.keys(grouped)) {
      grouped[repoName].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    }
    return grouped
  }, [prsData])

  // Memoize repos map for quick lookup
  const reposMap = useMemo(() => {
    return new Map((filteredRepos || []).map((r) => [r.full_name, r]))
  }, [filteredRepos])

  // Calculate canvas size
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
          <Button variant="outline" onClick={() => Actions.fetchRepos()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!reposData || (reposData as Repository[]).length === 0) {
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
      {/* Toolbar */}
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
                style={{ contain: 'layout style' }}
              >
                <RepoCard
                  repo={repo}
                  prs={prsByRepo[repo.full_name] || []}
                  className="h-full w-full"
                  isDraggable={!isLayoutLocked}
                  onClose={() => handleCloseRepo(repo.full_name)}
                  color={(repoColors as Record<string, string>)?.[repo.full_name] || null}
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
