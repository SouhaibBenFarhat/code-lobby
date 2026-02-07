/**
 * PRDescription - Collapsible PR description section with inline editing.
 */

import { useUpdatePRBody } from '@data'
import { Button, Col, cn, MarkdownContent, MarkdownEditor, Row } from '@ui-kit'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Loader2,
  Pencil,
  Sparkles,
  X
} from 'lucide-react'
import { useCallback, useState } from 'react'

export interface PRDescriptionProps {
  body: string | null
  prNodeId: string
  repoFullName: string
  prNumber: number
}

const DESCRIPTION_PREVIEW_LENGTH = 300

export function PRDescription({
  body,
  prNodeId,
  repoFullName,
  prNumber
}: PRDescriptionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true)
  const [isFullyExpanded, setIsFullyExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(body || '')

  const updatePRBody = useUpdatePRBody()

  const shouldTruncate = body && body.length > DESCRIPTION_PREVIEW_LENGTH

  // Get preview content - try to break at a natural point
  const getPreviewContent = (text: string) => {
    if (text.length <= DESCRIPTION_PREVIEW_LENGTH) return text
    const truncated = text.slice(0, DESCRIPTION_PREVIEW_LENGTH)
    // Try to break at paragraph, then newline, then space
    const lastParagraph = truncated.lastIndexOf('\n\n')
    const lastNewline = truncated.lastIndexOf('\n')
    const lastSpace = truncated.lastIndexOf(' ')
    const breakPoint =
      lastParagraph > DESCRIPTION_PREVIEW_LENGTH * 0.5
        ? lastParagraph
        : lastNewline > DESCRIPTION_PREVIEW_LENGTH * 0.5
          ? lastNewline
          : lastSpace > DESCRIPTION_PREVIEW_LENGTH * 0.5
            ? lastSpace
            : DESCRIPTION_PREVIEW_LENGTH
    return `${truncated.slice(0, breakPoint)}...`
  }

  const handleCopy = async () => {
    if (body) {
      await navigator.clipboard.writeText(body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStartEdit = useCallback(() => {
    setEditValue(body || '')
    setIsEditing(true)
    setIsOpen(true) // Ensure it's open when editing
  }, [body])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditValue(body || '')
  }, [body])

  const handleSaveEdit = useCallback(async () => {
    try {
      await updatePRBody.mutateAsync({
        prNodeId,
        body: editValue,
        repoFullName,
        prNumber
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update PR description:', error)
    }
  }, [updatePRBody, prNodeId, editValue, repoFullName, prNumber])

  const handleAIGenerate = useCallback(() => {
    // TODO: Implement AI description generation
    console.log('AI generate description - coming soon!')
  }, [])

  // Calculate editor height based on content
  const lines = Math.max(editValue.split('\n').length, Math.ceil(editValue.length / 60))
  const editorHeight = Math.min(Math.max(lines * 22 + 50, 150), 400)

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header - always visible */}
      <Row
        gutter="sm"
        align="center"
        className={cn(
          'p-3 transition-colors bg-surface-content',
          !isEditing && 'hover:bg-interactive-hover cursor-pointer'
        )}
        onClick={() => !isEditing && setIsOpen(!isOpen)}
      >
        <Col span="auto">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </Col>
        <Col span="auto">
          <FileText className="w-4 h-4 text-primary" />
        </Col>
        <Col>
          <span className="text-sm font-medium">Description</span>
        </Col>
        <Col span="auto">
          <Row gutter="xs" align="center">
            {!isEditing && body && (
              <Col span="auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopy()
                  }}
                  title="Copy description"
                >
                  {copied ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  )}
                </Button>
              </Col>
            )}
            {!isEditing && (
              <Col span="auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStartEdit()
                  }}
                  title="Edit description"
                >
                  <Pencil className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </Button>
              </Col>
            )}
            {isEditing && (
              <>
                {/* AI Generate Button with ripple effect */}
                <Col span="auto">
                  <div className="relative">
                    {/* Outer ripple rings - positioned outside the button */}
                    <span className="absolute inset-0 -m-2 flex items-center justify-center pointer-events-none">
                      <span className="absolute w-10 h-10 rounded-full border border-purple-500/30 animate-[ping_2s_ease-in-out_infinite]" />
                      <span className="absolute w-8 h-8 rounded-full border border-purple-500/20 animate-[ping_2s_ease-in-out_0.4s_infinite]" />
                      <span className="absolute w-6 h-6 rounded-full bg-purple-500/10 animate-pulse" />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 relative z-10 group"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAIGenerate()
                      }}
                      title="Generate with AI (coming soon)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>
                </Col>
                <Col span="auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCancelEdit()
                    }}
                    disabled={updatePRBody.isPending}
                  >
                    <X className="w-3 h-3 mr-1" />
                    <span className="text-xs">Cancel</span>
                  </Button>
                </Col>
                <Col span="auto">
                  <Button
                    size="sm"
                    className="h-6 px-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveEdit()
                    }}
                    disabled={updatePRBody.isPending}
                  >
                    {updatePRBody.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3 h-3 mr-1" />
                        <span className="text-xs">Save</span>
                      </>
                    )}
                  </Button>
                </Col>
              </>
            )}
          </Row>
        </Col>
      </Row>

      {/* Content area */}
      {isOpen && (
        <div className={cn('border-t border-border', isEditing ? 'p-0' : 'p-3')}>
          {isEditing ? (
            <div>
              <MarkdownEditor
                value={editValue}
                onChange={setEditValue}
                height={editorHeight}
                placeholder="Add a description..."
                data-testid="description-editor"
                className="border-0 rounded-none"
              />
              {updatePRBody.isError && (
                <p className="text-sm text-destructive p-3 pt-0">
                  Failed to update description. Please try again.
                </p>
              )}
            </div>
          ) : body ? (
            <Row gutter="sm" className="flex-col">
              <Col span="full">
                <div className="text-sm text-foreground-muted">
                  <MarkdownContent
                    content={isFullyExpanded || !shouldTruncate ? body : getPreviewContent(body)}
                  />
                </div>
              </Col>
              {shouldTruncate && (
                <Col span="full">
                  <Button
                    variant="unstyled"
                    size="none"
                    onClick={() => setIsFullyExpanded(!isFullyExpanded)}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    <Row gutter="xs" align="center">
                      <Col span="auto">
                        <ChevronRight
                          className={cn('w-3 h-3', isFullyExpanded ? 'rotate-90' : '-rotate-90')}
                        />
                      </Col>
                      <Col span="auto">{isFullyExpanded ? 'Show less' : 'Read more'}</Col>
                    </Row>
                  </Button>
                </Col>
              )}
            </Row>
          ) : (
            <p className="text-sm text-muted-foreground italic">No description provided</p>
          )}
        </div>
      )}
    </div>
  )
}
