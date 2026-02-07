/**
 * LabelsButton - Manage PR labels via dropdown
 *
 * A button that opens a popover to view, add, and remove labels from the PR.
 * Follows the same pattern as UpdateBranchButton, FindPreviewButton, etc.
 */

import type { github } from '@data'
import { useAddLabels, useRemoveLabel, useRepoLabels } from '@data'
import {
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Check, Loader2, Plus, RefreshCw, Search } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

import { useSelectedPR } from '../../hooks'

export type LabelsButtonProps = Record<string, never>

export function LabelsButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get repo full name from PR (null safe)
  const repoFullName = pr?.base.repo.full_name ?? null
  const currentLabels = pr?.labels ?? []
  const prNumber = pr?.number ?? 0

  // Fetch available labels for the repository
  const {
    data: repoLabels,
    isLoading: isLoadingLabels,
    isFetching: isFetchingLabels,
    refetch: refetchLabels
  } = useRepoLabels(repoFullName)

  // Mutations
  const addLabels = useAddLabels()
  const removeLabel = useRemoveLabel()

  // Filter and sort labels (selected first)
  const filteredLabels = useMemo(() => {
    if (!repoLabels) return []

    let labels = repoLabels
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      labels = repoLabels.filter(
        (label) =>
          label.name.toLowerCase().includes(query) ||
          label.description?.toLowerCase().includes(query)
      )
    }

    // Sort: selected labels first
    return labels.sort((a, b) => {
      const aSelected = currentLabels.some((l) => l.name === a.name)
      const bSelected = currentLabels.some((l) => l.name === b.name)
      if (aSelected && !bSelected) return -1
      if (!aSelected && bSelected) return 1
      return 0
    })
  }, [repoLabels, searchQuery, currentLabels])

  // Check if a label is currently on the PR
  const isLabelSelected = useCallback(
    (labelName: string) => {
      return currentLabels.some((l) => l.name === labelName)
    },
    [currentLabels]
  )

  // Toggle a label on/off
  const handleToggleLabel = useCallback(
    (label: github.RepoLabel) => {
      if (!repoFullName) return

      if (isLabelSelected(label.name)) {
        removeLabel.mutate({
          repoFullName,
          prNumber,
          labelName: label.name
        })
      } else {
        addLabels.mutate({
          repoFullName,
          prNumber,
          labels: [label.name]
        })
      }
    },
    [isLabelSelected, repoFullName, prNumber, addLabels, removeLabel]
  )

  const isPending = addLabels.isPending || removeLabel.isPending

  // Early return if no PR selected
  if (!pr) return null

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Add labels</TooltipContent>
      </Tooltip>

      <PopoverContent className="w-64 p-0" align="start">
        {/* Search and refresh */}
        <div className="p-2 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search labels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => refetchLabels()}
                disabled={isFetchingLabels}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isFetchingLabels && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh labels</TooltipContent>
          </Tooltip>
        </div>

        {/* Labels list */}
        <div className="max-h-[300px] overflow-y-auto">
          {isLoadingLabels ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? 'No labels found' : 'No labels available'}
            </div>
          ) : (
            <div className="p-1 flex flex-col gap-1">
              {filteredLabels.map((label) => {
                const isSelected = isLabelSelected(label.name)
                return (
                  <button
                    key={label.name}
                    type="button"
                    onClick={() => handleToggleLabel(label)}
                    disabled={isPending}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm',
                      'transition-colors hover:bg-interactive-hover',
                      isSelected && 'bg-info-subtle'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `#${label.color}` }}
                    />
                    <span className="flex-1 text-left truncate">{label.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
