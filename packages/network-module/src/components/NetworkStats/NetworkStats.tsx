/**
 * NetworkStats Component
 *
 * Displays summary statistics for network requests.
 * Shows total count, pending count, and error count.
 */

import { Loader2 } from 'lucide-react'

export interface NetworkStatsProps {
  /** Total number of requests (filtered) */
  total: number
  /** Total number of requests (unfiltered) - used when filtering is active */
  totalUnfiltered?: number
  /** Number of pending requests */
  pendingCount: number
  /** Number of failed requests */
  errorCount: number
  /** Whether a search filter is active */
  isFiltered?: boolean
}

export function NetworkStats({
  total,
  totalUnfiltered,
  pendingCount,
  errorCount,
  isFiltered = false
}: NetworkStatsProps): React.JSX.Element {
  return (
    <div
      className="px-3 py-1 border-b border-border/50 bg-muted/10 flex-shrink-0"
      data-testid="network-stats"
    >
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span data-testid="request-count">
          {isFiltered && totalUnfiltered !== undefined ? `${total} of ${totalUnfiltered}` : total}{' '}
          request{total !== 1 ? 's' : ''}
        </span>
        {pendingCount > 0 && (
          <span className="flex items-center gap-0.5 text-blue-500" data-testid="pending-count">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            {pendingCount}
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-destructive" data-testid="error-count">
            {errorCount} failed
          </span>
        )}
      </div>
    </div>
  )
}
