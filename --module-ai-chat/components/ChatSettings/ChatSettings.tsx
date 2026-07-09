/**
 * ChatSettings - Compact settings panel with model selector (CLI-only mode)
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui-kit'
import { Loader2 } from 'lucide-react'
import React from 'react'
import type { ClaudeModel } from '../../types'

export interface ChatSettingsProps {
  models: ClaudeModel[]
  selectedModel: string
  isLoadingModels: boolean
  onModelChange: (modelId: string) => void
}

export function ChatSettings({
  models,
  selectedModel,
  isLoadingModels,
  onModelChange
}: ChatSettingsProps): React.JSX.Element {
  return (
    <div className="px-3 py-2 border-b border-border bg-surface space-y-2">
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
              <code className="bg-surface px-1.5 py-0.5 rounded text-[10px]">{selectedModel}</code>
            )}
          </div>
        )}
      </div>

      {/* CLI Status */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 shrink-0">CLI</span>
        <span className="text-xs text-muted-foreground">Uses your Claude Pro/Max subscription</span>
      </div>
    </div>
  )
}
