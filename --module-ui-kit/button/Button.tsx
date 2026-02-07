import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../utils'

/** Button variant function with explicit typing for isolatedDeclarations */
const buttonVariants: (props?: Record<string, unknown>) => string = cva(
  // Apple-style base: smooth transitions, subtle active state, refined focus ring
  'inline-flex items-center justify-center whitespace-nowrap rounded text-sm font-medium transition-all duration-fast ease-theme focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97]',
  {
    variants: {
      variant: {
        // Primary - Apple blue filled button
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md',
        // Destructive - Red, used sparingly
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        // Outline - Secondary actions, subtle border
        outline:
          'border border-border bg-background hover:bg-interactive-hover hover:border-border',
        // Secondary - Subtle gray background
        secondary: 'bg-secondary text-secondary-foreground hover:bg-interactive-hover',
        // Ghost - Minimal, just hover state (like Apple's toolbar buttons)
        ghost: 'hover:bg-interactive-hover rounded-sm',
        // Link - Text only with underline
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
        // Unstyled - No visual styling, just semantic button with focus ring
        // Use for custom clickable areas (collapsible headers, tree items, tabs)
        unstyled:
          'justify-start rounded-none font-normal text-inherit active:scale-100 focus-visible:ring-1 focus-visible:ring-offset-0'
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs rounded-sm',
        lg: 'h-11 px-6 text-base rounded-lg',
        icon: 'h-9 w-9 rounded',
        'icon-sm': 'h-7 w-7 rounded-sm',
        'icon-xs': 'h-5 w-5 rounded-xs',
        // No size constraints - for unstyled variant
        none: ''
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Button: ForwardRefComponent<HTMLButtonElement, ButtonProps> = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, variant, size, asChild = false, disabled, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'

  // When disabled, wrap in a span that receives hover events for tooltips
  // (the button itself has pointer-events: none when disabled)
  if (disabled) {
    // Extract event handlers with proper typing for the span wrapper
    type SpanMouseEvent = React.MouseEventHandler<HTMLSpanElement>
    type SpanPointerEvent = React.PointerEventHandler<HTMLSpanElement>
    type SpanFocusEvent = React.FocusEventHandler<HTMLSpanElement>

    const {
      // Extract all pointer/mouse/focus events for the wrapper
      onMouseEnter,
      onMouseLeave,
      onMouseMove,
      onMouseOver,
      onMouseOut,
      onPointerEnter,
      onPointerLeave,
      onPointerMove,
      onPointerOver,
      onPointerOut,
      onFocus,
      onBlur,
      // Keep the rest for the button
      ...buttonProps
    } = props

    // Check if className contains w-full to apply it to the wrapper too
    const isFullWidth = typeof className === 'string' && className.includes('w-full')

    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: Wrapper only catches hover events for tooltip on disabled button
      <span
        className={cn('inline-flex cursor-not-allowed', isFullWidth && 'w-full')}
        onMouseEnter={onMouseEnter as SpanMouseEvent | undefined}
        onMouseLeave={onMouseLeave as SpanMouseEvent | undefined}
        onMouseMove={onMouseMove as SpanMouseEvent | undefined}
        onMouseOver={onMouseOver as SpanMouseEvent | undefined}
        onMouseOut={onMouseOut as SpanMouseEvent | undefined}
        onPointerEnter={onPointerEnter as SpanPointerEvent | undefined}
        onPointerLeave={onPointerLeave as SpanPointerEvent | undefined}
        onPointerMove={onPointerMove as SpanPointerEvent | undefined}
        onPointerOver={onPointerOver as SpanPointerEvent | undefined}
        onPointerOut={onPointerOut as SpanPointerEvent | undefined}
        onFocus={onFocus as SpanFocusEvent | undefined}
        onBlur={onBlur as SpanFocusEvent | undefined}
      >
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled as boolean}
          {...buttonProps}
        />
      </span>
    )
  }

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled as boolean | undefined}
      {...props}
    />
  )
})
Button.displayName = 'Button'

// Note: buttonVariants type is inferred by cva
export { Button, buttonVariants }
