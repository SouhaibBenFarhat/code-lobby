import * as React from 'react'
import { cn } from '../utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Textarea: ForwardRefComponent<HTMLTextAreaElement, TextareaProps> = React.forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Apple-style textarea: subtle background, refined border, smooth focus transition
        'flex min-h-[80px] w-full rounded border border-border bg-surface px-3 py-2 text-sm transition-all duration-fast ease-theme placeholder:text-foreground-subtle hover:border-border hover:bg-surface-hover focus-visible:outline-none focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40 resize-y',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
