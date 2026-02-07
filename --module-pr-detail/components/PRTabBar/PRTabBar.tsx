/**
 * PRTabBar - Chrome-styled tab bar for PR detail view
 *
 * Shows PR detail tab + any webview tabs, with a "+" button to add new tabs.
 */

import type { PRWebviewTab } from '@data'
import { Button, cn, Input, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Globe, Plus, X } from 'lucide-react'
import React, { useCallback, useState } from 'react'

export interface PRTabBarProps {
  /** Current PR title */
  prTitle: string
  /** PR number */
  prNumber: number
  /** List of webview tabs */
  tabs: PRWebviewTab[]
  /** Currently active tab (null = PR detail) */
  activeTabId: string | null
  /** Called when PR detail tab is selected */
  onSelectPRDetail: () => void
  /** Called when a webview tab is selected */
  onSelectTab: (tabId: string) => void
  /** Called when a webview tab is closed */
  onCloseTab: (tabId: string) => void
  /** Called when a new tab is added */
  onAddTab: (url: string) => void
}

export function PRTabBar({
  prTitle,
  prNumber,
  tabs,
  activeTabId,
  onSelectPRDetail,
  onSelectTab,
  onCloseTab,
  onAddTab
}: PRTabBarProps): React.JSX.Element {
  const [isAddingTab, setIsAddingTab] = useState(false)
  const [newTabUrl, setNewTabUrl] = useState('')

  const handleAddTab = useCallback(() => {
    if (newTabUrl.trim()) {
      // Add https:// if no protocol specified
      let url = newTabUrl.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`
      }
      onAddTab(url)
      setNewTabUrl('')
      setIsAddingTab(false)
    }
  }, [newTabUrl, onAddTab])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleAddTab()
      } else if (e.key === 'Escape') {
        setIsAddingTab(false)
        setNewTabUrl('')
      }
    },
    [handleAddTab]
  )

  return (
    <div className="flex items-end gap-0.5 px-2 pt-2 bg-surface-content border-b border-border-muted overflow-x-auto">
      {/* PR Detail Tab (always first) */}
      <button
        type="button"
        onClick={onSelectPRDetail}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-sm rounded-t-lg transition-colors min-w-[120px] max-w-[200px]',
          'border border-b-0',
          activeTabId === null
            ? 'bg-background border-border text-foreground'
            : 'bg-surface border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover'
        )}
      >
        <span className="font-mono text-xs text-muted-foreground">#{prNumber}</span>
        <span className="truncate flex-1 text-left">{prTitle}</span>
      </button>

      {/* Webview Tabs */}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'group flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-lg transition-colors min-w-[120px] max-w-[200px]',
            'border border-b-0',
            activeTabId === tab.id
              ? 'bg-background border-border text-foreground'
              : 'bg-surface border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover'
          )}
        >
          <button
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className="flex items-center gap-1.5 flex-1 min-w-0"
          >
            <Globe className="w-3.5 h-3.5 flex-shrink-0 text-info" />
            <span className="truncate flex-1 text-left">{tab.title || getHostname(tab.url)}</span>
          </button>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                className={cn(
                  'p-0.5 rounded hover:bg-interactive-hover transition-opacity',
                  activeTabId === tab.id
                    ? 'opacity-60 hover:opacity-100'
                    : 'opacity-0 group-hover:opacity-60'
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Close tab</TooltipContent>
          </Tooltip>
        </div>
      ))}

      {/* New Tab Input or Add Button */}
      {isAddingTab ? (
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Input
            value={newTabUrl}
            onChange={(e) => setNewTabUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newTabUrl.trim()) {
                setIsAddingTab(false)
              }
            }}
            placeholder="Enter URL..."
            className="h-6 w-[200px] text-xs"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddTab}>
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full mb-0.5"
              onClick={() => setIsAddingTab(true)}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New tab</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/** Extract hostname from URL */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url.slice(0, 30)
  }
}
