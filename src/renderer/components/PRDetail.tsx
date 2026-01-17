import { useState, useMemo } from 'react'
import { 
  X,
  GitPullRequest, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Circle,
  Loader2,
  ExternalLink,
  GitBranch,
  Clock,
  FileEdit,
  User,
  AlertCircle,
  PlayCircle,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Bot,
  Users,
  Copy,
  Check,
  FileCode,
  CheckCheck
} from 'lucide-react'
import { ScrollArea } from './ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Input } from './ui/input'
import { cn, formatRelativeTime, truncate } from '@/lib/utils'
import { MarkdownContent } from './MarkdownContent'
import type { PullRequest, CheckStatus, ReviewThread } from './types'

interface PRDetailProps {
  pr: PullRequest
  onClose: () => void
}

function CheckItem({ check }: { check: { name: string; status: string; conclusion: string | null; html_url: string } }) {
  const getIcon = () => {
    if (check.status === 'in_progress' || check.status === 'queued') {
      return <Loader2 className="w-4 h-4 text-warning animate-spin" />
    }
    switch (check.conclusion) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'failure':
        return <XCircle className="w-4 h-4 text-destructive" />
      case 'cancelled':
      case 'skipped':
        return <Circle className="w-4 h-4 text-muted-foreground" />
      default:
        return <Circle className="w-4 h-4 text-warning" />
    }
  }

  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors overflow-hidden"
      onClick={() => window.open(check.html_url, '_blank')}
    >
      <span className="flex-shrink-0">{getIcon()}</span>
      <span className="text-sm flex-1 truncate min-w-0">{check.name}</span>
      <Badge variant="secondary" className="text-[10px] h-5 flex-shrink-0">
        {check.status === 'in_progress' ? 'Running' : check.conclusion || check.status}
      </Badge>
    </div>
  )
}

interface CommentData {
  id: string
  body: string
  created_at: string
  actor: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  event: 'commented' | 'approved' | 'changes_requested' | 'reviewed'
}

const TRUNCATE_LENGTH = 200

