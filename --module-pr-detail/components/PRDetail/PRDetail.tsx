/**
 * PRDetail - PR detail panel showing comments, reviews, and CI status.
 *
 * Uses useSelectedPR hook to subscribe to store instead of receiving pr prop.
 * Now supports webview tabs for viewing preview/staging URLs within the panel.
 */

import {
  useAddWebviewTab,
  usePRActiveTab,
  usePRWebviewTabs,
  useRemoveWebviewTab,
  useSetPRActiveTab
} from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Col,
  cn,
  Row,
  ScrollArea,
  Separator
} from '@ui-kit'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileSearch,
  MessageSquare,
  Users,
  XCircle
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'

import { useSelectedPR } from '../../hooks'
// Import extracted components
import { ChangedFilesSection } from '../ChangedFilesSection'
import { CIChecksSection } from '../CIChecksSection'
import { CommentItem } from '../CommentItem'
import { CommitHistorySection } from '../CommitHistorySection'
import { PostCommentForm } from '../PostCommentForm'
import { PostScreenshotModal } from '../PostScreenshotModal'
import { PRDescription } from '../PRDescription'
import { PRDetailSkeleton } from '../PRDetailSkeleton'
import { PRHeader } from '../PRHeader'
import { PRTabBar } from '../PRTabBar'
import { ReviewsBySubmission } from '../ReviewsBySubmission'
import type { CommentData } from '../types'
import { WebviewPanel } from '../WebviewPanel'

export interface PRDetailProps {
  onClose: () => void
}

