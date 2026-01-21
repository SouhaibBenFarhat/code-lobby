/**
 * PRGrid - Canvas view with draggable repository cards.
 * Uses TanStack Query for data fetching with automatic caching and persistence.
 */

import {
  useCardLayouts,
  useMinimizedRepos,
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
import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { RepoCard } from './RepoCard'

// Memoized wrapper for Rnd to prevent unnecessary re-renders during drag
// Uses LOCAL state to prevent "snap back" when parent re-renders
const DraggableCard = memo(function DraggableCard({
  layout,
  repo,
  isMinimized,
  isLayoutLocked,
  repoColor,
  currentUser,
  onDragStop,
  onResizeStop,
  onClose,
  onColorChange,
  onMinimizeChange
}: {
  layout: { i: string; x: number; y: number; w: number; h: number }
  repo: Repository
  isMinimized: boolean
  isLayoutLocked: boolean
  repoColor: string | null
  currentUser: string | null
  onDragStop: (id: string, x: number, y: number) => void
  onResizeStop: (id: string, w: number, h: number, x: number, y: number) => void
  onClose: () => void
  onColorChange: (color: string | null) => void
  onMinimizeChange: (isMinimized: boolean) => void
}) {
  const MINIMIZED_HEIGHT = 85

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL STATE: Prevents "snap back" bug on drag & drop
  // When user drops a card, we update local state IMMEDIATELY.
  // This prevents the card from snapping to the old position while waiting
  // for the server/cache update.
  // ═══════════════════════════════════════════════════════════════════════════
  const [localPosition, setLocalPosition] = useState({ x: layout.x, y: layout.y })
  const [localSize, setLocalSize] = useState({ w: layout.w, h: layout.h })

  // Sync local state when layout prop changes (e.g., auto-arrange, external update)
  // But ONLY if user isn't currently interacting
  const isDraggingRef = useRef(false)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalPosition({ x: layout.x, y: layout.y })
      setLocalSize({ w: layout.w, h: layout.h })
    }
  }, [layout.x, layout.y, layout.w, layout.h])

  const handleDragStart = useCallback(() => {
    isDraggingRef.current = true
  }, [])

  const handleDragStop = useCallback(
    (_: unknown, d: { x: number; y: number }) => {
      isDraggingRef.current = false
      // Update local state IMMEDIATELY - no snap back!
      setLocalPosition({ x: d.x, y: d.y })
      // Then persist to server
      onDragStop(layout.i, d.x, d.y)
    },
    [layout.i, onDragStop]
  )

  const handleResizeStop = useCallback(
    (_: unknown, __: unknown, ref: HTMLElement, ___: unknown, pos: { x: number; y: number }) => {
      const w = parseInt(ref.style.width, 10)
      const h = parseInt(ref.style.height, 10)
      // Update local state IMMEDIATELY
      setLocalSize({ w, h })
      setLocalPosition({ x: pos.x, y: pos.y })
      // Then persist to server
      onResizeStop(layout.i, w, h, pos.x, pos.y)
    },
    [layout.i, onResizeStop]
  )

  return (
    <Rnd
      position={localPosition}
      size={{ width: localSize.w, height: localSize.h }}
      minWidth={MIN_CARD_W}
      minHeight={isMinimized ? MINIMIZED_HEIGHT : MIN_CARD_H}
      maxHeight={isMinimized ? MINIMIZED_HEIGHT : undefined}
      bounds="parent"
      disableDragging={isLayoutLocked}
      enableResizing={!isLayoutLocked && !isMinimized}
      onDragStart={handleDragStart}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
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
      className={!isLayoutLocked ? 'hover:shadow-xl hover:z-10' : ''}
      style={{ willChange: 'transform' }}
    >
      <RepoCard
        repo={repo}
        className="h-full w-full"
        isDraggable={!isLayoutLocked}
        onClose={onClose}
        color={repoColor}
        onColorChange={onColorChange}
        currentUser={currentUser}
        isMinimized={isMinimized}
        onMinimizeChange={onMinimizeChange}
      />
    </Rnd>
  )
})

const DEFAULT_CARD_W = 400
const DEFAULT_CARD_H = 350
const MIN_CARD_W = 280
const MIN_CARD_H = 200
const CARD_GAP = 16

interface PRGridProps {
  currentUser: string | null
}

