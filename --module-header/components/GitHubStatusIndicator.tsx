/**
 * GitHub Status Indicator
 *
 * Displays a small colored dot in the header reflecting the overall
 * GitHub status, with a tooltip showing per-component health for
 * the services CodeLobby depends on.
 */

import { type ComponentStatus, type GitHubStatusComponent, useGitHubStatus } from '@data'
import { cn, Separator, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, XCircle } from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_META: Record<ComponentStatus, { label: string; dotClass: string; textClass: string }> =
  {
    operational: {
      label: 'Operational',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-500'
    },
    degraded_performance: {
      label: 'Degraded',
      dotClass: 'bg-yellow-500',
      textClass: 'text-yellow-500'
    },
    partial_outage: {
      label: 'Partial Outage',
      dotClass: 'bg-orange-500',
      textClass: 'text-orange-500'
    },
    major_outage: {
      label: 'Major Outage',
      dotClass: 'bg-red-500',
      textClass: 'text-red-500'
    }
  }

const INDICATOR_META: Record<
  'none' | 'minor' | 'major' | 'critical',
  { label: string; dotClass: string; bgClass: string; borderClass: string }
> = {
  none: {
    label: 'All Systems Operational',
    dotClass: 'bg-emerald-500',
    bgClass: '',
    borderClass: ''
  },
  minor: {
    label: 'Minor Service Outage',
    dotClass: 'bg-yellow-500',
    bgClass: 'bg-warning-subtle',
    borderClass: 'border border-warning-border'
  },
  major: {
    label: 'Major Service Outage',
    dotClass: 'bg-orange-500',
    bgClass: 'bg-warning-subtle',
    borderClass: 'border border-warning-border'
  },
  critical: {
    label: 'Critical Service Outage',
    dotClass: 'bg-red-500',
    bgClass: 'bg-destructive-subtle',
    borderClass: 'border border-destructive-border'
  }
}

function StatusIcon({ status }: { status: ComponentStatus }) {
  switch (status) {
    case 'operational':
      return <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
    case 'degraded_performance':
      return <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0" />
    case 'partial_outage':
      return <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
    case 'major_outage':
      return <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
  }
}

function ComponentRow({ component }: { component: GitHubStatusComponent }) {
  const meta = STATUS_META[component.status]
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <StatusIcon status={component.status} />
        <span className="text-[11px]">{component.name}</span>
      </div>
      <span className={cn('text-[10px] font-medium', meta.textClass)}>{meta.label}</span>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GitHubStatusIndicator(): JSX.Element | null {
  const { data, isLoading, isError } = useGitHubStatus()

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 no-drag px-1.5 py-0.5">
        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Status</span>
      </div>
    )
  }

  if (isError || !data) {
    return null
  }

  const indicator = INDICATOR_META[data.status.indicator]
  const hasIncidents = data.incidents.length > 0
  const nonOperational = data.components.filter((c) => c.status !== 'operational')

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="https://www.githubstatus.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1.5 no-drag px-1.5 py-0.5 rounded-md transition-colors cursor-pointer hover:bg-interactive-hover',
              data.status.indicator !== 'none' && indicator.bgClass,
              data.status.indicator !== 'none' && indicator.borderClass
            )}
          >
            <span className={cn('w-2 h-2 rounded-full flex-shrink-0', indicator.dotClass)} />
            <span className="text-[10px] text-muted-foreground">GitHub</span>
          </a>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[280px]" sideOffset={8}>
          <div className="space-y-2">
            {/* Overall status */}
            <div className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', indicator.dotClass)} />
              <span className="font-medium">{indicator.label}</span>
            </div>

            <Separator />

            {/* Per-component breakdown */}
            <div className="space-y-1.5">
              {data.components.map((component) => (
                <ComponentRow key={component.id} component={component} />
              ))}
            </div>

            {/* Active incidents */}
            {hasIncidents && (
              <>
                <Separator />
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-orange-500">
                    Active Incidents ({data.incidents.length})
                  </p>
                  {data.incidents.slice(0, 3).map((incident) => (
                    <p
                      key={incident.id}
                      className="text-[10px] text-muted-foreground leading-tight"
                    >
                      {incident.name}
                    </p>
                  ))}
                </div>
              </>
            )}

            {/* Non-operational summary */}
            {nonOperational.length > 0 && !hasIncidents && (
              <>
                <Separator />
                <p className="text-[10px] text-muted-foreground">
                  {nonOperational.length} service{nonOperational.length > 1 ? 's' : ''} affected
                </p>
              </>
            )}

            <Separator />
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ExternalLink className="w-2.5 h-2.5" />
              <span>githubstatus.com</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </>
  )
}
