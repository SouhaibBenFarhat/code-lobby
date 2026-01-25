/**
 * NetworkRequestList Component
 *
 * Displays a scrollable list of network requests with empty states.
 * Auto-scrolls to show newest items when they arrive.
 */

import type { NetworkRequest } from '@codelobby/data'
import { ScrollArea } from '@codelobby/ui-kit'
import { Globe, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { NetworkRequestItem } from '../NetworkRequestItem'

export interface NetworkRequestListProps {
  /** All network requests (unfiltered) - used for empty state detection */
  requests: NetworkRequest[]
  /** Filtered network requests to display */
  filteredRequests: NetworkRequest[]
}

/**
 * Empty state component for when there are no requests
 */
function EmptyState(): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-[200px] text-center px-4"
      data-testid="empty-state"
    >
      <Globe className="w-8 h-8 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">No requests yet</p>
    </div>
  )
}

/**
 * Empty state component for when no requests match the filter
 */
function NoMatchState(): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center h-[200px] text-center px-4"
      data-testid="no-match-state"
    >
      <Search className="w-8 h-8 text-muted-foreground/30 mb-2" />
      <p className="text-xs text-muted-foreground">No matching requests</p>
      <p className="text-[10px] text-muted-foreground/60 mt-1">Try a different search term</p>
    </div>
  )
}

export function NetworkRequestList({
  requests,
  filteredRequests
}: NetworkRequestListProps): React.JSX.Element {
  const bottomMarkerRef = useRef<HTMLDivElement>(null)
  const prevRequestCountRef = useRef(filteredRequests.length)

  // Determine which state to show
  const hasRequests = requests.length > 0
  const hasFilteredRequests = filteredRequests.length > 0

  // Auto-scroll to bottom when new requests are added
  useEffect(() => {
    const currentCount = filteredRequests.length
    const prevCount = prevRequestCountRef.current

    // Only scroll if new items were added (not on initial load or filter changes)
    if (currentCount > prevCount && bottomMarkerRef.current?.scrollIntoView) {
      bottomMarkerRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }

    prevRequestCountRef.current = currentCount
  }, [filteredRequests.length])

  return (
    <ScrollArea className="flex-1" data-testid="network-request-list">
      {!hasRequests ? (
        <EmptyState />
      ) : !hasFilteredRequests ? (
        <NoMatchState />
      ) : (
        <div data-testid="request-items" className="pl-1">
          {/* Show oldest first, newest at bottom - chronological order */}
          {filteredRequests.map((request, index, arr) => (
            <NetworkRequestItem
              key={request.id}
              request={request}
              isLast={index === arr.length - 1}
            />
          ))}
          {/* Marker for auto-scroll to bottom */}
          <div ref={bottomMarkerRef} />
        </div>
      )}
    </ScrollArea>
  )
}
