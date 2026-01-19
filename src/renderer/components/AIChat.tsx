import { useVirtualizer } from '@tanstack/react-virtual'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Brain,
  ChevronRight,
  GitPullRequest,
  Key,
  List,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  User,
  X
} from 'lucide-react'
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { DogIcon } from './DogIcon'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

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

import { cn, formatRelativeTime } from '@/lib/utils'
import { MarkdownContent } from './MarkdownContent'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
}

// Context window sizes by model (in tokens)
// NOTE: Anthropic's API does not return context window size, so we must hardcode these.
// All current Claude models use 200K context. This is standard practice (Cursor does the same).
// We only find out the actual limit when we exceed it (error: model_context_window_exceeded).
const CONTEXT_WINDOWS: Record<string, number> = {
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000
}
const DEFAULT_CONTEXT_WINDOW = 200000

// Estimate tokens from text (~4 characters per token for English)
// This is a rough estimate. Actual tokenization varies by model.
// For accurate counting, we track input_tokens from API responses.
function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}

// Calculate total tokens from messages
// Uses estimation - actual tokens are tracked separately via API responses
function calculateTotalTokens(
  messages: ChatMessage[],
  streamingContent?: string,
  streamingThinking?: string
): number {
  let total = 0

  // Add tokens from all messages
  for (const msg of messages) {
    total += estimateTokens(msg.content)
    if (msg.thinking) {
      total += estimateTokens(msg.thinking)
    }
  }

  // Add streaming content if present
  if (streamingContent) {
    total += estimateTokens(streamingContent)
  }
  if (streamingThinking) {
    total += estimateTokens(streamingThinking)
  }

  // Add overhead for message formatting (~20 tokens per message)
  total += messages.length * 20

  return total
}

// Context load indicator component
interface ContextIndicatorProps {
  messages: ChatMessage[]
  streamingContent?: string
  streamingThinking?: string
  model: string
  inputText?: string
}

