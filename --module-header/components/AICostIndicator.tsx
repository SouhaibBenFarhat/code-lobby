/**
 * AICostIndicator - Displays AI usage cost and tokens in the header
 */

import { useAIUsage, useResetAIUsage } from '@data'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Coins, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// USD to EUR conversion rate
const USD_TO_EUR_RATE = 0.92

function formatCost(costUsd: number, currency: 'USD' | 'EUR' = 'EUR'): string {
  const value = currency === 'EUR' ? costUsd * USD_TO_EUR_RATE : costUsd
  const symbol = currency === 'EUR' ? '€' : '$'

  if (value < 0.01) {
    return `${symbol}${value.toFixed(4)}`
  }
  if (value < 1) {
    return `${symbol}${value.toFixed(3)}`
  }
  return `${symbol}${value.toFixed(2)}`
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

export function AICostIndicator(): React.JSX.Element | null {
  const { data: usage } = useAIUsage()
  const resetUsage = useResetAIUsage()
  const [isRippling, setIsRippling] = useState(false)
  const prevCostRef = useRef<number>(0)

  // Trigger ripple effect when cost changes
  useEffect(() => {
    if (usage && usage.costUsd > prevCostRef.current) {
      setIsRippling(true)
      const timer = setTimeout(() => setIsRippling(false), 600)
      return () => clearTimeout(timer)
    }
    prevCostRef.current = usage?.costUsd ?? 0
  }, [usage?.costUsd, usage])

  // Don't show if no usage yet
  if (!usage || (usage.inputTokens === 0 && usage.outputTokens === 0)) {
    return null
  }

  const totalTokens = usage.inputTokens + usage.outputTokens
  const costEur = formatCost(usage.costUsd, 'EUR')

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground no-drag relative overflow-hidden"
              >
                {/* Ripple effect */}
                {isRippling && (
                  <span className="absolute inset-0 animate-ping bg-purple-500/20 rounded-md" />
                )}
                <Sparkles
                  className={`w-3.5 h-3.5 text-purple-500 transition-transform ${isRippling ? 'scale-125' : ''}`}
                />
                <span
                  className={`font-medium transition-all ${isRippling ? 'text-purple-500 scale-105' : ''}`}
                >
                  {costEur}
                </span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>AI Usage & Cost</TooltipContent>
        </Tooltip>

        <PopoverContent className="w-64 p-3" align="end" sideOffset={8}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-purple-500" />
                <span className="font-semibold text-sm">AI Usage</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => resetUsage.mutate()}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset tracking</TooltipContent>
              </Tooltip>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost</span>
                <div className="text-right">
                  <span className="font-medium">{costEur}</span>
                  <span className="text-muted-foreground text-xs ml-1">
                    ({formatCost(usage.costUsd, 'USD')})
                  </span>
                </div>
              </div>

              <Separator />

              {/* Input breakdown */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Input</span>
                  <span className="text-[10px] text-muted-foreground/70">(what you send)</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs">{formatTokens(usage.inputTokens)}</span>
                  <span className="text-muted-foreground text-xs ml-1">
                    → {formatCost(usage.inputCostUsd, 'EUR')}
                  </span>
                </div>
              </div>

              {/* Output breakdown */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Output</span>
                  <span className="text-[10px] text-muted-foreground/70">(Claude's response)</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs">{formatTokens(usage.outputTokens)}</span>
                  <span className="text-muted-foreground text-xs ml-1">
                    → {formatCost(usage.outputCostUsd, 'EUR')}
                  </span>
                </div>
              </div>

              <div className="flex justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground">Total Tokens</span>
                <span className="font-mono text-xs font-medium">{formatTokens(totalTokens)}</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              Tracking resets on app restart
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
