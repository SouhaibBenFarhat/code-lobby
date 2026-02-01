/**
 * FloatingWindow - A draggable and resizable floating panel component.
 *
 * Uses react-rnd for drag/resize functionality.
 * Uses ViewHeader for consistent header styling.
 */

import { Maximize2, Minimize2, Minus, X } from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
import { Button } from '../button'
import { cn } from '../utils'
import { ViewHeader } from '../view-header'

export interface FloatingWindowProps {
  /** Window title displayed in the title bar */
  title: string
  /** Icon to show before the title */
  icon?: React.ReactNode
  /** Initial position {x, y} */
  defaultPosition?: { x: number; y: number }
  /** Initial size {width, height} */
  defaultSize?: { width: number; height: number }
  /** Minimum width */
  minWidth?: number
  /** Minimum height */
  minHeight?: number
  /** Maximum width */
  maxWidth?: number
  /** Maximum height */
  maxHeight?: number
  /** Called when close button is clicked */
  onClose: () => void
  /** Called when minimize button is clicked */
  onMinimize?: () => void
  /** Whether the window is minimized */
  isMinimized?: boolean
  /** Whether the window is maximized */
  isMaximized?: boolean
  /** Called when maximize/restore button is clicked */
  onMaximize?: () => void
  /** Z-index for stacking */
  zIndex?: number
  /** Children content */
  children: React.ReactNode
  /** Additional className for the window container */
  className?: string
  /** Called when window is focused (clicked) */
  onFocus?: () => void
  /** Whether this window is currently focused */
  isFocused?: boolean
  /** Bounds element selector or 'parent' */
  bounds?: string | Element
}

interface WindowPosition {
  x: number
  y: number
}

interface WindowSize {
  width: number
  height: number
}

