/**
 * ChatHeader - Header with horizontal tab bar for switching between chats (Cursor-style)
 */

import {
  Button,
  ClaudeIcon,
  cn,
  ScrollArea,
  ScrollBar,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@codelobby/ui-kit'
import { GitPullRequest, Plus, Settings, Trash2, X } from 'lucide-react'
import React, { useRef } from 'react'
import type { ClaudeModel, LinkedPRChat, PRChatInfo } from '../../types'

export interface ChatHeaderProps {
  linkedPRChat: LinkedPRChat | null | undefined
  apiKey: string | null
  selectedModel: string
  models: ClaudeModel[]
  allPRChats: PRChatInfo[]
  showSettings: boolean
  onShowSettingsChange: (show: boolean) => void
  onSwitchToPRChat?: (prId: string) => void
  onClearHistory: () => void
  onClose: () => void
  onDeletePRChat: (prId: string) => Promise<void>
}

export function ChatHeader({
  linkedPRChat,
  apiKey,
  selectedModel,
  models,
  allPRChats,
  showSettings,
  onShowSettingsChange,
  onSwitchToPRChat,
  onClearHistory,
  onClose,
  onDeletePRChat
}: ChatHeaderProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex flex-col border-b border-border bg-muted/20">
      {/* Top bar with logo and actions */}
      <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <ClaudeIcon className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="font-medium text-xs text-muted-foreground">AI Chat</span>
          {apiKey && selectedModel && (
            <span className="text-[10px] text-muted-foreground/60 truncate max-w-[80px]">
              •{' '}
              {models.find((m) => m.id === selectedModel)?.display_name ||
                selectedModel.split('-').slice(0, 2).join(' ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {apiKey && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onShowSettingsChange(!showSettings)}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearHistory}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear chat</TooltipContent>
              </Tooltip>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab bar - horizontal scrollable tabs */}
      {allPRChats.length > 0 && (
        <div className="relative">
          <ScrollArea className="w-full" ref={scrollRef}>
            <div className="flex items-stretch px-1 py-1 gap-0.5 min-w-max">
              {allPRChats.map((chat) => {
                const isActive = linkedPRChat?.prId === chat.prId
                return (
                  <div
                    key={chat.prId}
                    className={cn(
                      'group flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-pointer transition-all',
                      'border border-transparent hover:border-border/50 hover:bg-muted/50',
                      isActive && 'bg-background border-border shadow-sm'
                    )}
                  >
                    <Button
                      variant="unstyled"
                      size="none"
                      className="flex items-center gap-1.5 min-w-0"
                      onClick={() => onSwitchToPRChat?.(chat.prId)}
                    >
                      <GitPullRequest
                        className={cn(
                          'w-3.5 h-3.5 flex-shrink-0',
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <span
                        className={cn(
                          'truncate max-w-[100px]',
                          isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                        )}
                        title={`#${chat.prNumber} ${chat.prTitle}`}
                      >
                        #{chat.prNumber}
                      </span>
                    </Button>
                    <Button
                      variant="unstyled"
                      size="none"
                      className={cn(
                        'p-0.5 rounded hover:bg-destructive/20 transition-colors flex-shrink-0',
                        'opacity-0 group-hover:opacity-100',
                        isActive && 'opacity-60'
                      )}
                      onClick={async (e) => {
                        e.stopPropagation()
                        await onDeletePRChat(chat.prId)
                      }}
                      title="Close chat"
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                )
              })}
              {/* New chat indicator - just visual hint */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center px-2 py-1 text-muted-foreground/40 cursor-default">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Select a PR to start a new chat</TooltipContent>
              </Tooltip>
            </div>
            <ScrollBar orientation="horizontal" className="h-1.5" />
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
