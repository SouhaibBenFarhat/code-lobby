/**
 * Alert - Displays a callout for important messages
 *
 * Based on shadcn/ui Alert component
 */

import * as React from 'react'
import { cn } from '../utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive'
}

const Alert: React.ForwardRefExoticComponent<AlertProps & React.RefAttributes<HTMLDivElement>> =
  React.forwardRef<HTMLDivElement, AlertProps>(
    ({ className, variant = 'default', ...props }, ref) => (
      <div
        ref={ref}
        role="alert"
        className={cn(
          'relative w-full rounded-lg border p-4',
          '[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
          '[&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7',
          variant === 'default' && 'bg-background text-foreground',
          variant === 'destructive' &&
            'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
          className
        )}
        {...props}
      />
    )
  )
Alert.displayName = 'Alert'

const AlertTitle: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLHeadingElement> & React.RefAttributes<HTMLParagraphElement>
> = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
)
AlertTitle.displayName = 'AlertTitle'

const AlertDescription: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLParagraphElement> & React.RefAttributes<HTMLParagraphElement>
> = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
)
AlertDescription.displayName = 'AlertDescription'

export { Alert, AlertDescription, AlertTitle }
export type { AlertProps }
