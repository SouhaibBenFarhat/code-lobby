/**
 * PRHeader - Header section for PR detail panel with title, actions, and analysis.
 */

import { api } from '@codelobby/api'
import type { PullRequest } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import {
  Badge,
  Button,
  ClaudeIcon,
  Col,
  cn,
  formatRelativeTime,
  MarkdownContent,
  Row,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  truncate
} from '@codelobby/ui-kit'
import {
  AlertCircle,
  Clock,
  ExternalLink,
  FileEdit,
  GitBranch,
  GitPullRequest,
  Globe,
  HelpCircle,
  Loader2,
  MessageSquare,
  RefreshCw,
  Ticket,
  User,
  X
} from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { ApproveButton } from '../ApproveButton'
import { MergeButton } from '../MergeButton'

export interface PRHeaderProps {
  pr: PullRequest
  onClose: () => void
}

// Sub-component: PR Title and Branch Info
function PRTitleSection({ pr }: { pr: PullRequest }) {
  return (
    <div className="flex-1 min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 mb-1">
        <GitPullRequest
          className={cn(
            'w-4 h-4 flex-shrink-0',
            pr.draft ? 'text-muted-foreground' : 'text-primary'
          )}
        />
        <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>
        {pr.draft && (
          <Badge variant="secondary" className="text-[10px] h-4">
            Draft
          </Badge>
        )}
      </div>
      <h2 className="font-semibold text-sm leading-tight line-clamp-2 break-words">{pr.title}</h2>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground overflow-hidden">
        <GitBranch className="w-3 h-3 flex-shrink-0" />
        <span className="font-mono truncate max-w-[100px]">{truncate(pr.head.ref, 25)}</span>
        <span className="flex-shrink-0">→</span>
        <span className="font-mono truncate max-w-[80px]">{truncate(pr.base.ref, 15)}</span>
      </div>
    </div>
  )
}

