import {
  type ThemeVariant,
  useIsFullscreen,
  useNetworkPanel,
  usePRs,
  useQueryClient,
  useRateLimit,
  useRepos,
  useSetTheme,
  useSetUserProfilePanel,
  useTheme,
  useToggleNetworkPanel,
  useUserProfilePanel,
  type ViewMode
} from '@data'
import {
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
} from '@ui-kit'
import {
  Activity,
  AlertTriangle,
  Check,
  Clock,
  FolderTree,
  Gauge,
  LayoutGrid,
  Loader2,
  Monitor,
  Moon,
  Network,
  Palette,
  RefreshCw,
  Sun
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AccountMenu } from './AccountMenu'
import { AICostIndicator } from './AICostIndicator'
import { DatabaseViewer } from './DatabaseViewer'
import { EventStream } from './EventStream'
import { GitHubStatusIndicator } from './GitHubStatusIndicator'
import { LogsViewer } from './LogsViewer'
import { MemoryUsageIndicator } from './MemoryUsageIndicator'
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

interface HeaderProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isAIPanelOpen: boolean
  onToggleAIPanel: () => void
}

export function Header({
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
  const { data: theme = 'dark' as ThemeVariant } = useTheme()
  const setTheme = useSetTheme()
  const isDark = theme === 'dark' || theme === 'windows-dark'

  const isFetching = reposLoading || prsLoading || prsFetching

  // Rate limit from GitHub API
  const { data: rateLimitData } = useRateLimit()

  // Network panel
  const { data: networkPanelOpen } = useNetworkPanel()
  const toggleNetworkPanel = useToggleNetworkPanel()

  // User profile panel
  const { data: userProfilePanelData } = useUserProfilePanel()
  const setUserProfilePanel = useSetUserProfilePanel()
  const userProfileOpen = userProfilePanelData?.isOpen ?? false

  const toggleUserProfile = () => {
    setUserProfilePanel.mutate({ isOpen: !userProfileOpen })
  }

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
    document.documentElement.classList.toggle(
      'windows',
      theme === 'windows-light' || theme === 'windows-dark'
    )
  }, [theme, isDark])

  const [themeMenuOpen, setThemeMenuOpen] = useState(false)

  const handleRefresh = () => {
    // Invalidate all PR queries to trigger refetch
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'github' && query.queryKey[1] === 'prs'
    })
  }

  return (
    <header className="h-14 flex items-center gap-2 pr-4 drag-region header-bar shadow-elevation-medium relative z-20">
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

      <div className="flex items-center gap-1 no-drag bg-surface rounded-lg p-0.5">
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

      {rateLimitData && (
        <>
          <Separator orientation="vertical" className="h-6" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'flex items-center gap-1.5 no-drag cursor-default px-1.5 py-0.5 rounded-md transition-colors',
                  isRateLimited && 'bg-destructive-subtle border border-destructive-border',
                  isNearLimit && !isRateLimited && 'bg-warning-subtle border border-warning-border'
                )}
              >
                {isRateLimited ? (
                  <AlertTriangle className="w-3 h-3 text-destructive animate-pulse" />
                ) : (
                  <Gauge
                    className={cn(
                      'w-3 h-3',
                      isNearLimit ? 'text-warning' : 'text-muted-foreground'
                    )}
                  />
                )}
                {isRateLimited ? (
                  <div className="flex items-center gap-1 text-[10px] text-destructive font-medium">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTimeUntilReset(rateLimitData.resetAt)}</span>
                  </div>
                ) : isNearLimit ? (
                  <span className="text-[10px] text-warning font-medium">
                    {rateLimitData.remaining} left
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {rateLimitData.percentage}%
                  </span>
                )}
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

      <MemoryUsageIndicator />

      <GitHubStatusIndicator />

      <div className="flex-1" />

      <div className="flex items-center gap-1 no-drag">
        {isFetching && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            <span>Refreshing...</span>
          </div>
        )}

        <RepoSelector />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-7 w-7">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear cache & refresh</TooltipContent>
        </Tooltip>

        <Popover open={themeMenuOpen} onOpenChange={setThemeMenuOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Palette className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>Theme</TooltipContent>
          </Tooltip>
          <PopoverContent align="end" className="w-48 p-1" sideOffset={8}>
            <div className="flex flex-col gap-0.5">
              <p className="px-2 py-1.5 text-xs font-medium text-foreground-muted">Apple</p>
              {[
                { value: 'light' as ThemeVariant, label: 'Light', icon: Sun },
                { value: 'dark' as ThemeVariant, label: 'Dark', icon: Moon }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm transition-colors',
                    theme === value
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-interactive-hover'
                  )}
                  onClick={() => {
                    setTheme.mutate(value)
                    setThemeMenuOpen(false)
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {theme === value && <Check className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
              <Separator className="my-1" />
              <p className="px-2 py-1.5 text-xs font-medium text-foreground-muted">Windows</p>
              {[
                { value: 'windows-light' as ThemeVariant, label: 'Light', icon: Sun },
                { value: 'windows-dark' as ThemeVariant, label: 'Dark', icon: Moon }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm transition-colors',
                    theme === value
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-interactive-hover'
                  )}
                  onClick={() => {
                    setTheme.mutate(value)
                    setThemeMenuOpen(false)
                  }}
                >
                  <Monitor className="w-3 h-3 mr-0.5" />
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {theme === value && <Check className="w-3.5 h-3.5 ml-auto" />}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isAIPanelOpen ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={onToggleAIPanel}
            >
              <ClaudeIcon className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isAIPanelOpen ? 'Close AI Panel' : 'Open AI Panel'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-7 w-7', networkPanelOpen && 'bg-interactive-active')}
              onClick={() => toggleNetworkPanel.mutate()}
            >
              <Network className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Network Panel</TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Activity className="w-3.5 h-3.5" />
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

        <DatabaseViewer />

        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <LogsViewer />
            </div>
          </TooltipTrigger>
          <TooltipContent>Application logs</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {viewMode === 'ide' ? (
          <AccountMenu
            onToggleProfilePanel={toggleUserProfile}
            profilePanelOpen={userProfileOpen}
          />
        ) : (
          <AccountMenu />
        )}
      </div>
    </header>
  )
}
