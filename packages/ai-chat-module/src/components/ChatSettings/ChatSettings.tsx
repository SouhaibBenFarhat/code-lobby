/**
 * ChatSettings - Settings panel with model selector, thinking toggle, web search, and API key management
 */

import {
  Button,
  cn,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@codelobby/ui-kit'
import { Brain, Check, Globe, Loader2, RefreshCw, X } from 'lucide-react'
import React, { useState } from 'react'
import type { ClaudeModel } from '../../types'

export interface ChatSettingsProps {
  models: ClaudeModel[]
  selectedModel: string
  enableThinking: boolean
  enableWebSearch: boolean
  hasTavilyKey: boolean
  isLoadingModels: boolean
  onModelChange: (modelId: string) => void
  onThinkingChange: (enabled: boolean) => void
  onWebSearchChange: (enabled: boolean) => void
  onTavilyKeySubmit: (key: string) => Promise<{ success: boolean; error?: string }>
  onTavilyKeyRemove: () => void
  onLoadModels: () => void
  onRemoveApiKey: () => void
}

export function ChatSettings({
  models,
  selectedModel,
  enableThinking,
  enableWebSearch,
  hasTavilyKey,
  isLoadingModels,
  onModelChange,
  onThinkingChange,
  onWebSearchChange,
  onTavilyKeySubmit,
  onTavilyKeyRemove,
  onLoadModels,
  onRemoveApiKey
}: ChatSettingsProps): React.JSX.Element {
  const [showTavilyInput, setShowTavilyInput] = useState(false)
  const [tavilyKey, setTavilyKey] = useState('')
  const [tavilyError, setTavilyError] = useState<string | null>(null)
  const [isSubmittingTavily, setIsSubmittingTavily] = useState(false)

  const handleTavilySubmit = async () => {
    if (!tavilyKey.trim()) return

    setIsSubmittingTavily(true)
    setTavilyError(null)

    const result = await onTavilyKeySubmit(tavilyKey.trim())

    if (result.success) {
      setTavilyKey('')
      setShowTavilyInput(false)
    } else {
      setTavilyError(result.error || 'Failed to set API key')
    }

    setIsSubmittingTavily(false)
  }

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
        <button
          type="button"
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
        </button>
      </div>
      {enableThinking && (
        <p className="text-[10px] text-muted-foreground">
          Shows Claude's reasoning process. Uses more tokens.
        </p>
      )}

      {/* Web Search Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Web Search</span>
          {!hasTavilyKey && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-warning cursor-help">(needs API key)</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Configure a Tavily API key to enable web search</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <button
          type="button"
          onClick={() => hasTavilyKey && onWebSearchChange(!enableWebSearch)}
          disabled={!hasTavilyKey}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            !hasTavilyKey && 'opacity-50 cursor-not-allowed',
            enableWebSearch && hasTavilyKey ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
              enableWebSearch && hasTavilyKey ? 'translate-x-5' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {/* Tavily API Key Input */}
      {!hasTavilyKey ? (
        <div className="space-y-2">
          {!showTavilyInput ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => setShowTavilyInput(true)}
            >
              <Globe className="w-3 h-3 mr-1" />
              Add Tavily API Key
            </Button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-1">
                <Input
                  type="password"
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..."
                  className="h-7 text-xs font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handleTavilySubmit()}
                />
                <Button
                  variant="default"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleTavilySubmit}
                  disabled={!tavilyKey.trim() || isSubmittingTavily}
                >
                  {isSubmittingTavily ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setShowTavilyInput(false)
                    setTavilyKey('')
                    setTavilyError(null)
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {tavilyError && <p className="text-[10px] text-destructive">{tavilyError}</p>}
              <p className="text-[10px] text-muted-foreground">
                Get your API key at{' '}
                <a
                  href="https://tavily.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  tavily.com
                </a>
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Tavily API Key configured</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] text-destructive hover:text-destructive"
            onClick={onTavilyKeyRemove}
          >
            Remove
          </Button>
        </div>
      )}

      {enableWebSearch && hasTavilyKey && (
        <p className="text-[10px] text-muted-foreground">
          Claude can search the web for current information.
        </p>
      )}

      {/* API Key Management */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">Claude API Key configured</span>
        <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={onRemoveApiKey}>
          Remove Key
        </Button>
      </div>
    </div>
  )
}
