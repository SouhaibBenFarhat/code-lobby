/**
 * ChatHeader - Header for the AI Chat panel (CLI-only mode).
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
  selectedModel: string
  models: ClaudeModel[]
  isLoadingModels: boolean
  isConfigured: boolean
  onModelChange: (modelId: string) => void
  onClearHistory: () => void
  onClose: () => void
}

export function ChatHeader({
  selectedModel,
  models,
  isLoadingModels,
  isConfigured,
  onModelChange,
  onClearHistory,
  onClose
}: ChatHeaderProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between h-10 px-3 py-2 section-header">
      <div className="flex items-center gap-2 min-w-0">
        <ClaudeIcon className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="font-semibold text-sm">AI Chat</span>
        {isConfigured && selectedModel && (
          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
            • CLI{' '}
            {models.find((m) => m.id === selectedModel)?.display_name ||
              selectedModel.split('-').slice(0, 2).join(' ')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isConfigured && (
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
              <PopoverContent align="end" className="w-72 p-3">
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

                  {/* CLI mode info */}
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Using Claude Code CLI with your Pro/Max subscription. No API key needed.
                    </p>
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
