/**
 * ChatInput - Input area with API key entry, textarea, thinking slider, and quick actions
 */

import { Button, cn, Input, Slider, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Key, Loader2, Send, Square } from 'lucide-react'
import React, { useCallback, useEffect, useRef } from 'react'
import type { ChatMessage, CustomPrompt, QuickPrompt, StreamingState } from '../../types'
import { ContextIndicator } from '../ContextIndicator'
import { QuickActions } from '../QuickActions'

// Thinking budget range
const THINKING_MIN = 0
const THINKING_MAX = 32000
const THINKING_STEP = 1000

// Format thinking budget for display (compact)
function formatThinkingBudgetCompact(value: number): string {
  if (value === 0) return 'Off'
  if (value >= 1000) return `${value / 1000}k`
  return `${value}`
}

export interface ChatInputProps {
  // API Key state
  apiKey: string | null
  apiKeyInput: string
  isSettingKey: boolean
  onApiKeyInputChange: (value: string) => void
  onSetApiKey: () => void
  // Message state
  input: string
  isSending: boolean
  isContextValid: boolean
  linkedPRChat: boolean
  streaming: StreamingState
  messages: ChatMessage[]
  selectedModel: string
  // Thinking budget
  thinkingBudget: number
  onThinkingBudgetChange: (budget: number) => void
  // Quick actions
  prompts: QuickPrompt[]
  customPrompts: CustomPrompt[]
  // Handlers
  onInputChange: (value: string) => void
  onSendMessage: () => void
  onStopStreaming?: () => void
  onQuickActionSelect: (prompt: string, label: string) => void
  onAddCustomPrompt: (label: string, prompt: string) => Promise<void>
  onUpdateCustomPrompt: (id: string, label: string, prompt: string) => Promise<void>
  onDeleteCustomPrompt: (id: string) => Promise<void>
}

export function ChatInput({
  apiKey,
  apiKeyInput,
  isSettingKey,
  onApiKeyInputChange,
  onSetApiKey,
  input,
  isSending,
  isContextValid,
  linkedPRChat,
  streaming,
  messages,
  selectedModel,
  thinkingBudget,
  onThinkingBudgetChange,
  prompts,
  customPrompts,
  onInputChange,
  onSendMessage,
  onStopStreaming,
  onQuickActionSelect,
  onAddCustomPrompt,
  onUpdateCustomPrompt,
  onDeleteCustomPrompt
}: ChatInputProps): React.JSX.Element {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${Math.max(newHeight, 72)}px`
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSendMessage()
    }
  }

  const handleSendClick = () => {
    onSendMessage()
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px'
    }
  }

  // Focus textarea when API key is set
  useEffect(() => {
    if (apiKey && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [apiKey])

  // API Key Input
  if (!apiKey) {
    return (
      <div className="p-3 border-t border-border">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter Claude API key (sk-ant-...)"
              value={apiKeyInput}
              onChange={(e) => onApiKeyInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSetApiKey()}
              className="flex-1 h-9 text-sm"
              autoFocus
            />
            <Button
              onClick={onSetApiKey}
              disabled={isSettingKey || !apiKeyInput.trim()}
              size="icon"
              className="h-9 w-9"
            >
              {isSettingKey ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Get your key from{' '}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              console.anthropic.com
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Message Input
  return (
    <div className="p-3 border-t border-border">
      <div className="space-y-2">
        <QuickActions
          prompts={prompts}
          customPrompts={customPrompts}
          onSelect={onQuickActionSelect}
          onAddCustomPrompt={onAddCustomPrompt}
          onUpdateCustomPrompt={onUpdateCustomPrompt}
          onDeleteCustomPrompt={onDeleteCustomPrompt}
          disabled={isSending || streaming.isStreaming || (linkedPRChat && !isContextValid)}
        />

        <div className="relative">
          <textarea
            ref={textareaRef}
            placeholder={
              isSending
                ? 'Type to queue another message...'
                : linkedPRChat
                  ? 'Ask about this PR...'
                  : 'Type a message... (Shift+Enter for new line)'
            }
            value={input}
            onChange={(e) => {
              onInputChange(e.target.value)
              adjustTextareaHeight()
            }}
            onKeyDown={handleKeyDown}
            className="w-full min-h-[72px] max-h-[200px] px-3 py-2 pr-12 text-sm rounded-[8px] border border-border bg-secondary/50 resize-none transition-colors duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] placeholder:text-muted-foreground/60 hover:border-border/80 hover:bg-secondary/70 focus:outline-none focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]"
            style={{ height: '72px' }}
          />
          {/* FAB Send/Stop Button */}
          <div className="absolute bottom-4 right-2">
            {streaming.isStreaming && onStopStreaming ? (
              <Button
                onClick={onStopStreaming}
                variant="destructive"
                size="icon"
                className="h-6 w-6 rounded-full shadow-sm"
                title="Stop streaming"
              >
                <Square className="w-3 h-3" />
              </Button>
            ) : (
              <Button
                onClick={handleSendClick}
                disabled={!input.trim()}
                size="icon"
                className={cn(
                  'h-6 w-6 rounded-full shadow-sm',
                  isSending && input.trim() && 'bg-primary/70'
                )}
                title={isSending ? 'Add to queue (Enter)' : 'Send message (Enter)'}
              >
                <Send className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ContextIndicator
            messages={messages}
            streamingContent={streaming.content}
            streamingThinking={streaming.thinking}
            model={selectedModel}
            inputText={input}
          />

          {/* Compact Thinking Budget Slider */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Slider
                  value={[thinkingBudget]}
                  min={THINKING_MIN}
                  max={THINKING_MAX}
                  step={THINKING_STEP}
                  onValueChange={(values) => onThinkingBudgetChange(values[0])}
                  className="w-16"
                />
                <span
                  className={cn(
                    'text-[10px] tabular-nums ml-1',
                    thinkingBudget > 0 ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {formatThinkingBudgetCompact(thinkingBudget)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Extended thinking:{' '}
              {thinkingBudget === 0 ? 'Disabled' : `${thinkingBudget.toLocaleString()} tokens`}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
