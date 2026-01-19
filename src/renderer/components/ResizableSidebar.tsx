import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

interface ResizableSidebarProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  defaultOpen?: boolean
}

export function ResizableSidebar({
  children,
  defaultWidth = 384,
  minWidth = 280,
  maxWidth = 600,
  defaultOpen = true
}: ResizableSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Track width during drag without React re-renders
  const currentWidthRef = useRef(defaultWidth)
  const rafRef = useRef<number | null>(null)

  const startResizing = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      currentWidthRef.current = width
    },
    [width]
  )

  const stopResizing = useCallback(() => {
    setIsResizing(false)
    // Sync final width to React state
    setWidth(currentWidthRef.current)
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !sidebarRef.current) return

      // Cancel previous frame if still pending
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }

      // Use requestAnimationFrame to batch DOM updates
      rafRef.current = requestAnimationFrame(() => {
        if (!sidebarRef.current) return

        const sidebarRect = sidebarRef.current.getBoundingClientRect()
        const newWidth = sidebarRect.right - e.clientX

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          // Update DOM directly - no React re-render!
          sidebarRef.current.style.width = `${newWidth}px`
          currentWidthRef.current = newWidth
        }
      })
    },
    [isResizing, minWidth, maxWidth]
  )

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
    }

    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [isResizing, resize, stopResizing])

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  return (
    <div className="relative flex">
      {/* Toggle button when closed */}
      {!isOpen && (
        <div className="flex items-start pt-4 px-2 border-l border-border bg-card/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(true)}
              >
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Open activity stream</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Sidebar */}
      {isOpen && (
        <aside
          ref={sidebarRef}
          className={cn(
            'relative flex flex-col border-l border-border overflow-hidden bg-card/30',
            isResizing && 'select-none'
          )}
          style={{
            width: `${width}px`,
            willChange: isResizing ? 'width' : 'auto'
          }}
        >
          {/* Resize handle */}
          <div
            role="slider"
            aria-orientation="horizontal"
            aria-label="Resize sidebar"
            aria-valuemin={minWidth}
            aria-valuemax={maxWidth}
            aria-valuenow={width}
            tabIndex={0}
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10',
              isResizing ? 'bg-primary' : 'hover:bg-primary/50'
            )}
            onMouseDown={startResizing}
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                setWidth((w) => Math.max(minWidth, w - 20))
              }
              if (e.key === 'ArrowRight') {
                setWidth((w) => Math.min(maxWidth, w + 20))
              }
            }}
          />

          {/* Close button */}
          <div className="absolute top-3 left-3 z-10">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsOpen(false)}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Close activity stream</TooltipContent>
            </Tooltip>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
        </aside>
      )}
    </div>
  )
}
