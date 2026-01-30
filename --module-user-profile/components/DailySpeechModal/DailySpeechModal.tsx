/**
 * DailySpeechModal - Modal for generating and viewing daily standup speeches
 *
 * Features:
 * - Generate AI-powered daily standup from GitHub activity
 * - Edit generated speech before saving
 * - View history of past speeches
 * - Detailed loading progress
 */

import {
  type DailySpeech,
  type UserEvent,
  useAddAIUsage,
  useClaudeApiKey,
  useCurrentUser,
  useDailySpeeches,
  useDeleteDailySpeech,
  useSaveDailySpeech
} from '@data'
import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  MarkdownContent,
  Progress,
  ScrollArea,
  Textarea
} from '@ui-kit'
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  Clock,
  Edit3,
  History,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { calculateTokenCost, DEFAULT_MODEL } from '../../../--module-ai-chat/utils/claude-request'

interface GenerationProgress {
  stage: 'idle' | 'fetching-prs' | 'generating' | 'done' | 'error'
  message: string
  /** Progress percentage from 0 to 100 */
  percent: number
  prProgress?: { current: number; total: number }
}

interface DailySpeechModalProps {
  isOpen: boolean
  onClose: () => void
  events: UserEvent[]
}

export function DailySpeechModal({
  isOpen,
  onClose,
  events
}: DailySpeechModalProps): React.JSX.Element {
  const { data: claudeApiKey } = useClaudeApiKey()
  const { data: user } = useCurrentUser()
  const { data: speeches = [] } = useDailySpeeches()
  const saveSpeech = useSaveDailySpeech()
  const deleteSpeech = useDeleteDailySpeech()
  const addAIUsage = useAddAIUsage()

  // Current speech state
  const [currentSpeech, setCurrentSpeech] = useState<DailySpeech | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  // Generation state
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: 'idle',
    message: '',
    percent: 0
  })

  // Get today's date string in local timezone (YYYY-MM-DD)
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Parse a YYYY-MM-DD date string as local time (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const today = getLocalDateString(new Date())

  // Check if we have a speech for today
  const todaysSpeech = speeches.find((s) => s.date === today)

  // Load today's speech on open
  useEffect(() => {
    if (isOpen && todaysSpeech && !currentSpeech) {
      setCurrentSpeech(todaysSpeech)
    }
  }, [isOpen, todaysSpeech, currentSpeech])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setCurrentSpeech(null)
      setIsEditing(false)
      setEditedContent('')
      setShowHistory(false)
      setProgress({ stage: 'idle', message: '', percent: 0 })
    }
  }, [isOpen])

  // Fetch PR descriptions for events that have prNumber
  const fetchPRDescriptions = useCallback(
    async (eventsWithPRs: UserEvent[]): Promise<Map<string, string>> => {
      const descriptions = new Map<string, string>()
      const prsToFetch = eventsWithPRs.filter((e) => e.prNumber && e.repoName)
      const total = prsToFetch.length

      for (let i = 0; i < total; i++) {
        const event = prsToFetch[i]
        // PR fetching is 0-70% of progress (leave 30% for AI generation)
        const percent = Math.round(((i + 1) / total) * 70)
        setProgress({
          stage: 'fetching-prs',
          message: `Fetching PR ${i + 1}/${total}: ${event.title}`,
          percent,
          prProgress: { current: i + 1, total }
        })

        // Add a small delay to be gentle on rate limits
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 200))
        }

        // For now, we'll use the event description as PR description
        // In a full implementation, you'd fetch from GitHub API
        const key = `${event.repoName}#${event.prNumber}`
        descriptions.set(key, event.description || '')
      }

      return descriptions
    },
    []
  )

  // Generate daily speech
  const handleGenerate = useCallback(async () => {
    if (!user || !claudeApiKey) return

    setProgress({ stage: 'fetching-prs', message: 'Preparing events...', percent: 5 })

    try {
      // Get PR descriptions for events with PR numbers
      const eventsWithPRs = events.filter((e) => e.prNumber)

      // If no PRs to fetch, skip to 70%
      if (eventsWithPRs.length === 0) {
        setProgress({ stage: 'fetching-prs', message: 'No PRs to fetch', percent: 70 })
      }

      const prDescriptions = await fetchPRDescriptions(eventsWithPRs)

      // AI generation phase: 70-95%
      setProgress({ stage: 'generating', message: 'Generating speech with AI...', percent: 75 })

      // Build context for AI
      const contextEvents = events.map((e) => ({
        type: e.type,
        description: e.description || e.title,
        repoName: e.repoName,
        prNumber: e.prNumber,
        prTitle: e.title,
        prDescription: e.prNumber ? prDescriptions.get(`${e.repoName}#${e.prNumber}`) : undefined,
        timestamp: e.timestamp
      }))

      // Simulate progress while waiting for AI
      const progressInterval = setInterval(() => {
        setProgress((prev) => ({
          ...prev,
          percent: Math.min(prev.percent + 2, 95)
        }))
      }, 500)

      // Call the main process to generate speech
      const result = await window.electron.generateDailySpeech({
        username: user.login,
        date: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        events: contextEvents
      })

      clearInterval(progressInterval)

      if (result.success && result.content) {
        // Track AI usage for cost display
        if (result.usage) {
          const { inputCostUsd, outputCostUsd } = calculateTokenCost(
            DEFAULT_MODEL,
            result.usage.inputTokens,
            result.usage.outputTokens
          )
          addAIUsage.mutate({
            inputTokens: result.usage.inputTokens,
            outputTokens: result.usage.outputTokens,
            inputCostUsd,
            outputCostUsd
          })
        }

        const newSpeech: DailySpeech = {
          id: `speech-${Date.now()}`,
          date: today,
          content: result.content,
          metadata: {
            generatedAt: new Date().toISOString(),
            eventCount: events.length,
            prsFetched: eventsWithPRs.length
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }

        // Save to TanStack cache (persisted)
        saveSpeech.mutate(newSpeech)
        setCurrentSpeech(newSpeech)
        setProgress({ stage: 'done', message: 'Speech generated!', percent: 100 })
      } else {
        setProgress({
          stage: 'error',
          message: result.error || 'Failed to generate speech',
          percent: 0
        })
      }
    } catch (error) {
      setProgress({
        stage: 'error',
        message: error instanceof Error ? error.message : 'An error occurred',
        percent: 0
      })
    }
  }, [user, claudeApiKey, events, fetchPRDescriptions, saveSpeech, today, addAIUsage.mutate])

  // Save edited speech
  const handleSave = useCallback(() => {
    if (!currentSpeech || !editedContent.trim()) return

    const updatedSpeech: DailySpeech = {
      ...currentSpeech,
      content: editedContent,
      updatedAt: new Date().toISOString()
    }

    saveSpeech.mutate(updatedSpeech)
    setCurrentSpeech(updatedSpeech)
    setIsEditing(false)
  }, [currentSpeech, editedContent, saveSpeech])

  // Start editing
  const handleEdit = useCallback(() => {
    if (currentSpeech) {
      setEditedContent(currentSpeech.content)
      setIsEditing(true)
    }
  }, [currentSpeech])

  // Cancel editing
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditedContent('')
  }, [])

  // Select a speech from history
  const handleSelectSpeech = useCallback((speech: DailySpeech) => {
    setCurrentSpeech(speech)
    setShowHistory(false)
    setIsEditing(false)
  }, [])

  // Delete a speech from history
  const handleDeleteSpeech = useCallback(
    (e: React.MouseEvent, speechId: string) => {
      e.stopPropagation() // Prevent selecting the speech
      deleteSpeech.mutate(speechId)
      // If we deleted the current speech, clear it
      if (currentSpeech?.id === speechId) {
        setCurrentSpeech(null)
      }
    },
    [deleteSpeech, currentSpeech]
  )

  // Render progress indicator
  const renderProgress = (): React.JSX.Element => (
    <div className="flex flex-col items-center justify-center py-12 gap-6 px-8">
      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <Progress value={progress.percent} size="md" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress.percent}%</span>
          {progress.prProgress && (
            <span>
              PR {progress.prProgress.current}/{progress.prProgress.total}
            </span>
          )}
        </div>
      </div>

      {/* Stage indicator */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-sm font-medium">
            {progress.stage === 'fetching-prs' ? 'Fetching PR details' : 'Generating speech'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center max-w-xs">{progress.message}</p>
      </div>
    </div>
  )

  // Render error state
  const renderError = (): React.JSX.Element => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="p-3 bg-destructive/10 rounded-full">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm text-destructive text-center max-w-xs">{progress.message}</p>
      <Button variant="outline" size="sm" onClick={handleGenerate}>
        <RefreshCw className="w-3.5 h-3.5 mr-2" />
        Try Again
      </Button>
    </div>
  )

  // Render empty state (no events)
  const renderEmptyState = (): React.JSX.Element => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="p-3 bg-muted rounded-full">
        <Calendar className="w-6 h-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">No activity to summarize</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your GitHub activity from the last 24 hours will appear here
        </p>
      </div>
    </div>
  )

  // Render initial state (ready to generate)
  const renderReadyState = (): React.JSX.Element => (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="p-3 bg-primary/10 rounded-full">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">Generate your daily standup</p>
        <p className="text-xs text-muted-foreground mt-1">
          AI will summarize your {events.length} event{events.length !== 1 ? 's' : ''} from the last
          24 hours
        </p>
      </div>
      <Button onClick={handleGenerate} disabled={!claudeApiKey}>
        <Sparkles className="w-4 h-4 mr-2" />
        Generate Speech
      </Button>
      {!claudeApiKey && (
        <p className="text-xs text-muted-foreground">Configure your Claude API key first</p>
      )}
    </div>
  )

  // Render speech content (only called when currentSpeech exists)
  const renderSpeechContent = (speech: DailySpeech): React.JSX.Element => {
    return (
      <div className="flex flex-col h-full">
        {/* Metadata */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {parseLocalDate(speech.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(speech.metadata.generatedAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <span>{speech.metadata.eventCount} events</span>
          </div>
          <div className="flex items-center gap-1">
            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={handleEdit} className="h-7 text-xs">
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
                placeholder="Edit your speech..."
              />
            ) : (
              <MarkdownContent content={speech.content} className="prose-sm" />
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!editedContent.trim()}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}>
                <History className="w-3.5 h-3.5 mr-1.5" />
                History ({speeches.length})
              </Button>
              <Button size="sm" onClick={handleGenerate} disabled={!claudeApiKey}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Regenerate
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  // Render history view
  const renderHistory = (): React.JSX.Element => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Speech History</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="h-7">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {speeches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <History className="w-6 h-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No speeches yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {speeches.map((speech) => (
              <div
                key={speech.id}
                className={cn(
                  'w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors group relative',
                  currentSpeech?.id === speech.id && 'bg-muted'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleSelectSpeech(speech)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {parseLocalDate(speech.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {speech.metadata.eventCount} events • Generated{' '}
                        {new Date(speech.metadata.generatedAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {speech.content.slice(0, 150)}...
                  </p>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteSpeech(e, speech.id)}
                  className="absolute top-3 right-10 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                  title="Delete speech"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )

  // Determine what to render
  const renderContent = (): React.JSX.Element => {
    if (showHistory) {
      return renderHistory()
    }

    if (progress.stage === 'fetching-prs' || progress.stage === 'generating') {
      return renderProgress()
    }

    if (progress.stage === 'error') {
      return renderError()
    }

    if (currentSpeech) {
      return renderSpeechContent(currentSpeech)
    }

    if (events.length === 0) {
      return renderEmptyState()
    }

    return renderReadyState()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            Daily Standup
          </DialogTitle>
          <DialogDescription className="text-xs">
            AI-generated summary of your GitHub activity
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </DialogContent>
    </Dialog>
  )
}
