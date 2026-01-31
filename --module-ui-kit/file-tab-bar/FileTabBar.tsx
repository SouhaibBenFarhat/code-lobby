/**
 * FileTabBar - Horizontal tab bar for managing open files.
 *
 * Features:
 * - Horizontal scrolling for many tabs
 * - Close button on each tab
 * - Active tab highlighting
 * - File icons based on extension
 * - Drag reordering (future)
 */

import { FileCode, FileJson, FileText, FileType, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef } from 'react'
import { Button } from '../button'
import { ScrollArea, ScrollBar } from '../scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { cn } from '../utils'

export interface FileTab {
  /** Unique identifier for the tab */
  id: string
  /** Full file path */
  path: string
  /** File name (displayed in tab) */
  fileName: string
  /** Whether the file has unsaved changes */
  isModified?: boolean
}

export interface FileTabBarProps {
  /** Array of open file tabs */
  tabs: FileTab[]
  /** ID of the currently active tab */
  activeTabId: string | null
  /** Called when a tab is selected */
  onTabSelect: (tabId: string) => void
  /** Called when a tab close button is clicked */
  onTabClose: (tabId: string) => void
  /** Additional CSS classes */
  className?: string
}

/** Get file icon based on file extension */
function getFileIcon(fileName: string): React.JSX.Element {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <FileCode className="w-3.5 h-3.5 text-blue-400" />
    case 'json':
      return <FileJson className="w-3.5 h-3.5 text-yellow-400" />
    case 'md':
    case 'mdx':
      return <FileText className="w-3.5 h-3.5 text-gray-400" />
    case 'css':
    case 'scss':
    case 'less':
      return <FileType className="w-3.5 h-3.5 text-purple-400" />
    case 'html':
    case 'htm':
      return <FileCode className="w-3.5 h-3.5 text-orange-400" />
    case 'py':
      return <FileCode className="w-3.5 h-3.5 text-green-400" />
    case 'go':
      return <FileCode className="w-3.5 h-3.5 text-cyan-400" />
    case 'rs':
      return <FileCode className="w-3.5 h-3.5 text-orange-500" />
    case 'java':
    case 'kt':
      return <FileCode className="w-3.5 h-3.5 text-red-400" />
    case 'yaml':
    case 'yml':
      return <FileText className="w-3.5 h-3.5 text-pink-400" />
    default:
      return <FileText className="w-3.5 h-3.5 text-muted-foreground" />
  }
}

export function FileTabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  className
}: FileTabBarProps): React.JSX.Element {
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Scroll active tab into view when it changes
  useEffect(() => {
    // Only scroll if we have an active tab
    if (activeTabId && activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      })
    }
  }, [activeTabId])

  const handleTabClick = useCallback(
    (tabId: string) => {
      onTabSelect(tabId)
    },
    [onTabSelect]
  )

  const handleCloseClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      onTabClose(tabId)
    },
    [onTabClose]
  )

  if (tabs.length === 0) {
    return (
      <div
        className={cn(
          'file-tab-bar flex items-center h-9 px-3 bg-muted/30 border-b border-border/30 text-muted-foreground text-xs',
          className
        )}
      >
        No files open
      </div>
    )
  }

  return (
    <div className={cn('file-tab-bar h-9 bg-muted/30 border-b border-border/30', className)}>
      <ScrollArea className="h-full">
        <div className="flex items-stretch h-full">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId

            return (
              <Tooltip key={tab.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    ref={isActive ? activeTabRef : undefined}
                    className={cn(
                      'file-tab group flex items-center gap-2 px-3 h-full cursor-pointer border-r border-border/20 transition-colors',
                      'hover:bg-muted/50',
                      isActive
                        ? 'bg-background border-b-2 border-b-primary text-foreground'
                        : 'text-muted-foreground'
                    )}
                    onClick={() => handleTabClick(tab.id)}
                  >
                    {getFileIcon(tab.fileName)}

                    <span className="text-xs truncate max-w-[120px]">{tab.fileName}</span>

                    {tab.isModified && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'w-4 h-4 p-0 rounded-sm flex-shrink-0 transition-opacity',
                        'hover:bg-muted-foreground/20',
                        isActive
                          ? 'opacity-70 hover:opacity-100'
                          : 'opacity-0 group-hover:opacity-70'
                      )}
                      onClick={(e) => handleCloseClick(e, tab.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {tab.path}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  )
}
