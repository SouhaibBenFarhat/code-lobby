/**
 * NetworkRequestItem Component
 *
 * Displays a single network request row with expandable details in a timeline format.
 * Shows status icon, HTTP method, URL, status code, duration, cost, and error state.
 */

import type { NetworkRequest } from '@data'
import { Badge, Button, CodeHighlight, cn, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { ChevronDown, Zap } from 'lucide-react'
import { useState } from 'react'
import { formatDuration, formatJsonBody, getMethodColor } from '../../utils'
import { CopyButton } from '../CopyButton'

export interface NetworkRequestItemProps {
  /** The network request to display */
  request: NetworkRequest
  /** Whether this is the last item in the list (hides bottom connector) */
  isLast?: boolean
}

/**
 * Request body display with copy button and syntax highlighting
 */
function RequestBodySection({ body, label }: { body: string; label: string }): React.JSX.Element {
  const formattedBody = formatJsonBody(body)

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-medium text-muted-foreground">{label}:</p>
        <CopyButton text={body} label={label.toLowerCase()} />
      </div>
      <div className="max-h-[300px] overflow-auto border border-zinc-700/50 rounded-md">
        <CodeHighlight
          code={formattedBody}
          language="json"
          className="text-[9px] !p-2 !rounded-none"
        />
      </div>
    </div>
  )
}

/**
 * Get timeline dot color based on request status
 */
function getTimelineDotColor(status: NetworkRequest['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-blue-500'
    case 'success':
      return 'bg-green-500'
    case 'error':
      return 'bg-destructive'
    default:
      return 'bg-muted-foreground'
  }
}

/**
 * Get timeline line color based on request status
 */
function getTimelineLineColor(status: NetworkRequest['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-blue-500/30'
    case 'success':
      return 'bg-green-500/30'
    case 'error':
      return 'bg-destructive/30'
    default:
      return 'bg-border'
  }
}

export function NetworkRequestItem({
  request,
  isLast = false
}: NetworkRequestItemProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasDetails = Boolean(request.requestBody || request.responseBody)

  // Use the actual URL, or fall back to method name
  const displayUrl = request.url || request.method

  const rowContent = (
    <>
      {/* Expand indicator */}
      {hasDetails ? (
        <ChevronDown
          className={cn(
            'w-3 h-3 text-muted-foreground transition-transform flex-shrink-0',
            isExpanded && 'rotate-180'
          )}
          data-testid="expand-indicator"
        />
      ) : (
        <div className="w-3 flex-shrink-0" />
      )}

      {/* HTTP Method badge */}
      {request.httpMethod && (
        <Badge
          variant="outline"
          className={cn(
            'text-[8px] px-1 py-0 h-3.5 font-mono font-semibold flex-shrink-0 border',
            getMethodColor(request.httpMethod)
          )}
          data-testid="http-method-badge"
        >
          {request.httpMethod}
        </Badge>
      )}

      {/* Full URL */}
      <span
        className="font-mono text-[10px] text-foreground truncate flex-1 min-w-0"
        title={displayUrl}
        data-testid="request-url"
      >
        {displayUrl}
      </span>

      {/* Status code */}
      {request.statusCode && (
        <span
          className={cn(
            'text-[9px] font-mono flex-shrink-0',
            request.statusCode >= 200 && request.statusCode < 300 && 'text-green-600',
            request.statusCode >= 400 && 'text-destructive'
          )}
          data-testid="status-code"
        >
          {request.statusCode}
        </span>
      )}

      {/* Duration */}
      {request.durationMs !== undefined && (
        <span
          className={cn(
            'text-[9px] text-muted-foreground tabular-nums flex-shrink-0',
            request.durationMs > 2000 && 'text-yellow-500',
            request.durationMs > 5000 && 'text-destructive'
          )}
          data-testid="request-duration"
        >
          {formatDuration(request.durationMs)}
        </span>
      )}

      {/* API Cost */}
      {request.cost !== undefined && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={request.cost > 0 ? 'secondary' : 'outline'}
              className="text-[8px] px-1 py-0 h-3.5 font-mono flex-shrink-0"
              data-testid="request-cost"
            >
              <Zap className="w-2 h-2 mr-0.5" />
              {request.cost}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <p>GraphQL cost: {request.cost} pts</p>
            {request.rateLimit && (
              <p className="text-muted-foreground">
                {request.rateLimit.remaining.toLocaleString()} /{' '}
                {request.rateLimit.limit.toLocaleString()} remaining
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      )}

      {/* Error indicator */}
      {request.error && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className="text-[8px] px-1 py-0 h-3.5 flex-shrink-0"
              data-testid="error-badge"
            >
              Error
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs max-w-[200px]">
            {request.error}
          </TooltipContent>
        </Tooltip>
      )}
    </>
  )

  return (
    <div
      className={cn('relative flex', request.status === 'error' && 'bg-destructive/5')}
      data-testid="network-request-item"
    >
      {/* Timeline indicator */}
      <div
        className="flex flex-col items-center w-6 flex-shrink-0 pt-3"
        data-testid="timeline-indicator"
      >
        {/* Top connector line (from previous item) */}
        <div className={cn('w-0.5 h-1', getTimelineLineColor(request.status))} />
        {/* Dot */}
        <div
          className={cn(
            'w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-background',
            getTimelineDotColor(request.status),
            request.status === 'pending' && 'animate-pulse'
          )}
          data-testid="timeline-dot"
        />
        {/* Bottom connector line (to next item) */}
        {!isLast && (
          <div className={cn('w-0.5 flex-1 min-h-[8px]', getTimelineLineColor(request.status))} />
        )}
      </div>

      {/* Request content */}
      <div className="flex-1 min-w-0">
        {/* Main row - using Button for accessibility when expandable */}
        {hasDetails ? (
          <Button
            variant="unstyled"
            size="none"
            className="pr-3 py-1.5 hover:bg-muted/50 transition-colors flex items-center gap-1.5 w-full text-left cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            data-testid="request-row-expandable"
          >
            {rowContent}
          </Button>
        ) : (
          <div className="pr-3 py-1.5 flex items-center gap-1.5" data-testid="request-row">
            {rowContent}
          </div>
        )}

        {/* Expanded details */}
        {isExpanded && hasDetails && (
          <div
            className="pr-3 pb-2 pt-1 bg-muted/30 border-t border-border/30"
            data-testid="request-details"
          >
            {request.requestBody && (
              <RequestBodySection body={request.requestBody} label="Request Body" />
            )}
            {request.responseBody && (
              <RequestBodySection body={request.responseBody} label="Response Body" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
