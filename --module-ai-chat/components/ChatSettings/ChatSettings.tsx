/**
 * ChatSettings - Compact settings panel with model selector, thinking budget slider, and API key management
 */

import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider
} from '@ui-kit'
import { Loader2 } from 'lucide-react'
import React from 'react'
import type { ClaudeModel } from '../../types'

// Thinking budget range
const THINKING_MIN = 0
const THINKING_MAX = 32000
const THINKING_STEP = 1000

// Format thinking budget for display
function formatThinkingBudget(value: number): string {
  if (value === 0) return 'Off'
  if (value >= 1000) return `${value / 1000}k tokens`
  return `${value} tokens`
}

export interface ChatSettingsProps {
  models: ClaudeModel[]
  selectedModel: string
  thinkingBudget: number // 0 = off, otherwise token budget
  isLoadingModels: boolean
  onModelChange: (modelId: string) => void
  onThinkingBudgetChange: (budget: number) => void
  onRemoveApiKey: () => void
}

export function ChatSettings({
  models,
  selectedModel,
  thinkingBudget,
  isLoadingModels,
  onModelChange,
  onThinkingBudgetChange,
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

      {/* Extended Thinking Budget Slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 shrink-0">Thinking</span>
        <Slider
          value={[thinkingBudget]}
          min={THINKING_MIN}
          max={THINKING_MAX}
          step={THINKING_STEP}
          onValueChange={(values) => onThinkingBudgetChange(values[0])}
          className="flex-1"
        />
        <span className="text-[10px] text-muted-foreground tabular-nums min-w-[3.5rem] text-right">
          {formatThinkingBudget(thinkingBudget)}
        </span>
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
