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
  // The element is 1px wide/tall (the visible divider line).
  // A ::before pseudo-element extends the hit area to 8px so users
  // don't have to aim at a single pixel — the hover highlight still
  // only appears on the 1px line itself.
  const baseStyles = cn(
    'border-0 p-0 flex-shrink-0 relative transition-colors',
    'before:content-[""] before:absolute before:z-10'
  )

  const directionStyles = isHorizontal
    ? cn(
        'w-px cursor-col-resize bg-border',
        // Invisible hit area: 8px wide strip centered on the 1px line
        'before:top-0 before:bottom-0 before:-left-[4px] before:w-[9px]',
        isResizing ? 'bg-primary' : 'hover:bg-primary'
      )
    : cn(
        'h-px w-full cursor-row-resize bg-border',
        // Invisible hit area: 8px tall strip centered on the 1px line
        'before:left-0 before:right-0 before:-top-[4px] before:h-[9px]',
        isResizing ? 'bg-primary' : 'hover:bg-primary'
      )

  // Position styles (for absolute positioning inside panels)
  const positionStyles = position
    ? cn('absolute top-0 bottom-0 z-20', position === 'left' ? 'left-0' : 'right-0')
    : ''

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Resize ${direction === 'horizontal' ? 'panel width' : 'panel height'}`}
      className={cn(baseStyles, directionStyles, positionStyles, className)}
      {...props}
    />
  )
})

ResizeHandle.displayName = 'ResizeHandle'

export { ResizeHandle }
