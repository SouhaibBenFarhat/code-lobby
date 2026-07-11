/**
 * ChatInput - Input area with textarea, thinking slider, and quick actions
 */

import { Button, cn, Slider, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { Send, Square } from 'lucide-react'
import React, { useCallback, useRef } from 'react'
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
  return (
    <div className="px-3 pb-3 bg-chat">
      {/* Floating Cursor-style composer: textarea + divider + toolbar */}
      <div className="composer-glow relative rounded-xl border border-border bg-background overflow-hidden">
        {/* Upper part: textarea with vertically-centered send button */}
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
            className="w-full min-h-[72px] max-h-[200px] px-3 py-2.5 pr-12 text-sm bg-transparent border-0 resize-none placeholder:text-foreground-subtle focus:outline-none"
            style={{ height: '72px' }}
          />

          {/* Send / Stop button — vertically centered in the textarea area */}
          <div className="absolute top-1/2 right-2 -translate-y-1/2 z-10">
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
                variant="unstyled"
                size="none"
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center border border-border shadow-sm transition-colors',
                  'bg-surface-raised text-foreground-muted hover:bg-surface-hover hover:text-foreground',
                  isSending && input.trim() && 'text-foreground',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
                title={isSending ? 'Add to queue (Enter)' : 'Send message (Enter)'}
              >
                <Send className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Divider + toolbar: pre-prompts · context progress · thinking */}
        <div className="flex items-center gap-2 px-2 py-1.5 border-t border-border">
          <div className="flex-1 min-w-0">
            <QuickActions
              prompts={prompts}
              customPrompts={customPrompts}
              onSelect={onQuickActionSelect}
              onAddCustomPrompt={onAddCustomPrompt}
              onUpdateCustomPrompt={onUpdateCustomPrompt}
              onDeleteCustomPrompt={onDeleteCustomPrompt}
              disabled={isSending || streaming.isStreaming || (linkedPRChat && !isContextValid)}
            />
          </div>

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
                    thinkingBudget > 0 ? 'text-foreground' : 'text-muted-foreground'
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
