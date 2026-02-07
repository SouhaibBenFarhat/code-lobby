import * as React from 'react'
import { cn } from '../utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Input: ForwardRefComponent<HTMLInputElement, InputProps> = React.forwardRef<
  HTMLInputElement,
  InputProps
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // Apple-style input: subtle background, refined border, smooth focus transition
        'flex h-9 w-full rounded border border-border bg-surface px-3 py-2 text-sm transition-all duration-fast ease-theme file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-foreground-subtle hover:border-border hover:bg-surface-hover focus-visible:outline-none focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
