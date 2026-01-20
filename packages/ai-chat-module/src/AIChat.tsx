/**
 * AI Chat Component
 *
 * Demonstrates the modular architecture for a complex component:
 * - Reads all state from shared store
 * - Uses Actions for all mutations
 * - No cross-imports from other modules
 */

import { useState, useRef, useEffect } from 'react'
import { Store, useSignal, Actions, type ChatMessage } from '@codelobby/shared-store'

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function MessageBubble({
  message,
  userAvatar
}: {
  message: ChatMessage
  userAvatar?: string
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser ? 'bg-primary' : 'bg-orange-500'
        }`}
      >
        {isUser ? (
          userAvatar ? (
            <img src={userAvatar} alt="You" className="w-full h-full rounded-full" />
          ) : (
            <span className="text-xs text-primary-foreground font-medium">You</span>
          )
        ) : (
          <span className="text-xs text-white font-medium">AI</span>
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 rounded-2xl px-4 py-2.5 max-w-[85%] ${
          isUser
            ? 'bg-primary text-primary-foreground ml-auto rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        }`}
      >
        {/* Thinking (for assistant messages) */}
        {!isUser && message.thinking && (
          <details className="mb-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              View reasoning
            </summary>
            <div className="mt-2 p-2 bg-background/50 rounded text-xs text-muted-foreground whitespace-pre-wrap">
              {message.thinking}
            </div>
          </details>
        )}

        {/* Message text */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Timestamp */}
        <p
          className={`text-[10px] mt-1 ${
            isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}

function ThinkingIndicator({ content }: { content: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content])

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-orange-500 flex-shrink-0 flex items-center justify-center">
        <span className="text-xs text-white font-medium">AI</span>
      </div>
      <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Thinking...</span>
        </div>
        <div
          ref={scrollRef}
          className="max-h-32 overflow-y-auto text-xs text-muted-foreground whitespace-pre-wrap"
        >
          {content}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function AIChat() {
  // ─────────────────────────────────────────────────────────────────────────
  // Read from shared store
  // ─────────────────────────────────────────────────────────────────────────
  const user = useSignal(Store.user)
  const chatHistory = useSignal(Store.chatHistory)
  const isLoading = useSignal(Store.isAILoading)
  const thinking = useSignal(Store.aiThinking)
  const selectedPR = useSignal(Store.selectedPR)
  const aiPanelWidth = useSignal(Store.aiPanelWidth)

  // ─────────────────────────────────────────────────────────────────────────
  // Local state
  // ─────────────────────────────────────────────────────────────────────────
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory.length])

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!input.trim() || isLoading) return
    Actions.sendAIMessage(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClose = () => {
    Actions.toggleAIPanel()
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-background" style={{ width: aiPanelWidth }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">AI</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold">AI Assistant</h3>
            <p className="text-[10px] text-muted-foreground">Powered by Claude</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* PR Context Badge (if a PR is selected) */}
      {selectedPR && (
        <div className="px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Context:</span>
            <span className="font-medium truncate">
              {selectedPR.base.repo.full_name}#{selectedPR.number}
            </span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <h4 className="text-sm font-medium mb-1">Start a conversation</h4>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Ask me anything about your code, PRs, or development workflow.
            </p>
          </div>
        ) : (
          <>
            {chatHistory.map((message) => (
              <MessageBubble key={message.id} message={message} userAvatar={user?.avatar_url} />
            ))}
            {isLoading && thinking && <ThinkingIndicator content={thinking} />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 resize-none bg-muted rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
