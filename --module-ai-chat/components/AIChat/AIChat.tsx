/**
 * AIChat - AI chat panel powered by Claude Code CLI
 *
 * Automatically follows the selected PR:
 * - When you select a PR, the chat switches to that PR's conversation
 * - Messages are persisted per-PR via TanStack Query + localStorage
 * - Uses Claude Code CLI for AI capabilities (tools, context, web search)
 */

import type { ReviewCommentInput } from '@data'
import {
  type ClaudeMessage,
  type ClaudeReviewData,
  useAddCustomPrompt,
  useClaudeApiKeyStatus,
  useClaudeCodeStatus,
  useClaudeReviewListener,
  useClaudeSession,
  useClearSession,
  useCurrentUser,
  useCustomPrompts,
  useDeleteCustomPrompt,
  usePRFiles,
  useSendMessage,
  useSessionReviews,
  useSetClaudeApiKey,
  useStopClaude,
  useSubmitPRReviewWithComments,
  useUpdateCustomPrompt
} from '@data'
import { Button } from '@ui-kit'
import { ArrowDown, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useThrottledValue } from '../../hooks'
import type {
  AIChatPanelProps,
  QueuedMessage,
  ReviewData,
  ReviewVerdict,
  StreamingState
} from '../../types'
import { NoPRSelectedState, PRContextBanner } from '../ChatEmptyStates'
import { ChatHeader } from '../ChatHeader'
import { ChatInput } from '../ChatInput'
import { ReviewPreviewModal } from '../ReviewPreviewModal'
import { VirtualizedMessageList } from '../VirtualizedMessageList'

export type { AIChatPanelProps } from '../../types'

