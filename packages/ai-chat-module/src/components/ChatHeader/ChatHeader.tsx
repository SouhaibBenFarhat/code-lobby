/**
 * ChatHeader - Header section with title, conversation navigator, and action buttons
 */

import {
  Button,
  ClaudeIcon,
  cn,
  formatRelativeTime,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@codelobby/ui-kit'
import { ArrowLeft, GitPullRequest, List, MessageSquare, Settings, Trash2, X } from 'lucide-react'
import React from 'react'
import type { ClaudeModel, LinkedPRChat, PRChatInfo } from '../../types'

export interface ChatHeaderProps {
  linkedPRChat: LinkedPRChat | null | undefined
  apiKey: string | null
  selectedModel: string
  models: ClaudeModel[]
  allPRChats: PRChatInfo[]
  showConversations: boolean
  showSettings: boolean
  onShowConversationsChange: (show: boolean) => void
  onShowSettingsChange: (show: boolean) => void
  onClosePRChat?: () => void
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
  showConversations,
  showSettings,
  onShowConversationsChange,
  onShowSettingsChange,
  onClosePRChat,
  onSwitchToPRChat,
  onClearHistory,
  onClose,
  onDeletePRChat
}: ChatHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2 min-w-0">
        <ClaudeIcon className="w-5 h-5 text-primary flex-shrink-0" />
        <h2 className="font-semibold text-sm flex-shrink-0">
          {linkedPRChat ? 'PR Chat' : 'AI Assistant'}
        </h2>
        {linkedPRChat && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded truncate max-w-[120px]">
            #{linkedPRChat.prNumber}
          </span>
        )}
        {!linkedPRChat && apiKey && selectedModel && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            (
            {models.find((m) => m.id === selectedModel)?.display_name ||
              selectedModel.split('-').slice(0, 2).join(' ')}
            )
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Conversation Navigator */}
        {allPRChats.length > 0 && (
          <Popover open={showConversations} onOpenChange={onShowConversationsChange}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 relative"
                title="Switch conversation"
              >
                <List className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                  {allPRChats.length}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end" side="bottom" sideOffset={5}>
              <div className="p-2 border-b border-border">
                <h4 className="text-xs font-medium">Conversations</h4>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                <button
                  type="button"
                  className={cn(
                    'w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2',
                    !linkedPRChat && 'bg-primary/10'
                  )}
                  onClick={() => {
                    onClosePRChat?.()
                    onShowConversationsChange(false)
                  }}
                >
                  <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">General Chat</div>
                    <div className="text-[10px] text-muted-foreground">Main AI conversation</div>
                  </div>
                  {!linkedPRChat && (
                    <span className="text-[10px] text-primary font-medium">Active</span>
                  )}
                </button>

                {allPRChats.length > 0 && (
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium bg-muted/30">
                    PR Conversations ({allPRChats.length})
                  </div>
                )}

                {allPRChats.map((chat) => (
                  <div
                    key={chat.prId}
                    className={cn(
                      'group w-full px-3 py-2 hover:bg-muted/50 transition-colors flex items-start gap-2',
                      linkedPRChat?.prId === chat.prId && 'bg-primary/10'
                    )}
                  >
                    <GitPullRequest className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <button
                      type="button"
                      className="flex-1 text-left min-w-0"
                      onClick={() => {
                        onSwitchToPRChat?.(chat.prId)
                        onShowConversationsChange(false)
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate flex-1">
                          #{chat.prNumber} {chat.prTitle}
                        </span>
                        {linkedPRChat?.prId === chat.prId && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {chat.repoFullName} • {chat.messageCount} msgs •{' '}
                        {formatRelativeTime(chat.updatedAt)}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity flex-shrink-0"
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (linkedPRChat?.prId === chat.prId) {
                          onClosePRChat?.()
                        }
                        await onDeletePRChat(chat.prId)
                      }}
                      title="Delete conversation"
                    >
                      <X className="w-3 h-3 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {linkedPRChat && onClosePRChat && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClosePRChat}
            title="Back to general chat"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        {apiKey && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onShowSettingsChange(!showSettings)}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClearHistory}
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
