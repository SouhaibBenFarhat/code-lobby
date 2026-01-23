/**
 * ChatSettings - Settings panel with model selector, thinking toggle, and API key management
 */

import {
  Button,
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@codelobby/ui-kit'
import { Brain, Loader2, RefreshCw } from 'lucide-react'
import React from 'react'
import type { ClaudeModel } from '../../types'

export interface ChatSettingsProps {
  models: ClaudeModel[]
  selectedModel: string
  enableThinking: boolean
  isLoadingModels: boolean
  onModelChange: (modelId: string) => void
  onThinkingChange: (enabled: boolean) => void
  onLoadModels: () => void
  onRemoveApiKey: () => void
}

export function ChatSettings({
  models,
  selectedModel,
  enableThinking,
  isLoadingModels,
  onModelChange,
  onThinkingChange,
  onLoadModels,
  onRemoveApiKey
}: ChatSettingsProps): React.JSX.Element {
  return (
    <div className="p-3 border-b border-border bg-muted/40 space-y-3">
      {/* Model Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Model</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={onLoadModels}
            disabled={isLoadingModels}
            title="Refresh models"
          >
            <RefreshCw className={cn('w-3 h-3', isLoadingModels && 'animate-spin')} />
          </Button>
        </div>
        {models.length > 0 ? (
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="h-auto min-h-[32px] text-xs py-1">
              <SelectValue placeholder="Select a model">
                {selectedModel && (
                  <div className="flex flex-col items-start">
                    <span>
                      {models.find((m) => m.id === selectedModel)?.display_name || selectedModel}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{selectedModel}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id} className="text-xs py-2">
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
                <span>Loading models...</span>
              </>
            ) : (
              <>
                <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{selectedModel}</code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1"
                  onClick={onLoadModels}
                >
                  Load models
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Extended Thinking Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Extended Thinking</span>
        </div>
        <Button
          variant="unstyled"
          size="none"
          onClick={() => onThinkingChange(!enableThinking)}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            enableThinking ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
              enableThinking ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </Button>
      </div>
      {enableThinking && (
        <p className="text-[10px] text-muted-foreground">
          Shows Claude's reasoning process. Uses more tokens.
        </p>
      )}

      {/* API Key Management */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">API Key configured</span>
        <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={onRemoveApiKey}>
          Remove Key
        </Button>
      </div>
    </div>
  )
}
