/**
 * ClaudeCodeStatus - Indicator showing if Claude Code CLI is installed
 *
 * Shows a terminal icon that turns green with ripple effect when Claude Code
 * is detected on the machine.
 */

import { useClaudeCodeStatus } from '@data'
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Terminal } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ClaudeCodeStatus(): React.JSX.Element {
  const { data: status, isLoading } = useClaudeCodeStatus()
  const [showRipple, setShowRipple] = useState(false)

  // Trigger ripple effect when status changes to installed
  useEffect(() => {
    if (status?.installed) {
      setShowRipple(true)
      const timer = setTimeout(() => setShowRipple(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [status?.installed])

  const isInstalled = status?.installed ?? false

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-default',
            isInstalled ? 'text-green-500' : 'text-muted-foreground'
          )}
        >
          {/* Ripple effect */}
          {showRipple && isInstalled && (
            <>
              <span className="absolute inset-0 rounded-md bg-green-500/30 animate-ping" />
              <span
                className="absolute inset-0 rounded-md bg-green-500/20 animate-ping"
                style={{ animationDelay: '150ms' }}
              />
            </>
          )}

          {/* Glow effect when installed */}
          {isInstalled && <span className="absolute inset-0 rounded-md bg-green-500/10" />}

          {/* Icon */}
          <Terminal
            className={cn(
              'w-4 h-4 relative z-10 transition-all',
              isLoading && 'animate-pulse',
              isInstalled && 'drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]'
            )}
          />

          {/* Status dot */}
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-background z-20 transition-colors',
              isInstalled ? 'bg-green-500' : 'bg-muted-foreground/50'
            )}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {isLoading ? (
          <span>Checking Claude Code CLI...</span>
        ) : isInstalled ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-medium">Claude Code Installed</span>
            </div>
            {status?.version && <p className="text-muted-foreground">{status.version}</p>}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span>Claude Code Not Installed</span>
            </div>
            <p className="text-muted-foreground">
              Install: npm install -g @anthropic-ai/claude-code
            </p>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
