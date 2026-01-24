/**
 * Sheet Component (Shadcn-style Sliding Sidebar/Drawer)
 *
 * A slide-out panel that can be triggered from any side of the screen.
 * Uses Radix Dialog primitives for accessibility.
 *
 * Supports modal={false} for non-blocking panels that allow interaction
 * with the rest of the UI while open.
 */

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import * as React from 'react'

import { cn } from '../utils'

// Sheet with modal prop support
interface SheetProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Root> {
  modal?: boolean
}

const Sheet = ({ modal = true, ...props }: SheetProps) => (
  <DialogPrimitive.Root modal={modal} {...props} />
)

const SheetTrigger = DialogPrimitive.Trigger

const SheetClose = DialogPrimitive.Close

const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    className={cn(
      'fixed inset-x-0 top-14 bottom-0 z-50 bg-black/50',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const sheetVariants = cva('fixed z-50 gap-4 bg-background p-6 shadow-xl border-border', {
  variants: {
    side: {
      top: 'inset-x-0 top-14 border-b data-[state=open]:animate-slide-in-from-top data-[state=closed]:animate-slide-out-to-top',
      bottom:
        'inset-x-0 bottom-0 border-t data-[state=open]:animate-slide-in-from-bottom data-[state=closed]:animate-slide-out-to-bottom',
      left: 'top-14 bottom-0 left-0 w-3/4 border-r data-[state=open]:animate-slide-in-from-left data-[state=closed]:animate-slide-out-to-left sm:max-w-sm',
      right:
        'top-14 bottom-0 right-0 w-3/4 border-l data-[state=open]:animate-slide-in-from-right data-[state=closed]:animate-slide-out-to-right sm:max-w-sm'
    }
  },
  defaultVariants: {
    side: 'right'
  }
})

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** When false, no overlay is shown and clicking outside doesn't close the sheet */
  showOverlay?: boolean
  /** When true, hides the default close button (use your own in the header) */
  hideCloseButton?: boolean
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = 'right',
      className,
      children,
      showOverlay = true,
      hideCloseButton = false,
      onInteractOutside,
      ...props
    },
    ref
  ) => (
    <SheetPortal>
      {showOverlay && <SheetOverlay />}
      <DialogPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        onInteractOutside={showOverlay ? onInteractOutside : (e) => e.preventDefault()}
        {...props}
      >
        {!hideCloseButton && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
        {children}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
)
SheetContent.displayName = DialogPrimitive.Content.displayName

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
))
SheetTitle.displayName = DialogPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
SheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription
}
