/**
 * DailySpeechModal - Modal for generating and viewing daily standup speeches
 *
 * Features:
 * - History list view with generate button
 * - AI-powered daily standup using Claude Code
 * - Real-time thinking display during generation
 * - MarkdownEditor for editing before saving
 */

import { useClaudeCodeStatus, useCurrentUser, useGitHubToken } from '@data'
import {
  type DailyReport,
  useDeleteDailyReport,
  useRecentDailyReports,
  useUpsertDailyReport
} from '@persistence'
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Flex,
  MarkdownContent,
  MarkdownEditor,
  ScrollArea,
  ThinkingSection
} from '@ui-kit'
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronUp,
  History,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// =============================================================================
// Types
// =============================================================================

interface InternalToolActivity {
  name: string
  input: string
  timestamp: number
}

interface GenerationState {
  stage: 'idle' | 'generating' | 'done' | 'error'
  thinking: string
  streamedContent: string
  currentTool: InternalToolActivity | null
  toolHistory: InternalToolActivity[]
  error?: string
}

interface UnsavedReport {
  content: string
  thinking: string | null
  eventCount: number
  analyzedRepos: string | null
  analyzedPRs: string | null
  generationDurationMs: number | null
  toolsUsed: string | null
}

interface UserEvent {
  id: string
  type: string
  title: string
  description?: string
  repoName?: string
  prNumber?: number
  timestamp: string
  icon?: string
}

interface DailySpeechModalProps {
  isOpen: boolean
  onClose: () => void
  events: UserEvent[]
}

// View states for the modal
type ViewState = 'history' | 'generating' | 'editing'

// =============================================================================
// Helpers
// =============================================================================

function formatToolInput(input: unknown): string {
  if (typeof input === 'string') {
    return input.length > 100 ? `${input.slice(0, 100)}...` : input
  }
  if (typeof input === 'object' && input !== null) {
    const str = JSON.stringify(input)
    return str.length > 100 ? `${str.slice(0, 100)}...` : str
  }
  return String(input)
}

function getLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// =============================================================================
// Component
// =============================================================================