export function FloatingWindow({
  title,
  icon,
  defaultPosition = { x: 100, y: 100 },
  defaultSize = { width: 800, height: 600 },
  minWidth = 400,
  minHeight = 300,
  maxWidth,
  maxHeight,
  onClose,
  onMinimize,
  isMinimized = false,
  isMaximized = false,
  onMaximize,
  zIndex = 50,
  children,
  className,
  onFocus: _onFocus,
  isFocused = true,
  bounds = 'parent'
}: FloatingWindowProps): React.JSX.Element {
  const rndRef = useRef<Rnd>(null)
  const [position, setPosition] = useState<WindowPosition>(defaultPosition)
  const [size, setSize] = useState<WindowSize>(defaultSize)
  const [preMaximizeState, setPreMaximizeState] = useState<{
    position: WindowPosition
    size: WindowSize
  } | null>(null)

  const handleDragStop = useCallback((_e: unknown, data: { x: number; y: number }) => {
    setPosition({ x: data.x, y: data.y })
  }, [])

  const handleResizeStop = useCallback(
    (
      _e: unknown,
      _direction: unknown,
      ref: HTMLElement,
      _delta: unknown,
      pos: { x: number; y: number }
    ) => {
      setSize({
        width: ref.offsetWidth,
        height: ref.offsetHeight
      })
      setPosition(pos)
    },
    []
  )

  const handleMaximizeToggle = useCallback(() => {
    if (isMaximized && preMaximizeState) {
      // Restore previous state
      setPosition(preMaximizeState.position)
      setSize(preMaximizeState.size)
      setPreMaximizeState(null)
    } else {
      // Save current state and maximize
      setPreMaximizeState({ position, size })
      setPosition({ x: 0, y: 0 })
      // Get parent bounds for maximizing
      const parent = rndRef.current?.resizableElement.current?.parentElement
      if (parent) {
        setSize({
          width: parent.clientWidth,
          height: parent.clientHeight
        })
      }
    }
    onMaximize?.()
  }, [isMaximized, preMaximizeState, position, size, onMaximize])

  // When minimized, render just a title bar
  if (isMinimized) {
    return (
      <Rnd
        ref={rndRef}
        position={position}
        size={{ width: 280, height: 40 }}
        minWidth={200}
        minHeight={40}
        maxHeight={40}
        bounds={bounds}
        onDragStop={handleDragStop}
        dragHandleClassName="floating-window-title-bar"
        enableResizing={false}
        style={{ zIndex }}
      >
        <div
          className={cn(
            'floating-window-minimized',
            'flex flex-col rounded-lg overflow-hidden shadow-xl',
            'bg-card/95 backdrop-blur-xl border border-border/50',
            isFocused ? 'ring-1 ring-primary/30' : 'opacity-90',
            className
          )}
        >
          <ViewHeader
            size="sm"
            elevated={false}
            icon={icon}
            title={title}
            className="floating-window-title-bar cursor-move select-none rounded-lg"
            leftContent={
              <WindowControls
                onClose={onClose}
                onMinimize={onMinimize}
                onMaximize={onMaximize ? handleMaximizeToggle : undefined}
                isMaximized={isMaximized}
                isMinimized={isMinimized}
              />
            }
            centerContent={
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {icon}
                <span className="truncate">{title}</span>
              </div>
            }
          />
        </div>
      </Rnd>
    )
  }

  return (
    <Rnd
      ref={rndRef}
      position={isMaximized ? { x: 0, y: 0 } : position}
      size={isMaximized ? { width: '100%', height: '100%' } : size}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      bounds={bounds}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      dragHandleClassName="floating-window-title-bar"
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
      style={{ zIndex }}
      resizeHandleStyles={{
        bottom: { cursor: 'ns-resize' },
        right: { cursor: 'ew-resize' },
        bottomRight: { cursor: 'nwse-resize' },
        bottomLeft: { cursor: 'nesw-resize' },
        top: { cursor: 'ns-resize' },
        left: { cursor: 'ew-resize' },
        topRight: { cursor: 'nesw-resize' },
        topLeft: { cursor: 'nwse-resize' }
      }}
    >
      <div
        className={cn(
          'floating-window',
          'flex flex-col h-full rounded-lg overflow-hidden shadow-2xl',
          'bg-card/95 backdrop-blur-xl border border-border/50',
          isFocused ? 'ring-1 ring-primary/30' : 'opacity-95',
          className
        )}
      >
        {/* Title bar using ViewHeader */}
        <ViewHeader
          size="sm"
          elevated={false}
          icon={icon}
          title={title}
          className="floating-window-title-bar cursor-move select-none"
          leftContent={
            <WindowControls
              onClose={onClose}
              onMinimize={onMinimize}
              onMaximize={onMaximize ? handleMaximizeToggle : undefined}
              isMaximized={isMaximized}
              isMinimized={isMinimized}
            />
          }
          centerContent={
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              {icon}
              <span className="truncate">{title}</span>
            </div>
          }
        />

        {/* Content area */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </Rnd>
  )
}

/** Window control buttons (close, minimize, maximize) */
function WindowControls({
  onClose,
  onMinimize,
  onMaximize,
  isMaximized,
  isMinimized
}: {
  onClose: () => void
  onMinimize?: () => void
  onMaximize?: () => void
  isMaximized?: boolean
  isMinimized?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {/* Close button - red */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="w-3 h-3 p-0 rounded-full bg-red-500 hover:bg-red-600 text-red-900 hover:text-red-100 transition-colors group"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </Button>

      {/* Minimize button - yellow */}
      {onMinimize && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-3 h-3 p-0 rounded-full bg-yellow-500 hover:bg-yellow-600 text-yellow-900 hover:text-yellow-100 transition-colors group"
          onClick={(e) => {
            e.stopPropagation()
            onMinimize()
          }}
        >
          <Minus className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      )}

      {/* Maximize button - green */}
      {onMaximize && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="w-3 h-3 p-0 rounded-full bg-green-500 hover:bg-green-600 text-green-900 hover:text-green-100 transition-colors group"
          onClick={(e) => {
            e.stopPropagation()
            onMaximize()
          }}
        >
          {isMaximized || isMinimized ? (
            <Minimize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Maximize2 className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </Button>
      )}
    </div>
  )
}
