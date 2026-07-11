/**
 * GitHubStatusMenuItem
 *
 * Compact GitHub service-status row for the profile dropdown (AccountMenu).
 * Shows a colored dot + overall status label — or a short "N services affected"
 * summary when something is degraded — and opens githubstatus.com on click.
 *
 * Renders nothing until the status has loaded (or if the request errors), so it
 * never shows a broken/empty row in the menu.
 */

import { useGitHubStatus, useOpenExternal } from '@data'
import { cn, ListMenuItem, ListMenuSeparator } from '@ui-kit'
import { ExternalLink } from 'lucide-react'

const STATUS_URL = 'https://www.githubstatus.com'

const INDICATOR_META: Record<
  'none' | 'minor' | 'major' | 'critical',
  {
    label: string
    dotClass: string
  }
> = {
  none: { label: 'All Systems Operational', dotClass: 'bg-emerald-500' },
  minor: { label: 'Minor Service Outage', dotClass: 'bg-yellow-500' },
  major: { label: 'Major Service Outage', dotClass: 'bg-orange-500' },
  critical: { label: 'Critical Service Outage', dotClass: 'bg-red-500' }
}

export function GitHubStatusMenuItem(): React.JSX.Element | null {
  const { data, isError } = useGitHubStatus()
  const openExternal = useOpenExternal()

  if (isError || !data) return null

  const indicator = INDICATOR_META[data.status.indicator]
  const affected = data.components.filter((c) => c.status !== 'operational').length
  const description =
    affected > 0 ? `${affected} service${affected > 1 ? 's' : ''} affected` : indicator.label

  return (
    <>
      <ListMenuSeparator />
      <ListMenuItem
        icon={<span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', indicator.dotClass)} />}
        title="GitHub Status"
        description={description}
        trailing={<ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
        onClick={() => openExternal.mutate(STATUS_URL)}
      />
    </>
  )
}