function CommentItem({ comment }: { comment: CommentData }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  
  if (!comment.actor) return null

  const shouldTruncate = comment.body && comment.body.length > TRUNCATE_LENGTH

  const handleCopy = async () => {
    if (comment.body) {
      await navigator.clipboard.writeText(comment.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getEventBadge = () => {
    switch (comment.event) {
      case 'approved':
        return <Badge variant="default" className="bg-success/20 text-success text-[9px] h-[18px] px-1.5">Approved</Badge>
      case 'changes_requested':
        return <Badge variant="default" className="bg-destructive/20 text-destructive text-[9px] h-[18px] px-1.5">Changes</Badge>
      case 'reviewed':
        return <Badge variant="secondary" className="text-[9px] h-[18px] px-1.5">Reviewed</Badge>
      default:
        return null
    }
  }
  
  // Truncate markdown content for preview
  const getPreviewContent = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    // Try to truncate at a natural break point
    const truncated = text.slice(0, maxLength)
    const lastNewline = truncated.lastIndexOf('\n')
    const lastSpace = truncated.lastIndexOf(' ')
    const breakPoint = lastNewline > maxLength * 0.5 ? lastNewline : lastSpace > maxLength * 0.5 ? lastSpace : maxLength
    return truncated.slice(0, breakPoint) + '...'
  }
  
  return (
    <div className={cn(
      "p-2.5 rounded-lg space-y-1.5 overflow-hidden border-l-2 group/comment",
      comment.actor.isBot 
        ? "bg-purple-500/5 border-l-purple-500" 
        : comment.event === 'approved'
        ? "bg-success/5 border-l-success"
        : comment.event === 'changes_requested'
        ? "bg-destructive/5 border-l-destructive"
        : "bg-muted/20 border-l-primary/50"
    )}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Avatar className="h-5 w-5 flex-shrink-0">
          <AvatarImage src={comment.actor.avatar_url} alt={comment.actor.login} />
          <AvatarFallback className="text-[9px]">
            {comment.actor.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-medium truncate max-w-[100px]">{comment.actor.login}</span>
        {comment.actor.isBot && (
          <Badge variant="outline" className="text-[9px] h-[16px] px-1 gap-0.5 text-purple-500 border-purple-500/50">
            <Bot className="w-2 h-2" />
            Bot
          </Badge>
        )}
        {getEventBadge()}
        <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
          {formatRelativeTime(comment.created_at)}
        </span>
        {/* Copy button - visible on hover */}
        {comment.body && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover/comment:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
            title="Copy comment"
          >
            {copied ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
            )}
          </button>
        )}
      </div>
      {comment.body && (
        <div className="space-y-1.5">
          <div className="text-xs text-muted-foreground overflow-hidden">
            <MarkdownContent 
              content={isExpanded || !shouldTruncate ? comment.body : getPreviewContent(comment.body, TRUNCATE_LENGTH)} 
            />
          </div>
          {shouldTruncate && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-[10px] text-primary hover:text-primary/80 font-medium flex items-center gap-0.5"
            >
              {isExpanded ? (
                <>
                  <ChevronRight className="w-3 h-3 rotate-90" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3 -rotate-90" />
                  Show more ({comment.body.length - TRUNCATE_LENGTH}+ chars)
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

type CheckRun = { id: string; name: string; status: string; conclusion: string | null; html_url: string }

interface GroupedChecks {
  running: CheckRun[]
  failed: CheckRun[]
  success: CheckRun[]
  other: CheckRun[]
}

// Component for displaying a reviewer's feedback grouped together
interface ReviewerFeedback {
  login: string
  avatar_url: string
  isBot: boolean
  reviewState: 'approved' | 'changes_requested' | 'commented' | null
  reviewBody: string | null
  reviewDate: string | null
  inlineComments: Array<{
    id: string
    body: string
    created_at: string
    path: string
    line: number | null
    diffHunk?: string
    isResolved: boolean
  }>
}

function ReviewerCard({ reviewer, prUrl }: { reviewer: ReviewerFeedback; prUrl: string }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    let text = `Review by ${reviewer.login}\n`
    if (reviewer.reviewState) {
      text += `Status: ${reviewer.reviewState}\n`
    }
    if (reviewer.reviewBody) {
      text += `\n${reviewer.reviewBody}\n`
    }
    if (reviewer.inlineComments.length > 0) {
      text += `\nInline comments:\n`
      for (const c of reviewer.inlineComments) {
        text += `\n${c.path}:${c.line || '?'}\n${c.body}\n`
      }
    }
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getStateIcon = () => {
    switch (reviewer.reviewState) {
      case 'approved':
        return <CheckCircle2 className="w-4 h-4 text-success" />
      case 'changes_requested':
        return <XCircle className="w-4 h-4 text-destructive" />
      default:
        return <MessageSquare className="w-4 h-4 text-muted-foreground" />
    }
  }
  
  const getStateBadge = () => {
    switch (reviewer.reviewState) {
      case 'approved':
        return <Badge variant="outline" className="text-[9px] h-4 text-success border-success/50">Approved</Badge>
      case 'changes_requested':
        return <Badge variant="outline" className="text-[9px] h-4 text-destructive border-destructive/50">Changes requested</Badge>
      case 'commented':
        return <Badge variant="outline" className="text-[9px] h-4 text-muted-foreground">Commented</Badge>
      default:
        return null
    }
  }
  
  const resolvedCount = reviewer.inlineComments.filter(c => c.isResolved).length
  const unresolvedCount = reviewer.inlineComments.filter(c => !c.isResolved).length
  
  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      reviewer.reviewState === 'approved' ? "border-success/30" :
      reviewer.reviewState === 'changes_requested' ? "border-destructive/30" :
      "border-border"
    )}>
      {/* Reviewer header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 p-3 hover:bg-muted/50 transition-colors",
          reviewer.reviewState === 'approved' ? "bg-success/5" :
          reviewer.reviewState === 'changes_requested' ? "bg-destructive/5" :
          "bg-muted/20"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
        <Avatar className="h-6 w-6 flex-shrink-0">
          <AvatarImage src={reviewer.avatar_url} alt={reviewer.login} />
          <AvatarFallback className="text-[9px]">
            {reviewer.login.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{reviewer.login}</span>
        {reviewer.isBot && (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5 text-purple-500 border-purple-500/50">
            <Bot className="w-2 h-2" />
            Bot
          </Badge>
        )}
        {getStateBadge()}
        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {reviewer.inlineComments.length > 0 && (
            <span className="flex items-center gap-1">
              <FileCode className="w-3 h-3" />
              {reviewer.inlineComments.length}
            </span>
          )}
          {reviewer.reviewDate && (
            <span>{formatRelativeTime(reviewer.reviewDate)}</span>
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border">
          {/* Review body (summary comment) */}
          {reviewer.reviewBody && (
            <div className="p-3 bg-muted/10 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                {getStateIcon()}
                <span className="text-xs font-medium">Review Summary</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <MarkdownContent content={reviewer.reviewBody} />
              </div>
            </div>
          )}
          
          {/* Inline comments */}
          {reviewer.inlineComments.length > 0 && (
            <div className="p-2">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Inline Comments ({reviewer.inlineComments.length})
                </span>
                {unresolvedCount > 0 && (
                  <span className="text-[10px] text-warning">{unresolvedCount} open</span>
                )}
                {resolvedCount > 0 && (
                  <span className="text-[10px] text-success">{resolvedCount} resolved</span>
                )}
              </div>
              
              <div className="space-y-2">
                {reviewer.inlineComments.map(comment => {
                  const fileName = comment.path.split('/').pop() || comment.path
                  return (
                    <div 
                      key={comment.id}
                      className={cn(
                        "rounded border p-2",
                        comment.isResolved ? "bg-success/5 border-success/20" : "bg-muted/20 border-border"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1.5 text-[10px]">
                        <FileCode className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="font-mono text-primary truncate">{fileName}</span>
                        {comment.line && (
                          <span className="text-muted-foreground">L{comment.line}</span>
                        )}
                        {comment.isResolved && (
                          <Badge variant="outline" className="text-[8px] h-3.5 text-success border-success/50 gap-0.5">
                            <CheckCheck className="w-2 h-2" />
                            Resolved
                          </Badge>
                        )}
                        <span className="text-muted-foreground ml-auto">
                          {formatRelativeTime(comment.created_at)}
                        </span>
                      </div>
                      
                      {/* Diff hunk preview */}
                      {comment.diffHunk && (
                        <pre className="p-1.5 mb-1.5 bg-muted/50 text-[9px] font-mono overflow-x-auto rounded max-h-16 overflow-y-auto">
                          {comment.diffHunk.split('\n').slice(-4).join('\n')}
                        </pre>
                      )}
                      
                      <div className="text-xs text-muted-foreground">
                        <MarkdownContent content={comment.body} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-1 p-2 border-t border-border bg-muted/10">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={() => window.open(`${prUrl}/files`, '_blank')}
            >
              <ExternalLink className="w-3 h-3" />
              View in GitHub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Component for displaying a code review thread (inline comments on code)
function ReviewThreadItem({ thread, prUrl }: { thread: ReviewThread; prUrl: string }) {
  const [isExpanded, setIsExpanded] = useState(!thread.isResolved)
  const [copied, setCopied] = useState(false)
  
  const fileName = thread.path.split('/').pop() || thread.path
  const firstComment = thread.comments[0]
  
  const handleCopy = async () => {
    const allText = thread.comments.map(c => `${c.author.login}: ${c.body}`).join('\n\n')
    await navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleOpenInGithub = () => {
    // GitHub URLs for review comments follow this pattern
    const fileUrl = `${prUrl}/files#diff-${thread.path.replace(/\//g, '-')}`
    window.open(fileUrl, '_blank')
  }
  
  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      thread.isResolved ? "border-success/30 bg-success/5" : "border-border"
    )}>
      {/* Thread header - file path and line */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 p-2 text-xs hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <FileCode className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="font-mono text-primary truncate">{fileName}</span>
        {thread.line && (
          <span className="text-muted-foreground flex-shrink-0">L{thread.line}</span>
        )}
        {thread.isResolved && (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5 text-success border-success/50 ml-auto">
            <CheckCheck className="w-2.5 h-2.5" />
            Resolved
          </Badge>
        )}
        <span className="text-muted-foreground ml-auto flex-shrink-0">
          {thread.comments.length} {thread.comments.length === 1 ? 'comment' : 'comments'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border">
          {/* Diff hunk preview if available */}
          {firstComment?.diffHunk && (
            <pre className="p-2 bg-muted/30 text-[10px] font-mono overflow-x-auto border-b border-border max-h-24 overflow-y-auto">
              {firstComment.diffHunk.split('\n').slice(-5).join('\n')}
            </pre>
          )}
          
          {/* Comments in thread */}
          <div className="p-2 space-y-2">
            {thread.comments.map((comment, idx) => (
              <div 
                key={comment.id} 
                className={cn(
                  "p-2 rounded text-xs",
                  idx === 0 ? "bg-muted/30" : "bg-muted/10 ml-4"
                )}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Avatar className="h-4 w-4 flex-shrink-0">
                    <AvatarImage src={comment.author.avatar_url} alt={comment.author.login} />
                    <AvatarFallback className="text-[8px]">
                      {comment.author.login.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate max-w-[80px]">{comment.author.login}</span>
                  {comment.author.isBot && (
                    <Badge variant="outline" className="text-[8px] h-3.5 px-1 text-purple-500 border-purple-500/50">
                      Bot
                    </Badge>
                  )}
                  <span className="text-muted-foreground ml-auto">
                    {formatRelativeTime(comment.created_at)}
                  </span>
                </div>
                <div className="text-muted-foreground">
                  <MarkdownContent content={comment.body} />
                </div>
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 p-2 border-t border-border bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleOpenInGithub}
            >
              <ExternalLink className="w-3 h-3" />
              View in GitHub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function PRDetail({ pr, onClose }: PRDetailProps) {
  const [jobSearch, setJobSearch] = useState('')
  const [groupByState, setGroupByState] = useState(true)
  // Only failed is expanded by default (needs attention), others collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(['running', 'success', 'other']))
  
  // With GraphQL, all data is already included in the PR object!
  // No extra API calls needed 🎉
  const checks = pr.checks
  const checksLoading = false
  const eventsLoading = false

  // Filter checks based on search
  const filteredChecks = useMemo(() => {
    if (!checks?.check_runs) return []
    if (!jobSearch.trim()) return checks.check_runs
    
    const searchLower = jobSearch.toLowerCase()
    return checks.check_runs.filter(check => 
      check.name.toLowerCase().includes(searchLower) ||
      (check.conclusion && check.conclusion.toLowerCase().includes(searchLower)) ||
      check.status.toLowerCase().includes(searchLower)
    )
  }, [checks?.check_runs, jobSearch])

  // Group checks by state
  const groupedChecks = useMemo((): GroupedChecks => {
    const groups: GroupedChecks = { running: [], failed: [], success: [], other: [] }
    
    for (const check of filteredChecks) {
      if (check.status === 'in_progress' || check.status === 'queued') {
        groups.running.push(check)
      } else if (check.conclusion === 'failure') {
        groups.failed.push(check)
      } else if (check.conclusion === 'success') {
        groups.success.push(check)
      } else {
        groups.other.push(check)
      }
    }
    
    return groups
  }, [filteredChecks])

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  // Tab state for comments filter (now includes code reviews)
  const [commentTab, setCommentTab] = useState<'all' | 'humans' | 'bots' | 'reviews'>('all')

  // Combine comments and reviews into a unified list with isBot flag
  // Sorted chronologically: oldest first, newest last (like a conversation timeline)
  const allComments = useMemo(() => [
    ...(pr.commentsList || []).map(c => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      actor: { ...c.author, isBot: c.author.isBot || false },
      event: 'commented' as const
    })),
    ...(pr.reviews || []).map(r => ({
      id: r.id,
      body: r.body || '',
      created_at: r.created_at,
      actor: { ...r.author, isBot: r.author.isBot || false },
      event: r.state === 'approved' ? 'approved' as const : 
             r.state === 'changes_requested' ? 'changes_requested' as const : 'reviewed' as const
    }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), [pr.commentsList, pr.reviews])

  // Filter comments based on selected tab
  const comments = useMemo(() => {
    if (commentTab === 'all') return allComments
    if (commentTab === 'humans') return allComments.filter(c => !c.actor.isBot)
    if (commentTab === 'bots') return allComments.filter(c => c.actor.isBot)
    return allComments
  }, [allComments, commentTab])

  // Count bots and humans
  const botComments = allComments.filter(c => c.actor.isBot).length
  const humanComments = allComments.filter(c => !c.actor.isBot).length

  // Group code review comments by reviewer
  interface ReviewerGroup {
    login: string
    avatar_url: string
    isBot: boolean
    reviewState: 'approved' | 'changes_requested' | 'commented' | null
    reviewBody: string | null
    reviewDate: string | null
    inlineComments: Array<{
      id: string
      body: string
      created_at: string
      path: string
      line: number | null
      diffHunk?: string
      isResolved: boolean
    }>
  }

  const reviewsByReviewer = useMemo(() => {
    const reviewerMap = new Map<string, ReviewerGroup>()
    
    // First, get review states from reviews array
    for (const review of (pr.reviews || [])) {
      const login = review.author.login
      if (!reviewerMap.has(login)) {
        reviewerMap.set(login, {
          login,
          avatar_url: review.author.avatar_url,
          isBot: review.author.isBot || false,
          reviewState: null,
          reviewBody: null,
          reviewDate: null,
          inlineComments: []
        })
      }
      const group = reviewerMap.get(login)!
      // Use the latest review state
      if (review.state === 'approved' || review.state === 'changes_requested') {
        group.reviewState = review.state as 'approved' | 'changes_requested'
        group.reviewBody = review.body
        group.reviewDate = review.created_at
      } else if (!group.reviewState && review.state === 'commented') {
        group.reviewState = 'commented'
        group.reviewBody = review.body
        group.reviewDate = review.created_at
      }
    }
    
    // Then, add inline comments from review threads
    for (const thread of (pr.reviewThreads || [])) {
      for (const comment of thread.comments) {
        const login = comment.author.login
        if (!reviewerMap.has(login)) {
          reviewerMap.set(login, {
            login,
            avatar_url: comment.author.avatar_url,
            isBot: comment.author.isBot || false,
            reviewState: null,
            reviewBody: null,
            reviewDate: null,
            inlineComments: []
          })
        }
        const group = reviewerMap.get(login)!
        group.inlineComments.push({
          id: comment.id,
          body: comment.body,
          created_at: comment.created_at,
          path: thread.path,
          line: thread.line,
          diffHunk: comment.diffHunk,
          isResolved: thread.isResolved
        })
      }
    }
    
    // Sort inline comments by date for each reviewer
    for (const group of reviewerMap.values()) {
      group.inlineComments.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
    
    // Convert to array and sort by review state (approved last, changes_requested first)
    return Array.from(reviewerMap.values()).sort((a, b) => {
      const stateOrder = { 'changes_requested': 0, 'commented': 1, 'approved': 2, null: 3 }
      return (stateOrder[a.reviewState!] || 3) - (stateOrder[b.reviewState!] || 3)
    })
  }, [pr.reviews, pr.reviewThreads])

  const checksCount = checks?.check_runs.length || 0
  const passedChecks = checks?.check_runs.filter(c => c.conclusion === 'success').length || 0
  const failedChecks = checks?.check_runs.filter(c => c.conclusion === 'failure').length || 0
  const runningChecks = checks?.check_runs.filter(c => c.status === 'in_progress' || c.status === 'queued').length || 0

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0 overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 mb-1">
              <GitPullRequest className={cn(
                'w-4 h-4 flex-shrink-0',
                pr.draft ? 'text-muted-foreground' : 'text-primary'
              )} />
              <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>
              {pr.draft && <Badge variant="secondary" className="text-[10px] h-4">Draft</Badge>}
            </div>
            <h2 className="font-semibold text-sm leading-tight line-clamp-2 break-words">{pr.title}</h2>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground overflow-hidden">
              <GitBranch className="w-3 h-3 flex-shrink-0" />
              <span className="font-mono truncate max-w-[100px]">{truncate(pr.head.ref, 25)}</span>
              <span className="flex-shrink-0">→</span>
              <span className="font-mono truncate max-w-[80px]">{truncate(pr.base.ref, 15)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(pr.html_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[80px]">{pr.user.login}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span>{formatRelativeTime(pr.created_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileEdit className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-success">+{pr.additions}</span>
            <span className="text-destructive">-{pr.deletions}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span>{pr.comments + pr.review_comments}</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6 w-full max-w-full overflow-x-hidden pr-detail-content">
          {/* CI Checks Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-primary" />
                CI Checks
              </h3>
              {checksCount > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  {passedChecks > 0 && (
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {passedChecks}
                    </span>
                  )}
                  {failedChecks > 0 && (
                    <span className="text-destructive flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> {failedChecks}
                    </span>
                  )}
                  {runningChecks > 0 && (
                    <span className="text-warning flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> {runningChecks}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Search and group toggle */}
            {checksCount > 0 && (
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search jobs..."
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                  {jobSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setJobSearch('')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <Button
                  variant={groupByState ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setGroupByState(!groupByState)}
                  title={groupByState ? "Show flat list" : "Group by state"}
                >
                  <Layers className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {checksLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : checks && checks.check_runs.length > 0 ? (
              <div className="space-y-2">
                {filteredChecks.length > 0 ? (
                  groupByState ? (
                    // Grouped view
                    <>
                      {/* Running */}
                      {groupedChecks.running.length > 0 && (
                        <div className="rounded-lg border border-warning/30 bg-warning/5 overflow-hidden">
                          <button
                            onClick={() => toggleGroup('running')}
                            className="w-full flex items-center gap-2 p-2 text-sm font-medium text-warning hover:bg-warning/10 transition-colors"
                          >
                            {collapsedGroups.has('running') ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Running ({groupedChecks.running.length})</span>
                          </button>
                          {!collapsedGroups.has('running') && (
                            <div className="border-t border-warning/20 p-1 space-y-0.5">
                              {groupedChecks.running.map(check => (
                                <CheckItem key={check.id} check={check} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Failed */}
                      {groupedChecks.failed.length > 0 && (
                        <div className="rounded-lg border border-destructive/30 bg-destructive/5 overflow-hidden">
                          <button
                            onClick={() => toggleGroup('failed')}
                            className="w-full flex items-center gap-2 p-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            {collapsedGroups.has('failed') ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <XCircle className="w-4 h-4" />
                            <span>Failed ({groupedChecks.failed.length})</span>
                          </button>
                          {!collapsedGroups.has('failed') && (
                            <div className="border-t border-destructive/20 p-1 space-y-0.5">
                              {groupedChecks.failed.map(check => (
                                <CheckItem key={check.id} check={check} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Success */}
                      {groupedChecks.success.length > 0 && (
                        <div className="rounded-lg border border-success/30 bg-success/5 overflow-hidden">
                          <button
                            onClick={() => toggleGroup('success')}
                            className="w-full flex items-center gap-2 p-2 text-sm font-medium text-success hover:bg-success/10 transition-colors"
                          >
                            {collapsedGroups.has('success') ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Passed ({groupedChecks.success.length})</span>
                          </button>
                          {!collapsedGroups.has('success') && (
                            <div className="border-t border-success/20 p-1 space-y-0.5">
                              {groupedChecks.success.map(check => (
                                <CheckItem key={check.id} check={check} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Other (skipped, cancelled, etc) */}
                      {groupedChecks.other.length > 0 && (
                        <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                          <button
                            onClick={() => toggleGroup('other')}
                            className="w-full flex items-center gap-2 p-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                          >
                            {collapsedGroups.has('other') ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            <Circle className="w-4 h-4" />
                            <span>Other ({groupedChecks.other.length})</span>
                          </button>
                          {!collapsedGroups.has('other') && (
                            <div className="border-t border-border p-1 space-y-0.5">
                              {groupedChecks.other.map(check => (
                                <CheckItem key={check.id} check={check} />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    // Flat list view
                    <div className="space-y-1">
                      {filteredChecks.map((check) => (
                        <CheckItem key={check.id} check={check} />
                      ))}
                    </div>
                  )
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    <Search className="w-5 h-5 mx-auto mb-2 opacity-50" />
                    No jobs matching "{jobSearch}"
                  </div>
                )}
                {jobSearch && filteredChecks.length < checksCount && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing {filteredChecks.length} of {checksCount} jobs
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                No CI checks configured
              </div>
            )}
          </div>

          <Separator />

          {/* Comments & Reviews Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Discussion
              </h3>
            </div>

            {/* Tab filter - All, People, Bots, Reviews */}
            <div className="flex gap-1 mb-3 p-1 bg-muted/50 rounded-lg">
              <button
                onClick={() => setCommentTab('all')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  commentTab === 'all' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="w-3 h-3" />
                All ({allComments.length})
              </button>
              <button
                onClick={() => setCommentTab('humans')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  commentTab === 'humans' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="w-3 h-3" />
                People ({humanComments})
              </button>
              <button
                onClick={() => setCommentTab('bots')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  commentTab === 'bots' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Bot className="w-3 h-3" />
                Bots ({botComments})
              </button>
              <button
                onClick={() => setCommentTab('reviews')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[11px] font-medium transition-colors",
                  commentTab === 'reviews' 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileCode className="w-3 h-3" />
                Code ({pr.reviewThreads?.length || 0})
              </button>
            </div>

            {/* Comments content (All, People, Bots tabs) */}
            {commentTab !== 'reviews' && (
              <>
                {eventsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : comments.length > 0 ? (
                  <div className="relative ml-2">
                    {/* Timeline line - thicker and more visible */}
                    <div className="absolute left-[15px] top-6 bottom-6 w-[3px] bg-gradient-to-b from-primary/50 via-primary/30 to-primary/50 rounded-full" />
                    
                    {/* Start marker */}
                    <div className="absolute left-[11px] top-0 w-[11px] h-[11px] rounded-full bg-primary/30 border-2 border-primary" />
                    
                    <div className="space-y-0 pt-4">
                      {comments.slice(0, 30).map((comment, index) => (
                        <div key={`${comment.id}-${index}`} className="relative pl-12 pb-5 group">
                          {/* Timeline dot - larger and more prominent */}
                          <div className={cn(
                            "absolute left-[4px] top-3 w-[26px] h-[26px] rounded-full border-[3px] bg-background flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                            comment.event === 'approved' ? "border-success" :
                            comment.event === 'changes_requested' ? "border-destructive" :
                            comment.actor.isBot ? "border-purple-500" : "border-primary"
                          )}>
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
                          <div className={cn(
                            "absolute left-[30px] top-[22px] w-[18px] h-[2px]",
                            comment.event === 'approved' ? "bg-success/50" :
                            comment.event === 'changes_requested' ? "bg-destructive/50" :
                            comment.actor.isBot ? "bg-purple-500/50" : "bg-primary/50"
                          )} />
                          
                          <CommentItem comment={comment} />
                        </div>
                      ))}
                    </div>
                    
                    {/* End marker */}
                    <div className="absolute left-[11px] bottom-0 w-[11px] h-[11px] rounded-full bg-primary/30 border-2 border-primary" />
                    
                    {comments.length > 30 && (
                      <p className="text-xs text-muted-foreground text-center py-2 pl-12 mt-2">
                        Showing 30 of {comments.length} comments
                      </p>
                    )}
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
              </>
            )}

            {/* Code Reviews content (Code tab) - Grouped by Reviewer */}
            {commentTab === 'reviews' && (
              <>
                {reviewsByReviewer.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{reviewsByReviewer.length} reviewer{reviewsByReviewer.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {reviewsByReviewer.filter(r => r.reviewState === 'approved').length > 0 && (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {reviewsByReviewer.filter(r => r.reviewState === 'approved').length}
                          </span>
                        )}
                        {reviewsByReviewer.filter(r => r.reviewState === 'changes_requested').length > 0 && (
                          <span className="text-destructive flex items-center gap-1">
                            <XCircle className="w-3 h-3" />
                            {reviewsByReviewer.filter(r => r.reviewState === 'changes_requested').length}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {reviewsByReviewer.map(reviewer => (
                        <ReviewerCard 
                          key={reviewer.login} 
                          reviewer={reviewer} 
                          prUrl={pr.html_url}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    <FileCode className="w-5 h-5 mx-auto mb-2 opacity-50" />
                    No code reviews yet
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
