/**
 * LabelsSection - Display and manage PR labels
 *
 * Shows current labels on the PR and allows adding/removing labels
 * from the repository's available labels.
 */

import type { github } from '@data'
import { useAddLabels, useRemoveLabel, useRepoLabels } from '@data'
import {
  Badge,
  Button,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Check, Loader2, Plus, Search, Tag, X } from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

export interface LabelsSectionProps {
  /** Current labels on the PR */
  labels: Array<{ name: string; color: string }>
  /** Repository full name (owner/repo) */
  repoFullName: string
  /** PR number */
  prNumber: number
}

/**
 * Get contrasting text color (black or white) based on background color
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Parse RGB values
  const r = Number.parseInt(hex.substring(0, 2), 16)
  const g = Number.parseInt(hex.substring(2, 4), 16)
  const b = Number.parseInt(hex.substring(4, 6), 16)

  // Calculate luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export function LabelsSection({
  labels,
  repoFullName,
  prNumber
}: LabelsSectionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch available labels for the repository
  const { data: repoLabels, isLoading: isLoadingLabels } = useRepoLabels(repoFullName)

  // Mutations
  const addLabels = useAddLabels()
  const removeLabel = useRemoveLabel()

  // Filter labels based on search
  const filteredLabels = useMemo(() => {
    if (!repoLabels) return []
    if (!searchQuery) return repoLabels

    const query = searchQuery.toLowerCase()
    return repoLabels.filter(
      (label) =>
        label.name.toLowerCase().includes(query) || label.description?.toLowerCase().includes(query)
    )
  }, [repoLabels, searchQuery])

  // Check if a label is currently on the PR
  const isLabelSelected = useCallback(
    (labelName: string) => {
      return labels.some((l) => l.name === labelName)
    },
    [labels]
  )

  // Toggle a label on/off
  const handleToggleLabel = useCallback(
    (label: github.RepoLabel) => {
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

  // Remove a label (from the label badge X button)
  const handleRemoveLabel = useCallback(
    (labelName: string) => {
      removeLabel.mutate({
        repoFullName,
        prNumber,
        labelName
      })
    },
    [repoFullName, prNumber, removeLabel]
  )

  const isPending = addLabels.isPending || removeLabel.isPending

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Current labels */}
      {labels.map((label) => (
        <Badge
          key={label.name}
          variant="outline"
          className="group flex items-center gap-1 pr-1 text-xs font-medium"
          style={{
            backgroundColor: `#${label.color}`,
            color: getContrastColor(label.color),
            borderColor: `#${label.color}`
          }}
        >
          <span>{label.name}</span>
          <button
            type="button"
            onClick={() => handleRemoveLabel(label.name)}
            disabled={isPending}
            className={cn(
              'ml-0.5 rounded-full p-0.5 transition-colors',
              'opacity-60 hover:opacity-100',
              'hover:bg-black/20 dark:hover:bg-white/20'
            )}
          >
            <X className="w-3 h-3" />
          </button>
        </Badge>
      ))}

      {/* Add label button with popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
          >
            <Tag className="w-3 h-3" />
            <Plus className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="max-h-[280px]">
            {isLoadingLabels ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No labels found' : 'No labels available'}
              </div>
            ) : (
              <div className="p-1">
                {filteredLabels.map((label) => {
                  const isSelected = isLabelSelected(label.name)
                  return (
                    <Tooltip key={label.name}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleToggleLabel(label)}
                          disabled={isPending}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm',
                            'transition-colors hover:bg-muted',
                            isSelected && 'bg-muted/50'
                          )}
                        >
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: `#${label.color}` }}
                          />
                          <span className="flex-1 text-left truncate">{label.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                        </button>
                      </TooltipTrigger>
                      {label.description && (
                        <TooltipContent side="right" className="max-w-[200px]">
                          {label.description}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {isPending && (
            <div className="p-2 border-t text-center text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
              Updating labels...
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Show empty state if no labels */}
      {labels.length === 0 && <span className="text-xs text-muted-foreground">No labels</span>}
    </div>
  )
}
