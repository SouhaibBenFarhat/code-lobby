/**
 * @codelobby/app - App Shell
 *
 * Simplified version using @codelobby/data (TanStack Query only)
 */

import {
  initSessionCache,
  useAIPanel,
  useClaudeStreamListener,
  useCloseCodeVisualizer,
  useCodeVisualizer,
  useIDESettings,
  useIsAuthenticated,
  useMigrateAccounts,
  useNetworkPanel,
  useNetworkPanelHeight,
  usePRDetailPanel,
  usePRFiles,
  useSelectedPRId,
  useSetAIPanel,
  useSetIDESettings,
  useSetNetworkPanelHeight,
  useSetPRDetailPanel,
  useSetUserProfilePanel,
  useUserProfilePanel,
  useValidatePersistedToken,
  useViewMode,
  waitForHydration
} from '@data'
import { CodeVisualizerPanel } from '@pr-detail'
import { Slot } from '@slot-system'
import { Button, cn, ResizeHandle, Toaster, TooltipProvider } from '@ui-kit'
import { MousePointerClick, PanelRightClose } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TokenInput } from './TokenInput'

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 9999
const DEFAULT_PANEL_WIDTH = 400
const DEFAULT_AI_PANEL_WIDTH = 380
const MIN_PANEL_HEIGHT = 80
const DEFAULT_NETWORK_PANEL_HEIGHT = 200
const DEFAULT_USER_PROFILE_HEIGHT = 250

// Matches the .panel-slide CSS transition duration (--duration-slow = 350ms).
const PANEL_SLIDE_MS = 350

/**
 * Keeps a panel's content mounted for one slide duration after it closes, so the
 * content rides the collapse animation instead of vanishing before the panel
 * finishes sliding shut. Returns true while active, and stays true briefly after.
 */
function usePanelPresence(active: boolean, durationMs: number = PANEL_SLIDE_MS): boolean {
  const [present, setPresent] = useState(active)

  useEffect(() => {
    if (active) {
      setPresent(true)
      return
    }
    const timer = window.setTimeout(() => setPresent(false), durationMs)
    return () => window.clearTimeout(timer)
  }, [active, durationMs])

  return present
}

