/**
 * @codelobby/app - App Shell
 *
 * The App Shell is the main layout component. It:
 * - Defines the layout structure with slots
 * - Handles authentication state
 * - Manages panel resizing
 * - Provides global UI providers (Tooltip, Toast, etc.)
 *
 * The App Shell does NOT import any module components directly.
 * Modules register themselves to slots via the Slot System.
 */

import { api } from '@codelobby/api'
import { Store, useSignal } from '@codelobby/shared-store'
import { Slot } from '@codelobby/slot-system'
import { Button, Toaster, TokenInput, TooltipProvider } from '@codelobby/ui-kit'
import { MousePointerClick, PanelRight, PanelRightClose } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 800
const DEFAULT_PANEL_WIDTH = 400
const DEFAULT_AI_PANEL_WIDTH = 380

/**
 * Main App Shell component.
 */
export function App(): React.JSX.Element {
  // Read global state from the store
  const isAuthenticated = useSignal(Store.isAuthenticated)
  const isAuthLoading = useSignal(Store.loading.auth)
  const viewMode = useSignal(Store.viewMode)
  const prDetailOpen = useSignal(Store.prDetailOpen)
  const prDetailWidth = useSignal(Store.prDetailWidth)
  const aiPanelOpen = useSignal(Store.aiPanelOpen)
  const aiPanelWidth = useSignal(Store.aiPanelWidth)
  const selectedPR = useSignal(Store.selectedPR)
  const _user = useSignal(Store.user)

  // Panel resize state (local to App Shell)
  const [isPRResizing, setIsPRResizing] = useState(false)
  const [isAIResizing, setIsAIResizing] = useState(false)

  // Refs for smooth resize
  const prPanelRef = useRef<HTMLElement>(null)
  const aiPanelRef = useRef<HTMLElement>(null)
  const prWidthRef = useRef(DEFAULT_PANEL_WIDTH)
  const aiWidthRef = useRef(DEFAULT_AI_PANEL_WIDTH)
  const prRafRef = useRef<number | null>(null)
  const aiRafRef = useRef<number | null>(null)
  const prResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)
  const aiResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)

  // PR Panel resize handlers
  const handlePRResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsPRResizing(true)
      prResizeStart.current = { startX: e.clientX, startWidth: prDetailWidth }
      prWidthRef.current = prDetailWidth
    },
    [prDetailWidth]
  )

  // AI Panel resize handlers
  const handleAIResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsAIResizing(true)
      aiResizeStart.current = { startX: e.clientX, startWidth: aiPanelWidth }
      aiWidthRef.current = aiPanelWidth
    },
    [aiPanelWidth]
  )

  // Global mouse event handlers for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // PR Panel resize
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

      // AI Panel resize
      if (isAIResizing && aiResizeStart.current && aiPanelRef.current) {
        if (aiRafRef.current) cancelAnimationFrame(aiRafRef.current)
        aiRafRef.current = requestAnimationFrame(() => {
          if (!aiResizeStart.current || !aiPanelRef.current) return
          const delta = aiResizeStart.current.startX - e.clientX
          const newWidth = Math.min(
            MAX_PANEL_WIDTH,
            Math.max(MIN_PANEL_WIDTH, aiResizeStart.current.startWidth + delta)
          )
          aiPanelRef.current.style.width = `${newWidth}px`
          aiPanelRef.current.style.minWidth = `${newWidth}px`
          aiPanelRef.current.style.maxWidth = `${newWidth}px`
          aiWidthRef.current = newWidth
        })
      }
    }

    const handleMouseUp = () => {
      // Clean up animation frames
      if (prRafRef.current) {
        cancelAnimationFrame(prRafRef.current)
        prRafRef.current = null
      }
      if (aiRafRef.current) {
        cancelAnimationFrame(aiRafRef.current)
        aiRafRef.current = null
      }

      // Sync final widths to store
      if (isPRResizing) {
        Store.prDetailWidth.value = prWidthRef.current
        api.settings.setPRDetailPanel({ width: prWidthRef.current })
      }
      if (isAIResizing) {
        Store.aiPanelWidth.value = aiWidthRef.current
        api.settings.setAIPanel({ width: aiWidthRef.current })
      }

      setIsPRResizing(false)
      setIsAIResizing(false)
      prResizeStart.current = null
      aiResizeStart.current = null
    }

    if (isPRResizing || isAIResizing) {
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
  }, [isPRResizing, isAIResizing])

  const togglePRPanel = () => {
    const newState = !Store.prDetailOpen.value
    Store.prDetailOpen.value = newState
    api.settings.setPRDetailPanel({ isOpen: newState })
  }

  // Handle authentication success
  const handleAuthenticated = (authenticatedUser: {
    login: string
    avatar_url: string
    name: string | null
  }) => {
    Store.user.value = {
      ...authenticatedUser,
      html_url: `https://github.com/${authenticatedUser.login}`
    }
    Store.isAuthenticated.value = true
  }

  // Loading state
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

  // Not authenticated - show token input
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background">
        <TokenInput onAuthenticated={handleAuthenticated} />
        <Toaster />
      </div>
    )
  }

  // Authenticated - render the app with slots
  return (
    <TooltipProvider>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header Slot */}
        <Slot name="header" wrapInContainer={false} />

        {/* Main content area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel Slot (Explorer in IDE mode) */}
          <Slot name="left-panel" className="flex-shrink-0" />

          {/* Main Content Slot (Canvas or IDE view) */}
          <main className="flex-1 overflow-auto bg-muted/20">
            <Slot name="main" wrapInContainer={false} />
          </main>

          {/* Panel toggle button when collapsed (canvas mode only) */}
          {viewMode === 'canvas' && !prDetailOpen && (
            <Button
              variant="unstyled"
              size="none"
              onClick={togglePRPanel}
              className="absolute right-2 bottom-4 z-20 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              title="Open PR details panel"
            >
              <PanelRight className="w-5 h-5" />
            </Button>
          )}

          {/* Right Panel - PR Detail (canvas mode) */}
          {viewMode === 'canvas' && prDetailOpen && (
            <aside
              ref={prPanelRef}
              className="border-l border-border overflow-hidden flex bg-background relative flex-shrink-0"
              style={{
                width: prDetailWidth,
                minWidth: prDetailWidth,
                maxWidth: prDetailWidth,
                willChange: isPRResizing ? 'width' : 'auto',
                contain: 'layout style'
              }}
            >
              {/* Resize handle */}
              <div
                role="slider"
                aria-orientation="horizontal"
                aria-label="Resize panel"
                aria-valuemin={MIN_PANEL_WIDTH}
                aria-valuemax={MAX_PANEL_WIDTH}
                aria-valuenow={prDetailWidth}
                tabIndex={0}
                className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
                  isPRResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/30'
                }`}
                onMouseDown={handlePRResizeStart}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft')
                    Store.prDetailWidth.value = Math.max(MIN_PANEL_WIDTH, prDetailWidth - 20)
                  if (e.key === 'ArrowRight')
                    Store.prDetailWidth.value = Math.min(MAX_PANEL_WIDTH, prDetailWidth + 20)
                }}
              />
              <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {selectedPR ? (
                  <Slot name="pr-detail-panel" wrapInContainer={false} />
                ) : (
                  /* Placeholder when no PR selected */
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
                      <h3 className="font-semibold text-sm">PR Details</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={togglePRPanel}
                      >
                        <PanelRightClose className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                          <MousePointerClick className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            No PR selected
                          </p>
                          <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                            Click on a pull request card to view its details, CI status, and
                            comments
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {/* AI Panel */}
          {aiPanelOpen && (
            <aside
              ref={aiPanelRef}
              className="apple-panel overflow-hidden flex relative flex-shrink-0"
              style={{
                width: aiPanelWidth,
                minWidth: aiPanelWidth,
                maxWidth: aiPanelWidth,
                willChange: isAIResizing ? 'width' : 'auto',
                contain: 'layout style'
              }}
            >
              {/* Resize handle */}
              <div
                role="slider"
                aria-orientation="horizontal"
                aria-label="Resize AI panel"
                aria-valuemin={MIN_PANEL_WIDTH}
                aria-valuemax={MAX_PANEL_WIDTH}
                aria-valuenow={aiPanelWidth}
                tabIndex={0}
                className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
                  isAIResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/30'
                }`}
                onMouseDown={handleAIResizeStart}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft')
                    Store.aiPanelWidth.value = Math.max(MIN_PANEL_WIDTH, aiPanelWidth - 20)
                  if (e.key === 'ArrowRight')
                    Store.aiPanelWidth.value = Math.min(MAX_PANEL_WIDTH, aiPanelWidth + 20)
                }}
              />
              <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {/* AI Chat module renders here via slot */}
                <Slot name="ai-panel" wrapInContainer={false} />
              </div>
            </aside>
          )}
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
