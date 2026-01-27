import * as React from 'react'
import { cn } from '../utils'

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Card: ForwardRefComponent<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // Apple-style card: larger radius, visible shadow for separation, clean border
        'rounded-[12px] border border-border bg-card text-card-foreground',
        'shadow-[0_2px_8px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.06)]',
        'dark:shadow-[0_2px_12px_rgba(0,0,0,0.4),0_1px_4px_rgba(0,0,0,0.3)]',
        'transition-shadow duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        'hover:shadow-[0_4px_16px_rgba(0,0,0,0.12),0_2px_6px_rgba(0,0,0,0.08)]',
        'dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.5),0_3px_8px_rgba(0,0,0,0.35)]',
        className
      )}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader: ForwardRefComponent<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle: ForwardRefComponent<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
> = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription: ForwardRefComponent<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
> = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent: ForwardRefComponent<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter: ForwardRefComponent<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-4 pt-0', className)} {...props} />
  )
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