export function PRHeader({ pr, onClose }: PRHeaderProps): React.JSX.Element {
  // Get current user from store for approve button
  const user = useSignal(Store.user)
  const currentUser = user?.login || null

  // Use Actions instead of context for opening PR in chat
  const openPRInChat = useCallback((pr: PullRequest) => {
    Actions.createPRChat(pr)
    Actions.toggleAIPanel()
  }, [])

  // Preview URL extraction state
  const [isExtractingPreview, setIsExtractingPreview] = useState(false)
  const [previewMessage, setPreviewMessage] = useState<string | null>(null)
  const [isExtractingJira, setIsExtractingJira] = useState(false)
  const [jiraMessage, setJiraMessage] = useState<string | null>(null)

  // "Why Open?" analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [prAnalysis, setPrAnalysis] = useState<{
    analysis: string
    generatedAt: number
  } | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [streamingThinking, setStreamingThinking] = useState<string>('')
  const [streamingAnalysis, setStreamingAnalysis] = useState<string>('')
  const thinkingContainerRef = useRef<HTMLDivElement>(null)

  // Refresh PR detail - uses Actions pattern (proper architecture)
  const isRefreshing = useSignal(Store.loading.prDetail)

  const handleRefreshPR = useCallback(() => {
    Actions.refreshPRDetail(pr.base.repo.full_name, pr.number)
  }, [pr.base.repo.full_name, pr.number])

  // Auto-scroll thinking container to bottom when new content arrives
  useLayoutEffect(() => {
    if (thinkingContainerRef.current && streamingThinking) {
      requestAnimationFrame(() => {
        if (thinkingContainerRef.current) {
          thinkingContainerRef.current.scrollTop = thinkingContainerRef.current.scrollHeight
        }
      })
    }
  }, [streamingThinking])

  // Create a unique PR ID for persistence
  const prId = `${pr.base.repo.full_name}#${pr.number}`

  // Load persisted state when PR changes (analysis + panel open state)
  useEffect(() => {
    // Reset transient UI state immediately when PR changes
    setIsAnalyzing(false)
    setAnalysisError(null)

    // Load persisted state for this PR
    const loadPersistedState = async () => {
      // Guard against missing electron API (test environment)
      if (!window.electron) return

      // Load panel open state (default to false if not set)
      const panelOpen = await api.ai.getPRAnalysisPanelOpen(prId)
      setShowAnalysis(panelOpen)

      // Load any persisted analysis
      const saved = await api.ai.getPRAnalysis(prId)
      if (saved) {
        setPrAnalysis({
          analysis: saved.analysis,
          generatedAt: saved.generatedAt
        })
      } else {
        setPrAnalysis(null)
      }
    }
    loadPersistedState()
  }, [prId])

  // Persist panel open/closed state when it changes
  const handleTogglePanel = useCallback(
    (newState: boolean) => {
      setShowAnalysis(newState)
      api.ai.setPRAnalysisPanelOpen(prId, newState)
    },
    [prId]
  )

  // Handler for "Why Open?" analysis with streaming
  const handleAnalyzePR = useCallback(
    async (forceRefresh = false) => {
      if (forceRefresh) {
        // Delete existing analysis to force refresh
        await api.ai.deletePRAnalysis(prId)
        setPrAnalysis(null)
      }

      setIsAnalyzing(true)
      setAnalysisError(null)
      setStreamingThinking('')
      setStreamingAnalysis('')
      handleTogglePanel(true)

      try {
        // Gather all comments
        const comments: Array<{ author: string; body: string }> = []

        // Add general comments
        if (pr.commentsList) {
          for (const comment of pr.commentsList) {
            if (comment.author?.login && comment.body) {
              comments.push({
                author: comment.author.login,
                body: comment.body
              })
            }
          }
        }

        // Add review comments
        if (pr.reviews) {
          for (const review of pr.reviews) {
            if (review.author?.login && review.body) {
              comments.push({
                author: review.author.login,
                body: review.body
              })
            }
          }
        }

        // Add review thread comments
        if (pr.reviewThreads) {
          for (const thread of pr.reviewThreads) {
            for (const comment of thread.comments) {
              if (comment.author?.login && comment.body) {
                comments.push({
                  author: comment.author.login,
                  body: comment.body
                })
              }
            }
          }
        }

        const context = {
          prId,
          number: pr.number,
          title: pr.title,
          body: pr.body,
          draft: pr.draft,
          createdAt: pr.created_at,
          author: pr.user.login,
          baseBranch: pr.base.ref,
          headBranch: pr.head.ref,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changed_files,
          checks: (pr.checks?.check_runs || []).map((c) => ({
            name: c.name,
            status: c.status,
            conclusion: c.conclusion
          })),
          reviews: (pr.reviews || []).map((r) => ({
            author: r.author?.login || 'unknown',
            state: r.state,
            body: r.body
          })),
          comments,
          reviewThreads: (pr.reviewThreads || []).map((t) => ({
            isResolved: t.isResolved,
            path: t.path,
            commentsCount: t.comments.length
          }))
        }

        // Set up stream listener
        const unsubscribe = api.ai.onPRAnalysisStreamChunk((chunk) => {
          if (chunk.type === 'thinking' && chunk.thinking) {
            setStreamingThinking((prev) => prev + chunk.thinking)
          } else if (chunk.type === 'text' && chunk.content) {
            setStreamingAnalysis((prev) => prev + chunk.content)
          } else if (chunk.type === 'done' && chunk.fullResponse) {
            setPrAnalysis({
              analysis: chunk.fullResponse.analysis,
              generatedAt: Date.now()
            })
            setStreamingThinking('')
            setStreamingAnalysis('')
            setIsAnalyzing(false)
            unsubscribe()
          } else if (chunk.type === 'error') {
            setAnalysisError(chunk.error || 'Failed to analyze PR')
            setIsAnalyzing(false)
            unsubscribe()
          }
        })

        // Start streaming analysis
        const result = await api.ai.analyzePRStatusStreaming(context)

        if (!result.success) {
          setAnalysisError(result.error || 'Failed to start analysis')
          setIsAnalyzing(false)
          unsubscribe()
        }
      } catch {
        setAnalysisError('Failed to analyze PR status')
        setIsAnalyzing(false)
      }
    },
    [prId, pr, handleTogglePanel]
  )

  // Handler to extract and open preview URL using AI
  const handleOpenPreview = async () => {
    setIsExtractingPreview(true)
    setPreviewMessage(null)

    try {
      const comments: Array<{ author: string; body: string }> = []

      if (pr.commentsList) {
        for (const comment of pr.commentsList) {
          if (comment.author?.login && comment.body) {
            comments.push({ author: comment.author.login, body: comment.body })
          }
        }
      }

      if (pr.reviews) {
        for (const review of pr.reviews) {
          if (review.author?.login && review.body) {
            comments.push({ author: review.author.login, body: review.body })
          }
        }
      }

      if (pr.reviewThreads) {
        for (const thread of pr.reviewThreads) {
          for (const comment of thread.comments) {
            if (comment.author?.login && comment.body) {
              comments.push({ author: comment.author.login, body: comment.body })
            }
          }
        }
      }

      const result = await api.ai.extractPreviewUrl({
        title: pr.title,
        body: pr.body,
        comments
      })

      if (!result.success) {
        setPreviewMessage(result.message || 'No preview URL found')
        setTimeout(() => setPreviewMessage(null), 3000)
      }
    } catch {
      setPreviewMessage('Failed to extract preview URL')
      setTimeout(() => setPreviewMessage(null), 3000)
    } finally {
      setIsExtractingPreview(false)
    }
  }

  // Handler to extract and open Jira ticket using AI
  const handleOpenJira = async () => {
    setIsExtractingJira(true)
    setJiraMessage(null)

    try {
      const comments: Array<{ author: string; body: string }> = []

      if (pr.commentsList) {
        for (const comment of pr.commentsList) {
          if (comment.author?.login && comment.body) {
            comments.push({ author: comment.author.login, body: comment.body })
          }
        }
      }

      if (pr.reviews) {
        for (const review of pr.reviews) {
          if (review.author?.login && review.body) {
            comments.push({ author: review.author.login, body: review.body })
          }
        }
      }

      if (pr.reviewThreads) {
        for (const thread of pr.reviewThreads) {
          for (const comment of thread.comments) {
            if (comment.author?.login && comment.body) {
              comments.push({ author: comment.author.login, body: comment.body })
            }
          }
        }
      }

      const result = await api.ai.extractJiraTicket({
        title: pr.title,
        body: pr.body,
        branchName: pr.head.ref,
        comments
      })

      if (!result.success) {
        setJiraMessage(result.message || 'No Jira ticket found')
        setTimeout(() => setJiraMessage(null), 3000)
      } else if (result.ticketKey) {
        setJiraMessage(`Opening ${result.ticketKey}...`)
        setTimeout(() => setJiraMessage(null), 2000)
      }
    } catch {
      setJiraMessage('Failed to extract Jira ticket')
      setTimeout(() => setJiraMessage(null), 3000)
    } finally {
      setIsExtractingJira(false)
    }
  }

  return (
    <div className="p-4 border-b border-border flex-shrink-0 overflow-hidden bg-card/80 dark:bg-card/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10">
      <div className="flex items-start justify-between gap-3">
        <PRTitleSection pr={pr} />
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7',
                  showAnalysis && prAnalysis && 'bg-primary/10 text-primary'
                )}
                onClick={() => {
                  if (prAnalysis) {
                    handleTogglePanel(!showAnalysis)
                  } else {
                    handleAnalyzePR()
                  }
                }}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <HelpCircle className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-center">
              <p className="font-medium">Why is this PR open?</p>
              <p className="text-xs text-muted-foreground">
                AI analyzes CI, reviews, and comments to explain blockers
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => openPRInChat(pr)}
              >
                <ClaudeIcon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-center">
              <p className="font-medium">Start AI Chat</p>
              <p className="text-xs text-muted-foreground">
                Open AI assistant with this PR's context
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleOpenPreview}
                disabled={isExtractingPreview}
              >
                {isExtractingPreview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-center">
              <p className="font-medium">Open Preview</p>
              <p className="text-xs text-muted-foreground">
                AI finds the preview environment URL from this PR and opens it
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleOpenJira}
                disabled={isExtractingJira}
              >
                {isExtractingJira ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ticket className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[240px] text-center">
              <p className="font-medium">Find Jira Ticket</p>
              <p className="text-xs text-muted-foreground">
                AI finds the Jira ticket from PR context and opens it
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefreshPR}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh PR details</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => window.open(pr.html_url, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open in GitHub</TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <ApproveButton pr={pr} currentUser={currentUser} onApproveComplete={handleRefreshPR} />
          <MergeButton pr={pr} onMergeComplete={handleRefreshPR} />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status messages (Preview, Jira) */}
      {(previewMessage || jiraMessage) && (
        <div className="mt-2 px-2 py-1.5 bg-muted/50 rounded text-xs text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {previewMessage || jiraMessage}
        </div>
      )}

      {/* Why Open? Analysis Panel */}
      {showAnalysis && (
        <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Why is this PR still open?</span>
            </div>
            <div className="flex items-center gap-1">
              {prAnalysis && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleAnalyzePR(true)}
                      disabled={isAnalyzing}
                    >
                      <RefreshCw className={cn('w-3 h-3', isAnalyzing && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh analysis</TooltipContent>
                </Tooltip>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleTogglePanel(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="space-y-2">
              {streamingThinking && (
                <div className="rounded-md bg-muted/30 p-2 border border-muted">
                  <div className="flex items-center gap-2 mb-1">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-xs font-medium text-primary">Thinking...</span>
                  </div>
                  <div
                    ref={thinkingContainerRef}
                    className="text-xs text-muted-foreground font-mono max-h-24 overflow-y-auto whitespace-pre-wrap"
                  >
                    {streamingThinking}
                  </div>
                </div>
              )}

              {streamingAnalysis && (
                <div className="text-sm text-foreground/90">
                  <MarkdownContent content={streamingAnalysis} />
                </div>
              )}

              {!streamingThinking && !streamingAnalysis && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Starting analysis...</span>
                </div>
              )}
            </div>
          )}

          {analysisError && !isAnalyzing && (
            <div className="flex items-center gap-2 text-sm text-destructive py-2">
              <AlertCircle className="w-4 h-4" />
              <span>{analysisError}</span>
            </div>
          )}

          {prAnalysis && !isAnalyzing && (
            <div className="space-y-2">
              <div className="text-sm text-foreground/90">
                <MarkdownContent content={prAnalysis.analysis} />
              </div>
              <div className="text-[10px] text-muted-foreground">
                Generated {formatRelativeTime(new Date(prAnalysis.generatedAt).toISOString())}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <Row gutter="md" align="center" className="pt-3 text-xs">
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <User className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span className="truncate max-w-[80px]">{pr.user.login}</span>
            </Col>
          </Row>
        </Col>
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <Clock className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span>{formatRelativeTime(pr.created_at)}</span>
            </Col>
          </Row>
        </Col>
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <FileEdit className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span className="text-success">+{pr.additions}</span>
            </Col>
            <Col span="auto">
              <span className="text-destructive">-{pr.deletions}</span>
            </Col>
          </Row>
        </Col>
        <Col span="auto">
          <Row gutter="xs" align="center">
            <Col span="auto">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
            </Col>
            <Col span="auto">
              <span>{pr.comments + pr.review_comments}</span>
            </Col>
          </Row>
        </Col>
      </Row>
    </div>
  )
}
