/**
 * ChatSettings - Compact settings panel with model selector, thinking toggle, and API key management
 */

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toggle
} from '@ui-kit'
import { Loader2 } from 'lucide-react'
import React from 'react'
import type { ClaudeModel } from '../../types'

export interface ChatSettingsProps {
  models: ClaudeModel[]
  selectedModel: string
  enableThinking: boolean
  isLoadingModels: boolean
  onModelChange: (modelId: string) => void
  onThinkingChange: (enabled: boolean) => void
  onRemoveApiKey: () => void
}

export function ChatSettings({
  models,
  selectedModel,
  enableThinking,
  isLoadingModels,
  onModelChange,
  onThinkingChange,
  onRemoveApiKey
}: ChatSettingsProps): React.JSX.Element {
  return (
    <div className="px-3 py-2 border-b border-border bg-muted/40 space-y-2">
      {/* Model Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 shrink-0">Model</span>
        {models.length > 0 ? (
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue placeholder="Select a model">
                {selectedModel &&
                  (models.find((m) => m.id === selectedModel)?.display_name || selectedModel)}
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
              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{selectedModel}</code>
            )}
          </div>
        )}
      </div>

      {/* Extended Thinking Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 shrink-0">Thinking</span>
        <Toggle size="xs" checked={enableThinking} onCheckedChange={onThinkingChange} />
      </div>

      {/* API Key Management */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 shrink-0">API Key</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
          onClick={onRemoveApiKey}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