export function PRGrid({ currentUser }: PRGridProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLayoutLocked, setIsLayoutLocked] = useState(false)
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 800 })

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERY - Data fetching with automatic caching
  // PRs are fetched by each RepoCard individually for independent loading
  // ═══════════════════════════════════════════════════════════════════════════
  const { data: reposData, isLoading: reposLoading, error: reposError } = useRepos()
  const { data: selectedReposData } = useSelectedRepos()
  const { data: savedLayouts } = useCardLayouts()
  const { data: repoColors } = useRepoColors()
  const { data: minimizedReposArray } = useMinimizedRepos()

  // Mutations for updating data
  const setCardLayoutsMutation = useSetCardLayouts()
  const setRepoColorMutation = useSetRepoColor()
  const setRepoMinimizedMutation = useSetRepoMinimized()
  const setSelectedReposMutation = useSetSelectedRepos()

  // UI state from Store (non-API data)
  const user = useSignal(Store.user)

  // Convert minimizedRepos array to Set for O(1) lookup
  const minimizedRepos = useMemo(() => new Set(minimizedReposArray || []), [minimizedReposArray])

  // Filter repos based on selection, PRESERVING SELECTION ORDER
  // First selected = first slot, second selected = second slot, etc.
  const filteredRepos = useMemo(() => {
    if (!reposData || reposData.length === 0) return []
    if (!selectedReposData || selectedReposData.length === 0) {
      return [] // No repos selected = show no cards
    }
    // Create a map for O(1) lookup
    const repoMap = new Map((reposData as Repository[]).map((r) => [r.full_name, r]))
    // Return repos in SELECTION ORDER (selectedReposData order)
    return selectedReposData
      .map((fullName) => repoMap.get(fullName))
      .filter((repo): repo is Repository => repo !== undefined)
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

  // Generate layouts for SELECTED repos
  // RULE: Existing cards NEVER move. New cards go to next available slot.
  // This preserves stable positioning - adding a new repo won't shift existing windows.
  const visibleLayouts = useMemo((): { layouts: CardLayout[]; newLayouts: CardLayout[] } => {
    if (filteredRepos.length === 0) return { layouts: [], newLayouts: [] }

    const savedLayoutMap = new Map(((savedLayouts as CardLayout[]) || []).map((l) => [l.i, l]))
    const cardsPerRow = Math.max(
      1,
      Math.floor((containerSize.width - CARD_GAP) / (DEFAULT_CARD_W + CARD_GAP))
    )

    // Track which grid slots are occupied (for finding next available for new repos)
    const occupiedSlots = new Set<string>()

    // First pass: Collect layouts for repos that have saved positions
    // and mark their slots as occupied
    const resultLayouts: CardLayout[] = []
    const reposNeedingLayout: Repository[] = []

    for (const repo of filteredRepos) {
      const saved = savedLayoutMap.get(repo.full_name)
      if (saved) {
        resultLayouts.push(saved)
        // Mark this slot as occupied (approximate grid position)
        const col = Math.round((saved.x - CARD_GAP) / (DEFAULT_CARD_W + CARD_GAP))
        const row = Math.round((saved.y - CARD_GAP) / (DEFAULT_CARD_H + CARD_GAP))
        occupiedSlots.add(`${col},${row}`)
      } else {
        reposNeedingLayout.push(repo)
      }
    }

    // Second pass: Assign new repos to next available slots (filling from top-left)
    // This ensures new cards don't displace existing ones
    const newLayouts: CardLayout[] = []
    let slotIndex = 0
    for (const repo of reposNeedingLayout) {
      // Find next unoccupied slot
      let col: number
      let row: number
      do {
        col = slotIndex % cardsPerRow
        row = Math.floor(slotIndex / cardsPerRow)
        slotIndex++
      } while (occupiedSlots.has(`${col},${row}`))

      // Mark as occupied and add layout
      occupiedSlots.add(`${col},${row}`)
      const newLayout = {
        i: repo.full_name,
        x: col * (DEFAULT_CARD_W + CARD_GAP) + CARD_GAP,
        y: row * (DEFAULT_CARD_H + CARD_GAP) + CARD_GAP,
        w: DEFAULT_CARD_W,
        h: DEFAULT_CARD_H
      }
      resultLayouts.push(newLayout)
      newLayouts.push(newLayout)
    }

    return { layouts: resultLayouts, newLayouts }
  }, [filteredRepos, savedLayouts, containerSize.width])

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Use refs for layouts to prevent callback recreation
  // This is critical for smooth drag & drop - callbacks must be stable!
  // ═══════════════════════════════════════════════════════════════════════════
  const layoutsRef = useRef<CardLayout[]>([])
  layoutsRef.current = visibleLayouts.layouts

  // Save layouts via mutation (stable callback)
  const saveLayouts = useCallback(
    (newLayouts: CardLayout[]) => {
      setCardLayoutsMutation.mutate(newLayouts)
    },
    [setCardLayoutsMutation]
  )

  // Auto-save layouts for NEW cards to prevent them from being repositioned
  useEffect(() => {
    if (visibleLayouts.newLayouts.length > 0) {
      const existingSaved = (savedLayouts as CardLayout[]) || []
      const allLayouts = [...existingSaved, ...visibleLayouts.newLayouts]
      saveLayouts(allLayouts)
    }
  }, [visibleLayouts.newLayouts, savedLayouts, saveLayouts])

  // Handle repo color change (stable callback)
  const handleColorChange = useCallback(
    (repoFullName: string, color: string | null) => {
      setRepoColorMutation.mutate({ repoFullName, color })
    },
    [setRepoColorMutation]
  )

  // Handle minimize change (uses ref for stable callback)
  const handleMinimizeChange = useCallback(
    (repoFullName: string, isMinimized: boolean) => {
      setRepoMinimizedMutation.mutate({ repoFullName, isMinimized })

      const MINIMIZED_HEIGHT = 85
      const newLayouts = layoutsRef.current.map((l) => {
        if (l.i === repoFullName) {
          return { ...l, h: isMinimized ? MINIMIZED_HEIGHT : DEFAULT_CARD_H }
        }
        return l
      })
      saveLayouts(newLayouts)
    },
    [saveLayouts, setRepoMinimizedMutation]
  )

  // Handle drag end - uses ref for stable callback (CRITICAL for smooth drag!)
  const handleDragStop = useCallback(
    (id: string, x: number, y: number) => {
      const newLayouts = layoutsRef.current.map((l) => (l.i === id ? { ...l, x, y } : l))
      saveLayouts(newLayouts)
    },
    [saveLayouts]
  )

  // Handle resize end - uses ref for stable callback
  const handleResizeStop = useCallback(
    (id: string, w: number, h: number, x: number, y: number) => {
      const newLayouts = layoutsRef.current.map((l) => (l.i === id ? { ...l, w, h, x, y } : l))
      saveLayouts(newLayouts)
    },
    [saveLayouts]
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

    saveLayouts(newLayouts)
  }, [filteredRepos, containerSize, saveLayouts])

  // Only show full-page loading for repos, NOT for PRs
  // PRs loading shows spinner inside individual cards
  const isLoading = reposLoading
  const error = reposError

  // Memoize repos map for quick lookup
  const reposMap = useMemo(() => {
    return new Map((filteredRepos || []).map((r) => [r.full_name, r]))
  }, [filteredRepos])

  // Calculate canvas size
  const canvasSize = useMemo(() => {
    let maxX = containerSize.width
    let maxY = containerSize.height

    for (const layout of visibleLayouts.layouts) {
      maxX = Math.max(maxX, layout.x + layout.w + CARD_GAP)
      maxY = Math.max(maxY, layout.y + layout.h + CARD_GAP)
    }

    return { width: maxX, height: maxY }
  }, [visibleLayouts.layouts, containerSize])

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

          {visibleLayouts.layouts.map((layout) => {
            const repo = reposMap.get(layout.i)
            if (!repo) return null

            return (
              <DraggableCard
                key={layout.i}
                layout={layout}
                repo={repo}
                isMinimized={minimizedRepos?.has(repo.full_name) || false}
                isLayoutLocked={isLayoutLocked}
                repoColor={(repoColors as Record<string, string>)?.[repo.full_name] || null}
                currentUser={currentUser || fetchedCurrentUser}
                onDragStop={handleDragStop}
                onResizeStop={handleResizeStop}
                onClose={() => handleCloseRepo(repo.full_name)}
                onColorChange={(color) => handleColorChange(repo.full_name, color)}
                onMinimizeChange={(isMinimized) =>
                  handleMinimizeChange(repo.full_name, isMinimized)
                }
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
