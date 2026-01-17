import { useState, useEffect, useMemo } from 'react'
import { LogOut, RefreshCw, Moon, Sun, Loader2, Activity, Gauge, LayoutGrid, FolderTree, AlertTriangle, Clock } from 'lucide-react'
import { DogIcon } from './DogIcon'
import { useIsFetching, useQuery } from '@tanstack/react-query'
import { CodeLobbyLogo } from './CodeLobbyLogo'
import { EventStream } from './EventStream'
import { RepoSelector } from './RepoSelector'
import { LogsViewer } from './LogsViewer'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Separator } from './ui/separator'
import { cn } from '@/lib/utils'

// Helper to format time until reset
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

export type ViewMode = 'canvas' | 'ide'

interface RateLimitInfo {
  limit: number
  remaining: number
  used: number
  resetAt: string
  percentage: number
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

export function Header({ user, onLogout, viewMode, onViewModeChange, isAIPanelOpen, onToggleAIPanel }: HeaderProps) {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()
  const [isDark, setIsDark] = useState(true)
  const [, setTick] = useState(0) // Force re-render for countdown
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Fetch initial fullscreen state and listen for changes
  useEffect(() => {
    // Get initial state
    window.electron.isFullscreen().then(setIsFullscreen)
    
    // Listen for changes
    const cleanup = window.electron.onFullscreenChange((fullscreen) => {
      setIsFullscreen(fullscreen)
    })
    return cleanup
  }, [])

  // Fetch rate limit info (refreshes with other queries on window focus)
  const { data: rateLimitData } = useQuery({
    queryKey: ['rate-limit'],
    queryFn: async () => {
      const result = await window.electron.getRateLimit()
      if (result.success && result.data) {
        return result.data as RateLimitInfo
      }
      return null
    },
    refetchOnWindowFocus: true,
    staleTime: 30000
  })

  // Calculate rate limit status
  const isRateLimited = rateLimitData && rateLimitData.remaining === 0
  const isNearLimit = rateLimitData && rateLimitData.percentage >= 80
  const timeUntilReset = useMemo(() => {
    if (!rateLimitData?.resetAt) return ''
    return formatTimeUntilReset(rateLimitData.resetAt)
  }, [rateLimitData?.resetAt])

  // Update countdown every second when rate limited or near limit
  useEffect(() => {
    if (!isRateLimited && !isNearLimit) return
    
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isRateLimited, isNearLimit])

  useEffect(() => {
    // Check saved theme or default to dark
    const savedTheme = localStorage.getItem('codelobby-theme')
    const prefersDark = savedTheme ? savedTheme === 'dark' : true
    setIsDark(prefersDark)
    document.documentElement.classList.toggle('dark', prefersDark)
  }, [])

  const toggleTheme = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    document.documentElement.classList.toggle('dark', newIsDark)
    localStorage.setItem('codelobby-theme', newIsDark ? 'dark' : 'light')
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['prs'] })
    queryClient.invalidateQueries({ queryKey: ['pr-events'] })
  }

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-4 pr-4 drag-region header-bar">
        {/* Left section with window controls area + logo */}
        <div className="flex items-center h-full">
          {/* Window controls spacer (traffic lights) - hidden in fullscreen */}
          {!isFullscreen && <div className="w-[72px] h-full flex-shrink-0" />}
          {isFullscreen && <div className="w-3 h-full flex-shrink-0" />}
          
          {/* Logo - positioned right after traffic lights */}
          <div className="flex items-center gap-2.5 no-drag pr-4">
            <CodeLobbyLogo size={28} />
            <div className="flex flex-col">
              <span className="text-sm font-semibold leading-tight">CodeLobby</span>
              <span className="text-[10px] text-muted-foreground leading-tight">Real-time PR monitoring</span>
            </div>
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 no-drag bg-muted/50 rounded-lg p-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'canvas' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onViewModeChange('canvas')}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Canvas View</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'ide' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => onViewModeChange('ide')}
              >
                <FolderTree className="w-4 h-4" />
              </button>
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
                <div className={cn(
                  "flex items-center gap-2 no-drag cursor-default px-2 py-1 rounded-md transition-colors",
                  isRateLimited && "bg-destructive/10 border border-destructive/30",
                  isNearLimit && !isRateLimited && "bg-warning/10 border border-warning/30"
                )}>
                  {isRateLimited ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />
                  ) : (
                    <Gauge className={cn(
                      "w-3.5 h-3.5",
                      isNearLimit ? "text-warning" : "text-muted-foreground"
                    )} />
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          isRateLimited ? "bg-destructive" :
                          rateLimitData.percentage > 80 ? "bg-red-500" : 
                          rateLimitData.percentage > 50 ? "bg-yellow-500" : 
                          "bg-green-500"
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
                  <p className={cn(
                    "font-medium",
                    isRateLimited && "text-destructive"
                  )}>
                    {isRateLimited ? "⚠️ Rate Limit Reached!" : "API Rate Limit"}
                  </p>
                  <div className="space-y-0.5">
                    <p>Used: {rateLimitData.used.toLocaleString()} / {rateLimitData.limit.toLocaleString()}</p>
                    <p className={cn(isRateLimited && "text-destructive font-medium")}>
                      Remaining: {rateLimitData.remaining.toLocaleString()}
                    </p>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>
                      Resets in <span className="font-medium">{formatTimeUntilReset(rateLimitData.resetAt)}</span>
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

        <div className="flex-1" />

        <div className="flex items-center gap-2 no-drag">
          {isFetching > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Refreshing...</span>
            </div>
          )}

          <RepoSelector />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-8 w-8">
                <RefreshCw className={`w-4 h-4 ${isFetching > 0 ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh data</TooltipContent>
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
                variant={isAIPanelOpen ? "secondary" : "ghost"} 
                size="icon" 
                className="h-8 w-8"
                onClick={onToggleAIPanel}
              >
                <DogIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isAIPanelOpen ? 'Close AI Panel' : 'Open AI Panel'}</TooltipContent>
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

          <Separator orientation="vertical" className="h-6" />

          {user && (
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
              <Button variant="ghost" size="icon" onClick={onLogout} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </header>
  )
}
