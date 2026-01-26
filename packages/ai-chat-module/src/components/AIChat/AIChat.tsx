/**
 * AIChat - AI chat panel powered by Claude
 *
 * Automatically follows the selected PR:
 * - When you select a PR, the chat switches to that PR's conversation
 * - Messages are persisted per-PR via TanStack Query
 * - Uses XMLHttpRequest for streaming (better than fetch in Electron)
 */

import type { ChatMessage, ReviewCommentInput } from '@codelobby/data'
import {
  useAddCustomPrompt,
  useClaudeApiKey,
  useClaudeModels,
  useClearChat,
  useCustomPrompts,
  useDeleteCustomPrompt,
  useEnableThinking,
  useEnableWebFetch,
  usePRChatMessages,
  usePRFiles,
  useSaveMessage,
  useSelectedModel,
  useSetClaudeApiKey,
  useSetEnableThinking,
  useSetEnableWebFetch,
  useSetSelectedModel,
  useSubmitPRReviewWithComments
} from '@codelobby/data'
import { Button } from '@codelobby/ui-kit'
import { ArrowDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getPRQuickPrompts } from '../../constants'
import { useThrottledValue } from '../../hooks'
import type { AIChatPanelProps, ReviewData, ReviewVerdict, StreamingState } from '../../types'
import {
  applyStreamEvent,
  buildClaudeHeaders,
  buildClaudeRequestBody,
  buildSystemPrompt,
  CLAUDE_API_URL,
  createStreamAccumulator,
  DEFAULT_MODEL,
  formatMessagesForClaude,
  parseSSEChunk
} from '../../utils'
import { NoPRSelectedState, PRContextBanner } from '../ChatEmptyStates'
import { ChatHeader } from '../ChatHeader'
import { ChatInput } from '../ChatInput'
import { ChatSettings } from '../ChatSettings'
import { MessageBubble } from '../MessageBubble'
import { ReviewPreviewModal } from '../ReviewPreviewModal'
import { StreamingBubble } from '../StreamingBubble'

export type { AIChatPanelProps } from '../../types'

const SCROLL_THRESHOLD = 100

