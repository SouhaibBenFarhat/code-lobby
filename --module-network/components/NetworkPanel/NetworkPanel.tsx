/**
 * NetworkPanel Component
 *
 * Main container component that displays a list of API calls with their costs,
 * status, and timing information. Uses TanStack Query for state.
 */

import { useClearNetworkRequests, useNetworkRequests } from '@data'
import { useMemo, useState } from 'react'
import { calculateTotals, filterRequests } from '../../utils'
import { ListFooter } from '../ListFooter'
import { NetworkPanelHeader } from '../NetworkPanelHeader'
import { NetworkRequestList } from '../NetworkRequestList'
import { NetworkSearchInput } from '../NetworkSearchInput'
import { NetworkStats } from '../NetworkStats'

export interface NetworkPanelProps {
  /** Callback when close button is clicked */
  onClose: () => void
}

export function NetworkPanel({ onClose }: NetworkPanelProps): React.JSX.Element {
  const { data: requests = [] } = useNetworkRequests()
  const clearRequests = useClearNetworkRequests()
  const [searchQuery, setSearchQuery] = useState('')

  // Filter requests by URL search
  const filteredRequests = useMemo(
    () => filterRequests(requests, searchQuery),
    [requests, searchQuery]
  )

  // Calculate totals from filtered requests
  const totals = useMemo(() => calculateTotals(filteredRequests), [filteredRequests])

  const handleClearAll = (): void => {
    clearRequests.mutate()
  }

  const isFiltered = Boolean(searchQuery.trim())

  return (
    <div className="flex flex-col h-full" data-testid="network-panel">
      {/* Header with title, total cost, and action buttons */}
      <NetworkPanelHeader
        totalCost={totals.totalCost}
        showClearButton={requests.length > 0}
        onClear={handleClearAll}
        onClose={onClose}
      />

      {/* Search input for filtering */}
      <NetworkSearchInput value={searchQuery} onChange={setSearchQuery} />

      {/* Content area with stats and request list */}
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden border-t border-border-muted">
        {/* Summary stats */}
        {requests.length > 0 && (
          <NetworkStats
            total={totals.total}
            totalUnfiltered={requests.length}
            pendingCount={totals.pendingCount}
            errorCount={totals.errorCount}
            isFiltered={isFiltered}
          />
        )}

        {/* Request list with empty states */}
        <NetworkRequestList requests={requests} filteredRequests={filteredRequests} />
      </div>

      {/* Footer to mark end of panel */}
      {filteredRequests.length > 0 && <ListFooter count={filteredRequests.length} />}
    </div>
  )
}
