import {
  ChevronDown,
  ChevronUp,
  Code,
  ExternalLink,
  GitFork,
  GitPullRequest,
  Move,
  Palette,
  User,
  Users,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useMyPRsFilter } from '../App'
import { PRCard } from './PRCard'
import type { PullRequest, Repository } from './types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader } from './ui/card'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

// Preset color palette
const COLOR_PALETTE = [
  null, // No color (default)
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#64748b' // Slate
]

interface RepoCardProps {
  repo: Repository
  prs: PullRequest[]
  className?: string
  style?: React.CSSProperties
  isDraggable?: boolean
  onClose?: () => void
  color?: string | null
  onColorChange?: (color: string | null) => void
  currentUser?: string | null
  isMinimized?: boolean
  onMinimizeChange?: (isMinimized: boolean) => void
}

export function RepoCard({
  repo,
  prs,
  className,
  style,
  isDraggable = true,
  onClose,
  color,
  onColorChange,
  currentUser,
  isMinimized = false,
  onMinimizeChange
}: RepoCardProps) {
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const { isMyPRsFilterEnabled, toggleMyPRsFilter } = useMyPRsFilter()
  const showOnlyMyPRs = isMyPRsFilterEnabled(repo.full_name)

  // Filter PRs based on toggle
  const filteredPRs = useMemo(() => {
    if (!showOnlyMyPRs || !currentUser) return prs
    return prs.filter((pr) => pr.user.login === currentUser)
  }, [prs, showOnlyMyPRs, currentUser])

  const hasPRs = filteredPRs.length > 0
  const totalPRs = prs.length
  const myPRsCount = currentUser ? prs.filter((pr) => pr.user.login === currentUser).length : 0

  return (
    <Card
      className={cn('flex flex-col overflow-hidden h-full', className)}
      style={{
        ...style,
        ...(color
          ? {
              borderColor: color,
              borderWidth: '2px',
              boxShadow: `0 0 0 1px ${color}20, 0 4px 12px ${color}15`
            }
          : {})
      }}
    >
      {/* Top bar with drag handle, color picker, and close button */}
      <div
        className="flex items-center border-b border-border bg-muted/80 dark:bg-black/20"
        style={color ? { backgroundColor: `${color}15`, borderBottomColor: `${color}40` } : {}}
      >
        {/* Color picker */}
        {onColorChange && (
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="px-2 py-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Palette className="w-3.5 h-3.5" style={color ? { color } : {}} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Change card color</TooltipContent>
            </Tooltip>
            <PopoverContent
              className="w-auto p-2"
              align="start"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-6 gap-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    type="button"
                    key={c || 'no-color'}
                    className={cn(
                      'w-6 h-6 rounded-md border-2 transition-all hover:scale-110',
                      c === color ? 'ring-2 ring-offset-2 ring-primary' : 'border-transparent',
                      !c && 'bg-muted border-dashed border-muted-foreground/30'
                    )}
                    style={c ? { backgroundColor: c } : {}}
                    onClick={() => {
                      onColorChange(c)
                      setColorPickerOpen(false)
                    }}
                    title={c || 'No color'}
                  >
                    {!c && <X className="w-3 h-3 mx-auto text-muted-foreground/50" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Drag handle - only this area is draggable */}
        <div
          className={cn(
            'drag-handle flex-1 flex items-center justify-center gap-1 py-1 text-muted-foreground/50 transition-colors',
            isDraggable &&
              'cursor-grab active:cursor-grabbing hover:bg-muted/50 hover:text-muted-foreground'
          )}
        >
          {isDraggable && (
            <>
              <Move className="w-3 h-3" />
              <span className="text-[10px]">Drag to move</span>
            </>
          )}
        </div>
        {/* Minimize button */}
        {onMinimizeChange && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="px-2 py-1 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onMinimizeChange(!isMinimized)
                }}
              >
                {isMinimized ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isMinimized ? 'Expand' : 'Minimize'}</TooltipContent>
          </Tooltip>
        )}
        {/* Close button */}
        {onClose && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="px-2 py-1 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onClose()
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Hide this repo</TooltipContent>
          </Tooltip>
        )}
      </div>

      <CardHeader className="pb-2 flex-shrink-0 pt-2 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
              <AvatarFallback className="rounded-md text-[10px]">
                {repo.owner.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 truncate text-xs">
              <GitFork className="w-3 h-3 text-muted-foreground inline-block align-middle mr-1" />
              <span className="font-semibold">{repo.name}</span>
              <span className="text-muted-foreground ml-1.5">{repo.owner.login}</span>
              {repo.language && (
                <>
                  <span className="text-muted-foreground/40 mx-1.5">•</span>
                  <Code className="w-2.5 h-2.5 text-muted-foreground inline-block align-middle" />
                  <span className="text-muted-foreground ml-0.5">{repo.language}</span>
                </>
              )}
              <span className="text-muted-foreground/40 mx-1.5">•</span>
              <span className="text-muted-foreground text-[10px]">
                {formatRelativeTime(repo.updated_at)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* PR count badge */}
            {totalPRs > 0 && (
              <Badge variant="default" className="h-4 text-[9px] px-1">
                {showOnlyMyPRs ? `${filteredPRs.length}/${totalPRs}` : totalPRs}
              </Badge>
            )}
            {/* Toggle: All PRs vs My PRs - always show if there are any PRs */}
            {currentUser && totalPRs > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'p-1 rounded transition-colors',
                      showOnlyMyPRs
                        ? 'text-primary bg-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      toggleMyPRsFilter(repo.full_name)
                    }}
                  >
                    {showOnlyMyPRs ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {showOnlyMyPRs
                    ? `Showing my PRs only (${myPRsCount}/${totalPRs})`
                    : `Show only my PRs (${myPRsCount} of ${totalPRs})`}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.open(repo.html_url, '_blank')
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Open on GitHub</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>

      {/* Content and Footer - hidden when minimized */}
      {!isMinimized && (
        <>
          <CardContent className="flex-1 overflow-auto pt-0 px-2 pb-1">
            {hasPRs ? (
              <div className="space-y-1.5 p-0.5">
                {filteredPRs.map((pr) => (
                  <PRCard key={pr.id} pr={pr} />
                ))}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center py-4">
                <div className="space-y-1">
                  <GitPullRequest className="w-6 h-6 text-muted-foreground/50 mx-auto" />
                  <p className="text-[10px] text-muted-foreground">
                    {showOnlyMyPRs && totalPRs > 0 ? 'No PRs by you' : 'No open PRs'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>

          {/* Footer - visual end marker */}
          <div
            className="flex-shrink-0 border-t border-border bg-muted/80 dark:bg-black/20 px-3 py-1.5 flex items-center justify-center gap-2"
            style={color ? { borderTopColor: `${color}40`, backgroundColor: `${color}15` } : {}}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-1 h-1 rounded-full bg-muted-foreground/40"
                style={color ? { backgroundColor: `${color}60` } : {}}
              />
              <div
                className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
                style={color ? { backgroundColor: `${color}70` } : {}}
              />
              <div
                className="w-1 h-1 rounded-full bg-muted-foreground/40"
                style={color ? { backgroundColor: `${color}60` } : {}}
              />
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