export function AIChatPanel({ onClose, user, selectedPR }: AIChatPanelProps): React.JSX.Element {
  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVE PR ID - Chat automatically follows selected PR
  // ═══════════════════════════════════════════════════════════════════════════

  const prId = selectedPR ? `${selectedPR.base.repo.full_name}#${selectedPR.number}` : null
  const repoFullName = selectedPR?.base.repo.full_name ?? null
  const prNumber = selectedPR?.number ?? null

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERIES & MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: apiKey } = useClaudeApiKey()
  const { data: selectedModel } = useSelectedModel()
  const { data: enableThinking } = useEnableThinking()
  const { data: enableWebFetch } = useEnableWebFetch()
  const { data: customPrompts = [] } = useCustomPrompts()
  const { data: messages = [], isLoading: isLoadingMessages } = usePRChatMessages(prId)
  const { data: models = [], isLoading: isLoadingModels } = useClaudeModels()
  // Pass changed_files count to enable parallel fetching for large PRs
  const { data: prFiles = [] } = usePRFiles(repoFullName, prNumber, selectedPR?.changed_files)

  // Build PR context with full details including file diffs
  const prContext = selectedPR
    ? {
        prNumber: selectedPR.number,
        prTitle: selectedPR.title,
        prBody: selectedPR.body,
        repoFullName: selectedPR.base.repo.full_name,
        files: prFiles
      }
    : undefined

  const setApiKey = useSetClaudeApiKey()
  const setSelectedModelMut = useSetSelectedModel()
  const setEnableThinkingMut = useSetEnableThinking()
  const setEnableWebFetchMut = useSetEnableWebFetch()
  const saveMessage = useSaveMessage()
  const clearChat = useClearChat()
  const addCustomPrompt = useAddCustomPrompt()
  const deleteCustomPrompt = useDeleteCustomPrompt()
  const submitReview = useSubmitPRReviewWithComments()

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const [isSending, setIsSending] = useState(false)
  const [streaming, setStreaming] = useState<StreamingState>({
    content: '',
    thinking: '',
    isStreaming: false
  })
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Review preview state
  const [reviewPreview, setReviewPreview] = useState<{
    isOpen: boolean
    review: ReviewData | null
  }>({ isOpen: false, review: null })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const throttledStreaming = useThrottledValue(streaming, 100)

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const isAutoScrollingRef = useRef(false)

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const currentModel = selectedModel || DEFAULT_MODEL
  const hasMessages = messages.length > 0

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const isAtBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    const { scrollTop, scrollHeight, clientHeight } = container
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    const container = scrollContainerRef.current
    if (!container) return

    isAutoScrollingRef.current = true
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    })

    setTimeout(
      () => {
        isAutoScrollingRef.current = false
      },
      smooth ? 300 : 50
    )
  }, [])

  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return
    setUserScrolledUp(!isAtBottom())
  }, [isAtBottom])

  // ═══════════════════════════════════════════════════════════════════════════
  // STREAMING
  // ═══════════════════════════════════════════════════════════════════════════

  const sendMessageWithStreaming = useCallback(
    (messageText: string) => {
      if (!prId || !apiKey) return

      setError(null)
      setIsSending(true)
      setUserScrolledUp(false)

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: messageText,
        timestamp: new Date().toISOString()
      }
      saveMessage.mutate({ prId, message: userMessage })
      scrollToBottom(false)

      setStreaming({ content: '', thinking: '', isStreaming: true })

      const systemPrompt = buildSystemPrompt({ prContext })
      const claudeMessages = formatMessagesForClaude([...messages, userMessage])
      const requestBody = buildClaudeRequestBody({
        model: currentModel,
        systemPrompt,
        messages: claudeMessages,
        enableThinking: enableThinking ?? false
      })
      const headers = buildClaudeHeaders(apiKey)

      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr

      let accumulator = createStreamAccumulator()
      let lastProcessedIndex = 0

      xhr.open('POST', CLAUDE_API_URL)
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })

      xhr.onprogress = () => {
        const newText = xhr.responseText.slice(lastProcessedIndex)
        lastProcessedIndex = xhr.responseText.length
        if (!newText) return

        const events = parseSSEChunk(newText)
        for (const event of events) {
          accumulator = applyStreamEvent(accumulator, event)
        }

        setStreaming({
          content: accumulator.content,
          thinking: accumulator.thinking,
          isStreaming: true
        })
      }

      xhr.onload = () => {
        if (xhr.status !== 200) {
          try {
            const err = JSON.parse(xhr.responseText)
            setError(err.error?.message || `API error: ${xhr.status}`)
          } catch {
            setError(`API error: ${xhr.status}`)
          }
          setStreaming({ content: '', thinking: '', isStreaming: false })
          setIsSending(false)
          return
        }

        setStreaming({ content: '', thinking: '', isStreaming: false })
        const assistantMessage: ChatMessage = {
          id: accumulator.messageId,
          role: 'assistant',
          content: accumulator.content,
          thinking: accumulator.thinking || undefined,
          timestamp: new Date().toISOString()
        }
        saveMessage.mutate({ prId, message: assistantMessage })
        setIsSending(false)
      }

      xhr.onerror = () => {
        setError('Network error')
        setStreaming({ content: '', thinking: '', isStreaming: false })
        setIsSending(false)
      }

      xhr.send(JSON.stringify(requestBody))
    },
    [prId, apiKey, prContext, messages, currentModel, enableThinking, saveMessage, scrollToBottom]
  )

  // Cleanup XHR on unmount
  useEffect(() => {
    return () => {
      if (xhrRef.current) xhrRef.current.abort()
    }
  }, [])

  // Auto-scroll during streaming (throttledStreaming triggers scroll as content arrives)
  useEffect(() => {
    if (streaming.isStreaming && !userScrolledUp && throttledStreaming.content) {
      scrollToBottom(false)
    }
  }, [streaming.isStreaming, userScrolledUp, scrollToBottom, throttledStreaming.content])

  // Scroll when new messages arrive (messages triggers scroll when count changes)
  useEffect(() => {
    if (!streaming.isStreaming && messages.length > 0) {
      scrollToBottom()
      setUserScrolledUp(false)
    }
  }, [messages, streaming.isStreaming, scrollToBottom])

  // Reset scroll when PR changes (selectedPR triggers reset on PR switch)
  useEffect(() => {
    if (selectedPR) {
      setUserScrolledUp(false)
      // Small delay to allow messages to render
      setTimeout(() => scrollToBottom(false), 100)
    }
  }, [selectedPR, scrollToBottom])

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSetApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return
    setIsSettingKey(true)
    setError(null)
    try {
      const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        headers: buildClaudeHeaders(apiKeyInput.trim())
      })
      if (response.ok) {
        setApiKey.mutate(apiKeyInput.trim())
        setApiKeyInput('')
        // Models will auto-fetch via useClaudeModels when API key is set
      } else {
        setError('Invalid API key')
      }
    } catch {
      setError('Failed to validate API key')
    } finally {
      setIsSettingKey(false)
    }
  }, [apiKeyInput, setApiKey])

  const handleRemoveApiKey = useCallback(() => {
    setApiKey.mutate('')
    setShowSettings(false)
  }, [setApiKey])

  const handleSendMessage = useCallback(() => {
    if (!input.trim() || !prId || isSending) return
    sendMessageWithStreaming(input.trim())
    setInput('')
  }, [input, prId, isSending, sendMessageWithStreaming])

  const handleClearHistory = useCallback(() => {
    if (prId) clearChat.mutate(prId)
  }, [prId, clearChat])

  const toggleThinkingExpanded = useCallback((id: string) => {
    setExpandedThinking((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleScrollToBottomClick = useCallback(() => {
    setUserScrolledUp(false)
    scrollToBottom(true)
  }, [scrollToBottom])

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const showScrollButton = userScrolledUp

  return (
    <div className="h-full flex flex-col">
      <ChatHeader
        apiKey={apiKey || null}
        selectedModel={currentModel}
        models={models}
        showSettings={showSettings}
        onShowSettingsChange={setShowSettings}
        onClearHistory={handleClearHistory}
        onClose={onClose}
      />

      {/* Show PR context banner when a PR is selected */}
      {selectedPR && (
        <PRContextBanner
          prNumber={selectedPR.number}
          prTitle={selectedPR.title}
          repoFullName={selectedPR.base.repo.full_name}
        />
      )}

      {showSettings && apiKey && (
        <ChatSettings
          models={models}
          selectedModel={currentModel}
          enableThinking={enableThinking ?? false}
          isLoadingModels={isLoadingModels}
          onModelChange={(id) => setSelectedModelMut.mutate(id)}
          onThinkingChange={(enabled) => setEnableThinkingMut.mutate(enabled)}
          onRemoveApiKey={handleRemoveApiKey}
        />
      )}

      <div className="flex-1 relative overflow-hidden">
        {/* Loading state */}
        {isLoadingMessages && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* No PR selected */}
        {!isLoadingMessages && !selectedPR && <NoPRSelectedState apiKey={apiKey || null} />}

        {/* Chat area - shows when PR is selected */}
        {!isLoadingMessages && selectedPR && (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto p-4 space-y-4"
          >
            {/* Empty state when no messages */}
            {!hasMessages && !streaming.isStreaming && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-muted-foreground mb-2">No conversation yet</p>
                <p className="text-xs text-muted-foreground">
                  Ask a question about PR #{selectedPR.number}
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                expandedThinking={expandedThinking}
                toggleThinkingExpanded={toggleThinkingExpanded}
                user={user}
                onOpenReview={(review) => setReviewPreview({ isOpen: true, review })}
              />
            ))}

            {/* Streaming bubble */}
            {streaming.isStreaming && (
              <div className="pb-3">
                <StreamingBubble streaming={throttledStreaming} />
              </div>
            )}

            <div className="h-px" />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            variant="unstyled"
            size="none"
            onClick={handleScrollToBottomClick}
            className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive/10 border-t border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Input area */}
      {apiKey && prId ? (
        <ChatInput
          apiKey={apiKey}
          apiKeyInput={apiKeyInput}
          isSettingKey={isSettingKey}
          onApiKeyInputChange={setApiKeyInput}
          onSetApiKey={handleSetApiKey}
          input={input}
          isSending={isSending}
          isContextValid={true}
          linkedPRChat={!!selectedPR}
          streaming={streaming}
          messages={messages}
          selectedModel={currentModel}
          enableWebFetch={enableWebFetch ?? false}
          onWebFetchChange={(enabled) => setEnableWebFetchMut.mutate(enabled)}
          prompts={getPRQuickPrompts({
            hasCIFailures:
              selectedPR?.checks?.state === 'failure' || selectedPR?.checks?.state === 'error'
          })}
          customPrompts={customPrompts}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          onQuickActionSelect={(text) => {
            if (!prId || isSending) return
            sendMessageWithStreaming(text)
          }}
          onAddCustomPrompt={async (label, prompt) => {
            addCustomPrompt.mutate({ label, prompt })
          }}
          onDeleteCustomPrompt={async (id) => {
            deleteCustomPrompt.mutate(id)
          }}
        />
      ) : !apiKey ? (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetApiKey()}
              placeholder="Enter Claude API key..."
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
              disabled={isSettingKey}
            />
            <Button onClick={handleSetApiKey} disabled={isSettingKey || !apiKeyInput.trim()}>
              {isSettingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Set'}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Review Preview Modal */}
      {selectedPR && (
        <ReviewPreviewModal
          isOpen={reviewPreview.isOpen}
          onClose={() => setReviewPreview({ isOpen: false, review: null })}
          review={reviewPreview.review}
          prFiles={prFiles}
          prTitle={selectedPR.title}
          repoFullName={selectedPR.base.repo.full_name}
          isSubmitting={isSubmittingReview}
          onSubmit={async (
            summary: string,
            verdict: ReviewVerdict,
            comments: ReviewCommentInput[]
          ) => {
            setIsSubmittingReview(true)
            try {
              // Map verdict to GitHub's review event format
              const event =
                verdict === 'approve'
                  ? 'APPROVE'
                  : verdict === 'request_changes'
                    ? 'REQUEST_CHANGES'
                    : 'COMMENT'

              await submitReview.mutateAsync({
                owner: selectedPR.base.repo.owner.login,
                repo: selectedPR.base.repo.name,
                prNumber: selectedPR.number,
                event,
                body: summary,
                comments
              })
              return { success: true }
            } catch (err) {
              console.error('Failed to submit review:', err)
              return { success: false }
            } finally {
              setIsSubmittingReview(false)
            }
          }}
        />
      )}
    </div>
  )
}
