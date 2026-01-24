/**
 * CheckItem - Displays a single CI check with status, analysis button, and AI analysis panel.
 */

import type { CIFailureAnalysis } from '@codelobby/shared-store'
import { Actions, Store, useSignal } from '@codelobby/shared-store'
import { Badge, Button, Col, Row, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Sparkles,
  X,
  XCircle
} from 'lucide-react'
import { useState } from 'react'

export interface CheckItemProps {
  check: {
    id: string
    name: string
    status: string
    conclusion: string | null
    html_url: string
  }
  owner: string
  repo: string
}

export function CheckItem({ check, owner, repo }: CheckItemProps): React.JSX.Element {
  const ciFailureAnalyses = useSignal(Store.ciFailureAnalyses)
  const analysis: CIFailureAnalysis | undefined = ciFailureAnalyses[check.id]
  const [showAnalysis, setShowAnalysis] = useState(false)

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

  const handleAnalyze = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!analysis || analysis.error) {
      Actions.analyzeCIFailure(owner, repo, check.id, check.name)
    }
    setShowAnalysis(true)
  }

  const isFailed = check.conclusion === 'failure'
  const isLoading = analysis?.isLoading
  const isStreaming = analysis?.isStreaming

  return (
    <div>
      <Row
        gutter="sm"
        align="center"
        className="p-2 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors overflow-hidden w-full"
      >
        <Col span="auto">
          <Button
            variant="unstyled"
            size="none"
            className="flex items-center gap-2 text-left"
            onClick={() => window.open(check.html_url, '_blank')}
          >
            <span className="flex-shrink-0">{getIcon()}</span>
            <span className="text-sm truncate min-w-0">{check.name}</span>
          </Button>
        </Col>
        <Col>
          <Row gutter="sm" align="center" justify="end">
            <Col span="auto">
              <Badge variant="secondary" className="text-[10px] h-5">
                {check.status === 'in_progress' ? 'Running' : check.conclusion || check.status}
              </Badge>
            </Col>
            {isFailed && (
              <Col span="auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleAnalyze}
                      disabled={isLoading || isStreaming}
                    >
                      {isLoading || isStreaming ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="font-medium">Analyze with AI</p>
                    <p className="text-xs text-muted-foreground">
                      Get AI summary of why this check failed
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Col>
            )}
          </Row>
        </Col>
      </Row>

      {/* Streaming AI Analysis Panel - shows thinking in real-time */}
      {isFailed && showAnalysis && analysis && isStreaming && (
        <div className="p-3 rounded-lg bg-background/60 border border-border/50">
          <Row gutter="md" className="flex-col">
            <Col span="full">
              <Row gutter="sm" align="center">
                <Col span="auto">
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                </Col>
                <Col>
                  <span className="text-xs font-medium text-amber-500">Claude is thinking...</span>
                </Col>
              </Row>
            </Col>

            {/* Real-time thinking display */}
            {analysis.streamingThinking && (
              <Col span="full">
                <Row gutter="xs" className="flex-col">
                  <Col span="full">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Reasoning
                    </span>
                  </Col>
                  <Col span="full">
                    <div className="pl-3 border-l-2 border-amber-500/40 max-h-48 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground font-mono leading-relaxed">
                        {analysis.streamingThinking}
                        <span className="animate-pulse text-amber-500">▊</span>
                      </pre>
                    </div>
                  </Col>
                </Row>
              </Col>
            )}

            {/* Real-time content display */}
            {analysis.streamingContent && (
              <Col span="full" className="pt-2 border-t border-border/30">
                <Row gutter="xs" className="flex-col">
                  <Col span="full">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-foreground/80">
                      Analysis
                    </span>
                  </Col>
                  <Col span="full">
                    <div className="text-xs text-foreground/70 leading-relaxed">
                      {analysis.streamingContent}
                      <span className="animate-pulse text-amber-500">▊</span>
                    </div>
                  </Col>
                </Row>
              </Col>
            )}
          </Row>
        </div>
      )}

      {/* Final AI Analysis Panel */}
      {isFailed && showAnalysis && analysis && !analysis.isLoading && !analysis.isStreaming && (
        <div className="p-3 rounded-lg bg-background/60 border border-border/50">
          <Row gutter="md" className="flex-col">
            <Col span="full">
              <Row gutter="sm" align="center" justify="between">
                <Col span="auto">
                  <Row gutter="sm" align="center">
                    <Col span="auto">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </Col>
                    <Col>
                      <span className="text-xs font-medium text-foreground">AI Analysis</span>
                    </Col>
                  </Row>
                </Col>
                <Col span="auto">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => setShowAnalysis(false)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Col>
              </Row>
            </Col>

            {analysis.error ? (
              <Col span="full">
                <Row gutter="sm" align="center" className="text-xs text-destructive">
                  <Col span="auto">
                    <AlertCircle className="w-3.5 h-3.5" />
                  </Col>
                  <Col>
                    <span>{analysis.error}</span>
                  </Col>
                </Row>
              </Col>
            ) : (
              <Col span="full">
                <Row gutter="sm" className="flex-col text-xs">
                  {/* Thinking Section - collapsible */}
                  {analysis.thinking && (
                    <Col span="full">
                      <details className="group">
                        <summary className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground/80 transition-colors">
                          <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90 flex-shrink-0" />
                          <span className="text-[10px] font-medium uppercase tracking-wide">
                            Claude's Reasoning
                          </span>
                        </summary>
                        <div className="mt-2 ml-4 pl-3 border-l-2 border-amber-500/40">
                          <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground font-mono leading-relaxed max-h-48 overflow-y-auto">
                            {analysis.thinking}
                          </pre>
                        </div>
                      </details>
                    </Col>
                  )}

                  {/* Summary */}
                  {analysis.summary && (
                    <Col span="full" className="leading-relaxed">
                      <span className="font-semibold text-foreground">Summary: </span>
                      <span className="text-foreground/80">{analysis.summary}</span>
                    </Col>
                  )}

                  {/* Root Cause */}
                  {analysis.failureReason && (
                    <Col span="full" className="leading-relaxed">
                      <span className="font-semibold text-foreground">Root Cause: </span>
                      <span className="text-foreground/80">{analysis.failureReason}</span>
                    </Col>
                  )}

                  {/* Suggested Fix */}
                  {analysis.suggestedFix && (
                    <Col span="full" className="pt-2 border-t border-border/30 leading-relaxed">
                      <span className="font-semibold text-emerald-500">Fix: </span>
                      <span className="text-foreground/80">{analysis.suggestedFix}</span>
                    </Col>
                  )}
                </Row>
              </Col>
            )}
          </Row>
        </div>
      )}
    </div>
  )
}
