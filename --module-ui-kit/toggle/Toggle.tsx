import * as React from 'react'
import { cn } from '../utils'

type ToggleSize = 'default' | 'sm' | 'xs'

/** Get toggle container classes based on size */
function getToggleClasses(size: ToggleSize, checked: boolean, className?: string): string {
  const baseClasses =
    'relative inline-flex items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 cursor-pointer'

  const sizeClasses: Record<ToggleSize, string> = {
    default: 'h-6 w-11',
    sm: 'h-5 w-9',
    xs: 'h-4 w-7'
  }

  return cn(
    baseClasses,
    sizeClasses[size],
    checked ? 'bg-primary' : 'bg-interactive-active',
    className
  )
}

/** Get thumb classes based on size and checked state */
function getThumbClasses(size: ToggleSize, checked: boolean): string {
  const baseClasses = 'inline-block transform rounded-full bg-white shadow-sm transition-transform'

  const sizeClasses: Record<ToggleSize, string> = {
    default: 'h-5 w-5',
    sm: 'h-4 w-4',
    xs: 'h-3 w-3'
  }

  const translateClasses: Record<ToggleSize, Record<'checked' | 'unchecked', string>> = {
    default: { checked: 'translate-x-5', unchecked: 'translate-x-0.5' },
    sm: { checked: 'translate-x-4', unchecked: 'translate-x-0.5' },
    xs: { checked: 'translate-x-3', unchecked: 'translate-x-0.5' }
  }

  return cn(
    baseClasses,
    sizeClasses[size],
    translateClasses[size][checked ? 'checked' : 'unchecked']
  )
}

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  size?: ToggleSize
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

type ForwardRefComponent<T, P> = React.ForwardRefExoticComponent<P & React.RefAttributes<T>>

const Toggle: ForwardRefComponent<HTMLButtonElement, ToggleProps> = React.forwardRef<
  HTMLButtonElement,
  ToggleProps
>(({ className, size = 'default', checked = false, onCheckedChange, disabled, ...props }, ref) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={getToggleClasses(size, checked, className)}
      onClick={() => onCheckedChange?.(!checked)}
      ref={ref}
      {...props}
    >
      <span className={getThumbClasses(size, checked)} />
    </button>
  )
})
Toggle.displayName = 'Toggle'

export { Toggle }