export function PRDetail({ onClose }: PRDetailProps): React.JSX.Element | null {
  // Subscribe to selected PR and loading state from hook
  // The hook automatically fetches full PR data when selectedPRId changes
  const { pr, isLoading: isLoadingDetails, selectedPRId } = useSelectedPR()

  // Webview tabs - use PR identifier as key
  const prId = selectedPRId ? `${selectedPRId.repoFullName}#${selectedPRId.prNumber}` : null
  const { data: webviewTabs } = usePRWebviewTabs(prId)
  const { data: activeTabId } = usePRActiveTab(prId)
  const addWebviewTab = useAddWebviewTab()
  const removeWebviewTab = useRemoveWebviewTab()
  const setActiveTab = useSetPRActiveTab()

  // Webview tab handlers
  const handleSelectPRDetail = useCallback(() => {
    if (prId) {
      setActiveTab.mutate({ prId, tabId: null })
    }
  }, [prId, setActiveTab])

  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (prId) {
        setActiveTab.mutate({ prId, tabId })
      }
    },
    [prId, setActiveTab]
  )

  const handleCloseTab = useCallback(
    (tabId: string) => {
      if (prId) {
        removeWebviewTab.mutate({ prId, tabId })
      }
    },
    [prId, removeWebviewTab]
  )

  const handleAddTab = useCallback(
    (url: string) => {
      if (prId) {
        const tabId = `tab-${Date.now()}`
        addWebviewTab.mutate({
          prId,
          tab: { id: tabId, url, title: '' }
        })
      }
    },
    [prId, addWebviewTab]
  )

  // Get the active webview tab (if any)
  const activeWebviewTab = useMemo(() => {
    if (!activeTabId || !webviewTabs) return null
    return webviewTabs.find((t) => t.id === activeTabId) ?? null
  }, [activeTabId, webviewTabs])

  // Screenshot modal state
  const [screenshotData, setScreenshotData] = useState<{
    imageDataUrl: string
    sourceUrl: string
  } | null>(null)

  const handleScreenshotCaptured = useCallback((imageDataUrl: string, sourceUrl: string) => {
    setScreenshotData({ imageDataUrl, sourceUrl })
  }, [])

  const handleCloseScreenshotModal = useCallback(() => {
    setScreenshotData(null)
  }, [])

  // Tab state for comments filter (now includes code reviews)
  const [commentTab, setCommentTab] = useState<'all' | 'humans' | 'bots' | 'reviews'>('all')

  // Combine comments and reviews into a unified list with isBot flag
  const allComments = useMemo<CommentData[]>(() => {
    if (!pr) return []
    return [
      ...(pr.commentsList || []).map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.created_at,
        actor: { ...c.author, isBot: c.author.isBot || false },
        event: 'commented' as const
      })),
      ...(pr.reviews || []).map((r) => ({
        id: r.id,
        body: r.body || '',
        created_at: r.created_at,
        actor: { ...r.author, isBot: r.author.isBot || false },
        event:
          r.state === 'approved'
            ? ('approved' as const)
            : r.state === 'changes_requested'
              ? ('changes_requested' as const)
              : ('reviewed' as const)
      }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [pr])

  // Filter comments based on selected tab
  const comments = useMemo(() => {
    if (commentTab === 'all') return allComments
    if (commentTab === 'humans') return allComments.filter((c) => !c.actor.isBot)
    if (commentTab === 'bots') return allComments.filter((c) => c.actor.isBot)
    return allComments
  }, [allComments, commentTab])

  // Count bots and humans
  const botComments = allComments.filter((c) => c.actor.isBot).length
  const humanComments = allComments.filter((c) => !c.actor.isBot).length

  // Count unique reviewers (not total review submissions)
  const uniqueReviewersCount = useMemo(() => {
    if (!pr?.reviews) return 0
    return new Set(pr.reviews.map((r) => r.author.login)).size
  }, [pr?.reviews])

  // Get unique reviewers with their latest state for avatars
  const uniqueReviewers = useMemo(() => {
    if (!pr?.reviews) return []
    return Array.from(
      new Map(
        pr.reviews.map((r) => [r.author.login, { author: r.author, state: r.state }])
      ).values()
    )
  }, [pr?.reviews])

  // Get unique humans who commented
  const uniqueHumans = useMemo(() => {
    return Array.from(
      new Map(
        allComments.filter((c) => !c.actor.isBot).map((c) => [c.actor.login, c.actor])
      ).values()
    )
  }, [allComments])

  // Get unique bots who commented
  const uniqueBots = useMemo(() => {
    return Array.from(
      new Map(
        allComments.filter((c) => c.actor.isBot).map((c) => [c.actor.login, c.actor])
      ).values()
    )
  }, [allComments])

  // Don't render if no PR is selected (check identifier, not full data)
  if (!selectedPRId) return null

  // Show loading skeleton when fetching full details
  if (isLoadingDetails || !pr) {
    return (
      <PRDetailSkeleton
        prNumber={selectedPRId.prNumber}
        repoFullName={selectedPRId.repoFullName}
        onClose={onClose}
      />
    )
  }

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden bg-background"
      style={{ maxWidth: '100%' }}
    >
      <PRHeader onClose={onClose} />

      {/* Tab bar for PR detail + webviews */}
      <PRTabBar
        prTitle={pr.title}
        prNumber={pr.number}
        tabs={webviewTabs || []}
        activeTabId={activeTabId ?? null}
        onSelectPRDetail={handleSelectPRDetail}
        onSelectTab={handleSelectTab}
        onCloseTab={handleCloseTab}
        onAddTab={handleAddTab}
      />

      {/* PR Detail content - hidden when webview tab is active */}
      <ScrollArea className={cn('flex-1', activeWebviewTab && 'hidden')}>
        <div className="p-4 w-full max-w-full overflow-x-hidden pr-detail-content">
          <Row gutter="xl" className="flex-col">
            {/* Merge conflict indicator */}
            {pr.mergeable === 'CONFLICTING' && (
              <Col span="full">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 bg-destructive-subtle text-sm">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <span className="text-destructive font-medium">
                    This branch has conflicts that must be resolved
                  </span>
                  <span className="text-destructive/70">
                    — merge{' '}
                    <code className="text-xs bg-destructive/10 px-1 py-0.5 rounded font-mono">
                      {pr.base.ref}
                    </code>{' '}
                    into{' '}
                    <code className="text-xs bg-destructive/10 px-1 py-0.5 rounded font-mono">
                      {pr.head.ref}
                    </code>{' '}
                    to fix
                  </span>
                </div>
              </Col>
            )}

            {/* PR Description Section */}
            <Col span="full">
              <PRDescription
                body={pr.body}
                prNodeId={pr.id}
                repoFullName={`${pr.base.repo.owner.login}/${pr.base.repo.name}`}
                prNumber={pr.number}
              />
            </Col>

            <Col span="full">
              <Separator />
            </Col>

            {/* CI Checks Section */}
            <Col span="full">
              <CIChecksSection
                checks={pr.checks}
                checksLoading={false}
                owner={pr.base.repo.owner.login}
                repo={pr.base.repo.name}
              />
            </Col>

            <Col span="full">
              <Separator />
            </Col>

            {/* Commit History Section */}
            {pr.commits && pr.commits.length > 0 && (
              <Col span="full">
                <CommitHistorySection
                  commits={pr.commits}
                  totalCommits={pr.totalCommits || pr.commits.length}
                  repoFullName={`${pr.base.repo.owner.login}/${pr.base.repo.name}`}
                />
              </Col>
            )}

            {pr.commits && pr.commits.length > 0 && (
              <Col span="full">
                <Separator />
              </Col>
            )}

            {/* Changed Files Section */}
            <Col span="full">
              <ChangedFilesSection
                repoFullName={`${pr.base.repo.owner.login}/${pr.base.repo.name}`}
                prNumber={pr.number}
                totalChanged={pr.changed_files}
                headRef={pr.head.ref}
              />
            </Col>

            <Col span="full">
              <Separator />
            </Col>

            {/* Comments & Reviews Section */}
            <Col span="full">
              <Row gutter="md" className="flex-col">
                <Col span="full">
                  <Row gutter="sm" align="center">
                    <Col span="auto">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </Col>
                    <Col span="auto">
                      <h3 className="text-sm font-semibold">Discussion</h3>
                    </Col>
                  </Row>
                </Col>

                {/* Post Comment Form - at top since comments are newest first */}
                <Col span="full">
                  <PostCommentForm />
                </Col>

                {/* Tab filter - All, People, Bots, Reviews */}
                <Col span="full">
                  <div className="flex gap-1 p-1 bg-surface rounded-lg">
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={() => setCommentTab('all')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                        commentTab === 'all'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <MessageSquare className="w-3 h-3" />
                      All ({allComments.length})
                    </Button>
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={() => setCommentTab('humans')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                        commentTab === 'humans'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Users className="w-3 h-3" />
                      <span>People ({humanComments})</span>
                      {uniqueHumans.length > 0 && (
                        <div className="flex items-center -space-x-1 ml-0.5">
                          {uniqueHumans.slice(0, 3).map((actor) => (
                            <Avatar
                              key={actor.login}
                              className="w-3.5 h-3.5 ring-1 ring-background"
                            >
                              <AvatarImage src={actor.avatar_url} alt={actor.login} />
                              <AvatarFallback className="text-[5px]">
                                {actor.login.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {uniqueHumans.length > 3 && (
                            <span className="text-[9px] ml-0.5">+{uniqueHumans.length - 3}</span>
                          )}
                        </div>
                      )}
                    </Button>
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={() => setCommentTab('bots')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                        commentTab === 'bots'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Bot className="w-3 h-3" />
                      <span>Bots ({botComments})</span>
                      {uniqueBots.length > 0 && (
                        <div className="flex items-center -space-x-1 ml-0.5">
                          {uniqueBots.slice(0, 3).map((actor) => (
                            <Avatar
                              key={actor.login}
                              className="w-3.5 h-3.5 ring-1 ring-purple-400"
                            >
                              <AvatarImage src={actor.avatar_url} alt={actor.login} />
                              <AvatarFallback className="text-[5px]">
                                {actor.login.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {uniqueBots.length > 3 && (
                            <span className="text-[9px] ml-0.5">+{uniqueBots.length - 3}</span>
                          )}
                        </div>
                      )}
                    </Button>
                    <Button
                      variant="unstyled"
                      size="none"
                      onClick={() => setCommentTab('reviews')}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                        commentTab === 'reviews'
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <FileSearch className="w-3 h-3" />
                      <span>Reviews ({uniqueReviewersCount})</span>
                      {uniqueReviewers.length > 0 && (
                        <div className="flex items-center -space-x-1 ml-0.5">
                          {uniqueReviewers.slice(0, 3).map(({ author, state }) => (
                            <Avatar
                              key={author.login}
                              className={cn(
                                'w-3.5 h-3.5 ring-1',
                                state === 'approved'
                                  ? 'ring-emerald-500'
                                  : state === 'changes_requested'
                                    ? 'ring-red-500'
                                    : 'ring-gray-400'
                              )}
                            >
                              <AvatarImage src={author.avatar_url} alt={author.login} />
                              <AvatarFallback className="text-[5px]">
                                {author.login.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {uniqueReviewers.length > 3 && (
                            <span className="text-[9px] ml-0.5">+{uniqueReviewers.length - 3}</span>
                          )}
                        </div>
                      )}
                    </Button>
                  </div>
                </Col>

                {/* Comments content (All, People, Bots tabs) */}
                {commentTab !== 'reviews' && (
                  <Col span="full">
                    {comments.length > 0 ? (
                      <div className="relative ml-2">
                        {/* Timeline line */}
                        <div className="absolute left-[15px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-primary/50 via-primary/30 to-primary/50 rounded-full" />
                        {/* Start marker */}
                        <div className="absolute left-[11px] top-0 w-[11px] h-[11px] rounded-full bg-info-subtle border-2 border-primary" />

                        <div className="space-y-0 pt-4">
                          {comments.map((comment, index) => (
                            <div
                              key={`${comment.id}-${index}`}
                              className="relative pl-12 pb-5 group"
                            >
                              {/* Timeline dot */}
                              <div
                                className={cn(
                                  'absolute left-[4px] top-3 w-[26px] h-[26px] rounded-full border-[3px] bg-background flex items-center justify-center shadow-sm transition-transform group-hover:scale-110',
                                  comment.event === 'approved'
                                    ? 'border-success'
                                    : comment.event === 'changes_requested'
                                      ? 'border-destructive'
                                      : comment.actor.isBot
                                        ? 'border-purple-500'
                                        : 'border-primary'
                                )}
                              >
                                {comment.event === 'approved' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                                ) : comment.event === 'changes_requested' ? (
                                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                                ) : comment.actor.isBot ? (
                                  <Bot className="w-3.5 h-3.5 text-purple-500" />
                                ) : (
                                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                )}
                              </div>

                              {/* Connector line from dot to card */}
                              <div
                                className={cn(
                                  'absolute left-[30px] top-[22px] w-[18px] h-[2px]',
                                  comment.event === 'approved'
                                    ? 'bg-success-subtle'
                                    : comment.event === 'changes_requested'
                                      ? 'bg-destructive-subtle'
                                      : comment.actor.isBot
                                        ? 'bg-purple-500/50'
                                        : 'bg-info-subtle'
                                )}
                              />

                              <CommentItem
                                comment={comment}
                                repoFullName={selectedPRId.repoFullName}
                                prNumber={selectedPRId.prNumber}
                                onOpenInWebview={handleAddTab}
                              />
                            </div>
                          ))}
                        </div>

                        {/* End marker */}
                        <div className="absolute left-[11px] bottom-0 w-[11px] h-[11px] rounded-full bg-info-subtle border-2 border-primary" />
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">
                        {commentTab === 'bots' ? (
                          <>
                            <Bot className="w-5 h-5 mx-auto mb-2 opacity-50" />
                            No bot comments
                          </>
                        ) : commentTab === 'humans' ? (
                          <>
                            <Users className="w-5 h-5 mx-auto mb-2 opacity-50" />
                            No human comments
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-5 h-5 mx-auto mb-2 opacity-50" />
                            No comments yet
                          </>
                        )}
                      </div>
                    )}
                  </Col>
                )}

                {/* Reviews content (Reviews tab) - Tree-based display */}
                {commentTab === 'reviews' && (
                  <Col span="full">
                    <ReviewsBySubmission
                      reviews={pr.reviews || []}
                      reviewThreads={pr.reviewThreads || []}
                    />
                  </Col>
                )}
              </Row>
            </Col>
          </Row>
        </div>
      </ScrollArea>

      {/* Render all webview tabs - keep them alive but hidden when not active */}
      {(webviewTabs || []).map((tab) => (
        <div key={tab.id} className={cn('flex-1', activeTabId !== tab.id && 'hidden')}>
          <WebviewPanel
            url={tab.url}
            onScreenshotCaptured={(imageDataUrl) => handleScreenshotCaptured(imageDataUrl, tab.url)}
          />
        </div>
      ))}

      {/* Screenshot posting modal */}
      {selectedPRId && pr && (
        <PostScreenshotModal
          isOpen={!!screenshotData}
          onClose={handleCloseScreenshotModal}
          screenshotDataUrl={screenshotData?.imageDataUrl ?? null}
          repoFullName={selectedPRId.repoFullName}
          prNumber={selectedPRId.prNumber}
          prNodeId={pr.id}
          sourceUrl={screenshotData?.sourceUrl}
        />
      )}
    </div>
  )
}
