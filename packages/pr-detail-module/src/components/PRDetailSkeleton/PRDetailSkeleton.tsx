/**
 * PRDetailSkeleton - Loading skeleton for PR detail panel.
 *
 * Matches the exact layout of PRDetail to avoid page shifting during load.
 */

import { Button, Col, Row, ScrollArea, Separator, Skeleton } from '@codelobby/ui-kit'
import {
  ChevronDown,
  FileDiff,
  FileText,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  PlayCircle,
  X
} from 'lucide-react'
import * as React from 'react'

export interface PRDetailSkeletonProps {
  prNumber: number
  repoFullName: string
  onClose: () => void
}

export function PRDetailSkeleton({
  prNumber,
  repoFullName: _repoFullName,
  onClose
}: PRDetailSkeletonProps): React.JSX.Element {
  // repoFullName kept for API consistency with PRDetail but not displayed in skeleton
  void _repoFullName
  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden bg-background"
      style={{ maxWidth: '100%' }}
    >
      {/* Header skeleton - matches PRHeader exactly */}
      <div className="p-4 border-b border-border flex-shrink-0 overflow-hidden bg-card/80 dark:bg-card/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)] relative z-10">
        <div className="flex items-start justify-between gap-3">
          {/* Left side: PR info */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {/* PR number row */}
            <div className="flex items-center gap-2 mb-1">
              <GitPullRequest className="w-4 h-4 flex-shrink-0 text-primary" />
              <span className="text-xs text-muted-foreground font-mono">#{prNumber}</span>
            </div>
            {/* Title skeleton */}
            <Skeleton className="h-5 w-3/4 mb-2" />
            {/* Branch info */}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <GitBranch className="w-3 h-3 flex-shrink-0" />
              <Skeleton className="h-3 w-20" />
              <span className="flex-shrink-0">→</span>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>

          {/* Right side: action buttons skeleton */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Separator orientation="vertical" className="h-5 mx-1" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-7 w-7 rounded-md" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats row skeleton */}
        <Row gutter="md" align="center" className="pt-3 text-xs">
          <Col span="auto">
            <Row gutter="xs" align="center">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </Row>
          </Col>
          <Col span="auto">
            <Row gutter="xs" align="center">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </Row>
          </Col>
          <Col span="auto">
            <Row gutter="xs" align="center">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </Row>
          </Col>
          <Col span="auto">
            <Row gutter="xs" align="center">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-4" />
            </Row>
          </Col>
        </Row>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 w-full max-w-full overflow-x-hidden">
          <Row gutter="xl" className="flex-col">
            {/* PR Description Section - matches PRDescription */}
            <Col span="full">
              <div className="rounded-lg border border-border overflow-hidden">
                <Row gutter="sm" align="center" className="p-3 bg-muted/40 dark:bg-muted/50">
                  <Col span="auto">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Col>
                  <Col span="auto">
                    <FileText className="w-4 h-4 text-primary" />
                  </Col>
                  <Col>
                    <span className="text-sm font-medium">Description</span>
                  </Col>
                  <Col span="auto">
                    <Row gutter="xs" align="center">
                      <Skeleton className="h-6 w-6 rounded" />
                      <Skeleton className="h-6 w-6 rounded" />
                    </Row>
                  </Col>
                </Row>
                <div className="border-t border-border p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </Col>

            <Col span="full">
              <Separator />
            </Col>

            {/* CI Checks Section - matches CIChecksSection */}
            <Col span="full">
              <Row gutter="md" className="flex-col">
                <Col span="full">
                  <Row gutter="sm" align="center" justify="between">
                    <Col span="auto">
                      <Row gutter="sm" align="center">
                        <Col span="auto">
                          <PlayCircle className="w-4 h-4 text-primary" />
                        </Col>
                        <Col span="auto">
                          <h3 className="text-sm font-semibold">CI Checks</h3>
                        </Col>
                      </Row>
                    </Col>
                    <Col span="auto">
                      <Row gutter="sm" align="center" className="text-xs">
                        <Skeleton className="h-4 w-8" />
                        <Skeleton className="h-4 w-8" />
                      </Row>
                    </Col>
                  </Row>
                </Col>

                {/* Search bar skeleton */}
                <Col span="full">
                  <Row gutter="sm">
                    <Col>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </Col>
                    <Col span="auto">
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </Col>
                  </Row>
                </Col>

                {/* CI check groups skeleton */}
                <Col span="full">
                  <div className="space-y-2">
                    <div className="rounded-lg border border-success/30 bg-success/10 dark:bg-success/15 overflow-hidden">
                      <div className="flex items-center gap-2 p-2">
                        <ChevronDown className="w-4 h-4 text-success" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 dark:bg-muted/50 overflow-hidden">
                      <div className="flex items-center gap-2 p-2">
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>

            <Col span="full">
              <Separator />
            </Col>

            {/* Changed Files Section - matches ChangedFilesSection */}
            <Col span="full">
              <div className="space-y-3">
                <Row gutter="sm" align="center" justify="between">
                  <Col span="auto">
                    <Row gutter="sm" align="center">
                      <Col span="auto">
                        <FileDiff className="w-4 h-4 text-primary" />
                      </Col>
                      <Col span="auto">
                        <h3 className="text-sm font-semibold">Changed Files</h3>
                      </Col>
                      <Col span="auto">
                        <Skeleton className="h-5 w-8 rounded-full" />
                      </Col>
                    </Row>
                  </Col>
                </Row>

                {/* Search bar skeleton */}
                <Row gutter="sm">
                  <Col>
                    <Skeleton className="h-8 w-full rounded-md" />
                  </Col>
                </Row>

                {/* File tree skeleton */}
                <div className="space-y-1 pl-1">
                  <div className="flex items-center gap-2 py-1">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2 py-1 pl-6">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-2 py-1 pl-6">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-2 py-1 pl-6">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-36" />
                  </div>
                </div>
              </div>
            </Col>

            <Col span="full">
              <Separator />
            </Col>

            {/* Discussion Section - matches PRDetail discussion */}
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

                {/* Tab buttons skeleton */}
                <Col span="full">
                  <div className="flex gap-1 p-1 bg-muted/60 dark:bg-muted/70 rounded-lg">
                    <Skeleton className="flex-1 h-7 rounded-md" />
                    <Skeleton className="flex-1 h-7 rounded-md" />
                    <Skeleton className="flex-1 h-7 rounded-md" />
                    <Skeleton className="flex-1 h-7 rounded-md" />
                  </div>
                </Col>

                {/* Comments timeline skeleton */}
                <Col span="full">
                  <div className="relative ml-2 pt-4">
                    {/* Timeline line */}
                    <div className="absolute left-[15px] top-6 bottom-6 w-[3px] bg-muted rounded-full" />
                    {/* Start marker */}
                    <div className="absolute left-[11px] top-0 w-[11px] h-[11px] rounded-full bg-muted border-2 border-muted-foreground/30" />

                    <div className="space-y-0 pt-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="relative pl-12 pb-5">
                          {/* Timeline dot */}
                          <Skeleton className="absolute left-[4px] top-3 w-[26px] h-[26px] rounded-full" />
                          {/* Connector line */}
                          <div className="absolute left-[30px] top-[22px] w-[18px] h-[2px] bg-muted" />

                          {/* Comment card skeleton */}
                          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <Skeleton className="h-6 w-6 rounded-full" />
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-3 w-14 ml-auto" />
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* End marker */}
                    <div className="absolute left-[11px] bottom-0 w-[11px] h-[11px] rounded-full bg-muted border-2 border-muted-foreground/30" />
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>
      </ScrollArea>
    </div>
  )
}
