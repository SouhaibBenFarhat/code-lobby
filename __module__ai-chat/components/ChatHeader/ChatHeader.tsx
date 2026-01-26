/**
 * ChatHeader - Header for the AI Chat panel.
 * Uses ViewHeader-style elevation for visual consistency across the app.
 */

import { Button, ClaudeIcon, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Settings, Trash2, X } from 'lucide-react'
import type { ClaudeModel } from '../../types'

export interface ChatHeaderProps {
  apiKey: string | null
  selectedModel: string
  models: ClaudeModel[]
  showSettings: boolean
  onShowSettingsChange: (show: boolean) => void
  onClearHistory: () => void
  onClose: () => void
}

export function ChatHeader({
  apiKey,
  selectedModel,
  models,
  showSettings,
  onShowSettingsChange,
  onClearHistory,
  onClose
}: ChatHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between h-10 px-3 py-2 border-b border-border bg-card/80 dark:bg-card/60 backdrop-blur-sm shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10">
      <div className="flex items-center gap-2 min-w-0">
        <ClaudeIcon className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="font-semibold text-sm">AI Chat</span>
        {apiKey && selectedModel && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
            •{' '}
            {models.find((m) => m.id === selectedModel)?.display_name ||
              selectedModel.split('-').slice(0, 2).join(' ')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {apiKey && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onShowSettingsChange(!showSettings)}
                >
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClearHistory}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear chat</TooltipContent>
            </Tooltip>
          </>
        )}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}
