import {
  useIsFullscreen,
  useNetworkPanel,
  usePRs,
  useQueryClient,
  useRateLimit,
  useRepos,
  useSetTheme,
  useTheme,
  useToggleNetworkPanel,
  type ViewMode
} from '@codelobby/data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  ClaudeIcon,
  CodeLobbyLogo,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@codelobby/ui-kit'
import {
  Activity,
  AlertTriangle,
  Clock,
  FolderTree,
  Gauge,
  LayoutGrid,
  Loader2,
  LogOut,
  Moon,
  Network,
  RefreshCw,
  Sun
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AboutDialog } from './AboutDialog'
import { AICostIndicator } from './AICostIndicator'
import { EventStream } from './EventStream'
import { LogsViewer } from './LogsViewer'
import { RepoSelector } from './RepoSelector'

function formatTimeUntilReset(resetAt: string): string {
  const resetDate = new Date(resetAt)
  const now = new Date()
  const diffMs = resetDate.getTime() - now.getTime()

  if (diffMs <= 0) return 'now'

  const diffMins = Math.floor(diffMs / 60000)
  const diffSecs = Math.floor((diffMs % 60000) / 1000)

  if (diffMins > 60) {
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs}s`
  }

  return `${diffSecs}s`
}

interface User {
  login: string
  avatar_url: string
  name: string | null
}

interface HeaderProps {
  user: User | null
  onLogout: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isAIPanelOpen: boolean
  onToggleAIPanel: () => void
}

export function Header({
  user,
  onLogout,
  viewMode,
  onViewModeChange,
  isAIPanelOpen,
  onToggleAIPanel
}: HeaderProps): React.JSX.Element {
  // TanStack Query hooks
  const { isLoading: reposLoading } = useRepos()
  const { isLoading: prsLoading, isFetching: prsFetching } = usePRs()
  const queryClient = useQueryClient()

  // System state via TanStack
  const { data: isFullscreen = false } = useIsFullscreen()
  const { data: theme = 'dark' } = useTheme()
  const setTheme = useSetTheme()
  const isDark = theme === 'dark'

  const isFetching = reposLoading || prsLoading || prsFetching

  // Rate limit from GitHub API
  const { data: rateLimitData } = useRateLimit()

  // Network panel
  const { data: networkPanelOpen } = useNetworkPanel()
  const toggleNetworkPanel = useToggleNetworkPanel()

  const [, setTick] = useState(0)

  const isRateLimited = rateLimitData && rateLimitData.remaining === 0
  const isNearLimit = rateLimitData && rateLimitData.percentage >= 80
  const _timeUntilReset = useMemo(() => {
    if (!rateLimitData?.resetAt) return ''
    return formatTimeUntilReset(rateLimitData.resetAt)
  }, [rateLimitData?.resetAt])

  useEffect(() => {
    if (!isRateLimited && !isNearLimit) return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [isRateLimited, isNearLimit])

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const toggleTheme = () => {
    setTheme.mutate(isDark ? 'light' : 'dark')
  }

  const handleRefresh = () => {
    // Invalidate all PR queries to trigger refetch
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'github' && query.queryKey[1] === 'prs'
    })
  }

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-4 pr-4 drag-region header-bar shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-20">
      <div className="flex items-center h-full">
        {!isFullscreen && <div className="w-[72px] h-full flex-shrink-0" />}
        {isFullscreen && <div className="w-3 h-full flex-shrink-0" />}

        <div className="flex items-center gap-2.5 no-drag pr-4">
          <CodeLobbyLogo size={28} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">CodeLobby</span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Real-time PR monitoring
            </span>
          </div>
        </div>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-1 no-drag bg-muted/50 rounded-lg p-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="unstyled"
              size="none"
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'canvas'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewModeChange('canvas')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Canvas View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="unstyled"
              size="none"
              className={cn(
                'p-1.5 rounded-md transition-all',
                viewMode === 'ide'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => onViewModeChange('ide')}
            >
              <FolderTree className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>IDE View</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2 text-xs text-muted-foreground no-drag">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span>Live</span>
      </div>

      {rateLimitData && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-2 no-drag cursor-default px-2 py-1 rounded-md transition-colors',
                  isRateLimited && 'bg-destructive/10 border border-destructive/30',
                  isNearLimit && !isRateLimited && 'bg-warning/10 border border-warning/30'
                )}
              >
                {isRateLimited ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />
                ) : (
                  <Gauge
                    className={cn(
                      'w-3.5 h-3.5',
                      isNearLimit ? 'text-warning' : 'text-muted-foreground'
                    )}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        isRateLimited
                          ? 'bg-destructive'
                          : rateLimitData.percentage > 80
                            ? 'bg-red-500'
                            : rateLimitData.percentage > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                      )}
                      style={{ width: `${Math.min(rateLimitData.percentage, 100)}%` }}
                    />
                  </div>
                  {isRateLimited ? (
                    <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeUntilReset(rateLimitData.resetAt)}</span>
                    </div>
                  ) : isNearLimit ? (
                    <div className="flex items-center gap-1 text-[10px] text-warning">
                      <span>{rateLimitData.remaining}</span>
                      <span className="text-muted-foreground">left</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground w-8">
                      {rateLimitData.percentage}%
                    </span>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="space-y-1.5">
                <p className={cn('font-medium', isRateLimited && 'text-destructive')}>
                  {isRateLimited ? '⚠️ Rate Limit Reached!' : 'API Rate Limit'}
                </p>
                <div className="space-y-0.5">
                  <p>
                    Used: {rateLimitData.used.toLocaleString()} /{' '}
                    {rateLimitData.limit.toLocaleString()}
                  </p>
                  <p className={cn(isRateLimited && 'text-destructive font-medium')}>
                    Remaining: {rateLimitData.remaining.toLocaleString()}
                  </p>
                </div>
                <Separator className="my-1" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>
                    Resets in{' '}
                    <span className="font-medium">
                      {formatTimeUntilReset(rateLimitData.resetAt)}
                    </span>
                  </span>
                </div>
                <p className="text-muted-foreground text-[10px]">
                  ({new Date(rateLimitData.resetAt).toLocaleTimeString()})
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </>
      )}

      <AICostIndicator />

      <div className="flex-1" />

      <div className="flex items-center gap-2 no-drag">
        {isFetching && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span>Refreshing...</span>
          </div>
        )}

        <RepoSelector />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-8 w-8">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear cache & refresh</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDark ? 'Light mode' : 'Dark mode'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAIPanelOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleAIPanel}
            >
              <ClaudeIcon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isAIPanelOpen ? 'Close AI Panel' : 'Open AI Panel'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', networkPanelOpen && 'bg-muted')}
              onClick={() => toggleNetworkPanel.mutate()}
            >
              <Network className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Network Panel</TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Activity className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Activity stream</TooltipContent>
          </Tooltip>
          <PopoverContent
            className="w-[380px] h-[500px] p-0 overflow-hidden"
            align="end"
            sideOffset={8}
          >
            <EventStream />
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <LogsViewer />
            </div>
          </TooltipTrigger>
          <TooltipContent>Application logs</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <AboutDialog />
            </div>
          </TooltipTrigger>
          <TooltipContent>About CodeLobby</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {user?.login && (
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.avatar_url} alt={user.login} />
              <AvatarFallback>{user.login.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user.login}</span>
          </div>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Sign out</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
