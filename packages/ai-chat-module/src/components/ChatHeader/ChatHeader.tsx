/**
 * ChatHeader - Header section with title, conversation navigator, and action buttons
 */

import {
  Button,
  ClaudeIcon,
  formatRelativeTime,
  ListMenu,
  ListMenuContent,
  ListMenuHeader,
  ListMenuItem,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@codelobby/ui-kit'
import { GitPullRequest, List, Settings, Trash2, X } from 'lucide-react'
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
  onSwitchToPRChat,
  onClearHistory,
  onClose,
  onDeletePRChat
}: ChatHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
      <div className="flex items-center gap-2 min-w-0">
        <ClaudeIcon className="w-5 h-5 text-primary flex-shrink-0" />
        <h2 className="font-semibold text-sm flex-shrink-0">AI Assistant</h2>
        {linkedPRChat && (
          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded truncate max-w-[120px]">
            #{linkedPRChat.prNumber}
          </span>
        )}
        {apiKey && selectedModel && (
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
            <PopoverContent className="w-80 p-0" align="end" side="bottom" sideOffset={5}>
              <ListMenu>
                <ListMenuHeader>
                  <h4 className="text-xs font-medium">PR Conversations ({allPRChats.length})</h4>
                </ListMenuHeader>
                <ListMenuContent>
                  {allPRChats.map((chat) => (
                    <ListMenuItem
                      key={chat.prId}
                      icon={<GitPullRequest className="w-4 h-4 text-blue-500" />}
                      title={`#${chat.prNumber} ${chat.prTitle}`}
                      description={`${chat.repoFullName} • ${chat.messageCount} msgs • ${formatRelativeTime(chat.updatedAt)}`}
                      active={linkedPRChat?.prId === chat.prId}
                      trailing={
                        linkedPRChat?.prId === chat.prId && (
                          <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
                            Active
                          </span>
                        )
                      }
                      actionButton={<X className="w-3 h-3 text-destructive" />}
                      actionTitle="Delete conversation"
                      onAction={async () => {
                        await onDeletePRChat(chat.prId)
                      }}
                      onClick={() => {
                        onSwitchToPRChat?.(chat.prId)
                        onShowConversationsChange(false)
                      }}
                    />
                  ))}
                </ListMenuContent>
              </ListMenu>
            </PopoverContent>
          </Popover>
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
