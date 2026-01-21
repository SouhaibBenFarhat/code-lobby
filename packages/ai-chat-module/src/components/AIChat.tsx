/**
 * AIChat - AI chat panel powered by Claude.
 * Main component that orchestrates the chat experience.
 */

/// <reference path="../../../../src/preload/electron-api.d.ts" />

import {
  Button,
  ClaudeIcon,
  cn,
  formatRelativeTime,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@codelobby/ui-kit'
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Brain,
  GitPullRequest,
  Key,
  List,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

// Internal imports
import { GENERAL_QUICK_PROMPTS, getPRQuickPrompts } from '../constants'
import { useThrottledValue } from '../hooks/useThrottledValue'
import type {
  AIChatPanelProps,
  ChatMessage,
  ClaudeModel,
  CustomPrompt,
  PRChatInfo,
  QueuedMessage,
  StreamingState
} from '../types'
import { ContextIndicator } from './ContextIndicator'
import { QuickActions } from './QuickActions'
import { VirtualizedMessageList } from './VirtualizedMessageList'

// Re-export types for external consumers
export type { AIChatPanelProps } from '../types'

export function AIChatPanel({
  onClose,
  user,
  linkedPRChat,
  onClosePRChat,
  onSwitchToPRChat,
  selectedPR,
  onStartPRChat
}: AIChatPanelProps): React.JSX.Element {
  // Core state
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
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([])

  // PR chat state
  const [allPRChats, setAllPRChats] = useState<PRChatInfo[]>([])
  const [showConversations, setShowConversations] = useState(false)
  const [prSystemContext, setPrSystemContext] = useState<string | undefined>(undefined)

  // Scroll and UI state
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [isConversationReady, setIsConversationReady] = useState(false)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const isProcessingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const scrollFrameRef = useRef<number | null>(null)
  const virtualizerScrollToEndRef = useRef<(() => void) | null>(null)
  const initialScrollDoneRef = useRef(false)
  const processMessageRef = useRef<(userMessage: string, tempMsgId: string) => Promise<void>>()

  // Throttle streaming content to ~30fps to avoid layout thrashing
  const throttledStreaming = useThrottledValue(streaming, 30)

  // Computed values
  const selectedPRId = selectedPR ? `${selectedPR.base.repo.full_name}#${selectedPR.number}` : null

  const isContextValid = useMemo(() => {
    if (linkedPRChat) {
      return prSystemContext !== undefined
    }
    return prSystemContext === undefined
  }, [linkedPRChat, prSystemContext])

  const showPREmptyState = selectedPR && (!linkedPRChat || linkedPRChat.prId !== selectedPRId)

  // Callbacks
  const handleVirtualizerReady = useCallback(
    (scrollToEnd: () => void) => {
      virtualizerScrollToEndRef.current = scrollToEnd
      if (!initialScrollDoneRef.current && !isLoading && messages.length > 0) {
        initialScrollDoneRef.current = true
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
      }
    } catch (e) {
      console.error('Failed to load models:', e)
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

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
      chatInfos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      setAllPRChats(chatInfos)
    } catch (e) {
      console.error('Failed to load PR chats:', e)
    }
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setIsConversationReady(false)
    initialScrollDoneRef.current = false
    setError(null)

    try {
      const [key, model, thinking, customPromptsData] = await Promise.all([
        window.electron.getClaudeApiKey(),
        window.electron.getSelectedModel(),
        window.electron.getEnableThinking(),
        window.electron.getCustomPrompts()
      ])
      setApiKey(key)
      setSelectedModel(model)
      setEnableThinking(thinking)
      setCustomPrompts(customPromptsData)

      if (linkedPRChat) {
        const prChat = await window.electron.getPRChat(linkedPRChat.prId)
        if (prChat) {
          setMessages(prChat.messages)
          setPrSystemContext(prChat.systemContext)
          setChatStarted(prChat.messages.length > 0)
        } else {
          setMessages([])
          setPrSystemContext(undefined)
          setChatStarted(false)
        }
      } else {
        const history = await window.electron.getChatHistory()
        setMessages(history)
        setPrSystemContext(undefined)
        setChatStarted(history.length > 0)
      }

      if (key) {
        loadModels()
      }
    } catch (e) {
      console.error('Failed to load AI chat data:', e)
    } finally {
      setIsLoading(false)
    }
  }, [loadModels, linkedPRChat])

  // Effects
  useEffect(() => {
    loadData()
  }, [loadData])

  const linkedPRChatId = linkedPRChat?.prId
  useEffect(() => {
    void linkedPRChatId
    loadAllPRChats()
  }, [loadAllPRChats, linkedPRChatId])

  // Auto-switch to PR chat when selectedPR changes
  useEffect(() => {
    if (!selectedPRId) return
    if (linkedPRChat?.prId === selectedPRId) return

    let cancelled = false
    const checkAndSwitch = async () => {
      try {
        const existingChat = await window.electron.getPRChat(selectedPRId)
        if (cancelled) return
        if (existingChat && onSwitchToPRChat) {
          onSwitchToPRChat(selectedPRId)
        } else if (linkedPRChat && onClosePRChat) {
          onClosePRChat()
        }
      } catch (e) {
        console.error('Error checking for PR chat:', e)
      }
    }
    checkAndSwitch()
    return () => {
      cancelled = true
    }
  }, [selectedPRId, linkedPRChat?.prId, onSwitchToPRChat, onClosePRChat, linkedPRChat])

  // Clear stale context
  useEffect(() => {
    if (selectedPRId && !linkedPRChat && prSystemContext !== undefined) {
      setPrSystemContext(undefined)
    }
  }, [selectedPRId, linkedPRChat, prSystemContext])

  // Scroll management
  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100
  }, [])

  const scrollToBottom = useCallback(
    (force = false, _instant = false) => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
      scrollFrameRef.current = requestAnimationFrame(() => {
        if (!force && isUserScrolledUp) return
        if (virtualizerScrollToEndRef.current) {
          virtualizerScrollToEndRef.current()
        } else {
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

  // Auto-scroll effects
  useEffect(() => {
    if (!isUserScrolledUp && !streaming.isStreaming) {
      scrollToBottom(false, false)
    }
  }, [scrollToBottom, isUserScrolledUp, streaming.isStreaming])

  useLayoutEffect(() => {
    if (streaming.isStreaming && !isUserScrolledUp) {
      scrollToBottom(false, true)
    }
  }, [streaming.isStreaming, scrollToBottom, isUserScrolledUp])

  // Cleanup effects
  useEffect(() => {
    return () => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current()
      }
    }
  }, [])

  // Focus and textarea effects
  useEffect(() => {
    if (!isLoading && apiKey && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isLoading, apiKey])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 200)
      textarea.style.height = `${Math.max(newHeight, 72)}px`
    }
  }, [])

  // Initial scroll
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !initialScrollDoneRef.current) {
      if (virtualizerScrollToEndRef.current) {
        initialScrollDoneRef.current = true
        const timeout = setTimeout(() => {
          requestAnimationFrame(() => {
            virtualizerScrollToEndRef.current?.()
            setIsConversationReady(true)
          })
        }, 50)
        return () => clearTimeout(timeout)
      }
    } else if (!isLoading && messages.length === 0) {
      setIsConversationReady(true)
      initialScrollDoneRef.current = true
    }
  }, [isLoading, messages.length])

  // Custom prompt handlers
  const handleAddCustomPrompt = useCallback(async (label: string, prompt: string) => {
    const result = await window.electron.addCustomPrompt(label, prompt)
    if (result.success && result.prompt) {
      const newPrompt = result.prompt
      setCustomPrompts((prev) => [...prev, newPrompt])
    }
  }, [])

  const handleDeleteCustomPrompt = useCallback(async (id: string) => {
    const result = await window.electron.deleteCustomPrompt(id)
    if (result.success) {
      setCustomPrompts((prev) => prev.filter((p) => p.id !== id))
    }
  }, [])

  // API key handlers
  const handleSetApiKey = async () => {
    if (!apiKeyInput.trim()) return
    const keyToSet = apiKeyInput.trim()
    setIsSettingKey(true)
    setError(null)
    try {
      const result = await window.electron.setClaudeApiKey(keyToSet)
      if (result.success) {
        setApiKey(keyToSet)
        setApiKeyInput('')
        const [defaultModel] = await Promise.all([window.electron.getSelectedModel()])
        setSelectedModel(defaultModel)
        loadModels()
      } else {
        setError(result.error || 'Invalid API key')
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
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

  // Model and settings handlers
  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    await window.electron.setSelectedModel(modelId)
  }

  const handleThinkingChange = async (enabled: boolean) => {
    setEnableThinking(enabled)
    await window.electron.setEnableThinking(enabled)
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

  // Message processing
  const processNextInQueue = useCallback(() => {
    setMessageQueue((prev) => {
      if (prev.length === 0) return prev
      const [next, ...rest] = prev
      const tempUserMsg: ChatMessage = {
        id: next.id,
        role: 'user',
        content: next.content,
        timestamp: new Date().toISOString()
      }
      setMessages((msgs) => [...msgs, tempUserMsg])
      setTimeout(() => {
        processMessageRef.current?.(next.content, next.id)
      }, 100)
      return rest
    })
  }, [])

  const processMessage = useCallback(
    async (userMessage: string, tempMsgId: string) => {
      isProcessingRef.current = true
      setIsSending(true)
      setError(null)
      setStreaming({ content: '', thinking: '', isStreaming: true })

      try {
        if (streamCleanupRef.current) {
          streamCleanupRef.current()
        }

        const cleanup = window.electron.onChatStreamChunk((chunk) => {
          if (chunk.type === 'text' && chunk.content) {
            setStreaming((prev) => ({ ...prev, content: prev.content + chunk.content }))
          } else if (chunk.type === 'thinking' && chunk.thinking) {
            setStreaming((prev) => ({ ...prev, thinking: prev.thinking + chunk.thinking }))
          } else if (chunk.type === 'done') {
            setStreaming({ content: '', thinking: '', isStreaming: false })
            if (linkedPRChat) {
              window.electron.getPRChat(linkedPRChat.prId).then((prChat) => {
                if (prChat) setMessages(prChat.messages)
              })
            } else {
              window.electron.getChatHistory().then((history) => setMessages(history))
            }
            setIsSending(false)
            isProcessingRef.current = false
            if (streamCleanupRef.current) {
              streamCleanupRef.current()
              streamCleanupRef.current = null
            }
            processNextInQueue()
          } else if (chunk.type === 'error') {
            setError(chunk.error || 'Failed to send message')
            setStreaming({ content: '', thinking: '', isStreaming: false })
            setIsSending(false)
            isProcessingRef.current = false
            setMessages((prev) => prev.filter((m) => m.id !== tempMsgId))
            if (streamCleanupRef.current) {
              streamCleanupRef.current()
              streamCleanupRef.current = null
            }
            processNextInQueue()
          }
        })
        streamCleanupRef.current = cleanup

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
      } catch {
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

  useEffect(() => {
    processMessageRef.current = processMessage
  }, [processMessage])

  const sendMessage = useCallback(
    (messageText: string) => {
      if (!messageText.trim()) return
      if (linkedPRChat && !prSystemContext) {
        setError('PR context not loaded. Please wait a moment and try again.')
        return
      }

      const userMessage = messageText.trim()
      const msgId = `temp_${Date.now()}`

      if (isProcessingRef.current || isSending) {
        setMessageQueue((prev) => [...prev, { id: msgId, content: userMessage }])
        return
      }

      setMessages((prev) => [
        ...prev,
        { id: msgId, role: 'user', content: userMessage, timestamp: new Date().toISOString() }
      ])
      processMessage(userMessage, msgId)
    },
    [isSending, processMessage, linkedPRChat, prSystemContext]
  )

  const handleSendMessage = useCallback(() => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '72px'
    }
  }, [input, sendMessage])

  const handleClearHistory = async () => {
    if (linkedPRChat) {
      await window.electron.clearPRChatMessages(linkedPRChat.prId)
    } else {
      await window.electron.clearChatHistory()
    }
    setMessages([])
  }

  const handlePostComment = useCallback(
    async (
      file: string,
      line: number,
      body: string
    ): Promise<{ success: boolean; commentUrl?: string }> => {
      if (!selectedPR || !linkedPRChat) return { success: false }

      const attributedBody = `${body}\n\n---\n_Posted by AI Assistant via CodeLobby_`
      try {
        return await window.electron.postPRComment(
          selectedPR.base.repo.owner.login,
          selectedPR.base.repo.name,
          selectedPR.number,
          selectedPR.head.sha,
          file,
          line,
          attributedBody
        )
      } catch {
        return { success: false }
      }
    },
    [selectedPR, linkedPRChat]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Render
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <ClaudeIcon className="w-5 h-5 text-primary flex-shrink-0" />
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
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {allPRChats.length}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="end" side="bottom" sideOffset={5}>
                <div className="p-2 border-b border-border">
                  <h4 className="text-xs font-medium">Conversations</h4>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2',
                      !linkedPRChat && 'bg-primary/10'
                    )}
                    onClick={() => {
                      onClosePRChat?.()
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

                  {allPRChats.length > 0 && (
                    <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-medium bg-muted/30">
                      PR Conversations ({allPRChats.length})
                    </div>
                  )}

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
                          onSwitchToPRChat?.(chat.prId)
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
                          {chat.repoFullName} • {chat.messageCount} msgs •{' '}
                          {formatRelativeTime(chat.updatedAt)}
                        </div>
                      </button>
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-opacity flex-shrink-0"
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (linkedPRChat?.prId === chat.prId) await onClosePRChat?.()
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

      {/* Messages area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading skeleton */}
        {(isLoading || (!isConversationReady && messages.length > 0)) && (
          <div className="absolute inset-0 z-10 bg-background p-3 space-y-3 overflow-hidden">
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
                  style={{ width: `${skeleton.width}%`, height: `${skeleton.height}px` }}
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

        {/* PR Empty state */}
        {!isLoading && showPREmptyState && selectedPR && (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4 px-6 max-w-md">
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

        {/* Default empty state */}
        {!isLoading && !showPREmptyState && messages.length === 0 && !streaming.isStreaming && (
          <div className="h-full flex items-center justify-center min-h-[200px]">
            <div className="text-center space-y-4">
              <ClaudeIcon className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {apiKey ? 'Start a conversation with Claude' : 'Enter your API key below to start'}
              </p>
              {apiKey && !chatStarted && (
                <Button
                  onClick={() => {
                    setChatStarted(true)
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

        {/* Message list */}
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
            linkedPRChat={linkedPRChat}
            onPostComment={handlePostComment}
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

      {/* Context sync warning */}
      {linkedPRChat && !isContextValid && !error && (
        <div className="px-3 py-2 bg-warning/10 border-t border-warning/20">
          <div className="flex items-center gap-2 text-xs text-warning">
            <Loader2 className="w-3.5 h-3.5 flex-shrink-0 animate-spin" />
            <span className="truncate">Syncing PR context...</span>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20">
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-border">
        {!apiKey ? (
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
          <div className="space-y-2">
            <QuickActions
              prompts={
                linkedPRChat
                  ? getPRQuickPrompts({
                      hasCIFailures:
                        selectedPR?.checks?.state === 'failure' ||
                        selectedPR?.checks?.state === 'error'
                    })
                  : GENERAL_QUICK_PROMPTS
              }
              customPrompts={customPrompts}
              onSelect={sendMessage}
              onAddCustomPrompt={handleAddCustomPrompt}
              onDeleteCustomPrompt={handleDeleteCustomPrompt}
              disabled={isSending || streaming.isStreaming || (!!linkedPRChat && !isContextValid)}
            />

            <div className="flex gap-2 items-end">
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
