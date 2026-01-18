import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Apple-style input: subtle background, refined border, smooth focus transition
          'flex h-9 w-full rounded-[8px] border border-border bg-secondary/50 px-3 py-2 text-sm transition-all duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 hover:border-border/80 hover:bg-secondary/70 focus-visible:outline-none focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
