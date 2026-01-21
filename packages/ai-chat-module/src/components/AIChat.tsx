/**
 * AIChat - AI chat panel powered by Claude.
 * Main component that orchestrates the chat experience.
 *
 * This component coordinates:
 * - ChatHeader: Title, conversation navigator, settings buttons
 * - ChatSettings: Model selector, thinking toggle, API key management
 * - ChatInput: Message input, quick actions, context indicator
 * - ChatEmptyStates: Loading skeleton, PR empty state, default empty state
 * - VirtualizedMessageList: Efficient message rendering
 */

/// <reference path="../../../../src/preload/electron-api.d.ts" />

import { ArrowDown } from 'lucide-react'
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
import {
  ChatLoadingSkeleton,
  ContextSyncBanner,
  DefaultEmptyState,
  ErrorBanner,
  PRContextBanner,
  PREmptyState
} from './ChatEmptyStates'
import { ChatHeader } from './ChatHeader'
import { ChatInput } from './ChatInput'
import { ChatSettings } from './ChatSettings'
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
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  // API & Model state
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [enableThinking, setEnableThinking] = useState(false)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Message state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
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
  const [prSystemContext, setPrSystemContext] = useState<string | undefined>(undefined)

  // Scroll state
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [isConversationReady, setIsConversationReady] = useState(false)

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const isProcessingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const scrollFrameRef = useRef<number | null>(null)
  const virtualizerScrollToEndRef = useRef<(() => void) | null>(null)
  const initialScrollDoneRef = useRef(false)
  const processMessageRef = useRef<(userMessage: string, tempMsgId: string) => Promise<void>>()

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════

  const throttledStreaming = useThrottledValue(streaming, 30)
  const selectedPRId = selectedPR ? `${selectedPR.base.repo.full_name}#${selectedPR.number}` : null

  const isContextValid = useMemo(() => {
    if (linkedPRChat) {
      return prSystemContext !== undefined
    }
    return prSystemContext === undefined
  }, [linkedPRChat, prSystemContext])

  const showPREmptyState = selectedPR && (!linkedPRChat || linkedPRChat.prId !== selectedPRId)

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS - Data Loading
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS - Scroll Management
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS - Message Processing
  // ═══════════════════════════════════════════════════════════════════════════

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACKS - Event Handlers
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSendMessage = useCallback(() => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }, [input, sendMessage])

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

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId)
    await window.electron.setSelectedModel(modelId)
  }

  const handleThinkingChange = async (enabled: boolean) => {
    setEnableThinking(enabled)
    await window.electron.setEnableThinking(enabled)
  }

  const handleClearHistory = async () => {
    if (linkedPRChat) {
      await window.electron.clearPRChatMessages(linkedPRChat.prId)
    } else {
      await window.electron.clearChatHistory()
    }
    setMessages([])
  }

  const handleDeletePRChat = async (prId: string) => {
    await window.electron.deletePRChat(prId)
    loadAllPRChats()
  }

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

  const handleStartChat = useCallback(() => {
    setChatStarted(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Load initial data
  useEffect(() => {
    loadData()
  }, [loadData])

  // Load PR chats when linkedPRChat changes
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

  // Process message ref update
  useEffect(() => {
    processMessageRef.current = processMessage
  }, [processMessage])

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

  // Focus textarea
  useEffect(() => {
    if (!isLoading && apiKey && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [isLoading, apiKey])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const showInput = chatStarted || messages.length > 0 || streaming.isStreaming || linkedPRChat

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <ChatHeader
        linkedPRChat={linkedPRChat}
        apiKey={apiKey}
        selectedModel={selectedModel}
        models={models}
        allPRChats={allPRChats}
        showConversations={showConversations}
        showSettings={showSettings}
        onShowConversationsChange={setShowConversations}
        onShowSettingsChange={setShowSettings}
        onClosePRChat={onClosePRChat}
        onSwitchToPRChat={onSwitchToPRChat}
        onClearHistory={handleClearHistory}
        onClose={onClose}
        onDeletePRChat={handleDeletePRChat}
      />

      {/* PR Context Banner */}
      {linkedPRChat && (
        <PRContextBanner
          prNumber={linkedPRChat.prNumber}
          prTitle={linkedPRChat.prTitle}
          repoFullName={linkedPRChat.repoFullName}
        />
      )}

      {/* Settings Panel */}
      {showSettings && apiKey && (
        <ChatSettings
          models={models}
          selectedModel={selectedModel}
          enableThinking={enableThinking}
          isLoadingModels={isLoadingModels}
          onModelChange={handleModelChange}
          onThinkingChange={handleThinkingChange}
          onLoadModels={loadModels}
          onRemoveApiKey={handleRemoveApiKey}
        />
      )}

      {/* Messages area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading skeleton */}
        {(isLoading || (!isConversationReady && messages.length > 0)) && <ChatLoadingSkeleton />}

        {/* PR Empty state */}
        {!isLoading && showPREmptyState && selectedPR && (
          <PREmptyState selectedPR={selectedPR} apiKey={apiKey} onStartPRChat={onStartPRChat} />
        )}

        {/* Default empty state */}
        {!isLoading && !showPREmptyState && messages.length === 0 && !streaming.isStreaming && (
          <DefaultEmptyState
            apiKey={apiKey}
            chatStarted={chatStarted}
            onStartChat={handleStartChat}
          />
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
      <ContextSyncBanner isVisible={!!linkedPRChat && !isContextValid && !error} />

      {/* Error display */}
      <ErrorBanner error={error} />

      {/* Input area */}
      {apiKey && showInput ? (
        <ChatInput
          apiKey={apiKey}
          apiKeyInput={apiKeyInput}
          isSettingKey={isSettingKey}
          onApiKeyInputChange={setApiKeyInput}
          onSetApiKey={handleSetApiKey}
          input={input}
          isSending={isSending}
          isContextValid={isContextValid}
          linkedPRChat={!!linkedPRChat}
          streaming={streaming}
          messages={messages}
          selectedModel={selectedModel}
          prompts={
            linkedPRChat
              ? getPRQuickPrompts({
                  hasCIFailures:
                    selectedPR?.checks?.state === 'failure' || selectedPR?.checks?.state === 'error'
                })
              : GENERAL_QUICK_PROMPTS
          }
          customPrompts={customPrompts}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          onQuickActionSelect={sendMessage}
          onAddCustomPrompt={handleAddCustomPrompt}
          onDeleteCustomPrompt={handleDeleteCustomPrompt}
        />
      ) : !apiKey ? (
        <ChatInput
          apiKey={null}
          apiKeyInput={apiKeyInput}
          isSettingKey={isSettingKey}
          onApiKeyInputChange={setApiKeyInput}
          onSetApiKey={handleSetApiKey}
          input=""
          isSending={false}
          isContextValid={true}
          linkedPRChat={false}
          streaming={{ content: '', thinking: '', isStreaming: false }}
          messages={[]}
          selectedModel=""
          prompts={[]}
          customPrompts={[]}
          onInputChange={() => {}}
          onSendMessage={() => {}}
          onQuickActionSelect={() => {}}
          onAddCustomPrompt={async () => {}}
          onDeleteCustomPrompt={async () => {}}
        />
      ) : null}
    </div>
  )
}
