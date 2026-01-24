/**
 * NetworkPanelHeader Component
 *
 * Header for the network panel displaying title, total cost, and action buttons.
 * Uses ViewHeader-style elevation for visual consistency across the app.
 */

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { Globe, Trash2, X, Zap } from 'lucide-react'

export interface NetworkPanelHeaderProps {
  /** Total API cost to display */
  totalCost: number
  /** Whether to show the clear button (when there are requests) */
  showClearButton: boolean
  /** Callback when clear button is clicked */
  onClear: () => void
  /** Callback when close button is clicked */
  onClose: () => void
}

export function NetworkPanelHeader({
  totalCost,
  showClearButton,
  onClear,
  onClose
}: NetworkPanelHeaderProps): React.JSX.Element {
  return (
    <div
      className="flex items-center justify-between h-10 px-3 py-2 border-b border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm flex-shrink-0 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10"
      data-testid="network-panel-header"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Globe className="w-4 h-4 text-primary flex-shrink-0" data-testid="network-icon" />
        <span className="font-semibold text-sm">Network</span>
        {totalCost > 0 && (
          <span
            className="text-xs text-muted-foreground flex items-center gap-0.5"
            data-testid="total-cost"
          >
            • <Zap className="w-3 h-3" /> {totalCost} pts
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {showClearButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClear}
                aria-label="Clear all requests"
                data-testid="clear-button"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all</TooltipContent>
          </Tooltip>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Close network panel"
          data-testid="close-button"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
