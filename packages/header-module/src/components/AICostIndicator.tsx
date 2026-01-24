import { api } from '@codelobby/api'
import {
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@codelobby/ui-kit'
import { Coins, RotateCcw, Sparkles } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'

interface AIUsage {
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  sessionStartedAt: string
  lastUpdatedAt: string
}

// USD to EUR conversion rate (approximate)
const USD_TO_EUR_RATE = 0.92

function formatCostEur(costUsd: number): string {
  const costEur = costUsd * USD_TO_EUR_RATE
  if (costEur < 0.01) {
    return `€${costEur.toFixed(4)}`
  }
  if (costEur < 1) {
    return `€${costEur.toFixed(3)}`
  }
  return `€${costEur.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function AICostIndicator(): React.JSX.Element | null {
  const [usage, setUsage] = useState<AIUsage | null>(null)
  const [isResetting, setIsResetting] = useState(false)

  const fetchUsage = useCallback(async () => {
    try {
      const data = await api.ai.getAIUsage()
      setUsage(data)
    } catch (error) {
      console.error('Failed to fetch AI usage:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchUsage, 5000)
    return () => clearInterval(interval)
  }, [fetchUsage])

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await api.ai.resetAIUsage()
      await fetchUsage()
    } catch (error) {
      console.error('Failed to reset AI usage:', error)
    } finally {
      setIsResetting(false)
    }
  }

  // Don't render if we haven't loaded usage data yet
  if (!usage) {
    return null
  }

  const totalTokens = usage.totalInputTokens + usage.totalOutputTokens
  const costEur = usage.totalCostUsd * USD_TO_EUR_RATE

  // Color thresholds based on cost
  const isHighCost = costEur >= 1
  const isMediumCost = costEur >= 0.1 && costEur < 1

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-2 no-drag cursor-pointer px-2 py-1 rounded-md transition-colors hover:bg-muted/50',
                  isHighCost && 'bg-warning/10 border border-warning/30',
                  isMediumCost && 'bg-muted/30'
                )}
              >
                <Sparkles
                  className={cn('w-3.5 h-3.5', isHighCost ? 'text-warning' : 'text-primary/70')}
                />
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      isHighCost ? 'text-warning' : 'text-foreground/80'
                    )}
                  >
                    {formatCostEur(usage.totalCostUsd)}
                  </span>
                </div>
              </div>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            AI Usage: {formatTokens(totalTokens)} tokens
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-64 p-3" align="center" sideOffset={8}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">AI Usage</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleReset}
                disabled={isResetting}
                title="Reset usage tracking"
              >
                <RotateCcw className={cn('w-3 h-3', isResetting && 'animate-spin')} />
              </Button>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-semibold text-primary">
                  {formatCostEur(usage.totalCostUsd)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>USD equivalent</span>
                <span>${usage.totalCostUsd.toFixed(4)}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Input tokens</span>
                <span>{formatTokens(usage.totalInputTokens)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Output tokens</span>
                <span>{formatTokens(usage.totalOutputTokens)}</span>
              </div>
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Total tokens</span>
                <span>{formatTokens(totalTokens)}</span>
              </div>
            </div>

            <Separator />

            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>Tracking since: {formatDate(usage.sessionStartedAt)}</p>
              <p>Last updated: {formatDate(usage.lastUpdatedAt)}</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
