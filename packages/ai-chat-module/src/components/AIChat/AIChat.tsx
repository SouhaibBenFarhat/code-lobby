/**
 * AIChat - AI chat panel powered by Claude.
 * Main component that orchestrates the chat experience.
 *
 * UI Components:
 * - ChatHeader: Title, conversation navigator, settings buttons
 * - ChatSettings: Model selector, thinking toggle, API key management
 * - ChatInput: Message input, quick actions, context indicator
 * - ChatEmptyStates: Loading skeleton, PR empty state, default empty state
 * - VirtualizedMessageList: Efficient message rendering
 *
 * Custom Hooks:
 * - useScrollManagement: Scroll state and behavior
 * - useThrottledValue: Throttle streaming updates
 */

/// <reference path="../../../../../src/preload/electron-api.d.ts" />

import { ArrowDown } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { GENERAL_QUICK_PROMPTS, getPRQuickPrompts } from '../../constants'
import { useScrollManagement, useThrottledValue } from '../../hooks'
import type {
  AIChatPanelProps,
  ChatMessage,
  ClaudeModel,
  CustomPrompt,
  PRChatInfo,
  QueuedMessage,
  StreamingState
} from '../../types'
import {
  ChatLoadingSkeleton,
  ContextSyncBanner,
  DefaultEmptyState,
  ErrorBanner,
  PRContextBanner,
  PREmptyState
} from '../ChatEmptyStates'
import { ChatHeader } from '../ChatHeader'
import { ChatInput } from '../ChatInput'
import { ChatSettings } from '../ChatSettings'
import { VirtualizedMessageList } from '../VirtualizedMessageList'

