import * as React from 'react'
import { cn } from '../utils'

export interface ResizeHandleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Direction of resize - 'horizontal' for left/right, 'vertical' for up/down */
  direction: 'horizontal' | 'vertical'
  /** Whether the handle is currently being dragged */
  isResizing?: boolean
}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

/**
 * ResizeHandle - A reusable resize handle for resizable panels.
 *
 * Renders a transparent, easy-to-grab hit area with a subtle rounded grip pill
 * in the centre — no hard divider line. The grip is faint at rest, strengthens
 * on hover, and is most prominent while dragging.
 *
 * The element itself stays 1px in flow (so it never widens the gutter); a wider
 * transparent `::before` provides the pointer target. Always render it as a flex
 * sibling in the gutter between two panels — never inside an `overflow-hidden`
 * panel, which would clip the hit area.
 *
 * @example
 * // Left/right (width) resize
 * <ResizeHandle direction="horizontal" isResizing={isResizing} onMouseDown={handleResizeStart} />
 *
 * @example
 * // Top/bottom (height) resize
 * <ResizeHandle direction="vertical" isResizing={isResizing} onMouseDown={handleResizeStart} />
 */
const ResizeHandle: ForwardRefComponent<HTMLButtonElement, ResizeHandleProps> = React.forwardRef<
  HTMLButtonElement,
  ResizeHandleProps
>(({ direction, isResizing = false, className, ...props }, ref) => {
  const isHorizontal = direction === 'horizontal'

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Resize ${isHorizontal ? 'panel width' : 'panel height'}`}
      className={cn(
        // z-20 keeps the hover grip painted above both (flush) panel edges.
        'group relative z-20 flex flex-shrink-0 items-center justify-center border-0 bg-transparent p-0',
        // Transparent hit target so users don't have to aim at the 1px seam.
        'before:absolute before:z-10 before:content-[""]',
        isHorizontal
          ? 'w-px cursor-col-resize self-stretch before:inset-y-0 before:-left-[7px] before:w-[15px]'
          : 'h-px w-full cursor-row-resize before:inset-x-0 before:-top-[7px] before:h-[15px]',
        className
      )}
      {...props}
    >
      {/* Rounded grip — invisible at rest, fades in on hover of the seam, prominent while dragging */}
      <span
        className={cn(
          'pointer-events-none shrink-0 rounded-full transition-all duration-150',
          isResizing
            ? isHorizontal
              ? 'w-1.5 h-14 bg-foreground-muted opacity-100'
              : 'h-1.5 w-14 bg-foreground-muted opacity-100'
            : isHorizontal
              ? 'w-1.5 h-11 bg-foreground-subtle opacity-0 group-hover:opacity-100'
              : 'h-1.5 w-11 bg-foreground-subtle opacity-0 group-hover:opacity-100'
        )}
      />
    </button>
  )
})

ResizeHandle.displayName = 'ResizeHandle'

export { ResizeHandle }
