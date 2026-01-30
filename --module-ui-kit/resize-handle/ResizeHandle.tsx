import * as React from 'react'
import { cn } from '../utils'

export interface ResizeHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Direction of resize - 'horizontal' for left/right, 'vertical' for up/down */
  direction: 'horizontal' | 'vertical'
  /** Whether the handle is currently being dragged */
  isResizing?: boolean
  /** Position for absolute positioning (only for horizontal handles) */
  position?: 'left' | 'right'
}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

/**
 * ResizeHandle - A reusable resize handle for resizable panels.
 *
 * @example
 * // Horizontal resize (left/right panels)
 * <ResizeHandle
 *   direction="horizontal"
 *   isResizing={isResizing}
 *   onMouseDown={handleResizeStart}
 * />
 *
 * @example
 * // Vertical resize (top/bottom panels)
 * <ResizeHandle
 *   direction="vertical"
 *   isResizing={isResizing}
 *   onMouseDown={handleResizeStart}
 * />
 *
 * @example
 * // Absolute positioned (inside a panel)
 * <ResizeHandle
 *   direction="horizontal"
 *   position="left"
 *   isResizing={isResizing}
 *   onMouseDown={handleResizeStart}
 * />
 */
const ResizeHandle: ForwardRefComponent<HTMLButtonElement, ResizeHandleProps> = React.forwardRef<
  HTMLButtonElement,
  ResizeHandleProps
>(({ direction, isResizing = false, position, className, ...props }, ref) => {
  const isHorizontal = direction === 'horizontal'

  // Base styles shared by all handles
  const baseStyles = 'border-0 p-0 flex-shrink-0 transition-colors bg-transparent'

  // Active/hover styles
  const interactionStyles = isResizing ? 'bg-primary/50' : 'hover:bg-primary/50'

  // Direction-specific styles
  const directionStyles = isHorizontal
    ? 'w-1 cursor-col-resize' // Thin vertical bar for horizontal resize
    : 'h-1 w-full cursor-row-resize border-t border-border' // Thin horizontal bar with top border

  // Position styles (for absolute positioning inside panels)
  const positionStyles = position
    ? cn('absolute top-0 bottom-0 z-20', position === 'left' ? 'left-0' : 'right-0')
    : ''

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Resize ${direction === 'horizontal' ? 'panel width' : 'panel height'}`}
      className={cn(baseStyles, interactionStyles, directionStyles, positionStyles, className)}
      {...props}
    />
  )
})

ResizeHandle.displayName = 'ResizeHandle'

export { ResizeHandle }