export function App(): React.JSX.Element {
  // Read data from TanStack Query
  const { isAuthenticated, isLoading: isAuthLoading } = useIsAuthenticated()
  const { data: viewMode = 'canvas' } = useViewMode()
  const { data: prDetailPanelData } = usePRDetailPanel()
  const { data: aiPanelData } = useAIPanel()
  const { data: selectedPRId } = useSelectedPRId()

  const prDetailOpen = prDetailPanelData?.isOpen ?? false
  const storedPrDetailWidth = prDetailPanelData?.width ?? DEFAULT_PANEL_WIDTH
  const aiPanelOpen = aiPanelData?.isOpen ?? false
  const storedAiPanelWidth = aiPanelData?.width ?? DEFAULT_AI_PANEL_WIDTH

  // Network panel state
  const { data: networkPanelOpen } = useNetworkPanel()
  const { data: networkPanelHeight = DEFAULT_NETWORK_PANEL_HEIGHT } = useNetworkPanelHeight()

  // The right sidebar hosts both the AI panel and the network panel.
  const sidebarOpen = aiPanelOpen || !!networkPanelOpen

  // User profile panel state
  const { data: userProfilePanelData } = useUserProfilePanel()
  const userProfileOpen = userProfilePanelData?.isOpen ?? false
  const userProfileHeight = userProfilePanelData?.height ?? DEFAULT_USER_PROFILE_HEIGHT

  // Code Visualizer state
  const { data: codeVisualizerData } = useCodeVisualizer()
  const closeCodeVisualizer = useCloseCodeVisualizer()
  const codeVisualizerOpen = codeVisualizerData?.isOpen ?? false
  const codeVisualizerRepoFullName = codeVisualizerData?.repoFullName ?? null
  const codeVisualizerPrNumber = codeVisualizerData?.prNumber ?? null
  const codeVisualizerHeadRef = codeVisualizerData?.headRef ?? null
  const codeVisualizerInitialFilePath = codeVisualizerData?.initialFilePath ?? undefined

  // Fetch files for Code Visualizer
  const { data: codeVisualizerFiles = [] } = usePRFiles(
    codeVisualizerRepoFullName,
    codeVisualizerPrNumber
  )

  // Explorer width (from IDE settings, controlled by IDEView)
  const { data: ideSettings } = useIDESettings()
  const storedExplorerWidth = ideSettings?.sidebarWidth ?? 280

  // Panel widths render from local state so a resize commits its final width
  // synchronously on drag end. Persisting runs through the (async) mutations
  // below; rendering straight from the store would flash the panel's fixed-width
  // inner content one stale frame at the pre-drag width on release. The effects
  // keep local state in sync when the stored width changes elsewhere.
  const [prDetailWidth, setPrDetailWidthState] = useState(storedPrDetailWidth)
  const [aiPanelWidth, setAiPanelWidthState] = useState(storedAiPanelWidth)
  const [explorerWidth, setExplorerWidthState] = useState(storedExplorerWidth)
  useEffect(() => {
    setPrDetailWidthState(storedPrDetailWidth)
  }, [storedPrDetailWidth])
  useEffect(() => {
    setAiPanelWidthState(storedAiPanelWidth)
  }, [storedAiPanelWidth])
  useEffect(() => {
    setExplorerWidthState(storedExplorerWidth)
  }, [storedExplorerWidth])

  // Mutations
  const setPRDetailPanel = useSetPRDetailPanel()
  const setAIPanel = useSetAIPanel()
  const setIDESettings = useSetIDESettings()
  const setNetworkPanelHeight = useSetNetworkPanelHeight()
  const setUserProfilePanel = useSetUserProfilePanel()

  // Keep panel content mounted through the slide-out so it doesn't pop away
  // before the panel width finishes collapsing.
  const prDetailContentPresent = usePanelPresence(prDetailOpen)
  const aiContentPresent = usePanelPresence(aiPanelOpen)
  const networkContentPresent = usePanelPresence(!!networkPanelOpen)

  // Initialize Claude Code stream listener (receives IPC events from main process)
  useClaudeStreamListener()

  // Validate persisted token on startup (after hydration completes)
  const { mutate: validatePersistedToken } = useValidatePersistedToken()
  // One-time migration from the single-account model to multi-account.
  const { mutateAsync: migrateAccounts } = useMigrateAccounts()
  useEffect(() => {
    // Wait for TanStack Query cache to hydrate from localStorage
    // and initialize session cache from SQLite, then migrate any legacy single
    // account into the accounts list before validating the active token.
    Promise.all([waitForHydration(), initSessionCache()])
      .then(() => migrateAccounts())
      .then(() => validatePersistedToken())
  }, [migrateAccounts, validatePersistedToken])

  // Panel resize state
  const [isPRResizing, setIsPRResizing] = useState(false)
  const [isAIResizing, setIsAIResizing] = useState(false)
  const [isNetworkResizing, setIsNetworkResizing] = useState(false)
  const [isUserProfileResizing, setIsUserProfileResizing] = useState(false)
  const [isExplorerResizing, setIsExplorerResizing] = useState(false)

  const prPanelRef = useRef<HTMLElement>(null)
  const rightSidebarRef = useRef<HTMLElement>(null)
  const networkPanelRef = useRef<HTMLDivElement>(null)
  const leftSidebarRef = useRef<HTMLElement>(null)
  const userProfilePanelRef = useRef<HTMLDivElement>(null)
  const prWidthRef = useRef(DEFAULT_PANEL_WIDTH)
  const aiWidthRef = useRef(DEFAULT_AI_PANEL_WIDTH)
  const explorerWidthRef = useRef(280)
  const networkHeightRef = useRef(DEFAULT_NETWORK_PANEL_HEIGHT)
  const userProfileHeightRef = useRef(DEFAULT_USER_PROFILE_HEIGHT)
  const prRafRef = useRef<number | null>(null)
  const aiRafRef = useRef<number | null>(null)
  const explorerRafRef = useRef<number | null>(null)
  const networkRafRef = useRef<number | null>(null)
  const userProfileRafRef = useRef<number | null>(null)
  const prResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)
  const aiResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)
  const explorerResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)
  const networkResizeStart = useRef<{ startY: number; startHeight: number } | null>(null)
  const userProfileResizeStart = useRef<{ startY: number; startHeight: number } | null>(null)

  const handlePRResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsPRResizing(true)
      prResizeStart.current = { startX: e.clientX, startWidth: prDetailWidth }
      prWidthRef.current = prDetailWidth
    },
    [prDetailWidth]
  )

  const handleAIResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsAIResizing(true)
      aiResizeStart.current = { startX: e.clientX, startWidth: aiPanelWidth }
      aiWidthRef.current = aiPanelWidth
    },
    [aiPanelWidth]
  )

  const handleNetworkResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsNetworkResizing(true)
      networkResizeStart.current = { startY: e.clientY, startHeight: networkPanelHeight }
      networkHeightRef.current = networkPanelHeight
    },
    [networkPanelHeight]
  )

  const handleExplorerResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsExplorerResizing(true)
      explorerResizeStart.current = { startX: e.clientX, startWidth: explorerWidth }
      explorerWidthRef.current = explorerWidth
    },
    [explorerWidth]
  )

  const handleUserProfileResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsUserProfileResizing(true)
      userProfileResizeStart.current = { startY: e.clientY, startHeight: userProfileHeight }
      userProfileHeightRef.current = userProfileHeight
    },
    [userProfileHeight]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPRResizing && prResizeStart.current && prPanelRef.current) {
        if (prRafRef.current) cancelAnimationFrame(prRafRef.current)
        prRafRef.current = requestAnimationFrame(() => {
          if (!prResizeStart.current || !prPanelRef.current) return
          const delta = prResizeStart.current.startX - e.clientX
          const newWidth = Math.min(
            MAX_PANEL_WIDTH,
            Math.max(MIN_PANEL_WIDTH, prResizeStart.current.startWidth + delta)
          )
          prPanelRef.current.style.width = `${newWidth}px`
          prPanelRef.current.style.minWidth = `${newWidth}px`
          prPanelRef.current.style.maxWidth = `${newWidth}px`
          prWidthRef.current = newWidth
        })
      }

      if (isAIResizing && aiResizeStart.current && rightSidebarRef.current) {
        if (aiRafRef.current) cancelAnimationFrame(aiRafRef.current)
        aiRafRef.current = requestAnimationFrame(() => {
          if (!aiResizeStart.current || !rightSidebarRef.current) return
          const delta = aiResizeStart.current.startX - e.clientX
          const newWidth = Math.min(
            MAX_PANEL_WIDTH,
            Math.max(MIN_PANEL_WIDTH, aiResizeStart.current.startWidth + delta)
          )
          rightSidebarRef.current.style.width = `${newWidth}px`
          rightSidebarRef.current.style.minWidth = `${newWidth}px`
          rightSidebarRef.current.style.maxWidth = `${newWidth}px`
          aiWidthRef.current = newWidth
        })
      }

      // Explorer (left sidebar) width resize - dragging right increases width
      if (isExplorerResizing && explorerResizeStart.current && leftSidebarRef.current) {
        if (explorerRafRef.current) cancelAnimationFrame(explorerRafRef.current)
        explorerRafRef.current = requestAnimationFrame(() => {
          if (!explorerResizeStart.current || !leftSidebarRef.current) return
          const delta = e.clientX - explorerResizeStart.current.startX
          // Allow up to 70% of window width, min 200px
          const maxExplorerWidth = Math.floor(window.innerWidth * 0.7)
          const newWidth = Math.min(
            maxExplorerWidth,
            Math.max(200, explorerResizeStart.current.startWidth + delta)
          )
          leftSidebarRef.current.style.width = `${newWidth}px`
          leftSidebarRef.current.style.minWidth = `${newWidth}px`
          leftSidebarRef.current.style.maxWidth = `${newWidth}px`
          explorerWidthRef.current = newWidth
        })
      }

      if (
        isNetworkResizing &&
        networkResizeStart.current &&
        networkPanelRef.current &&
        rightSidebarRef.current
      ) {
        if (networkRafRef.current) cancelAnimationFrame(networkRafRef.current)
        networkRafRef.current = requestAnimationFrame(() => {
          if (!networkResizeStart.current || !networkPanelRef.current || !rightSidebarRef.current)
            return
          // Dragging up increases height, dragging down decreases height
          const delta = networkResizeStart.current.startY - e.clientY
          // Max height is sidebar height minus minimum space for AI panel
          const sidebarHeight = rightSidebarRef.current.clientHeight
          const maxHeight = sidebarHeight - MIN_PANEL_HEIGHT
          const newHeight = Math.min(
            maxHeight,
            Math.max(MIN_PANEL_HEIGHT, networkResizeStart.current.startHeight + delta)
          )
          networkPanelRef.current.style.height = `${newHeight}px`
          networkHeightRef.current = newHeight
        })
      }

      // User profile panel resize (dragging up increases height)
      if (
        isUserProfileResizing &&
        userProfileResizeStart.current &&
        userProfilePanelRef.current &&
        leftSidebarRef.current
      ) {
        if (userProfileRafRef.current) cancelAnimationFrame(userProfileRafRef.current)
        userProfileRafRef.current = requestAnimationFrame(() => {
          if (
            !userProfileResizeStart.current ||
            !userProfilePanelRef.current ||
            !leftSidebarRef.current
          )
            return
          // Dragging up increases height, dragging down decreases height
          const delta = userProfileResizeStart.current.startY - e.clientY
          // Max height is sidebar height minus minimum space for explorer
          const sidebarHeight = leftSidebarRef.current.clientHeight
          const maxHeight = sidebarHeight - MIN_PANEL_HEIGHT
          const newHeight = Math.min(
            maxHeight,
            Math.max(MIN_PANEL_HEIGHT, userProfileResizeStart.current.startHeight + delta)
          )
          userProfilePanelRef.current.style.height = `${newHeight}px`
          userProfileHeightRef.current = newHeight
        })
      }
    }

    const handleMouseUp = () => {
      if (prRafRef.current) cancelAnimationFrame(prRafRef.current)
      if (aiRafRef.current) cancelAnimationFrame(aiRafRef.current)
      if (explorerRafRef.current) cancelAnimationFrame(explorerRafRef.current)
      if (networkRafRef.current) cancelAnimationFrame(networkRafRef.current)
      if (userProfileRafRef.current) cancelAnimationFrame(userProfileRafRef.current)

      if (isPRResizing) {
        setPrDetailWidthState(prWidthRef.current)
        setPRDetailPanel.mutate({ width: prWidthRef.current })
      }
      if (isAIResizing) {
        setAiPanelWidthState(aiWidthRef.current)
        setAIPanel.mutate({ width: aiWidthRef.current })
      }
      if (isExplorerResizing) {
        setExplorerWidthState(explorerWidthRef.current)
        setIDESettings.mutate({ sidebarWidth: explorerWidthRef.current })
      }
      if (isNetworkResizing) {
        setNetworkPanelHeight.mutate(networkHeightRef.current)
      }
      if (isUserProfileResizing) {
        setUserProfilePanel.mutate({ height: userProfileHeightRef.current })
      }

      setIsPRResizing(false)
      setIsAIResizing(false)
      setIsExplorerResizing(false)
      setIsNetworkResizing(false)
      setIsUserProfileResizing(false)
      prResizeStart.current = null
      aiResizeStart.current = null
      explorerResizeStart.current = null
      networkResizeStart.current = null
      userProfileResizeStart.current = null
    }

    if (isPRResizing || isAIResizing || isExplorerResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else if (isNetworkResizing || isUserProfileResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [
    isPRResizing,
    isAIResizing,
    isExplorerResizing,
    isNetworkResizing,
    isUserProfileResizing,
    setPRDetailPanel,
    setAIPanel,
    setIDESettings,
    setNetworkPanelHeight,
    setUserProfilePanel
  ])

  const closePRPanel = () => {
    setPRDetailPanel.mutate({ isOpen: false })
  }

  if (isAuthLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background">
        <TokenInput />
        <Toaster />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <Slot name="header" wrapInContainer={false} />

        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar (Explorer + User Profile) — populated only in IDE mode.
              The <aside> stays mounted so its width can animate 0 ↔ full, letting
              <main> reflow smoothly instead of snapping when the mode changes. */}
          <aside
            ref={leftSidebarRef}
            className={cn(
              'apple-sidebar overflow-hidden flex flex-shrink-0',
              !isExplorerResizing && 'panel-slide',
              viewMode === 'ide' && 'floating-panel m-2'
            )}
            style={{
              width: viewMode === 'ide' ? explorerWidth : 0,
              minWidth: viewMode === 'ide' ? explorerWidth : 0,
              maxWidth: viewMode === 'ide' ? explorerWidth : 0
            }}
          >
            {viewMode === 'ide' && (
              <div
                className={cn(
                  'flex flex-col overflow-hidden',
                  isExplorerResizing ? 'flex-1 min-w-0' : 'flex-shrink-0'
                )}
                style={isExplorerResizing ? undefined : { width: explorerWidth }}
              >
                <div
                  className={userProfileOpen ? 'flex-1 overflow-hidden' : 'h-full overflow-hidden'}
                >
                  <Slot name="left-panel" wrapInContainer={false} />
                </div>
                {userProfileOpen && (
                  <>
                    <ResizeHandle
                      direction="vertical"
                      isResizing={isUserProfileResizing}
                      onMouseDown={handleUserProfileResizeStart}
                    />
                    <div
                      ref={userProfilePanelRef}
                      className="flex-shrink-0 overflow-hidden"
                      style={{ height: userProfileHeight }}
                    >
                      <Slot name="user-profile" wrapInContainer={false} />
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
          {/* Explorer resize handle - outside aside for better hit area */}
          {viewMode === 'ide' && (
            <ResizeHandle
              direction="horizontal"
              isResizing={isExplorerResizing}
              onMouseDown={handleExplorerResizeStart}
            />
          )}

          <main className="flex-1 overflow-auto bg-background floating-panel m-2">
            <Slot name="main" wrapInContainer={false} />
          </main>

          {/* PR detail panel (Canvas mode). Stays mounted while in canvas so its
              width animates open/closed and <main> reflows in lockstep. The resize
              handle sits in the gutter (a flex sibling before the panel) so it has a
              full, unclipped hit area — matching the explorer and AI-chat resizers. */}
          {viewMode === 'canvas' && prDetailContentPresent && (
            <ResizeHandle
              direction="horizontal"
              isResizing={isPRResizing}
              onMouseDown={handlePRResizeStart}
            />
          )}
          {viewMode === 'canvas' && (
            <aside
              ref={prPanelRef}
              className={cn(
                'overflow-hidden flex bg-background flex-shrink-0',
                prDetailContentPresent &&
                  'border-l border-border shadow-[-2px_0_8px_rgba(0,0,0,0.06)] dark:shadow-[-2px_0_8px_rgba(0,0,0,0.2)]',
                !isPRResizing && 'panel-slide'
              )}
              style={{
                width: prDetailOpen ? prDetailWidth : 0,
                minWidth: prDetailOpen ? prDetailWidth : 0,
                maxWidth: prDetailOpen ? prDetailWidth : 0
              }}
            >
              {prDetailContentPresent && (
                <div
                  className={cn(
                    'overflow-hidden flex flex-col',
                    isPRResizing ? 'flex-1 min-w-0' : 'flex-shrink-0'
                  )}
                  style={isPRResizing ? undefined : { width: prDetailWidth }}
                >
                  {selectedPRId ? (
                    <Slot name="pr-detail-panel" wrapInContainer={false} />
                  ) : (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between p-3 border-b border-border bg-surface-raised">
                        <h3 className="font-semibold text-sm">PR Details</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={closePRPanel}
                        >
                          <PanelRightClose className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-6">
                        <div className="text-center space-y-4">
                          <div className="w-16 h-16 mx-auto rounded-full bg-surface flex items-center justify-center">
                            <MousePointerClick className="w-8 h-8 text-foreground-subtle" />
                          </div>
                          <p className="text-sm font-medium text-muted-foreground">
                            No PR selected
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}

          {/* Right sidebar (AI chat + Network). Always mounted so its width can
              animate 0 ↔ full; content lingers briefly on close to ride the slide.
              The resize handle sits in the gutter (a flex sibling before the panel)
              so it has a full, unclipped hit area like the explorer resizer. */}
          {(aiContentPresent || networkContentPresent) && (
            <ResizeHandle
              direction="horizontal"
              isResizing={isAIResizing}
              onMouseDown={handleAIResizeStart}
            />
          )}
          <aside
            ref={rightSidebarRef}
            className={cn(
              'apple-panel overflow-hidden flex flex-shrink-0',
              !isAIResizing && 'panel-slide',
              sidebarOpen && 'floating-panel m-2'
            )}
            style={{
              width: sidebarOpen ? aiPanelWidth : 0,
              minWidth: sidebarOpen ? aiPanelWidth : 0,
              maxWidth: sidebarOpen ? aiPanelWidth : 0
            }}
          >
            {(aiContentPresent || networkContentPresent) && (
              <div
                className={cn(
                  'flex flex-col overflow-hidden',
                  isAIResizing ? 'flex-1 min-w-0' : 'flex-shrink-0'
                )}
                style={isAIResizing ? undefined : { width: aiPanelWidth }}
              >
                {aiContentPresent && (
                  <div
                    className={
                      networkContentPresent ? 'flex-1 overflow-hidden' : 'h-full overflow-hidden'
                    }
                  >
                    <Slot name="ai-panel" wrapInContainer={false} />
                  </div>
                )}
                {networkContentPresent && (
                  <>
                    {aiContentPresent && (
                      <ResizeHandle
                        direction="vertical"
                        isResizing={isNetworkResizing}
                        onMouseDown={handleNetworkResizeStart}
                      />
                    )}
                    <div
                      ref={networkPanelRef}
                      className="flex-shrink-0 overflow-hidden"
                      style={{ height: aiContentPresent ? networkPanelHeight : '100%' }}
                    >
                      <Slot name="network-panel" wrapInContainer={false} />
                    </div>
                  </>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* Code Visualizer Floating Window */}
        {codeVisualizerOpen &&
          codeVisualizerRepoFullName &&
          codeVisualizerHeadRef &&
          codeVisualizerFiles.length > 0 && (
            <CodeVisualizerPanel
              repoFullName={codeVisualizerRepoFullName}
              headRef={codeVisualizerHeadRef}
              files={codeVisualizerFiles}
              onClose={() => closeCodeVisualizer.mutate()}
              initialFilePath={codeVisualizerInitialFilePath}
            />
          )}

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
