import * as React from 'react'
import { cn } from '../utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps): React.JSX.Element {
  return (
    <div className={cn('animate-skeleton rounded-md bg-border-subtle', className)} {...props} />
  )
}

export { Skeleton }
