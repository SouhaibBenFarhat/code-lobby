/**
 * RepoCard - A draggable card displaying a repository and its PRs.
 * Each card fetches its OWN PRs independently for isolated loading states.
 * Uses ViewHeader-style elevation for visual consistency.
 */

import { usePRsForRepo, useRefreshRepoPRs } from '@codelobby/queries'
import type { Repository } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@codelobby/ui-kit'
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FolderGit2,
  GitPullRequest,
  Loader2,
  Palette,
  RefreshCw,
  User,
  Users,
  X
} from 'lucide-react'
import React, { memo, useMemo } from 'react'
import { PRCard } from './PRCard'

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

export const RepoCard: React.MemoExoticComponent<(props: RepoCardProps) => React.JSX.Element> =
  memo(function RepoCard({
    repo,
    className,
    style,
    isDraggable = true,
    onClose,
    color,
    onColorChange,
    currentUser,
    isMinimized = false,
    onMinimizeChange
  }: RepoCardProps): React.JSX.Element {
    const [colorPickerOpen, setColorPickerOpen] = React.useState(false)

    // ═══════════════════════════════════════════════════════════════════════════
    // EACH CARD FETCHES ITS OWN PRs - Independent loading per card!
    // ═══════════════════════════════════════════════════════════════════════════
    const { data: prs = [], isLoading: isLoadingPRs } = usePRsForRepo(repo.full_name)
    const refreshMutation = useRefreshRepoPRs()
    const isReloading = refreshMutation.isPending

    // Use shared store instead of context
    const myPRsRepos = useSignal(Store.myPRsRepos)
    const showOnlyMyPRs = myPRsRepos.includes(repo.full_name)

    const handleToggleMyPRsFilter = () => {
      Actions.toggleMyPRsFilter(repo.full_name)
    }

    const handleReload = () => {
      refreshMutation.mutate(repo.full_name)
    }

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
        {/* Header with ViewHeader-style elevation */}
        <div
          className={cn(
            'flex items-center h-10 px-2 border-b border-border',
            'bg-card/80 dark:bg-card/60 backdrop-blur-sm',
            'shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]',
            'relative z-10',
            isDraggable && 'drag-handle cursor-grab active:cursor-grabbing'
          )}
          style={color ? { backgroundColor: `${color}15`, borderBottomColor: `${color}40` } : {}}
        >
          {/* Left: Avatar + Repo name */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Avatar className="h-6 w-6 rounded-md flex-shrink-0">
              <AvatarImage src={repo.owner.avatar_url} alt={repo.owner.login} />
              <AvatarFallback className="rounded-md text-[8px]">
                {repo.owner.login.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1.5 min-w-0">
              <FolderGit2
                className="w-3.5 h-3.5 flex-shrink-0"
                style={color ? { color } : { color: 'hsl(var(--primary))' }}
              />
              <span className="font-semibold text-sm truncate">{repo.name}</span>
              {totalPRs > 0 && (
                <Badge
                  variant="default"
                  className="h-4 text-[9px] px-1 flex-shrink-0"
                  style={color ? { backgroundColor: color } : {}}
                >
                  {showOnlyMyPRs ? `${filteredPRs.length}/${totalPRs}` : totalPRs}
                </Badge>
              )}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Color picker */}
            {onColorChange && (
              <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Palette className="w-3.5 h-3.5" style={color ? { color } : {}} />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Change card color</TooltipContent>
                </Tooltip>
                <PopoverContent
                  className="w-auto p-2"
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid grid-cols-6 gap-1">
                    {COLOR_PALETTE.map((c) => (
                      <Button
                        variant="unstyled"
                        size="none"
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
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* My PRs filter toggle */}
            {currentUser && totalPRs > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn('h-6 w-6', showOnlyMyPRs && 'text-primary bg-primary/20')}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleToggleMyPRsFilter()
                    }}
                  >
                    {showOnlyMyPRs ? (
                      <User className="w-3.5 h-3.5" />
                    ) : (
                      <Users className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showOnlyMyPRs
                    ? `Showing my PRs only (${myPRsCount}/${totalPRs})`
                    : `Show only my PRs (${myPRsCount} of ${totalPRs})`}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Reload button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={isReloading}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReload()
                  }}
                >
                  {isReloading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload PRs</TooltipContent>
            </Tooltip>

            {/* External link */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.open(repo.html_url, '_blank')
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open on GitHub</TooltipContent>
            </Tooltip>

            {/* Minimize button */}
            {onMinimizeChange && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
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
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMinimized ? 'Expand' : 'Minimize'}</TooltipContent>
              </Tooltip>
            )}

            {/* Close button */}
            {onClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onClose()
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Hide this repo</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Content - hidden when minimized */}
        {!isMinimized && (
          <CardContent className="flex-1 overflow-auto pt-2 px-2 pb-2">
            {isLoadingPRs ? (
              <div className="h-full flex items-center justify-center text-center py-4">
                <div className="space-y-2">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                  <p className="text-[10px] text-muted-foreground">Loading PRs...</p>
                </div>
              </div>
            ) : hasPRs ? (
              <div className="space-y-1.5">
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
        )}
      </Card>
    )
  })
