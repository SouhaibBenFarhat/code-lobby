/**
 * PRDescription - Collapsible PR description section with copy and edit actions.
 */

import { Button, Col, cn, MarkdownContent, Row } from '@codelobby/ui-kit'
import { Check, ChevronDown, ChevronRight, Copy, Edit, FileText } from 'lucide-react'
import { useState } from 'react'

export interface PRDescriptionProps {
  body: string | null
  prUrl: string
}

const DESCRIPTION_PREVIEW_LENGTH = 300

export function PRDescription({ body, prUrl }: PRDescriptionProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(true)
  const [isFullyExpanded, setIsFullyExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const handleEdit = () => {
    // Open the PR edit page in GitHub
    window.open(prUrl, '_blank')
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Row
        gutter="sm"
        align="center"
        className="p-3 hover:bg-muted/60 transition-colors bg-muted/40 dark:bg-muted/50 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
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
            {body && (
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
            <Col span="auto">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit()
                }}
                title="Edit on GitHub"
              >
                <Edit className="w-3 h-3 text-muted-foreground hover:text-foreground" />
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>

      {isOpen && (
        <div className="border-t border-border p-3">
          {body ? (
            <Row gutter="sm" className="flex-col">
              <Col span="full">
                <div className="text-sm text-foreground/80 dark:text-foreground/70">
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
