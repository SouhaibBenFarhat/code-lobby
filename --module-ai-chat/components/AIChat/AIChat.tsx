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
  // Claude 4.6 family (Latest - Feb 2026)
  { id: 'claude-opus-4-6', display_name: 'Claude Opus 4.6 (Premium)' },
  // Claude 4.5 family (Nov 2025)
  { id: 'claude-opus-4-5-20251101', display_name: 'Claude Opus 4.5' },
  { id: 'claude-sonnet-4-5-20250929', display_name: 'Claude Sonnet 4.5 (Balanced)' },
  { id: 'claude-haiku-4-5-20251001', display_name: 'Claude Haiku 4.5 (Fast)' },
  // Claude Code CLI aliases (auto-resolve to latest)
  { id: 'opus', display_name: 'Opus (Latest)' },
  { id: 'sonnet', display_name: 'Sonnet (Latest)' },
  { id: 'haiku', display_name: 'Haiku (Latest)' },
  { id: 'opusplan', display_name: 'Opus Plan (Opus plans, Sonnet executes)' },
  // Claude 4 family (May/Aug 2025)
  { id: 'claude-opus-4-1-20250805', display_name: 'Claude Opus 4.1' },
  { id: 'claude-opus-4-20250514', display_name: 'Claude Opus 4' },
  { id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4' },
  // Legacy
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
  const { data: currentUser } = useCurrentUser()
  const isClaudeCodeInstalled = claudeCodeStatus?.installed ?? false

  // CLI-only: ready when Claude Code CLI is installed
  const isAIReady = isClaudeCodeInstalled

  // ═══════════════════════════════════════════════════════════════════════════
  // TANSTACK QUERIES & MUTATIONS (Claude Code)
  // ═══════════════════════════════════════════════════════════════════════════

  const { data: session } = useClaudeSession(sessionId ?? 'no-pr')
  const sessionReviews = useSessionReviews(sessionId ?? 'no-pr')
  const sendMessageMutation = useSendMessage()
  const stopClaudeMutation = useStopClaude()
  const clearSessionMutation = useClearSession()

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

  // Expand thinking sections by default (disable auto-collapse): add any message with thinking to expanded set
  useEffect(() => {
    setExpandedThinking((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const m of messages) {
        if (m.thinking && !next.has(m.id)) {
          next.add(m.id)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [messages])

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

  // Throttle streaming display: 80ms = responsive (text feels live) without layout thrash (plain text + containment handle jump)
  const throttledStreaming = useThrottledValue(streaming, 80)

  // ═══════════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════════

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isAutoScrollingRef = useRef(false)
  /** User has scrolled up; stop auto-scroll until they scroll back to bottom or click "scroll to bottom". */
  const userScrolledUpRef = useRef(false)
  /** After we programmatically scroll, the next scroll event may be from that scroll; don't re-enable. */
  const programmaticScrollJustFinishedRef = useRef(false)
  const lastScrollTopRef = useRef(0)
  const virtualizerScrollToEndRef = useRef<((opts?: { smooth?: boolean }) => void) | null>(null)
  /** Ref to bottom anchor; we use scrollIntoView() on content update (ChatGPT-style). */
  const scrollAnchorRef = useRef<HTMLDivElement>(null)

  /** Scroll so the bottom anchor is in view. Single source of truth for "stay at bottom" to avoid jerk from mixing virtualizer scroll with anchor. */
  const scrollAnchorIntoView = useCallback(() => {
    if (userScrolledUpRef.current || !scrollAnchorRef.current) return
    isAutoScrollingRef.current = true
    scrollAnchorRef.current.scrollIntoView({ block: 'end', behavior: 'auto' })
    const t = setTimeout(() => {
      isAutoScrollingRef.current = false
      programmaticScrollJustFinishedRef.current = true
    }, 100)
    return t
  }, [])

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
    if (userScrolledUpRef.current) return

    isAutoScrollingRef.current = true

    // Use virtualizer's scrollToEnd if available (more accurate for virtualized lists)
    if (virtualizerScrollToEndRef.current) {
      virtualizerScrollToEndRef.current({ smooth })
    } else {
      const container = scrollContainerRef.current
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'instant'
        })
      }
    }

    const delay = smooth ? 400 : 150
    setTimeout(() => {
      isAutoScrollingRef.current = false
      programmaticScrollJustFinishedRef.current = true
    }, delay)
  }, [])

  const handleScroll = useCallback(() => {
    // Ignore scroll events triggered by programmatic scrolling
    if (isAutoScrollingRef.current) return

    const container = scrollContainerRef.current
    if (!container) return

    const currentScrollTop = container.scrollTop
    const scrolledUp = currentScrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = currentScrollTop

    // User scrolled UP by any amount -> disable auto-scroll (sync ref so effect sees it immediately)
    if (scrolledUp) {
      userScrolledUpRef.current = true
      setUserScrolledUp(true)
      programmaticScrollJustFinishedRef.current = false
      return
    }
    // User scrolled to the very bottom -> re-enable auto-scroll only if this wasn't our programmatic scroll
    if (isAtBottom()) {
      if (programmaticScrollJustFinishedRef.current) {
        programmaticScrollJustFinishedRef.current = false
        return
      }
      userScrolledUpRef.current = false
      setUserScrolledUp(false)
    }
  }, [isAtBottom])

  // Callback when virtualizer is ready - stores the scrollToEnd function
  const handleVirtualizerReady = useCallback(
    (scrollToEnd: (opts?: { smooth?: boolean }) => void) => {
      virtualizerScrollToEndRef.current = scrollToEnd
    },
    []
  )

  // As soon as user scrolls up (wheel), stop auto-scroll before any scroll event or effect run
  const handleScrollUpIntent = useCallback(() => {
    userScrolledUpRef.current = true
    setUserScrolledUp(true)
    programmaticScrollJustFinishedRef.current = false
  }, [])

  // Stable callback for VirtualizedMessageList: check before applying scroll in rAF (cancels in-flight scrolls)
  const getShouldAutoScroll = useCallback(() => !userScrolledUpRef.current, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE (via Claude Code CLI)
  // ═══════════════════════════════════════════════════════════════════════════

  const sendMessageWithClaudeCode = useCallback(
    (messageText: string, displayLabel?: string) => {
      if (!sessionId || !isAIReady) return

      setError(null)
      userScrolledUpRef.current = false
      setUserScrolledUp(false)
      // Use anchor only (no virtualizer scrollToBottom) to avoid jerk from mixed scroll methods
      scrollAnchorIntoView()
      setTimeout(() => scrollAnchorIntoView(), 120)

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
      isAIReady,
      selectedPR,
      selectedModel,
      thinkingBudget,
      sendMessageMutation,
      scrollAnchorIntoView,
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

  // Auto-scroll during streaming: scroll anchor into view on each content or thinking update (ChatGPT-style).
  // One anchor at bottom + scrollIntoView(block: 'end') keeps view at live edge. Include thinking so
  // when the thinking section appears or grows, the chat scrolls down to show it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intent is to run when content/thinking updates (scroll to new bottom)
  useEffect(() => {
    if (!streaming.isStreaming || userScrolledUpRef.current || !scrollAnchorRef.current) return
    isAutoScrollingRef.current = true
    scrollAnchorRef.current.scrollIntoView({ block: 'end', behavior: 'auto' })
    const t = setTimeout(() => {
      isAutoScrollingRef.current = false
      programmaticScrollJustFinishedRef.current = true
    }, 100)
    return () => clearTimeout(t)
  }, [streaming.isStreaming, throttledStreaming.content, throttledStreaming.thinking])

  // Scroll when new messages arrive
  useEffect(() => {
    if (!streaming.isStreaming && messages.length > 0) {
      userScrolledUpRef.current = false
      setUserScrolledUp(false)
      const wasStreaming = prevStreamingRef.current
      if (wasStreaming) {
        // Streaming just ended: use anchor after layout (double rAF) so virtualizer has measured; avoids jerk from scrollToBottom + wrong scrollHeight.
        const raf1 = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollAnchorIntoView()
          })
        })
        return () => cancelAnimationFrame(raf1)
      }
      scrollToBottom()
    }
  }, [messages.length, streaming.isStreaming, scrollToBottom, scrollAnchorIntoView])

  // Reset scroll and clear pending review when PR changes
  useEffect(() => {
    if (selectedPR) {
      userScrolledUpRef.current = false
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
    userScrolledUpRef.current = false
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

  // Show loading while checking CLI status
  if (isLoadingClaudeCode) {
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
          selectedModel=""
          models={[]}
          isLoadingModels={false}
          isConfigured={false}
          onModelChange={() => {}}
          onClearHistory={() => {}}
          onClose={onClose}
        />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-warning-subtle flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="text-lg font-semibold">Claude Code CLI Required</h3>
            <p className="text-sm text-muted-foreground">
              Install Claude Code CLI to use AI features with your Pro/Max subscription.
            </p>
            <div className="bg-surface p-3 rounded-md font-mono text-sm">
              npm install -g @anthropic-ai/claude-code
            </div>
            <p className="text-xs text-muted-foreground">
              After installing, run <code className="bg-muted px-1 rounded">claude login</code> to
              authenticate, then restart CodeLobby.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <ChatHeader
        selectedModel={selectedModel}
        models={CLAUDE_MODELS}
        isLoadingModels={false}
        isConfigured={isClaudeCodeInstalled}
        onModelChange={setSelectedModel}
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

      <div className="flex-1 relative overflow-hidden bg-chat">
        {/* No PR selected */}
        {!selectedPR && <NoPRSelectedState />}

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
                scrollAnchorRef={scrollAnchorRef}
                onScroll={handleScroll}
                onScrollUpIntent={handleScrollUpIntent}
                getShouldAutoScroll={getShouldAutoScroll}
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
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-surface-raised text-foreground-muted border border-border shadow-lg flex items-center justify-center hover:bg-surface-hover hover:text-foreground transition-colors z-10"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-destructive-subtle border-t border-destructive-border text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Input area */}
      {isAIReady && sessionId && (
        <ChatInput
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
      )}

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
