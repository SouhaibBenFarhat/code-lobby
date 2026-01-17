import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Send, Trash2, Key, Loader2, Bot, User, AlertCircle, Settings, X, RefreshCw, Brain, ChevronRight, ArrowDown } from 'lucide-react'

// Utility for throttling with requestAnimationFrame
function useThrottledValue<T>(value: T, fps = 30): T {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastUpdateRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const minInterval = 1000 / fps
    const now = performance.now()
    
    if (now - lastUpdateRef.current >= minInterval) {
      setThrottledValue(value)
      lastUpdateRef.current = now
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = requestAnimationFrame(() => {
        setThrottledValue(value)
        lastUpdateRef.current = performance.now()
      })
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [value, fps])

  return throttledValue
}
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { cn } from '@/lib/utils'
import { MarkdownContent } from './MarkdownContent'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
}

interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
}

interface AIChatPanelProps {
  onClose: () => void
}

// Streaming state for the current assistant message being generated
interface StreamingState {
  content: string
  thinking: string
  isStreaming: boolean
}

// Queued message waiting to be sent
interface QueuedMessage {
  id: string
  content: string
}

// Virtualized message list component for performance
// IMPORTANT: Streaming content is rendered OUTSIDE the virtualizer to avoid constant re-measurements
interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  streaming: StreamingState
  throttledStreaming: StreamingState // Throttled version for display
  messageQueue: QueuedMessage[]
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  setMessageQueue: React.Dispatch<React.SetStateAction<QueuedMessage[]>>
  scrollContainerRef: React.RefObject<HTMLDivElement>
  onScroll: () => void
  onVirtualizerReady: (scrollToEnd: () => void) => void
}

function VirtualizedMessageList({
  messages,
  streaming,
  throttledStreaming,
  messageQueue,
  expandedThinking,
  toggleThinkingExpanded,
  setMessageQueue,
  scrollContainerRef,
  onScroll,
  onVirtualizerReady,
}: VirtualizedMessageListProps) {
  // Only virtualize static messages - streaming content is rendered separately
  const allItems = useMemo(() => {
    const items: Array<{ type: 'message' | 'queued'; data: ChatMessage | QueuedMessage; index?: number }> = []
    
    // Add messages
    messages.forEach(msg => {
      items.push({ type: 'message', data: msg })
    })
    
    // Add queued messages (these are static, ok to virtualize)
    messageQueue.forEach((msg, idx) => {
      items.push({ type: 'queued', data: msg, index: idx })
    })
    
    return items
  }, [messages, messageQueue])

  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 100, // Slightly larger estimate for safety
    overscan: 5, // Render 5 extra items above/below viewport
  })

  const virtualItems = virtualizer.getVirtualItems()
  
  // Expose scrollToEnd function to parent via callback
  // This uses virtualizer's scrollToIndex which is more reliable
  useLayoutEffect(() => {
    const scrollToEnd = () => {
      if (allItems.length > 0) {
        // Use virtualizer's scrollToIndex for accurate positioning
        virtualizer.scrollToIndex(allItems.length - 1, { align: 'end' })
        
        // Also scroll to absolute bottom to include streaming content
        requestAnimationFrame(() => {
          const container = scrollContainerRef.current
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        })
      }
    }
    onVirtualizerReady(scrollToEnd)
  }, [allItems.length, virtualizer, onVirtualizerReady, scrollContainerRef])

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-auto p-3"
      onScroll={onScroll}
    >
      {/* Virtualized messages */}
      <div
        style={{
          height: allItems.length > 0 ? `${virtualizer.getTotalSize()}px` : 'auto',
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = allItems[virtualItem.index]
          
          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="pb-3"
            >
              {item.type === 'message' && (
                <MessageBubble
                  message={item.data as ChatMessage}
                  expandedThinking={expandedThinking}
                  toggleThinkingExpanded={toggleThinkingExpanded}
                />
              )}
              
              {item.type === 'queued' && (
                <QueuedMessageBubble
                  message={item.data as QueuedMessage}
                  index={item.index!}
                  onRemove={() => setMessageQueue(prev => prev.filter(m => m.id !== (item.data as QueuedMessage).id))}
                />
              )}
            </div>
          )
        })}
      </div>
      
      {/* Streaming content - rendered OUTSIDE virtualizer for smooth updates */}
      {streaming.isStreaming && (
        <div className="pb-3">
          <StreamingBubble streaming={throttledStreaming} />
        </div>
      )}
      
      {/* Queue header - rendered outside virtualizer when streaming */}
      {streaming.isStreaming && messageQueue.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-2 pb-3 border-t border-dashed border-border/50">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>{messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued</span>
        </div>
      )}
      
      {/* Scroll anchor at absolute bottom */}
      <div data-scroll-anchor className="h-px" />
    </div>
  )
}