export type { AIChatPanelProps } from '../../types'

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

  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [enableThinking, setEnableThinking] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  const [allPRChats, setAllPRChats] = useState<PRChatInfo[]>([])
  const [prSystemContext, setPrSystemContext] = useState<string | undefined>(undefined)

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const streamCleanupRef = useRef<(() => void) | null>(null)
  const isProcessingRef = useRef(false)
  const processMessageRef = useRef<(msg: string, id: string) => Promise<void>>()

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM HOOKS
  // ═══════════════════════════════════════════════════════════════════════════

  const scroll = useScrollManagement(isLoading, messages.length)
  const throttledStreaming = useThrottledValue(streaming, 30)

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED
  // ═══════════════════════════════════════════════════════════════════════════

  const selectedPRId = selectedPR ? `${selectedPR.base.repo.full_name}#${selectedPR.number}` : null
  const isContextValid = useMemo(
    () => (linkedPRChat ? prSystemContext !== undefined : prSystemContext === undefined),
    [linkedPRChat, prSystemContext]
  )
  const showPREmptyState = selectedPR && (!linkedPRChat || linkedPRChat.prId !== selectedPRId)
  const showInput = chatStarted || messages.length > 0 || streaming.isStreaming || linkedPRChat

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════════════════════

  const loadModels = useCallback(async () => {
    setIsLoadingModels(true)
    try {
      const result = await window.electron.fetchClaudeModels()
      if (result.success && result.models) setModels(result.models)
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

  const loadAllPRChats = useCallback(async () => {
    const chats = await window.electron.getPRChats()
    const infos: PRChatInfo[] = chats.map((c) => ({
      prId: c.prId,
      prNumber: c.prNumber,
      prTitle: c.prTitle,
      repoFullName: c.repoFullName,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length
    }))
    infos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    setAllPRChats(infos)
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll.resetScroll is stable (empty deps)
  const loadData = useCallback(async () => {
    setIsLoading(true)
    scroll.resetScroll()
    setError(null)
    try {
      const [key, model, thinking, prompts] = await Promise.all([
        window.electron.getClaudeApiKey(),
        window.electron.getSelectedModel(),
        window.electron.getEnableThinking(),
        window.electron.getCustomPrompts()
      ])
      setApiKey(key)
      setSelectedModel(model)
      setEnableThinking(thinking)
      setCustomPrompts(prompts)

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
      if (key) loadModels()
    } finally {
      setIsLoading(false)
    }
  }, [loadModels, linkedPRChat])

  // ═══════════════════════════════════════════════════════════════════════════
  // MESSAGE PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════

  const processNextInQueue = useCallback(() => {
    setMessageQueue((prev) => {
      if (!prev.length) return prev
      const [next, ...rest] = prev
      setMessages((m) => [
        ...m,
        { id: next.id, role: 'user', content: next.content, timestamp: new Date().toISOString() }
      ])
      setTimeout(() => processMessageRef.current?.(next.content, next.id), 100)
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
        streamCleanupRef.current?.()
        const cleanup = window.electron.onChatStreamChunk((chunk) => {
          if (chunk.type === 'text' && chunk.content) {
            setStreaming((p) => ({ ...p, content: p.content + chunk.content }))
          } else if (chunk.type === 'thinking' && chunk.thinking) {
            setStreaming((p) => ({ ...p, thinking: p.thinking + chunk.thinking }))
          } else if (chunk.type === 'done') {
            setStreaming({ content: '', thinking: '', isStreaming: false })
            ;(linkedPRChat
              ? window.electron.getPRChat(linkedPRChat.prId).then((c) => c?.messages || [])
              : window.electron.getChatHistory()
            ).then(setMessages)
            setIsSending(false)
            isProcessingRef.current = false
            streamCleanupRef.current?.()
            streamCleanupRef.current = null
            processNextInQueue()
          } else if (chunk.type === 'error') {
            setError(chunk.error || 'Failed to send message')
            setStreaming({ content: '', thinking: '', isStreaming: false })
            setIsSending(false)
            isProcessingRef.current = false
            setMessages((p) => p.filter((m) => m.id !== tempMsgId))
            streamCleanupRef.current?.()
            streamCleanupRef.current = null
            processNextInQueue()
          }
        })
        streamCleanupRef.current = cleanup

        const result = await window.electron.sendChatMessageStreaming(userMessage, prSystemContext)
        if (!result.success) {
          setError(result.error || 'Failed to send message')
          setStreaming({ content: '', thinking: '', isStreaming: false })
          setMessages((p) => p.filter((m) => m.id !== tempMsgId))
          setIsSending(false)
          isProcessingRef.current = false
          streamCleanupRef.current?.()
          streamCleanupRef.current = null
          processNextInQueue()
        }
      } catch {
        setError('Failed to communicate with Claude')
        setStreaming({ content: '', thinking: '', isStreaming: false })
        setMessages((p) => p.filter((m) => m.id !== tempMsgId))
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
    (text: string) => {
      if (!text.trim()) return
      if (linkedPRChat && !prSystemContext) {
        setError('PR context not loaded. Please wait.')
        return
      }
      const msg = text.trim()
      const id = `temp_${Date.now()}`
      if (isProcessingRef.current || isSending) {
        setMessageQueue((p) => [...p, { id, content: msg }])
        return
      }
      setMessages((p) => [
        ...p,
        { id, role: 'user', content: msg, timestamp: new Date().toISOString() }
      ])
      processMessage(msg, id)
    },
    [isSending, processMessage, linkedPRChat, prSystemContext]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSendMessage = useCallback(() => {
    if (!input.trim()) return
    sendMessage(input.trim())
    setInput('')
  }, [input, sendMessage])

  const handleSetApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return
    setIsSettingKey(true)
    setError(null)
    try {
      const result = await window.electron.setClaudeApiKey(apiKeyInput.trim())
      if (result.success) {
        setApiKey(apiKeyInput.trim())
        setApiKeyInput('')
        setSelectedModel(await window.electron.getSelectedModel())
        loadModels()
      } else {
        setError(result.error || 'Invalid API key')
      }
    } catch (e) {
      setError(`Failed to set API key: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setIsSettingKey(false)
    }
  }, [apiKeyInput, loadModels])

  const handleRemoveApiKey = useCallback(async () => {
    await window.electron.setClaudeApiKey(null)
    setApiKey(null)
    setShowSettings(false)
    setMessages([])
    setMessageQueue([])
  }, [])

  const handleClearHistory = useCallback(async () => {
    linkedPRChat
      ? await window.electron.clearPRChatMessages(linkedPRChat.prId)
      : await window.electron.clearChatHistory()
    setMessages([])
  }, [linkedPRChat])

  const handleDeletePRChat = useCallback(
    async (prId: string) => {
      await window.electron.deletePRChat(prId)
      loadAllPRChats()
    },
    [loadAllPRChats]
  )

  const handlePostComment = useCallback(
    async (file: string, line: number, body: string) => {
      if (!selectedPR || !linkedPRChat) return { success: false }
      try {
        return await window.electron.postPRComment(
          selectedPR.base.repo.owner.login,
          selectedPR.base.repo.name,
          selectedPR.number,
          selectedPR.head.sha,
          file,
          line,
          `${body}\n\n---\n_Posted by AI Assistant via CodeLobby_`
        )
      } catch {
        return { success: false }
      }
    },
    [selectedPR, linkedPRChat]
  )

  const toggleThinkingExpanded = useCallback((id: string) => {
    setExpandedThinking((p) => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  const handleStartChat = useCallback(() => {
    setChatStarted(true)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    loadData()
  }, [loadData])

  // biome-ignore lint/correctness/useExhaustiveDependencies: linkedPRChat?.prId triggers reload when chat changes
  useEffect(() => {
    loadAllPRChats()
  }, [loadAllPRChats, linkedPRChat?.prId])

  useEffect(() => {
    if (!selectedPRId || linkedPRChat?.prId === selectedPRId) return
    let cancelled = false
    ;(async () => {
      const chat = await window.electron.getPRChat(selectedPRId)
      if (cancelled) return
      chat && onSwitchToPRChat ? onSwitchToPRChat(selectedPRId) : linkedPRChat && onClosePRChat?.()
    })()
    return () => {
      cancelled = true
    }
  }, [selectedPRId, linkedPRChat?.prId, onSwitchToPRChat, onClosePRChat, linkedPRChat])

  useEffect(() => {
    if (selectedPRId && !linkedPRChat && prSystemContext !== undefined) {
      setPrSystemContext(undefined)
    }
  }, [selectedPRId, linkedPRChat, prSystemContext])

  useEffect(() => {
    if (!scroll.isUserScrolledUp && !streaming.isStreaming) scroll.scrollToBottom(false)
  }, [scroll, streaming.isStreaming])

  useLayoutEffect(() => {
    if (streaming.isStreaming && !scroll.isUserScrolledUp) scroll.scrollToBottom(false)
  }, [streaming.isStreaming, scroll])

  useEffect(() => () => streamCleanupRef.current?.(), [])

  useEffect(() => {
    if (!isLoading && messages.length > 0 && !scroll.initialScrollDoneRef.current) {
      if (scroll.virtualizerScrollToEndRef.current) {
        scroll.initialScrollDoneRef.current = true
        const t = setTimeout(() => {
          requestAnimationFrame(() => {
            scroll.virtualizerScrollToEndRef.current?.()
            scroll.setIsConversationReady(true)
          })
        }, 50)
        return () => clearTimeout(t)
      }
    } else if (!isLoading && !messages.length) {
      scroll.setIsConversationReady(true)
      scroll.initialScrollDoneRef.current = true
    }
  }, [isLoading, messages.length, scroll])

  useEffect(() => {
    if (!isLoading && apiKey) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [isLoading, apiKey])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col">
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

      {linkedPRChat && (
        <PRContextBanner
          prNumber={linkedPRChat.prNumber}
          prTitle={linkedPRChat.prTitle}
          repoFullName={linkedPRChat.repoFullName}
        />
      )}

      {showSettings && apiKey && (
        <ChatSettings
          models={models}
          selectedModel={selectedModel}
          enableThinking={enableThinking}
          isLoadingModels={isLoadingModels}
          onModelChange={async (id) => {
            setSelectedModel(id)
            await window.electron.setSelectedModel(id)
          }}
          onThinkingChange={async (enabled) => {
            setEnableThinking(enabled)
            await window.electron.setEnableThinking(enabled)
          }}
          onLoadModels={loadModels}
          onRemoveApiKey={handleRemoveApiKey}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        {(isLoading || (!scroll.isConversationReady && messages.length > 0)) && (
          <ChatLoadingSkeleton />
        )}

        {!isLoading && showPREmptyState && selectedPR && (
          <PREmptyState selectedPR={selectedPR} apiKey={apiKey} onStartPRChat={onStartPRChat} />
        )}

        {!isLoading && !showPREmptyState && !messages.length && !streaming.isStreaming && (
          <DefaultEmptyState
            apiKey={apiKey}
            chatStarted={chatStarted}
            onStartChat={handleStartChat}
          />
        )}

        {!isLoading && !showPREmptyState && (messages.length > 0 || streaming.isStreaming) && (
          <VirtualizedMessageList
            messages={messages}
            streaming={streaming}
            throttledStreaming={throttledStreaming}
            messageQueue={messageQueue}
            expandedThinking={expandedThinking}
            toggleThinkingExpanded={toggleThinkingExpanded}
            setMessageQueue={setMessageQueue}
            scrollContainerRef={scroll.scrollContainerRef}
            onScroll={scroll.handleScroll}
            onVirtualizerReady={scroll.handleVirtualizerReady}
            user={user}
            linkedPRChat={linkedPRChat}
            onPostComment={handlePostComment}
          />
        )}

        {scroll.isUserScrolledUp && messages.length > 0 && (
          <button
            type="button"
            onClick={() => scroll.scrollToBottom(true)}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}
      </div>

      <ContextSyncBanner isVisible={!!linkedPRChat && !isContextValid && !error} />
      <ErrorBanner error={error} />

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
          onAddCustomPrompt={async (l, p) => {
            const r = await window.electron.addCustomPrompt(l, p)
            if (r.success && r.prompt)
              setCustomPrompts((prev) => [...prev, r.prompt as CustomPrompt])
          }}
          onDeleteCustomPrompt={async (id) => {
            const r = await window.electron.deleteCustomPrompt(id)
            if (r.success) setCustomPrompts((p) => p.filter((x) => x.id !== id))
          }}
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
