import * as React from 'react'
import { cn } from '../utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Label: ForwardRefComponent<HTMLLabelElement, LabelProps> = React.forwardRef<
  HTMLLabelElement,
  LabelProps
>(({ className, ...props }, ref) => {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Generic label component - htmlFor is passed via props
    <label
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Label.displayName = 'Label'

export { Label }