function ContextIndicator({
  messages,
  streamingContent,
  streamingThinking,
  model,
  inputText
}: ContextIndicatorProps) {
  const maxTokens = CONTEXT_WINDOWS[model] || DEFAULT_CONTEXT_WINDOW
  const usedTokens =
    calculateTotalTokens(messages, streamingContent, streamingThinking) +
    estimateTokens(inputText || '')
  const percentage = Math.min((usedTokens / maxTokens) * 100, 100)

  // Color based on usage
  const getColor = () => {
    if (percentage < 50) return 'bg-green-500'
    if (percentage < 80) return 'bg-yellow-500'
    if (percentage < 95) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Format numbers with K suffix
  const formatTokens = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-help">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-300', getColor())}
                style={{ width: `${percentage}%` }}
              />
            </div>
            {percentage >= 95 && <span className="text-[10px] text-red-500">⚠️</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs px-2 py-1">
          <span>
            {percentage.toFixed(1)}% • {formatTokens(usedTokens)} / {formatTokens(maxTokens)}{' '}
            context used
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
}

// GitHub user for avatar display
interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

// Linked PR chat info
interface LinkedPRChat {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
}

// PR Chat from store
interface PRChatInfo {
  prId: string
  prNumber: number
  prTitle: string
  repoFullName: string
  updatedAt: string
  messageCount: number
}

interface SelectedPR {
  number: number
  title: string
  base: {
    repo: {
      full_name: string
    }
  }
}

interface AIChatPanelProps {
  onClose: () => void
  user?: GitHubUser | null
  linkedPRChat?: LinkedPRChat | null
  onClosePRChat?: () => void | Promise<void>
  onSwitchToPRChat?: (prId: string) => void
  selectedPR?: SelectedPR | null
  onStartPRChat?: (pr: SelectedPR) => void
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
  user?: GitHubUser | null
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
  user
}: VirtualizedMessageListProps) {
  // Only virtualize static messages - streaming content is rendered separately
  const allItems = useMemo(() => {
    const items: Array<{
      type: 'message' | 'queued'
      data: ChatMessage | QueuedMessage
      index?: number
    }> = []

    // Add messages
    messages.forEach((msg) => {
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
    overscan: 5 // Render 5 extra items above/below viewport
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
    <div ref={scrollContainerRef} className="h-full overflow-auto p-3" onScroll={onScroll}>
      {/* Virtualized messages */}
      <div
        style={{
          height: allItems.length > 0 ? `${virtualizer.getTotalSize()}px` : 'auto',
          width: '100%',
          position: 'relative'
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
                transform: `translateY(${virtualItem.start}px)`
              }}
              className="pb-3"
            >
              {item.type === 'message' && (
                <MessageBubble
                  message={item.data as ChatMessage}
                  expandedThinking={expandedThinking}
                  toggleThinkingExpanded={toggleThinkingExpanded}
                  user={user}
                />
              )}

              {item.type === 'queued' && (
                <QueuedMessageBubble
                  message={item.data as QueuedMessage}
                  index={item.index ?? 0}
                  onRemove={() =>
                    setMessageQueue((prev) =>
                      prev.filter((m) => m.id !== (item.data as QueuedMessage).id)
                    )
                  }
                  user={user}
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
          <span>
            {messageQueue.length} message{messageQueue.length > 1 ? 's' : ''} queued
          </span>
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
  user
}: {
  message: ChatMessage
  expandedThinking: Set<string>
  toggleThinkingExpanded: (id: string) => void
  user?: GitHubUser | null
}) {
  return (
    <div className={cn('flex gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
      {message.role === 'assistant' && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <DogIcon className="w-3.5 h-3.5 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[85%] rounded-lg',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground px-3 py-2 selection:bg-white/30 selection:text-white'
            : 'bg-muted'
        )}
      >
        {message.role === 'assistant' ? (
          <div className="space-y-0">
            {message.thinking && (
              <div
                className={cn(
                  'border-b transition-colors',
                  expandedThinking.has(message.id)
                    ? 'border-primary/20 bg-primary/5'
                    : 'border-border/50'
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleThinkingExpanded(message.id)}
                  className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      'w-3 h-3 transition-transform',
                      expandedThinking.has(message.id) && 'rotate-90'
                    )}
                  />
                  <Brain
                    className={cn(
                      'w-3.5 h-3.5',
                      expandedThinking.has(message.id) && 'text-primary'
                    )}
                  />
                  <span>Thinking</span>
                  <span className="text-[10px] text-muted-foreground/60 ml-auto">
                    Click to {expandedThinking.has(message.id) ? 'hide' : 'show'}
                  </span>
                </button>
                {expandedThinking.has(message.id) && (
                  <div className="px-3 pb-3 text-xs text-muted-foreground/90 bg-primary/5 border-l-2 border-primary/40 ml-3 mr-3 mb-2 rounded">
                    <pre className="whitespace-pre-wrap font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed">
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
        <Avatar className="w-7 h-7 flex-shrink-0">
          {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.login} /> : null}
          <AvatarFallback className="bg-muted">
            <User className="w-3.5 h-3.5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
})

// Streaming bubble component - optimized for frequent updates
// Uses will-change to hint GPU acceleration and contain: content to isolate layout
const StreamingBubble = React.memo(function StreamingBubble({
  streaming
}: {
  streaming: StreamingState
}) {
  const thinkingRef = useRef<HTMLPreElement>(null)

  // Auto-scroll thinking section to bottom as new content streams in
  useEffect(() => {
    if (thinkingRef.current && streaming.thinking) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight
    }
  }, [streaming.thinking])

  return (
    <div
      className="flex gap-2"
      style={{
        contain: 'content', // Isolate layout changes to this subtree
        willChange: 'contents' // Hint to browser about updates
      }}
    >
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <DogIcon className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="max-w-[85%] rounded-lg bg-muted min-h-[40px]">
        {streaming.thinking && (
          <div className="border-b border-primary/20 bg-primary/5">
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-primary/80">
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-medium">Thinking...</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Extended reasoning</span>
            </div>
            <div
              className="px-3 pb-3 text-xs text-muted-foreground/90 bg-primary/5 border-l-2 border-primary/40 ml-3 mr-3 mb-2 rounded"
              style={{ contain: 'content' }}
            >
              <pre
                ref={thinkingRef}
                className="whitespace-pre-wrap font-mono text-[11px] max-h-64 overflow-y-auto leading-relaxed"
              >
                {streaming.thinking}
                <span className="inline-block w-2 h-3 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
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
  user
}: {
  message: QueuedMessage
  index: number
  onRemove: () => void
  user?: GitHubUser | null
}) {
  return (
    <div className="flex gap-2 justify-end opacity-60">
      <div className="max-w-[85%] rounded-lg bg-primary/50 text-primary-foreground px-3 py-2 relative group selection:bg-white/30 selection:text-white">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <button
          type="button"
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
      <Avatar className="w-7 h-7 flex-shrink-0 opacity-50">
        {user?.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.login} /> : null}
        <AvatarFallback className="bg-muted/50">
          <User className="w-3.5 h-3.5" />
        </AvatarFallback>
      </Avatar>
    </div>
  )
})

export function AIChatPanel({
  onClose,
  user,
  linkedPRChat,
  onClosePRChat,
  onSwitchToPRChat,
  selectedPR,
  onStartPRChat
}: AIChatPanelProps) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatStarted, setChatStarted] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [enableThinking, setEnableThinking] = useState(false)
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const [streaming, setStreaming] = useState<StreamingState>({
    content: '',
    thinking: '',
    isStreaming: false
  })
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([])

  // All PR chats for the conversation navigator
  const [allPRChats, setAllPRChats] = useState<PRChatInfo[]>([])
  const [showConversations, setShowConversations] = useState(false)
  // System context for PR chats (invisible to user, sent to AI)
  const [prSystemContext, setPrSystemContext] = useState<string | undefined>(undefined)
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
  const handleVirtualizerReady = useCallback(
    (scrollToEnd: () => void) => {
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
    },
    [isLoading, messages.length]
  )

  const loadModels = useCallback(async () => {
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
  }, [])

  // Load all PR chats for the conversation navigator
  const loadAllPRChats = useCallback(async () => {
    try {
      const chats = await window.electron.getPRChats()
      const chatInfos: PRChatInfo[] = chats.map((chat) => ({
        prId: chat.prId,
        prNumber: chat.prNumber,
        prTitle: chat.prTitle,
        repoFullName: chat.repoFullName,
        updatedAt: chat.updatedAt,
        messageCount: chat.messages.length
      }))
      // Sort by most recently updated
      chatInfos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setAllPRChats(chatInfos)
    } catch (e) {
      console.error('Failed to load PR chats:', e)
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [key, model, thinking] = await Promise.all([
        window.electron.getClaudeApiKey(),
        window.electron.getSelectedModel(),
        window.electron.getEnableThinking()
      ])
      setApiKey(key)
      setSelectedModel(model)
      setEnableThinking(thinking)

      // Load appropriate chat history based on linkedPRChat
      if (linkedPRChat) {
        const prChat = await window.electron.getPRChat(linkedPRChat.prId)
        if (prChat) {
          setMessages(prChat.messages)
          setPrSystemContext(prChat.systemContext) // Load system context (invisible to user)
          setChatStarted(prChat.messages.length > 0)
        } else {
          setMessages([])
          setPrSystemContext(undefined)
          setChatStarted(false)
        }
      } else {
        const history = await window.electron.getChatHistory()
        setMessages(history)
        setPrSystemContext(undefined) // Clear system context for general chat
        setChatStarted(history.length > 0)
      }

      // If we have an API key, fetch available models
      if (key) {
        loadModels()
      }
    } catch (e) {
      console.error('Failed to load AI chat data:', e)
    } finally {
      setIsLoading(false)
    }
  }, [loadModels, linkedPRChat])

  // Load API key and chat history on mount or when linkedPRChat changes
  useEffect(() => {
    loadData()
  }, [loadData])

  // Load all PR chats for conversation navigator
  // Using linkedPRChat?.prId to trigger reload when switching chats
  const linkedPRChatId = linkedPRChat?.prId
  useEffect(() => {
    // Reference linkedPRChatId to satisfy exhaustive deps and trigger reload on chat switch
    void linkedPRChatId
    loadAllPRChats()
  }, [loadAllPRChats, linkedPRChatId])

  // Auto-switch to PR chat when selectedPR changes
  useEffect(() => {
    if (!selectedPR) return

    const selectedPRId = `${selectedPR.base.repo.full_name}#${selectedPR.number}`

    // If already showing this PR's chat, do nothing
    if (linkedPRChat?.prId === selectedPRId) return

    // Check if a chat exists for this PR
    const checkAndSwitch = async () => {
      const existingChat = await window.electron.getPRChat(selectedPRId)
      if (existingChat && onSwitchToPRChat) {
        // Chat exists, switch to it
        onSwitchToPRChat(selectedPRId)
      }
      // If no chat exists, do nothing - the empty state will show
    }
    checkAndSwitch()
  }, [selectedPR, linkedPRChat?.prId, onSwitchToPRChat])

  // Compute if we should show empty state for selected PR with no chat
  const selectedPRId = selectedPR ? `${selectedPR.base.repo.full_name}#${selectedPR.number}` : null
  const showPREmptyState = selectedPR && (!linkedPRChat || linkedPRChat.prId !== selectedPRId)

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
    setExpandedThinking((prev) => {
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
  const scrollToBottom = useCallback(
    (force = false, _instant = false) => {
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
    },
    [isUserScrolledUp]
  )

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
  }, [scrollToBottom, isUserScrolledUp, streaming.isStreaming])

  // Auto-scroll during streaming - use instant scroll to avoid jerkiness
  // Use useLayoutEffect to sync with paint cycle
  useLayoutEffect(() => {
    if (streaming.isStreaming && !isUserScrolledUp) {
      // Use instant scroll during streaming
      scrollToBottom(false, true)
    }
  }, [streaming.isStreaming, scrollToBottom, isUserScrolledUp])

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
    console.log(
      '[AIChat] handleSetApiKey called, apiKeyInput:',
      apiKeyInput ? `${apiKeyInput.length} chars` : 'empty'
    )
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
    console.log(
      '[AIChat] Setting key, length:',
      keyToSet.length,
      'prefix:',
      keyToSet.substring(0, 10)
    )

    await window.electron.logFromRenderer('info', 'AUTH', 'Setting Claude API key from UI', {
      keyLength: keyToSet.length,
      keyPrefix: `${keyToSet.substring(0, 10)}...`
    })

    setIsSettingKey(true)
    setError(null)

    try {
      console.log('[AIChat] Calling IPC setClaudeApiKey...')
      await window.electron.logFromRenderer('info', 'AUTH', 'Calling setClaudeApiKey IPC...')
      const result = await window.electron.setClaudeApiKey(keyToSet)

      console.log('[AIChat] IPC result:', result)
      await window.electron.logFromRenderer('info', 'AUTH', 'setClaudeApiKey IPC result', {
        result
      })

      if (result.success) {
        console.log('[AIChat] Success!')
        await window.electron.logFromRenderer('info', 'AUTH', 'API key set successfully')
        setApiKey(keyToSet)
        setApiKeyInput('')
        // Load available models and get default
        const [defaultModel] = await Promise.all([window.electron.getSelectedModel()])
        setSelectedModel(defaultModel)
        loadModels()
      } else {
        console.log('[AIChat] Failed:', result.error)
        await window.electron.logFromRenderer('error', 'AUTH', 'API key set failed', {
          error: result.error
        })
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

  // Ref for processMessage to break circular dependency
  const processMessageRef = useRef<(userMessage: string, tempMsgId: string) => Promise<void>>()

  // Process next message in queue
  const processNextInQueue = useCallback(() => {
    setMessageQueue((prev) => {
      if (prev.length === 0) return prev

      const [next, ...rest] = prev

      // Add next message to UI and start processing
      const tempUserMsg: ChatMessage = {
        id: next.id,
        role: 'user',
        content: next.content,
        timestamp: new Date().toISOString()
      }
      setMessages((msgs) => [...msgs, tempUserMsg])

      // Process the message (delayed to allow state to update)
      setTimeout(() => {
        processMessageRef.current?.(next.content, next.id)
      }, 100)

      return rest
    })
  }, [])

  // Process a single message (internal function)
  const processMessage = useCallback(
    async (userMessage: string, tempMsgId: string) => {
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
            setStreaming((prev) => ({ ...prev, content: prev.content + chunk.content }))
          } else if (chunk.type === 'thinking' && chunk.thinking) {
            setStreaming((prev) => ({ ...prev, thinking: prev.thinking + chunk.thinking }))
          } else if (chunk.type === 'done') {
            // Stream complete - reload history from the correct source
            // Main process now handles saving to the correct chat (PR or general)
            setStreaming({ content: '', thinking: '', isStreaming: false })

            // Reload messages from the appropriate source
            if (linkedPRChat) {
              window.electron.getPRChat(linkedPRChat.prId).then((prChat) => {
                if (prChat) {
                  setMessages(prChat.messages)
                }
              })
            } else {
              window.electron.getChatHistory().then((history) => {
                setMessages(history)
              })
            }

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
            setMessages((prev) => prev.filter((m) => m.id !== tempMsgId))
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

        // Start streaming (pass system context for PR chats)
        const result = await window.electron.sendChatMessageStreaming(userMessage, prSystemContext)
        if (!result.success) {
          setError(result.error || 'Failed to send message')
          setStreaming({ content: '', thinking: '', isStreaming: false })
          setMessages((prev) => prev.filter((m) => m.id !== tempMsgId))
          setIsSending(false)
          isProcessingRef.current = false
          if (streamCleanupRef.current) {
            streamCleanupRef.current()
            streamCleanupRef.current = null
          }
          processNextInQueue()
        }
      } catch (_e) {
        setError('Failed to communicate with Claude')
        setStreaming({ content: '', thinking: '', isStreaming: false })
        setMessages((prev) => prev.filter((m) => m.id !== tempMsgId))
        setIsSending(false)
        isProcessingRef.current = false
        processNextInQueue()
      }
    },
    [processNextInQueue, linkedPRChat, prSystemContext]
  )

  // Keep ref updated with latest processMessage
  useEffect(() => {
    processMessageRef.current = processMessage
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
      setMessageQueue((prev) => [...prev, queuedMsg])
      return
    }

    // Optimistically add user message to UI
    const tempUserMsg: ChatMessage = {
      id: msgId,
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages((prev) => [...prev, tempUserMsg])

    // Process immediately
    processMessage(userMessage, msgId)
  }, [input, isSending, processMessage])

  const handleClearHistory = async () => {
    if (linkedPRChat) {
      await window.electron.clearPRChatMessages(linkedPRChat.prId)
    } else {
      await window.electron.clearChatHistory()
    }
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <DogIcon className="w-5 h-5 text-primary flex-shrink-0" />
          <h2 className="font-semibold text-sm flex-shrink-0">
            {linkedPRChat ? 'PR Chat' : 'AI Assistant'}
          </h2>
          {linkedPRChat && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded truncate max-w-[120px]">
              #{linkedPRChat.prNumber}
            </span>
          )}
          {!linkedPRChat && apiKey && selectedModel && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
              (
              {models.find((m) => m.id === selectedModel)?.display_name ||
                selectedModel.split('-').slice(0, 2).join(' ')}
              )
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Conversation Navigator */}
          {allPRChats.length > 0 && (
            <Popover open={showConversations} onOpenChange={setShowConversations}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 relative"
                  title="Switch conversation"
                >
                  <List className="w-4 h-4" />
                  {allPRChats.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                      {allPRChats.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end" side="bottom" sideOffset={5}>
                <div className="p-2 border-b border-border">
                  <h4 className="text-xs font-medium">Conversations</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {/* General Chat Option */}
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2',
                      !linkedPRChat && 'bg-primary/10'
                    )}
                    onClick={() => {
                      if (onClosePRChat) {
                        onClosePRChat()
                      }
                      setShowConversations(false)
                    }}
                  >
                    <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">General Chat</div>
                      <div className="text-[10px] text-muted-foreground">Main AI conversation</div>
                    </div>
                    {!linkedPRChat && (
                      <span className="text-[10px] text-primary font-medium">Active</span>
                    )}
                  </button>

                  {/* Separator */}
                  {allPRChats.length > 0 && (
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium bg-muted/30">
                      PR Conversations ({allPRChats.length})
                    </div>
                  )}

                  {/* PR Chats */}
                  {allPRChats.map((chat) => (
                    <div
                      key={chat.prId}
                      className={cn(
                        'group w-full px-3 py-2 hover:bg-muted/50 transition-colors flex items-start gap-2',
                        linkedPRChat?.prId === chat.prId && 'bg-primary/10'
                      )}
                    >
                      <GitPullRequest className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <button
                        type="button"
                        className="flex-1 text-left min-w-0"
                        onClick={() => {
                          if (onSwitchToPRChat) {
                            onSwitchToPRChat(chat.prId)
                          }
                          setShowConversations(false)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate flex-1">
                            #{chat.prNumber} {chat.prTitle}
                          </span>
                          {linkedPRChat?.prId === chat.prId && (
                            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          <span className="truncate">{chat.repoFullName}</span>
                          <span className="mx-1">•</span>
                          <span>{chat.messageCount} msgs</span>
                          <span className="mx-1">•</span>
                          <span>{formatRelativeTime(chat.updatedAt)}</span>
                        </div>
                      </button>
                      {/* Delete button - shown on hover */}
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity flex-shrink-0"
                        onClick={async (e) => {
                          e.stopPropagation()
                          // If deleting the active chat, switch to general first
                          if (linkedPRChat?.prId === chat.prId && onClosePRChat) {
                            await onClosePRChat()
                          }
                          await window.electron.deletePRChat(chat.prId)
                          loadAllPRChats()
                        }}
                        title="Delete conversation"
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {linkedPRChat && onClosePRChat && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClosePRChat}
              title="Back to general chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
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

      {/* PR Context Banner */}
      {linkedPRChat && (
        <div className="px-3 py-2 border-b border-border bg-primary/5">
          <div className="flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">
                #{linkedPRChat.prNumber} {linkedPRChat.prTitle}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">
                {linkedPRChat.repoFullName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && apiKey && (
        <div className="p-3 border-b border-border bg-muted/40 space-y-3">
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
                <RefreshCw className={cn('w-3 h-3', isLoadingModels && 'animate-spin')} />
              </Button>
            </div>
            {models.length > 0 ? (
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger className="h-auto min-h-[32px] text-xs py-1">
                  <SelectValue placeholder="Select a model">
                    {selectedModel && (
                      <div className="flex flex-col items-start">
                        <span>
                          {models.find((m) => m.id === selectedModel)?.display_name ||
                            selectedModel}
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
                    <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">
                      {selectedModel}
                    </code>
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
              type="button"
              onClick={() => handleThinkingChange(!enableThinking)}
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
            {[
              { id: 'skeleton-1', isUser: false, width: 65, height: 55 },
              { id: 'skeleton-2', isUser: true, width: 50, height: 45 },
              { id: 'skeleton-3', isUser: false, width: 75, height: 60 },
              { id: 'skeleton-4', isUser: true, width: 45, height: 50 },
              { id: 'skeleton-5', isUser: false, width: 60, height: 48 }
            ].map((skeleton) => (
              <div
                key={skeleton.id}
                className={cn('flex gap-2', skeleton.isUser ? 'justify-end' : 'justify-start')}
              >
                {!skeleton.isUser && (
                  <div className="w-7 h-7 rounded-full bg-muted animate-pulse flex-shrink-0" />
                )}
                <div
                  className={cn(
                    'rounded-lg animate-pulse',
                    skeleton.isUser ? 'bg-primary/20' : 'bg-muted'
                  )}
                  style={{
                    width: `${skeleton.width}%`,
                    height: `${skeleton.height}px`
                  }}
                />
                {skeleton.isUser && (
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

        {/* PR Empty state - shown when PR is selected but no chat exists for it */}
        {!isLoading && showPREmptyState && selectedPR && (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4 px-6">
              <GitPullRequest className="w-12 h-12 mx-auto text-blue-500/40" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  #{selectedPR.number} {selectedPR.title.slice(0, 50)}
                  {selectedPR.title.length > 50 ? '...' : ''}
                </p>
                <p className="text-xs text-muted-foreground">{selectedPR.base.repo.full_name}</p>
              </div>
              <p className="text-sm text-muted-foreground">No conversation yet for this PR</p>
              {onStartPRChat && apiKey && (
                <Button size="sm" onClick={() => onStartPRChat(selectedPR)} className="mt-2">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start chatting about this PR
                </Button>
              )}
              {!apiKey && (
                <p className="text-xs text-muted-foreground mt-2">
                  Enter your API key below to start chatting
                </p>
              )}
            </div>
          </div>
        )}

        {/* Default empty state - only when no PR selected and no messages */}
        {!isLoading && !showPREmptyState && messages.length === 0 && !streaming.isStreaming && (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4">
              <DogIcon className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {apiKey ? 'Start a conversation with Claude' : 'Enter your API key below to start'}
              </p>
              {apiKey && !chatStarted && (
                <Button
                  onClick={() => {
                    setChatStarted(true)
                    // Focus the input after a small delay to let it render
                    setTimeout(() => textareaRef.current?.focus(), 50)
                  }}
                  className="gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Start Chat
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Message list - show only when not in PR empty state */}
        {!isLoading && !showPREmptyState && (messages.length > 0 || streaming.isStreaming) && (
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
            user={user}
          />
        )}

        {/* Scroll to bottom button */}
        {isUserScrolledUp && messages.length > 0 && (
          <button
            type="button"
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
        ) : chatStarted || messages.length > 0 || streaming.isStreaming || linkedPRChat ? (
          // Message input - only show when chat has started, has messages, or is a PR chat
          <div className="space-y-1">
            <div className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                placeholder={
                  isSending
                    ? 'Type to queue another message...'
                    : 'Type a message... (Shift+Enter for new line)'
                }
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
                className={cn(
                  'h-9 w-9 flex-shrink-0 mb-1',
                  isSending && input.trim() && 'bg-primary/70'
                )}
                title={isSending ? 'Add to queue (Enter)' : 'Send message (Enter)'}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <ContextIndicator
                messages={messages}
                streamingContent={streaming.content}
                streamingThinking={streaming.thinking}
                model={selectedModel}
                inputText={input}
              />
              <p className="text-[10px] text-muted-foreground">
                {isSending
                  ? 'Enter to queue • Shift+Enter for new line'
                  : 'Enter to send • Shift+Enter for new line'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
