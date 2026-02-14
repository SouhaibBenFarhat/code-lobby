import * as React from 'react'
import { cn } from '../utils'

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value from 0 to 100 */
  value?: number
  /** Whether to show indeterminate animation when value is not provided */
  indeterminate?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

const sizeClasses = {
  sm: 'h-px',
  md: 'h-2',
  lg: 'h-3'
}

const variantClasses = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive'
}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Progress: ForwardRefComponent<HTMLDivElement, ProgressProps> = React.forwardRef<
  HTMLDivElement,
  ProgressProps
>(
  (
    { className, value = 0, indeterminate = false, size = 'md', variant = 'default', ...props },
    ref
  ) => {
    const clampedValue = Math.min(100, Math.max(0, value))

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clampedValue}
        className={cn(
          'relative w-full overflow-hidden rounded-full bg-surface',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out rounded-full',
            variantClasses[variant],
            indeterminate && 'animate-progress-indeterminate'
          )}
          style={{
            width: indeterminate ? '40%' : `${clampedValue}%`
          }}
        />
      </div>
    )
  }
)
Progress.displayName = 'Progress'

export { Progress }