// Available Claude models for selection
// Ordered by: newest/most capable first
const CLAUDE_MODELS = [
  // Claude 4.5 family (Latest - Nov 2025)
  { id: 'claude-opus-4-5-20251101', display_name: 'Claude Opus 4.5 (Premium)' },
  { id: 'claude-haiku-4-5-20251001', display_name: 'Claude Haiku 4.5 (Fast)' },
  { id: 'claude-sonnet-4-5-20250929', display_name: 'Claude Sonnet 4.5 (Balanced)' },
  // Claude Code CLI aliases (auto-resolve to latest)
  { id: 'opus', display_name: 'Opus (Latest)' },
  { id: 'sonnet', display_name: 'Sonnet (Latest)' },
  { id: 'haiku', display_name: 'Haiku (Latest)' },
  { id: 'opusplan', display_name: 'Opus Plan (Opus plans, Sonnet executes)' },
  // Claude 4 family (Active - May/Aug 2025)
  { id: 'claude-opus-4-1-20250805', display_name: 'Claude Opus 4.1' },
  { id: 'claude-opus-4-20250514', display_name: 'Claude Opus 4' },
  { id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4' },
  // Legacy (older versions)
  { id: 'claude-3-7-sonnet-20250219', display_name: 'Claude 3.7 Sonnet (Deprecated)' },
  { id: 'claude-3-5-haiku-20241022', display_name: 'Claude 3.5 Haiku (Deprecated)' },
  { id: 'claude-3-haiku-20240307', display_name: 'Claude 3 Haiku' }
]

const DEFAULT_MODEL = 'sonnet'

/**
 * Generate a unique session ID for a PR
 */
function getPRSessionId(repoFullName: string, prNumber: number): string {
  return `pr-${repoFullName.replace('/', '-')}-${prNumber}`
}

export function AIChatPanel({ onClose, user, selectedPR }: AIChatPanelProps): React.JSX.Element {
  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVE PR ID / SESSION ID
  // ═══════════════════════════════════════════════════════════════════════════

  const repoFullName = selectedPR?.base.repo.full_name ?? null
  const prNumber = selectedPR?.number ?? null
  const sessionId = repoFullName && prNumber ? getPRSessionId(repoFullName, prNumber) : null

  // ═══════════════════════════════════════════════════════════════════════════
  // CLAUDE CODE STATUS
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: claudeCodeStatus, isLoading: isLoadingClaudeCode } = useClaudeCodeStatus()
  const { data: apiKeyStatus, isLoading: isLoadingApiKey } = useClaudeApiKeyStatus()
  const { data: currentUser } = useCurrentUser()
  const isClaudeCodeInstalled = claudeCodeStatus?.installed ?? false
  const hasApiKey = apiKeyStatus?.hasKey ?? false

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERIES & MUTATIONS (Claude Code)
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: session } = useClaudeSession(sessionId ?? 'no-pr')
  const sessionReviews = useSessionReviews(sessionId ?? 'no-pr')
  const sendMessageMutation = useSendMessage()
  const stopClaudeMutation = useStopClaude()
  const clearSessionMutation = useClearSession()
  const setApiKeyMutation = useSetClaudeApiKey()

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER QUERIES & MUTATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: customPrompts = [] } = useCustomPrompts()
  const { data: prFiles = [] } = usePRFiles(repoFullName, prNumber, selectedPR?.changed_files)
  const addCustomPrompt = useAddCustomPrompt()
  const updateCustomPrompt = useUpdateCustomPrompt()
  const deleteCustomPrompt = useDeleteCustomPrompt()
  const submitReview = useSubmitPRReviewWithComments()

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCAL STATE
  // ═══════════════════════════════════════════════════════════════════════════

  const [apiKeyInput, setApiKeyInput] = useState('')
  const [isSettingKey, setIsSettingKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')

  // Model and thinking settings
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [thinkingBudget, setThinkingBudget] = useState(10000) // 0 = off, otherwise token budget
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set())
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Review preview state
  const [reviewPreview, setReviewPreview] = useState<{
    isOpen: boolean
    review: ReviewData | null
  }>({ isOpen: false, review: null })
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  // Message queue - stores messages to send after current streaming completes
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([])

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVED STATE FROM SESSION
  // ═══════════════════════════════════════════════════════════════════════════

  const messages = session?.messages ?? []

  // isStreaming: true while actively streaming OR while finalizing (status='done' but content not yet in messages)
  // This prevents the flash where StreamingBubble hides before MessageBubble appears
  const isActivelyStreaming =
    session?.status === 'streaming' ||
    session?.status === 'thinking' ||
    session?.status === 'tool_use'
  const isFinalizing = session?.status === 'done' && Boolean(session?.currentStream)
  const isStreaming = isActivelyStreaming || isFinalizing

  const isSending = isStreaming || sendMessageMutation.isPending
  const hasMessages = messages.length > 0

  // Build streaming state for UI - simple derivation, no complex detection
  const getStreamingStatus = (): StreamingState['status'] => {
    if (!isStreaming) return 'idle'
    if (session?.status === 'thinking') return 'thinking'
    if (session?.status === 'tool_use') return 'tool_use'
    if (session?.currentStream) return 'writing'
    return 'composing'
  }

  // Direct object creation - no useMemo needed for simple derivation
  const streaming: StreamingState = {
    content: session?.currentStream ?? '',
    thinking: session?.thinking ?? '',
    isStreaming,
    status: getStreamingStatus(),
    activity: session?.activity ?? null,
    toolHistory: session?.toolHistory ?? []
  }

  // Reduced throttle: 30ms instead of 100ms for snappier updates
  const throttledStreaming = useThrottledValue(streaming, 30)

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAutoScrollingRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const virtualizerScrollToEndRef = useRef<(() => void) | null>(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // SCROLL MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  const isAtBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    const { scrollTop, scrollHeight, clientHeight } = container
    // Very small threshold (5px) to account for sub-pixel rendering
    return scrollHeight - scrollTop - clientHeight < 5
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    isAutoScrollingRef.current = true

    // Use virtualizer's scrollToEnd if available (more accurate for virtualized lists)
    if (virtualizerScrollToEndRef.current) {
      virtualizerScrollToEndRef.current()
    } else {
      const container = scrollContainerRef.current
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'instant'
        })
      }
    }

    setTimeout(
      () => {
        isAutoScrollingRef.current = false
      },
      smooth ? 300 : 50
    )
  }, [])

  const handleScroll = useCallback(() => {
    // Ignore scroll events triggered by programmatic scrolling
    if (isAutoScrollingRef.current) return

    const container = scrollContainerRef.current
    if (!container) return

    const currentScrollTop = container.scrollTop
    const scrolledUp = currentScrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = currentScrollTop

    // User scrolled UP by any amount -> disable auto-scroll
    if (scrolledUp) {
      setUserScrolledUp(true)
    }
    // User scrolled to the very bottom -> re-enable auto-scroll
    else if (isAtBottom()) {
      setUserScrolledUp(false)
    }
  }, [isAtBottom])

  // Callback when virtualizer is ready - stores the scrollToEnd function
  const handleVirtualizerReady = useCallback((scrollToEnd: () => void) => {
    virtualizerScrollToEndRef.current = scrollToEnd
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE (via Claude Code CLI)
  // ═══════════════════════════════════════════════════════════════════════════

  const sendMessageWithClaudeCode = useCallback(
    (messageText: string, displayLabel?: string) => {
      if (!sessionId || !hasApiKey) return

      setError(null)
      setUserScrolledUp(false)
      scrollToBottom(false)

      // Build FULL PR context - Claude gets everything internally via system prompt
      const prContext = selectedPR
        ? {
            owner: selectedPR.base.repo.owner.login,
            repo: selectedPR.base.repo.name,
            branch: selectedPR.head.ref,
            baseBranch: selectedPR.base.ref,
            prNumber: selectedPR.number,
            prTitle: selectedPR.title,
            prDescription: selectedPR.body || undefined,
            changedFiles: selectedPR.changed_files,
            // Include labels
            labels: selectedPR.labels?.map((l) => l.name) || [],
            // Include ALL PR comments
            comments:
              selectedPR.commentsList?.map((c) => ({
                author: c.author.login,
                body: c.body,
                createdAt: new Date(c.created_at).toLocaleDateString()
              })) || [],
            // Include ALL review content
            reviews:
              selectedPR.reviews?.map((r) => ({
                author: r.author.login,
                state: r.state,
                body: r.body,
                createdAt: new Date(r.created_at).toLocaleDateString()
              })) || [],
            // Include ALL review threads (inline comments on code)
            reviewThreads:
              selectedPR.reviewThreads?.map((t) => ({
                path: t.path,
                line: t.line,
                isResolved: t.isResolved,
                comments: t.comments.map((c) => ({
                  author: c.author.login,
                  body: c.body,
                  createdAt: new Date(c.created_at).toLocaleDateString()
                }))
              })) || [],
            // Summarize review status
            reviewSummary: selectedPR.reviews
              ? (() => {
                  const approved = selectedPR.reviews.filter((r) => r.state === 'approved').length
                  const changes = selectedPR.reviews.filter(
                    (r) => r.state === 'changes_requested'
                  ).length
                  const commented = selectedPR.reviews.filter((r) => r.state === 'commented').length
                  const parts = []
                  if (approved > 0) parts.push(`${approved} approval${approved > 1 ? 's' : ''}`)
                  if (changes > 0)
                    parts.push(`${changes} change${changes > 1 ? 's' : ''} requested`)
                  if (commented > 0) parts.push(`${commented} comment${commented > 1 ? 's' : ''}`)
                  return parts.length > 0 ? parts.join(', ') : undefined
                })()
              : undefined,
            // Include current user's GitHub username
            username: currentUser?.login
          }
        : // Even without a PR selected, pass the username for personalization
          currentUser?.login
          ? { owner: '', repo: '', username: currentUser.login }
          : undefined

      // Claude config - uses user-selected model and thinking settings
      const config = {
        model: selectedModel,
        enableExtendedThinking: thinkingBudget > 0,
        maxThinkingTokens: thinkingBudget
      }

      // Send message directly - NO prompt enhancement needed
      // All context is provided internally via system prompt
      sendMessageMutation.mutate(
        { sessionId, prompt: messageText, displayLabel, prContext, config },
        {
          onError: (err) => {
            setError(err.message || 'Failed to send message')
          }
        }
      )
    },
    [
      sessionId,
      hasApiKey,
      selectedPR,
      selectedModel,
      thinkingBudget,
      sendMessageMutation,
      scrollToBottom,
      currentUser?.login
    ]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════

  // Sync error from session
  useEffect(() => {
    if (session?.error) {
      setError(session.error)
    }
  }, [session?.error])

  // Auto-scroll during streaming
  useEffect(() => {
    if (streaming.isStreaming && !userScrolledUp && throttledStreaming.content) {
      scrollToBottom(false)
    }
  }, [streaming.isStreaming, userScrolledUp, scrollToBottom, throttledStreaming.content])

  // Scroll when new messages arrive
  useEffect(() => {
    if (!streaming.isStreaming && messages.length > 0) {
      scrollToBottom()
      setUserScrolledUp(false)
    }
  }, [messages.length, streaming.isStreaming, scrollToBottom])

  // Reset scroll and clear pending review when PR changes
  useEffect(() => {
    if (selectedPR) {
      setUserScrolledUp(false)
      setTimeout(() => scrollToBottom(false), 100)
    }
  }, [selectedPR, scrollToBottom])

  // Process message queue when streaming ends
  const prevStreamingRef = useRef(isStreaming)
  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming

    // Only process when streaming just ended (was streaming, now not)
    if (wasStreaming && !isStreaming && messageQueue.length > 0) {
      // Small delay to let the UI settle before processing next message
      const timeout = setTimeout(() => {
        const [nextMessage, ...remainingQueue] = messageQueue
        setMessageQueue(remainingQueue)

        if (nextMessage) {
          sendMessageWithClaudeCode(nextMessage.content, nextMessage.displayLabel)
        }
      }, 300) // 300ms delay between messages for smoother UX

      return () => clearTimeout(timeout)
    }
  }, [isStreaming, messageQueue, sendMessageWithClaudeCode])

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSetApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return
    setIsSettingKey(true)
    setError(null)
    try {
      // Validate by testing against Claude API
      const response = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        headers: {
          'x-api-key': apiKeyInput.trim(),
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        }
      })
      if (response.ok) {
        setApiKeyMutation.mutate(apiKeyInput.trim())
        setApiKeyInput('')
      } else {
        setError('Invalid API key')
      }
    } catch {
      setError('Failed to validate API key')
    } finally {
      setIsSettingKey(false)
    }
  }, [apiKeyInput, setApiKeyMutation])

  /**
   * Generate unique queued message ID
   */
  const generateQueueId = useCallback(() => {
    return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }, [])

  /**
   * Add a message to the queue (used when Claude is already streaming)
   */
  const addToQueue = useCallback(
    (content: string, displayLabel?: string) => {
      const queuedMessage: QueuedMessage = {
        id: generateQueueId(),
        content,
        displayLabel
      }
      setMessageQueue((prev) => [...prev, queuedMessage])
    },
    [generateQueueId]
  )

  const handleSendMessage = useCallback(() => {
    if (!input.trim() || !sessionId) return

    const messageText = input.trim()
    setInput('')

    // If currently streaming, queue the message instead
    if (isStreaming) {
      addToQueue(messageText)
      return
    }

    sendMessageWithClaudeCode(messageText)
  }, [input, sessionId, isStreaming, addToQueue, sendMessageWithClaudeCode])

  const handleClearHistory = useCallback(() => {
    if (sessionId) clearSessionMutation.mutate(sessionId)
  }, [sessionId, clearSessionMutation])

  const handleStopStreaming = useCallback(() => {
    if (sessionId) stopClaudeMutation.mutate(sessionId)
  }, [sessionId, stopClaudeMutation])

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

  const handleOpenReview = useCallback((review: ReviewData) => {
    setReviewPreview({ isOpen: true, review })
  }, [])

  // Convert ClaudeReviewData to ReviewData format (add IDs to comments)
  const convertToReviewData = useCallback((review: ClaudeReviewData): ReviewData => {
    return {
      summary: review.summary,
      verdict: review.verdict,
      comments: review.comments.map((c, i) => ({
        id: `review-comment-${i}-${Date.now()}`,
        file: c.file,
        line: c.line,
        body: c.body
      }))
    }
  }, [])

  // Handler for opening a review from the message history (ClaudeReviewData -> ReviewData)
  const handleOpenMessageReview = useCallback(
    (review: ClaudeReviewData) => {
      handleOpenReview(convertToReviewData(review))
    },
    [handleOpenReview, convertToReviewData]
  )

  // Listen for Claude review events (tool-based approach)
  // The hook stores the review in session.pendingReviewData, which gets attached to the message on finalization
  // We pass a no-op callback since we don't need to do anything else (review button shows in message bubble)
  useClaudeReviewListener(sessionId, () => {})

  const _handleRemoveQueuedMessage = useCallback((id: string) => {
    setMessageQueue((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERT CLAUDE MESSAGES TO CHAT MESSAGES FOR UI
  // ═══════════════════════════════════════════════════════════════════════════

  const chatMessages = useMemo(
    () =>
      messages.map((m: ClaudeMessage) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        displayLabel: m.displayLabel, // Show this instead of full content for quick actions
        thinking: m.thinking,
        hasReview: m.hasReview, // Flag for messages that have an associated review
        timestamp: new Date(m.timestamp).toISOString()
      })),
    [messages]
  )

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const showScrollButton = userScrolledUp
  const isLoading = isLoadingClaudeCode || isLoadingApiKey

  // Show loading while checking status
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading...</p>
      </div>
    )
  }

  // Show Claude Code CLI install prompt if not installed
  if (!isClaudeCodeInstalled) {
    return (
      <div className="h-full flex flex-col">
        <ChatHeader
          apiKey={null}
          selectedModel=""
          models={[]}
          isLoadingModels={false}
          onModelChange={() => {}}
          onRemoveApiKey={() => {}}
          onClearHistory={() => {}}
          onClose={onClose}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold">Claude Code CLI Required</h3>
            <p className="text-sm text-muted-foreground">
              CodeLobby uses Claude Code CLI for AI features. Install it to enable AI-powered PR
              analysis.
            </p>
            <div className="bg-muted p-3 rounded-md font-mono text-sm">
              npm install -g @anthropic-ai/claude-code
            </div>
            <p className="text-xs text-muted-foreground">After installing, restart CodeLobby.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ChatHeader
        apiKey={hasApiKey ? 'configured' : null}
        selectedModel={selectedModel}
        models={CLAUDE_MODELS}
        isLoadingModels={false}
        onModelChange={setSelectedModel}
        onRemoveApiKey={() => {
          // Clear the API key
          setApiKeyMutation.mutate('')
        }}
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

      <div className="flex-1 relative overflow-hidden">
        {/* No PR selected */}
        {!selectedPR && <NoPRSelectedState apiKey={hasApiKey ? 'configured' : null} />}

        {/* Chat area - shows when PR is selected */}
        {selectedPR && (
          <>
            {/* Empty state when no messages */}
            {!hasMessages && !streaming.isStreaming ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-muted-foreground mb-2">No conversation yet</p>
                <p className="text-xs text-muted-foreground">
                  Ask a question about PR #{selectedPR.number}
                </p>
              </div>
            ) : (
              /* Virtualized message list - only renders visible messages */
              <VirtualizedMessageList
                messages={chatMessages}
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
                sessionReviews={sessionReviews}
                onOpenReview={handleOpenMessageReview}
              />
            )}
          </>
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
      {hasApiKey && sessionId ? (
        <ChatInput
          apiKey="configured"
          apiKeyInput={apiKeyInput}
          isSettingKey={isSettingKey}
          onApiKeyInputChange={setApiKeyInput}
          onSetApiKey={handleSetApiKey}
          input={input}
          isSending={isSending}
          isContextValid={true}
          linkedPRChat={!!selectedPR}
          streaming={streaming}
          messages={chatMessages}
          selectedModel={selectedModel}
          thinkingBudget={thinkingBudget}
          onThinkingBudgetChange={setThinkingBudget}
          prompts={[]}
          customPrompts={customPrompts}
          onInputChange={setInput}
          onSendMessage={handleSendMessage}
          onStopStreaming={isStreaming ? handleStopStreaming : undefined}
          onQuickActionSelect={(prompt, label) => {
            if (!sessionId) return
            // If streaming, queue the quick action
            if (isStreaming) {
              addToQueue(prompt, label)
              return
            }
            sendMessageWithClaudeCode(prompt, label)
          }}
          onAddCustomPrompt={async (label, prompt) => {
            addCustomPrompt.mutate({ label, prompt })
          }}
          onUpdateCustomPrompt={async (id, label, prompt) => {
            updateCustomPrompt.mutate({ id, label, prompt })
          }}
          onDeleteCustomPrompt={async (id) => {
            deleteCustomPrompt.mutate(id)
          }}
        />
      ) : !hasApiKey ? (
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
