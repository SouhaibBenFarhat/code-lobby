/**
 * AICostIndicator - CLI status + usage stats indicator
 *
 * Shows CLI installed status + today's activity from stats-cache.json
 */

import { useClaudeCodeStatus, useCliUsageStats } from '@data'
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
} from '@ui-kit'
import { Loader2, MessageSquare, RefreshCw, Terminal, Wrench } from 'lucide-react'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/** Shorten model ID to a human-friendly label */
function shortModelName(modelId: string): string {
  if (modelId.includes('opus-4-6')) return 'Opus 4.6'
  if (modelId.includes('opus-4-5')) return 'Opus 4.5'
  if (modelId.includes('sonnet-4-5')) return 'Sonnet 4.5'
  if (modelId.includes('sonnet-4-')) return 'Sonnet 4'
  if (modelId.includes('haiku-4-5')) return 'Haiku 4.5'
  if (modelId.includes('haiku')) return 'Haiku'
  // Fallback: extract model name from ID
  const parts = modelId.replace('claude-', '').split('-')
  return parts.slice(0, 2).join(' ')
}

// ===========================================================================
// Stat Row
// ===========================================================================

function StatRow({
  icon,
  label,
  value
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-xs font-mono font-medium">{value}</span>
    </div>
  )
}

// ===========================================================================
// Main Component
// ===========================================================================

export function AICostIndicator(): React.JSX.Element | null {
  const { data: cliStatus, isLoading: isCheckingCli } = useClaudeCodeStatus()
  const isCliInstalled = cliStatus?.installed ?? false
  const { data: stats, isLoading: isLoadingStats, refetch: refetchStats } = useCliUsageStats(true)

  const todayMessages = stats?.today?.messages ?? 0

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
                {/* CLI status icon */}
                <div className="relative">
                  <Terminal
                    className={cn(
                      'w-3.5 h-3.5 transition-all',
                      isCheckingCli && 'animate-pulse text-muted-foreground',
                      isCliInstalled && 'text-green-500 drop-shadow-[0_0_3px_rgba(34,197,94,0.4)]',
                      !isCliInstalled && !isCheckingCli && 'text-muted-foreground'
                    )}
                  />
                  <span
                    className={cn(
                      'absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-background',
                      isCliInstalled ? 'bg-green-500' : 'bg-foreground-ghost'
                    )}
                  />
                </div>

                {/* Today's message count */}
                {isLoadingStats && !stats ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : stats ? (
                  <span className="font-mono font-medium">{todayMessages}</span>
                ) : (
                  <span className="font-medium">CLI</span>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isCliInstalled
              ? `Claude Code CLI${cliStatus?.version ? ` ${cliStatus.version}` : ''} — ${todayMessages} messages today`
              : 'Claude Code CLI not installed'}
          </TooltipContent>
        </Tooltip>

        <PopoverContent className="w-72 p-3" align="end" sideOffset={8}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal
                  className={cn(
                    'w-4 h-4',
                    isCliInstalled ? 'text-green-500' : 'text-muted-foreground'
                  )}
                />
                <div>
                  <span className="font-semibold text-sm">Claude Code CLI</span>
                  {isCliInstalled && cliStatus?.version && (
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      {cliStatus.version}
                    </span>
                  )}
                </div>
              </div>
              {stats && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => refetchStats()}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh stats</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* CLI Status */}
            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  isCliInstalled ? 'bg-green-500' : 'bg-foreground-ghost'
                )}
              />
              <span className={isCliInstalled ? 'text-foreground' : 'text-muted-foreground'}>
                {isCheckingCli
                  ? 'Checking...'
                  : isCliInstalled
                    ? 'Installed & Active'
                    : 'Not Installed'}
              </span>
            </div>

            {!isCliInstalled && !isCheckingCli && (
              <p className="text-[10px] text-muted-foreground">
                Install:{' '}
                <code className="bg-muted px-1 rounded">
                  npm install -g @anthropic-ai/claude-code
                </code>
              </p>
            )}

            {isCliInstalled && (
              <>
                <Separator />

                {/* Today's Activity */}
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-xs font-medium">Today&apos;s Activity</span>
                </div>

                {isLoadingStats && !stats ? (
                  <div className="flex items-center justify-center py-3 gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Loading stats...
                  </div>
                ) : stats ? (
                  <div className="space-y-1.5">
                    <StatRow
                      icon={<MessageSquare className="w-3 h-3 text-muted-foreground" />}
                      label="Messages"
                      value={formatNumber(stats.today.messages)}
                    />
                    <StatRow
                      icon={<Terminal className="w-3 h-3 text-muted-foreground" />}
                      label="Sessions"
                      value={formatNumber(stats.today.sessions)}
                    />
                    <StatRow
                      icon={<Wrench className="w-3 h-3 text-muted-foreground" />}
                      label="Tool Calls"
                      value={formatNumber(stats.today.toolCalls)}
                    />

                    {/* Model breakdown */}
                    {Object.keys(stats.modelUsage).length > 0 && (
                      <>
                        <Separator className="my-1.5" />
                        <span className="text-[10px] text-muted-foreground">
                          All-time tokens by model
                        </span>
                        {Object.entries(stats.modelUsage)
                          .sort(
                            ([, a], [, b]) =>
                              b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)
                          )
                          .slice(0, 4)
                          .map(([model, usage]) => (
                            <div
                              key={model}
                              className="flex items-center justify-between text-[10px]"
                            >
                              <span className="text-muted-foreground truncate max-w-[120px]">
                                {shortModelName(model)}
                              </span>
                              <span className="font-mono text-foreground">
                                {formatNumber(usage.inputTokens + usage.outputTokens)} tok
                              </span>
                            </div>
                          ))}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No usage data available yet.
                  </p>
                )}
              </>
            )}

            <p className="text-[10px] text-muted-foreground text-center pt-1">
              {isCliInstalled
                ? `${formatNumber(stats?.totalMessages ?? 0)} total messages · ${formatNumber(stats?.totalSessions ?? 0)} sessions`
                : 'CLI mode requires Claude Code installed'}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
