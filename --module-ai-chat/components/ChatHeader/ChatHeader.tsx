/**
 * ChatHeader - Header for the AI Chat panel.
 * Uses ViewHeader-style elevation for visual consistency across the app.
 * Settings are shown in a popover.
 */

import {
  Button,
  ClaudeIcon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Loader2, Settings, Trash2, X } from 'lucide-react'
import type { ClaudeModel } from '../../types'

export interface ChatHeaderProps {
  apiKey: string | null
  selectedModel: string
  models: ClaudeModel[]
  isLoadingModels: boolean
  onModelChange: (modelId: string) => void
  onRemoveApiKey: () => void
  onClearHistory: () => void
  onClose: () => void
}

export function ChatHeader({
  apiKey,
  selectedModel,
  models,
  isLoadingModels,
  onModelChange,
  onRemoveApiKey,
  onClearHistory,
  onClose
}: ChatHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between h-10 px-3 py-2 section-header">
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
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-64 p-3">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Settings</h4>

                  {/* Model Selector */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground">Model</span>
                    {models.length > 0 ? (
                      <Select value={selectedModel} onValueChange={onModelChange}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select a model">
                            {selectedModel &&
                              (models.find((m) => m.id === selectedModel)?.display_name ||
                                selectedModel)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id} className="text-xs py-1.5">
                              {model.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {isLoadingModels ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Loading...</span>
                          </>
                        ) : (
                          <code className="bg-surface px-1.5 py-0.5 rounded text-[10px]">
                            {selectedModel}
                          </code>
                        )}
                      </div>
                    )}
                  </div>

                  {/* API Key Management */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">API Key</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive-subtle px-2"
                      onClick={onRemoveApiKey}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
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