export function DailySpeechModal({
  isOpen,
  onClose,
  events
}: DailySpeechModalProps): React.JSX.Element {
  const { data: claudeCodeStatus } = useClaudeCodeStatus()
  const { data: user } = useCurrentUser()
  const { data: githubToken } = useGitHubToken()
  const isCliReady = claudeCodeStatus?.installed ?? false
  const { data: reports = [] } = useRecentDailyReports(30)
  const upsertReport = useUpsertDailyReport()
  const deleteReport = useDeleteDailyReport()

  // View state
  const [view, setView] = useState<ViewState>('history')
  const [editContent, setEditContent] = useState('')
  const [unsavedReport, setUnsavedReport] = useState<UnsavedReport | null>(null)
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null)
  const [showThinking, setShowThinking] = useState(false)

  // Generation state
  const [state, setState] = useState<GenerationState>({
    stage: 'idle',
    thinking: '',
    streamedContent: '',
    currentTool: null,
    toolHistory: []
  })

  // Refs for cleanup
  const cleanupRefs = useRef<Array<() => void>>([])
  const sessionIdRef = useRef<string | null>(null)

  const today = getLocalDateString(new Date())

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      for (const cleanup of cleanupRefs.current) {
        cleanup()
      }
      cleanupRefs.current = []

      setView('history')
      setEditContent('')
      setUnsavedReport(null)
      setExpandedReportId(null)
      setShowThinking(false)
      setState({
        stage: 'idle',
        thinking: '',
        streamedContent: '',
        currentTool: null,
        toolHistory: []
      })
    }
  }, [isOpen])

  // Generate daily speech
  const handleGenerate = useCallback(async () => {
    if (!user || !isCliReady || !githubToken) return

    const sessionId = `daily-${Date.now()}`
    sessionIdRef.current = sessionId

    setView('generating')
    setState({
      stage: 'generating',
      thinking: '',
      streamedContent: '',
      currentTool: null,
      toolHistory: []
    })

    // Setup event listeners
    const chunkCleanup = window.electron.onDailySpeechChunk((data) => {
      if (data.sessionId !== sessionId) return

      const { event } = data

      if (event.type === 'thinking' && event.thinking) {
        setState((prev) => ({
          ...prev,
          thinking: prev.thinking + event.thinking
        }))
      } else if (event.type === 'text' && event.content) {
        setState((prev) => ({
          ...prev,
          streamedContent: prev.streamedContent + event.content
        }))
      } else if (event.type === 'tool_use' && event.tool_name) {
        const activity: InternalToolActivity = {
          name: event.tool_name,
          input: event.input ? formatToolInput(event.input) : '',
          timestamp: Date.now()
        }
        setState((prev) => ({
          ...prev,
          currentTool: activity,
          toolHistory: [...prev.toolHistory, activity]
        }))
      }
    })

    const doneCleanup = window.electron.onDailySpeechDone((data) => {
      if (data.sessionId !== sessionId) return

      if (data.success && data.content) {
        const unsaved: UnsavedReport = {
          content: data.content,
          thinking: data.thinking || null,
          eventCount: events.length,
          analyzedRepos: data.metadata?.analyzedRepos
            ? JSON.stringify(data.metadata.analyzedRepos)
            : null,
          analyzedPRs: data.metadata?.analyzedPRs
            ? JSON.stringify(data.metadata.analyzedPRs)
            : null,
          generationDurationMs: data.metadata?.generationDurationMs || null,
          toolsUsed: data.metadata?.toolsUsed ? JSON.stringify(data.metadata.toolsUsed) : null
        }

        setUnsavedReport(unsaved)
        setEditContent(data.content)
        setView('editing')
        setState((prev) => ({
          ...prev,
          stage: 'done',
          currentTool: null
        }))
      }
    })

    const errorCleanup = window.electron.onDailySpeechError((data) => {
      if (data.sessionId !== sessionId) return

      setState((prev) => ({
        ...prev,
        stage: 'error',
        error: data.error,
        currentTool: null
      }))
    })

    cleanupRefs.current = [chunkCleanup, doneCleanup, errorCleanup]

    // Start generation
    try {
      const contextEvents = events.map((e) => ({
        type: e.type,
        description: e.description || e.title,
        repoName: e.repoName,
        prNumber: e.prNumber,
        prTitle: e.title,
        timestamp: e.timestamp
      }))

      await window.electron.generateDailySpeechStreaming({
        sessionId,
        username: user.login,
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        events: contextEvents,
        githubToken
      })
    } catch (error) {
      setState((prev) => ({
        ...prev,
        stage: 'error',
        error: error instanceof Error ? error.message : 'An error occurred'
      }))
    }
  }, [user, isCliReady, githubToken, events])

  // Stop generation
  const handleStop = useCallback(() => {
    if (sessionIdRef.current) {
      window.electron.stopDailySpeech(sessionIdRef.current)
    }
    setView('history')
  }, [])

  // Save the report
  const handleSave = useCallback(() => {
    if (!unsavedReport || !editContent.trim()) return

    const report: DailyReport = {
      id: `report-${Date.now()}`,
      date: today,
      content: editContent,
      summary: null,
      eventCount: unsavedReport.eventCount,
      analyzedRepos: unsavedReport.analyzedRepos,
      analyzedPRs: unsavedReport.analyzedPRs,
      generationDurationMs: unsavedReport.generationDurationMs,
      toolsUsed: unsavedReport.toolsUsed,
      thinking: unsavedReport.thinking,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    upsertReport.mutate(report, {
      onSuccess: () => {
        setUnsavedReport(null)
        setEditContent('')
        setView('history')
      }
    })
  }, [unsavedReport, editContent, today, upsertReport])

  // Discard and go back
  const handleDiscard = useCallback(() => {
    setUnsavedReport(null)
    setEditContent('')
    setView('history')
    setState({
      stage: 'idle',
      thinking: '',
      streamedContent: '',
      currentTool: null,
      toolHistory: []
    })
  }, [])

  // Delete a report from history
  const handleDeleteReport = useCallback(
    (e: React.MouseEvent, reportId: string) => {
      e.stopPropagation()
      deleteReport.mutate(reportId)
    },
    [deleteReport]
  )

  // Toggle expand/collapse for a history report
  const handleToggleExpand = useCallback((reportId: string) => {
    setExpandedReportId((prev) => (prev === reportId ? null : reportId))
  }, [])

  // ==========================================================================
  // Render Functions
  // ==========================================================================

  // Render the history list view
  const renderHistoryView = (): React.JSX.Element => (
    <Flex direction="col" gap="none" className="h-full">
      {/* Header with Generate button */}
      <Flex align="center" justify="end" className="px-6 py-4 shrink-0">
        <Button
          onClick={handleGenerate}
          disabled={!isCliReady || !githubToken || events.length === 0}
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate
        </Button>
      </Flex>

      {/* History list */}
      <ScrollArea className="flex-1">
        {reports.length === 0 ? (
          <Flex direction="col" align="center" justify="center" gap="lg" className="h-full py-16">
            <div className="p-4 bg-surface rounded-full">
              <History className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">No reports yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Generate your first standup to see it here
              </p>
            </div>
          </Flex>
        ) : (
          <Flex direction="col" gap="sm" className="p-4">
            {reports.map((report) => {
              const isExpanded = expandedReportId === report.id
              const dateFormatted = parseLocalDate(report.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })
              const timeFormatted = new Date(report.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })
              const contentLines = report.content.split('\n').filter((line) => line.trim())
              const summary =
                contentLines.find((line) => !line.startsWith('#'))?.slice(0, 100) ||
                report.content.slice(0, 100)

              return (
                <div
                  key={report.id}
                  className={cn(
                    'border rounded-lg overflow-hidden transition-all',
                    isExpanded ? 'bg-surface' : 'hover:bg-interactive-hover'
                  )}
                >
                  {/* Header */}
                  <button
                    type="button"
                    onClick={() => handleToggleExpand(report.id)}
                    className="w-full px-4 py-3 text-left"
                  >
                    <Flex align="start" justify="between" gap="md">
                      <Flex direction="col" gap="xs" className="flex-1 min-w-0">
                        <Flex align="center" gap="sm">
                          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{dateFormatted}</span>
                          <span className="text-xs text-muted-foreground">{timeFormatted}</span>
                        </Flex>
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground truncate">
                            {summary}
                            {summary.length >= 100 && '...'}
                          </p>
                        )}
                      </Flex>
                      <Flex align="center" gap="sm" className="shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteReport(e, report.id)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Flex>
                    </Flex>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <Flex direction="col" gap="none" className="border-t">
                      <div className="p-4">
                        <MarkdownContent
                          content={report.content}
                          className="prose prose-sm prose-neutral dark:prose-invert max-w-none"
                        />
                      </div>
                      {report.thinking && (
                        <ThinkingSection
                          thinking={report.thinking}
                          isExpanded={showThinking}
                          onExpandedChange={setShowThinking}
                          maxHeight={80}
                        />
                      )}
                    </Flex>
                  )}
                </div>
              )
            })}
          </Flex>
        )}
      </ScrollArea>

      {/* Footer hint */}
      {(!isCliReady || !githubToken) && (
        <div className="px-6 py-3 border-t bg-surface text-sm text-muted-foreground text-center">
          {!isCliReady && !githubToken
            ? 'Install Claude Code CLI and configure GitHub token to generate reports'
            : !isCliReady
              ? 'Install Claude Code CLI to generate reports'
              : 'GitHub token required to generate reports'}
        </div>
      )}
    </Flex>
  )

  // Render the generating view
  const renderGeneratingView = (): React.JSX.Element => (
    <Flex direction="col" gap="none" className="h-full">
      {/* Header */}
      <Flex align="center" justify="between" className="px-6 py-4 border-b shrink-0">
        <Flex align="center" gap="sm">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="font-medium">Generating...</span>
        </Flex>
        <Button variant="outline" size="sm" onClick={handleStop}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </Flex>

      {/* Thinking panel */}
      <ThinkingSection
        thinking={state.thinking}
        isStreaming={state.stage === 'generating'}
        currentTool={
          state.currentTool
            ? { name: state.currentTool.name, input: state.currentTool.input }
            : null
        }
        toolCount={state.toolHistory.length}
        maxHeight={128}
        autoScroll
      />

      {/* Streaming content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {state.streamedContent ? (
            <MarkdownContent
              content={state.streamedContent}
              className="prose prose-neutral dark:prose-invert max-w-none"
            />
          ) : (
            <Flex direction="col" align="center" justify="center" gap="md" className="py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-base font-medium">Analyzing your GitHub activity...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Claude is reading your code changes and PRs
                </p>
              </div>
            </Flex>
          )}
        </div>
      </ScrollArea>

      {/* Error state */}
      {state.stage === 'error' && (
        <div className="px-6 py-4 border-t bg-destructive-subtle">
          <Flex align="center" gap="sm" className="text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{state.error}</span>
          </Flex>
        </div>
      )}
    </Flex>
  )

  // Render the editing view (after generation)
  const renderEditingView = (): React.JSX.Element => (
    <Flex direction="col" gap="none" className="h-full">
      {/* Header */}
      <Flex align="center" justify="between" className="px-6 py-4 border-b shrink-0">
        <Flex align="center" gap="sm">
          <Button variant="ghost" size="sm" onClick={handleDiscard} className="h-8 w-8 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium">Edit & Save</span>
          <span className="text-xs text-muted-foreground bg-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded">
            Unsaved
          </span>
        </Flex>
        <Flex gap="sm">
          <Button variant="ghost" onClick={handleDiscard}>
            Discard
          </Button>
          <Button onClick={handleSave} disabled={!editContent.trim() || upsertReport.isPending}>
            {upsertReport.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </Flex>
      </Flex>

      {/* Metadata */}
      {unsavedReport && (
        <Flex
          align="center"
          gap="md"
          className="px-6 py-2 border-b bg-surface text-xs text-muted-foreground"
        >
          <Flex align="center" gap="xs">
            <Calendar className="w-3 h-3" />
            <span>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </Flex>
          <span>{unsavedReport.eventCount} events analyzed</span>
          {unsavedReport.analyzedRepos && (
            <span>{JSON.parse(unsavedReport.analyzedRepos).length} repos</span>
          )}
        </Flex>
      )}

      {/* Markdown Editor */}
      <div className="flex-1 p-4 overflow-hidden">
        <MarkdownEditor
          value={editContent}
          onChange={setEditContent}
          height={400}
          placeholder="Edit your standup report..."
          defaultTab="write"
          className="h-full"
        />
      </div>
    </Flex>
  )

  // Determine what to render
  const renderContent = (): React.JSX.Element => {
    switch (view) {
      case 'generating':
        return renderGeneratingView()
      case 'editing':
        return renderEditingView()
      default:
        return renderHistoryView()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] max-h-[700px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Daily Standup
          </DialogTitle>
          <DialogDescription className="text-sm">
            Generate AI-powered daily summaries from your GitHub activity
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  )
}