// Individual message bubble component (memoized for performance)
const MessageBubble = React.memo(function MessageBubble({
  message,
  expandedThinking,
  toggleThinkingExpanded,
}: {
  message: ChatMessage
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
}) {
  return (
    <div
      className={cn(
        "flex gap-2",
        message.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      {message.role === 'assistant' && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[85%] rounded-lg",
          message.role === 'user'
            ? 'bg-primary text-primary-foreground px-3 py-2'
            : 'bg-muted'
        )}
      >
        {message.role === 'assistant' ? (
          <div className="space-y-0">
            {message.thinking && (
              <div className="border-b border-border/50">
                <button
                  onClick={() => toggleThinkingExpanded(message.id)}
                  className="flex items-center gap-1.5 w-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight 
                    className={cn(
                      "w-3 h-3 transition-transform",
                      expandedThinking.has(message.id) && "rotate-90"
                    )} 
                  />
                  <Brain className="w-3 h-3" />
                  <span>Thinking...</span>
                </button>
                {expandedThinking.has(message.id) && (
                  <div className="px-3 pb-2 text-xs text-muted-foreground bg-muted/50 border-l-2 border-primary/30 ml-3 mr-3 mb-2 rounded">
                    <pre className="whitespace-pre-wrap font-mono text-[10px] max-h-48 overflow-y-auto">
                      {message.thinking}
                    </pre>
                  </div>
                )}
              </div>
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm px-3 py-2">
              <MarkdownContent content={message.content} />
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
      
      {message.role === 'user' && (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  )
})

// Streaming bubble component - optimized for frequent updates
// Uses will-change to hint GPU acceleration and contain: content to isolate layout
const StreamingBubble = React.memo(function StreamingBubble({
  streaming,
}: {
  streaming: StreamingState
}) {
  return (
    <div 
      className="flex gap-2"
      style={{ 
        contain: 'content', // Isolate layout changes to this subtree
        willChange: 'contents' // Hint to browser about updates
      }}
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="max-w-[85%] rounded-lg bg-muted min-h-[40px]">
        {streaming.thinking && (
          <div className="border-b border-border/50">
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground">
              <Brain className="w-3 h-3 animate-pulse" />
              <span>Thinking...</span>
            </div>
            <div 
              className="px-3 pb-2 text-xs text-muted-foreground bg-muted/50 border-l-2 border-primary/30 ml-3 mr-3 mb-2 rounded"
              style={{ contain: 'content' }}
            >
              <pre className="whitespace-pre-wrap font-mono text-[10px] max-h-48 overflow-y-auto">
                {streaming.thinking}
                <span className="inline-block w-2 h-3 bg-primary/50 animate-pulse ml-0.5" />
              </pre>
            </div>
          </div>
        )}
        <div 
          className="prose prose-sm dark:prose-invert max-w-none text-sm px-3 py-2"
          style={{ contain: 'content' }}
        >
          {streaming.content ? (
            <>
              <MarkdownContent content={streaming.content} />
              <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />
            </>
          ) : (
            !streaming.thinking && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Generating response...</span>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
})

// Queued message bubble component
const QueuedMessageBubble = React.memo(function QueuedMessageBubble({
  message,
  index,
  onRemove,
}: {
  message: QueuedMessage
  index: number
  onRemove: () => void
}) {
  return (
    <div className="flex gap-2 justify-end opacity-60">
      <div className="max-w-[85%] rounded-lg bg-primary/50 text-primary-foreground px-3 py-2 relative group">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <button
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove from queue"
        >
          <X className="w-3 h-3" />
        </button>
        <span className="absolute -bottom-1 -left-1 text-[9px] bg-muted text-muted-foreground px-1 rounded">
          #{index + 1}
        </span>
      </div>
      <div className="w-7 h-7 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
        <User className="w-3.5 h-3.5 opacity-50" />
      </div>
    </div>
  )
})

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [enableThinking, setEnableThinking] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const [streaming, setStreaming] = useState<StreamingState>({ content: '', thinking: '', isStreaming: false })
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([])
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [isConversationReady, setIsConversationReady] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const isProcessingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const scrollFrameRef = useRef<number | null>(null)
  const virtualizerScrollToEndRef = useRef<(() => void) | null>(null)
  const initialScrollDoneRef = useRef(false)
  
  // Throttle streaming content to ~30fps to avoid layout thrashing
  const throttledStreaming = useThrottledValue(streaming, 30)
  
  // Callback when virtualizer is ready with scrollToEnd function
  const handleVirtualizerReady = useCallback((scrollToEnd: () => void) => {
    virtualizerScrollToEndRef.current = scrollToEnd
    
    // If we haven't done initial scroll yet and data is loaded, do it now
    if (!initialScrollDoneRef.current && !isLoading && messages.length > 0) {
      initialScrollDoneRef.current = true
      // Small delay to ensure DOM is painted
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToEnd()
          setIsConversationReady(true)
        })
      })
    }
  }, [isLoading, messages.length])

  // Load API key and chat history on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [key, history, model, thinking] = await Promise.all([
        window.electron.getClaudeApiKey(),
        window.electron.getChatHistory(),
        window.electron.getSelectedModel(),
        window.electron.getEnableThinking()
      ])
      setApiKey(key)
      setMessages(history)
      setSelectedModel(model)
      setEnableThinking(thinking)
      
      // If we have an API key, fetch available models
      if (key) {
        loadModels()
      }
    } catch (e) {
      console.error('Failed to load AI chat data:', e)
    } finally {
      setIsLoading(false)
    }
  }

  const loadModels = async () => {
    setIsLoadingModels(true)
    try {
      const result = await window.electron.fetchClaudeModels()
      if (result.success && result.models) {
        setModels(result.models)
        window.electron.logFromRenderer('info', 'API', 'Claude models loaded', { 
          count: result.models.length 
        })
      } else {
        window.electron.logFromRenderer('error', 'API', 'Failed to load Claude models', { 
          error: result.error 
        })
      }
    } catch (e) {
      console.error('Failed to load models:', e)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    await window.electron.setSelectedModel(modelId)
    window.electron.logFromRenderer('info', 'API', 'Model changed', { model: modelId })
  }

  const handleThinkingChange = async (enabled: boolean) => {
    setEnableThinking(enabled)
    await window.electron.setEnableThinking(enabled)
    window.electron.logFromRenderer('info', 'API', 'Extended thinking changed', { enabled })
  }

  const toggleThinkingExpanded = (messageId: string) => {
    setExpandedThinking(prev => {
      const next = new Set(prev)
      if (next.has(messageId)) {
        next.delete(messageId)
      } else {
        next.add(messageId)
      }
      return next
    })
  }

  // Check if user is near the bottom of scroll container
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    const threshold = 100 // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

  // Scroll to bottom - uses virtualizer's scrollToIndex when available, falls back to scrollTop
  const scrollToBottom = useCallback((force = false, _instant = false) => {
    if (scrollFrameRef.current) {
      cancelAnimationFrame(scrollFrameRef.current)
    }
    
    scrollFrameRef.current = requestAnimationFrame(() => {
      if (!force && isUserScrolledUp) return
      
      // Use virtualizer's scrollToEnd if available (more accurate)
      if (virtualizerScrollToEndRef.current) {
        virtualizerScrollToEndRef.current()
      } else {
        // Fallback to direct scroll
        const container = scrollContainerRef.current
        if (container) {
          container.scrollTop = container.scrollHeight
        }
      }
      setIsUserScrolledUp(false)
    })
  }, [isUserScrolledUp])

  // Handle user scroll to detect if they scrolled up
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const currentScrollTop = container.scrollTop
    const wasScrollingUp = currentScrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = currentScrollTop
    
    if (wasScrollingUp && !isNearBottom()) {
      setIsUserScrolledUp(true)
    } else if (isNearBottom()) {
      setIsUserScrolledUp(false)
    }
  }, [isNearBottom])

  // Auto-scroll when messages change (new message added, not during streaming)
  useEffect(() => {
    if (!isUserScrolledUp && !streaming.isStreaming) {
      scrollToBottom(false, false) // smooth scroll for new messages
    }
  }, [messages, scrollToBottom, isUserScrolledUp, streaming.isStreaming])
  
  // Auto-scroll during streaming - use instant scroll to avoid jerkiness
  // Use useLayoutEffect to sync with paint cycle
  useLayoutEffect(() => {
    if (streaming.isStreaming && !isUserScrolledUp) {
      // Use instant scroll during streaming
      scrollToBottom(false, true)
    }
  }, [throttledStreaming.content, throttledStreaming.thinking, streaming.isStreaming, scrollToBottom, isUserScrolledUp])
  
  // Cleanup scroll animation frame on unmount
  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  // Clean up stream listener on unmount
  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
      }
    }
  }, [])

  // Focus textarea when ready
  useEffect(() => {
    if (!isLoading && apiKey && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isLoading, apiKey])
  
  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200) // Max height of 200px
      textarea.style.height = `${Math.max(newHeight, 72)}px` // Min height of 72px (3 lines)
    }
  }, [])

  // Handle initial scroll after data loads
  // This triggers when isLoading becomes false and we have messages
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDoneRef.current) {
      // If virtualizer is already ready, scroll now
      if (virtualizerScrollToEndRef.current) {
        initialScrollDoneRef.current = true
        // Give DOM time to render, then scroll
        const timeout = setTimeout(() => {
          requestAnimationFrame(() => {
            virtualizerScrollToEndRef.current?.()
            setIsConversationReady(true)
          })
        }, 50)
        return () => clearTimeout(timeout)
      }
      // Otherwise, the handleVirtualizerReady callback will handle it
    } else if (!isLoading && messages.length === 0) {
      // No messages, just mark as ready
      setIsConversationReady(true)
      initialScrollDoneRef.current = true
    }
  }, [isLoading, messages.length])

  const handleSetApiKey = async () => {
    // Log immediately when button is clicked
    console.log('[AIChat] handleSetApiKey called, apiKeyInput:', apiKeyInput ? `${apiKeyInput.length} chars` : 'empty')
    window.electron.logFromRenderer('info', 'AUTH', 'API key button clicked', { 
      hasInput: !!apiKeyInput,
      inputLength: apiKeyInput?.length || 0 
    })
    
    if (!apiKeyInput.trim()) {
      console.log('[AIChat] Empty input, returning')
      window.electron.logFromRenderer('warn', 'AUTH', 'Empty API key input, ignoring')
      return
    }
    
    const keyToSet = apiKeyInput.trim()
    console.log('[AIChat] Setting key, length:', keyToSet.length, 'prefix:', keyToSet.substring(0, 10))
    
    await window.electron.logFromRenderer('info', 'AUTH', 'Setting Claude API key from UI', {
      keyLength: keyToSet.length,
      keyPrefix: keyToSet.substring(0, 10) + '...'
    })
    
    setIsSettingKey(true)
    setError(null)
    
    try {
      console.log('[AIChat] Calling IPC setClaudeApiKey...')
      await window.electron.logFromRenderer('info', 'AUTH', 'Calling setClaudeApiKey IPC...')
      const result = await window.electron.setClaudeApiKey(keyToSet)
      
      console.log('[AIChat] IPC result:', result)
      await window.electron.logFromRenderer('info', 'AUTH', 'setClaudeApiKey IPC result', { result })
      
      if (result.success) {
        console.log('[AIChat] Success!')
        await window.electron.logFromRenderer('info', 'AUTH', 'API key set successfully')
        setApiKey(keyToSet)
        setApiKeyInput('')
        // Load available models and get default
        const [defaultModel] = await Promise.all([
          window.electron.getSelectedModel(),
        ])
        setSelectedModel(defaultModel)
        loadModels()
      } else {
        console.log('[AIChat] Failed:', result.error)
        await window.electron.logFromRenderer('error', 'AUTH', 'API key set failed', { error: result.error })
        setError(result.error || 'Invalid API key')
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      const stack = e instanceof Error ? e.stack : undefined
      console.error('[AIChat] Exception:', errorMsg, e)
      await window.electron.logFromRenderer('error', 'AUTH', 'Exception setting API key', { 
        error: errorMsg, 
        stack 
      })
      setError(`Failed to set API key: ${errorMsg}`)
    } finally {
      setIsSettingKey(false)
    }
  }

  const handleRemoveApiKey = async () => {
    await window.electron.setClaudeApiKey(null)
    setApiKey(null)
    setShowSettings(false)
    setMessages([])
    setMessageQueue([])
  }

  // Process a single message (internal function)
  const processMessage = useCallback(async (userMessage: string, tempMsgId: string) => {
    isProcessingRef.current = true
    setIsSending(true)
    setError(null)
    setStreaming({ content: '', thinking: '', isStreaming: true })
    
    try {
      // Clean up any previous stream listener
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
      }

      // Set up stream chunk handler
      const cleanup = window.electron.onChatStreamChunk((chunk) => {
        if (chunk.type === 'text' && chunk.content) {
          setStreaming(prev => ({ ...prev, content: prev.content + chunk.content }))
        } else if (chunk.type === 'thinking' && chunk.thinking) {
          setStreaming(prev => ({ ...prev, thinking: prev.thinking + chunk.thinking }))
        } else if (chunk.type === 'done') {
          // Stream complete - reload history to get the saved message
          setStreaming({ content: '', thinking: '', isStreaming: false })
          window.electron.getChatHistory().then(history => {
            setMessages(history)
          })
          setIsSending(false)
          isProcessingRef.current = false
          // Clean up listener
          if (streamCleanupRef.current) {
            streamCleanupRef.current()
            streamCleanupRef.current = null
          }
          // Process next message in queue
          processNextInQueue()
        } else if (chunk.type === 'error') {
          setError(chunk.error || 'Failed to send message')
          setStreaming({ content: '', thinking: '', isStreaming: false })
          setIsSending(false)
          isProcessingRef.current = false
          // Remove the optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== tempMsgId))
          // Clean up listener
          if (streamCleanupRef.current) {
            streamCleanupRef.current()
            streamCleanupRef.current = null
          }
          // Still try to process next in queue
          processNextInQueue()
        }
      })
      streamCleanupRef.current = cleanup

      // Start streaming
      const result = await window.electron.sendChatMessageStreaming(userMessage)
      if (!result.success) {
        setError(result.error || 'Failed to send message')
        setStreaming({ content: '', thinking: '', isStreaming: false })
        setMessages(prev => prev.filter(m => m.id !== tempMsgId))
        setIsSending(false)
        isProcessingRef.current = false
        if (streamCleanupRef.current) {
          streamCleanupRef.current()
          streamCleanupRef.current = null
        }
        processNextInQueue()
      }
    } catch (e) {
      setError('Failed to communicate with Claude')
      setStreaming({ content: '', thinking: '', isStreaming: false })
      setMessages(prev => prev.filter(m => m.id !== tempMsgId))
      setIsSending(false)
      isProcessingRef.current = false
      processNextInQueue()
    }
  }, [])

  // Process next message in queue
  const processNextInQueue = useCallback(() => {
    setMessageQueue(prev => {
      if (prev.length === 0) return prev
      
      const [next, ...rest] = prev
      
      // Add next message to UI and start processing
      const tempUserMsg: ChatMessage = {
        id: next.id,
        role: 'user',
        content: next.content,
        timestamp: new Date().toISOString()
      }
      setMessages(msgs => [...msgs, tempUserMsg])
      
      // Process the message (delayed to allow state to update)
      setTimeout(() => {
        processMessage(next.content, next.id)
      }, 100)
      
      return rest
    })
  }, [processMessage])

  // Main send message handler
  const handleSendMessage = useCallback(async () => {
    if (!input.trim()) return
    
    const userMessage = input.trim()
    const msgId = `temp_${Date.now()}`
    setInput('')
    
    // Reset textarea height after clearing
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px'
    }
    
    // If already processing, add to queue
    if (isProcessingRef.current || isSending) {
      const queuedMsg: QueuedMessage = {
        id: msgId,
        content: userMessage
      }
      setMessageQueue(prev => [...prev, queuedMsg])
      return
    }
    
    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])
    
    // Process immediately
    processMessage(userMessage, msgId)
  }, [input, isSending, processMessage])

  const handleClearHistory = async () => {
    await window.electron.clearChatHistory()
    setMessages([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Chat interface (unified - handles both API key setup and chat)
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sm">AI Assistant</h2>
          {apiKey && selectedModel && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              ({models.find(m => m.id === selectedModel)?.display_name || selectedModel.split('-').slice(0, 2).join(' ')})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {apiKey && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClearHistory}
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && apiKey && (
        <div className="p-3 border-b border-border bg-muted/30 space-y-3">
          {/* Model Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Model</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={loadModels}
                disabled={isLoadingModels}
                title="Refresh models"
              >
                <RefreshCw className={cn("w-3 h-3", isLoadingModels && "animate-spin")} />
              </Button>
            </div>
            {models.length > 0 ? (
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="h-auto min-h-[32px] text-xs py-1">
                  <SelectValue placeholder="Select a model">
                    {selectedModel && (
                      <div className="flex flex-col items-start">
                        <span>{models.find(m => m.id === selectedModel)?.display_name || selectedModel}</span>
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
                      onClick={loadModels}
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
              onClick={() => handleThinkingChange(!enableThinking)}
              className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                enableThinking ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                  enableThinking ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
          {enableThinking && (
            <p className="text-[10px] text-muted-foreground">
              Shows Claude's reasoning process. Uses more tokens.
            </p>
          )}
          
          {/* API Key */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">API Key configured</span>
            <Button
              variant="destructive"
              size="sm"
              className="h-6 text-xs"
              onClick={handleRemoveApiKey}
            >
              Remove Key
            </Button>
          </div>
        </div>
      )}

      {/* Messages area with virtual scrolling */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading skeleton - shown while fetching or before virtualizer is ready */}
        {(isLoading || (!isConversationReady && messages.length > 0)) && (
          <div className="absolute inset-0 z-10 bg-background p-3 space-y-3 overflow-hidden">
            {/* Skeleton messages */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "justify-start" : "justify-end")}>
                {i % 2 === 0 && (
                  <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
                )}
                <div 
                  className={cn(
                    "rounded-lg animate-pulse",
                    i % 2 === 0 ? "bg-muted" : "bg-primary/20"
                  )}
                  style={{ 
                    width: `${40 + Math.random() * 40}%`,
                    height: `${40 + Math.random() * 40}px`
                  }}
                />
                {i % 2 !== 0 && (
                  <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
                )}
              </div>
            ))}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Loading conversation...</span>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!isLoading && messages.length === 0 && !streaming.isStreaming ? (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-2">
              <Bot className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {apiKey ? 'Start a conversation with Claude' : 'Enter your API key below to start'}
              </p>
            </div>
          </div>
        ) : !isLoading && (
          <VirtualizedMessageList
            messages={messages}
            streaming={streaming}
            throttledStreaming={throttledStreaming}
            messageQueue={messageQueue}
            expandedThinking={expandedThinking}
            toggleThinkingExpanded={toggleThinkingExpanded}
            setMessageQueue={setMessageQueue}
            scrollContainerRef={scrollContainerRef}
            onScroll={handleScroll}
            onVirtualizerReady={handleVirtualizerReady}
          />
        )}
        
        {/* Scroll to bottom button */}
        {isUserScrolledUp && messages.length > 0 && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        </div>
      )}

      {/* Input area - shows API key input or message input */}
      <div className="p-3 border-t border-border">
        {!apiKey ? (
          // API Key input
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Enter Claude API key (sk-ant-...)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
                className="flex-1 h-9 text-sm"
                autoFocus
              />
              <Button
                onClick={handleSetApiKey}
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
        ) : (
          // Message input
          <div className="space-y-1">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                placeholder={isSending ? "Type to queue another message..." : "Type a message... (Shift+Enter for new line)"}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                className="flex-1 min-h-[72px] max-h-[200px] px-3 py-2 text-sm rounded-[8px] border border-border bg-secondary/50 resize-none transition-colors duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] placeholder:text-muted-foreground/60 hover:border-border/80 hover:bg-secondary/70 focus:outline-none focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_rgba(0,122,255,0.15)]"
                style={{ height: '72px' }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!input.trim()}
                size="icon"
                className={cn("h-9 w-9 flex-shrink-0 mb-1", isSending && input.trim() && "bg-primary/70")}
                title={isSending ? "Add to queue (Enter)" : "Send message (Enter)"}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {isSending 
                ? "Enter to queue • Shift+Enter for new line" 
                : "Enter to send • Shift+Enter for new line"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
