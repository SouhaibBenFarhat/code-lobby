/**
 * Timeline Component
 *
 * A beautiful timeline display for logs and events
 */

import * as React from 'react'
import { cn } from './utils'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE ROOT
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const Timeline: React.ForwardRefExoticComponent<
  TimelineProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TimelineProps>(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn('relative', className)} {...props}>
      {children}
    </div>
  )
})
Timeline.displayName = 'Timeline'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE ITEM
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TimelineItem: React.ForwardRefExoticComponent<
  TimelineItemProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('relative pb-1.5 pl-5 last:pb-0', className)} {...props}>
        {children}
      </div>
    )
  }
)
TimelineItem.displayName = 'TimelineItem'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE CONNECTOR (the vertical line)
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineConnectorProps extends React.HTMLAttributes<HTMLDivElement> {
  isLast?: boolean
}

const TimelineConnector: React.ForwardRefExoticComponent<
  TimelineConnectorProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TimelineConnectorProps>(
  ({ className, isLast, ...props }, ref) => {
    if (isLast) return null
    return (
      <div
        ref={ref}
        className={cn('absolute left-[7px] top-4 bottom-0 w-px bg-border/50', className)}
        {...props}
      />
    )
  }
)
TimelineConnector.displayName = 'TimelineConnector'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE DOT
// ═══════════════════════════════════════════════════════════════════════════

type TimelineDotVariant = 'default' | 'error' | 'warning' | 'success' | 'info' | 'debug'

interface TimelineDotProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: TimelineDotVariant
  icon?: React.ReactNode
  pulse?: boolean
}

const dotVariants: Record<TimelineDotVariant, string> = {
  default: 'bg-muted-foreground',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  success: 'bg-green-500',
  info: 'bg-blue-500',
  debug: 'bg-gray-500'
}

const TimelineDot: React.ForwardRefExoticComponent<
  TimelineDotProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TimelineDotProps>(
  ({ className, variant = 'default', icon, pulse, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'absolute left-0 top-0.5 z-10 flex h-4 w-4 items-center justify-center rounded-full',
          dotVariants[variant],
          pulse && 'animate-pulse',
          className
        )}
        {...props}
      >
        {icon && <span className="text-white text-[10px]">{icon}</span>}
      </div>
    )
  }
)
TimelineDot.displayName = 'TimelineDot'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE HEADER
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TimelineHeader: React.ForwardRefExoticComponent<
  TimelineHeaderProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TimelineHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('flex items-center gap-2 text-sm', className)} {...props}>
        {children}
      </div>
    )
  }
)
TimelineHeader.displayName = 'TimelineHeader'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE TIME
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineTimeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

const TimelineTime: React.ForwardRefExoticComponent<
  TimelineTimeProps & React.RefAttributes<HTMLSpanElement>
> = React.forwardRef<HTMLSpanElement, TimelineTimeProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn('text-xs text-muted-foreground tabular-nums', className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)
TimelineTime.displayName = 'TimelineTime'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE TITLE
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
}

const TimelineTitle: React.ForwardRefExoticComponent<
  TimelineTitleProps & React.RefAttributes<HTMLHeadingElement>
> = React.forwardRef<HTMLHeadingElement, TimelineTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h4 ref={ref} className={cn('font-medium leading-none', className)} {...props}>
        {children}
      </h4>
    )
  }
)
TimelineTitle.displayName = 'TimelineTitle'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE DESCRIPTION
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const TimelineDescription: React.ForwardRefExoticComponent<
  TimelineDescriptionProps & React.RefAttributes<HTMLParagraphElement>
> = React.forwardRef<HTMLParagraphElement, TimelineDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={cn('text-sm text-muted-foreground mt-1', className)} {...props}>
        {children}
      </p>
    )
  }
)
TimelineDescription.displayName = 'TimelineDescription'

// ═══════════════════════════════════════════════════════════════════════════
// TIMELINE CONTENT
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const TimelineContent: React.ForwardRefExoticComponent<
  TimelineContentProps & React.RefAttributes<HTMLDivElement>
> = React.forwardRef<HTMLDivElement, TimelineContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('pt-0.5', className)} {...props}>
        {children}
      </div>
    )
  }
)
TimelineContent.displayName = 'TimelineContent'

export {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineDot,
  TimelineHeader,
  TimelineTime,
  TimelineTitle,
  TimelineDescription,
  TimelineContent
}
