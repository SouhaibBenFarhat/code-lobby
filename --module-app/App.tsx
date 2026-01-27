/**
 * @codelobby/app - App Shell
 *
 * Simplified version using @codelobby/data (TanStack Query only)
 */

import {
  useAIPanel,
  useIsAuthenticated,
  useNetworkPanel,
  useNetworkPanelHeight,
  usePRDetailPanel,
  useSelectedPRId,
  useSetAIPanel,
  useSetNetworkPanelHeight,
  useSetPRDetailPanel,
  useValidatePersistedToken,
  useViewMode
} from '@data'
import { Slot } from '@slot-system'
import { Button, Toaster, TooltipProvider } from '@ui-kit'
import { MousePointerClick, PanelRightClose } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { TokenInput } from './TokenInput'

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 9999
const DEFAULT_PANEL_WIDTH = 400
const DEFAULT_AI_PANEL_WIDTH = 380
const MIN_PANEL_HEIGHT = 80
const DEFAULT_NETWORK_PANEL_HEIGHT = 200

export function App(): React.JSX.Element {
  // Read data from TanStack Query
  const { isAuthenticated, isLoading: isAuthLoading } = useIsAuthenticated()
  const { data: viewMode = 'canvas' } = useViewMode()
  const { data: prDetailPanelData } = usePRDetailPanel()
  const { data: aiPanelData } = useAIPanel()
  const { data: selectedPRId } = useSelectedPRId()

  const prDetailOpen = prDetailPanelData?.isOpen ?? false
  const prDetailWidth = prDetailPanelData?.width ?? DEFAULT_PANEL_WIDTH
  const aiPanelOpen = aiPanelData?.isOpen ?? false
  const aiPanelWidth = aiPanelData?.width ?? DEFAULT_AI_PANEL_WIDTH

  // Network panel state
  const { data: networkPanelOpen } = useNetworkPanel()
  const { data: networkPanelHeight = DEFAULT_NETWORK_PANEL_HEIGHT } = useNetworkPanelHeight()

  // Mutations
  const setPRDetailPanel = useSetPRDetailPanel()
  const setAIPanel = useSetAIPanel()
  const setNetworkPanelHeight = useSetNetworkPanelHeight()
  const { mutate: validatePersistedToken } = useValidatePersistedToken()

  // On app startup, validate persisted token and restore user data
  useEffect(() => {
    validatePersistedToken()
  }, [validatePersistedToken])

  // Panel resize state
  const [isPRResizing, setIsPRResizing] = useState(false)
  const [isAIResizing, setIsAIResizing] = useState(false)
  const [isNetworkResizing, setIsNetworkResizing] = useState(false)

  const prPanelRef = useRef<HTMLElement>(null)
  const rightSidebarRef = useRef<HTMLElement>(null)
  const networkPanelRef = useRef<HTMLDivElement>(null)
  const prWidthRef = useRef(DEFAULT_PANEL_WIDTH)
  const aiWidthRef = useRef(DEFAULT_AI_PANEL_WIDTH)
  const networkHeightRef = useRef(DEFAULT_NETWORK_PANEL_HEIGHT)
  const prRafRef = useRef<number | null>(null)
  const aiRafRef = useRef<number | null>(null)
  const networkRafRef = useRef<number | null>(null)
  const prResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)
  const aiResizeStart = useRef<{ startX: number; startWidth: number } | null>(null)
  const networkResizeStart = useRef<{ startY: number; startHeight: number } | null>(null)

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
    }

    const handleMouseUp = () => {
      if (prRafRef.current) cancelAnimationFrame(prRafRef.current)
      if (aiRafRef.current) cancelAnimationFrame(aiRafRef.current)
      if (networkRafRef.current) cancelAnimationFrame(networkRafRef.current)

      if (isPRResizing) {
        setPRDetailPanel.mutate({ width: prWidthRef.current })
      }
      if (isAIResizing) {
        setAIPanel.mutate({ width: aiWidthRef.current })
      }
      if (isNetworkResizing) {
        setNetworkPanelHeight.mutate(networkHeightRef.current)
      }

      setIsPRResizing(false)
      setIsAIResizing(false)
      setIsNetworkResizing(false)
      prResizeStart.current = null
      aiResizeStart.current = null
      networkResizeStart.current = null
    }

    if (isPRResizing || isAIResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else if (isNetworkResizing) {
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
    isNetworkResizing,
    setPRDetailPanel,
    setAIPanel,
    setNetworkPanelHeight
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
          <Slot name="left-panel" className="flex-shrink-0" />

          <main className="flex-1 overflow-auto bg-muted/20">
            <Slot name="main" wrapInContainer={false} />
          </main>

          {viewMode === 'canvas' && prDetailOpen && (
            <aside
              ref={prPanelRef}
              className="border-l border-border overflow-hidden flex bg-background relative flex-shrink-0"
              style={{ width: prDetailWidth, minWidth: prDetailWidth, maxWidth: prDetailWidth }}
            >
              <button
                type="button"
                aria-label="Resize panel"
                className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 border-0 p-0 transition-colors ${isPRResizing ? 'bg-primary/50' : 'hover:bg-primary/50'}`}
                onMouseDown={handlePRResizeStart}
              />
              <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {selectedPRId ? (
                  <Slot name="pr-detail-panel" wrapInContainer={false} />
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
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
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                          <MousePointerClick className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No PR selected</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}

          {(aiPanelOpen || networkPanelOpen) && (
            <aside
              ref={rightSidebarRef}
              className="apple-panel overflow-hidden flex relative flex-shrink-0"
              style={{ width: aiPanelWidth, minWidth: aiPanelWidth, maxWidth: aiPanelWidth }}
            >
              <button
                type="button"
                aria-label="Resize panel"
                className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-20 border-0 p-0 transition-colors ${isAIResizing ? 'bg-primary/50' : 'hover:bg-primary/50'}`}
                onMouseDown={handleAIResizeStart}
              />
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {aiPanelOpen && (
                  <div
                    className={
                      networkPanelOpen ? 'flex-1 overflow-hidden' : 'h-full overflow-hidden'
                    }
                  >
                    <Slot name="ai-panel" wrapInContainer={false} />
                  </div>
                )}
                {networkPanelOpen && (
                  <>
                    {aiPanelOpen && (
                      <button
                        type="button"
                        aria-label="Resize network panel"
                        className={`h-1 w-full cursor-row-resize p-0 flex-shrink-0 transition-colors border-t border-border ${isNetworkResizing ? 'bg-primary/50' : 'hover:bg-primary/50'}`}
                        onMouseDown={handleNetworkResizeStart}
                      />
                    )}
                    <div
                      ref={networkPanelRef}
                      className="flex-shrink-0 overflow-hidden"
                      style={{ height: aiPanelOpen ? networkPanelHeight : '100%' }}
                    >
                      <Slot name="network-panel" wrapInContainer={false} />
                    </div>
                  </>
                )}
              </div>
            </aside>
          )}
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
