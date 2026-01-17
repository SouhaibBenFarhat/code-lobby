import { useState, useEffect } from 'react'
import { LogOut, RefreshCw, Moon, Sun, Loader2, Activity, Gauge, LayoutGrid, FolderTree, Bot } from 'lucide-react'
import { useIsFetching, useQuery } from '@tanstack/react-query'
import { CodeLobbyLogo } from './CodeLobbyLogo'
import { EventStream } from './EventStream'
import { RepoSelector } from './RepoSelector'
import { LogsViewer } from './LogsViewer'
import { AIChatPanel } from './AIChat'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from './ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { Separator } from './ui/separator'
import { cn } from '@/lib/utils'

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
}

export function Header({ user, onLogout, viewMode, onViewModeChange }: HeaderProps) {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()
  const [isDark, setIsDark] = useState(true)

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
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center pl-20 pr-4 gap-4 drag-region header-bar">
        <div className="flex items-center gap-3 no-drag">
          <CodeLobbyLogo size={36} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">CodeLobby</span>
            <span className="text-[10px] text-muted-foreground">Real-time PR monitoring</span>
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
                <div className="flex items-center gap-2 no-drag cursor-default">
                  <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          rateLimitData.percentage > 80 
                            ? 'bg-red-500' 
                            : rateLimitData.percentage > 50 
                              ? 'bg-yellow-500' 
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${rateLimitData.percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground w-8">
                      {rateLimitData.percentage}%
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <div className="space-y-1">
                  <p className="font-medium">API Rate Limit</p>
                  <p>Used: {rateLimitData.used.toLocaleString()} / {rateLimitData.limit.toLocaleString()}</p>
                  <p>Remaining: {rateLimitData.remaining.toLocaleString()}</p>
                  <p>Resets: {new Date(rateLimitData.resetAt).toLocaleTimeString()}</p>
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

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Bot className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>AI Assistant</TooltipContent>
            </Tooltip>
            <PopoverContent 
              className="w-[400px] h-[500px] p-0 overflow-hidden" 
              align="end"
              sideOffset={8}
            >
              <AIChatPanel onClose={() => {}} />
            </PopoverContent>
          </Popover>

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
