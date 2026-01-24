/**
 * CIChecksSection - Displays CI checks with search, grouping, and status indicators.
 */

import { Button, Col, Input, Row } from '@codelobby/ui-kit'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Layers,
  Loader2,
  PlayCircle,
  Search,
  X,
  XCircle
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { CheckItem } from '../CheckItem'
import type { CheckRun, GroupedChecks } from '../types'

export interface CIChecksSectionProps {
  checks: { check_runs: CheckRun[] } | null | undefined
  checksLoading: boolean
  owner: string
  repo: string
}

export function CIChecksSection({
  checks,
  checksLoading,
  owner,
  repo
}: CIChecksSectionProps): React.JSX.Element {
  const [jobSearch, setJobSearch] = useState('')
  const [groupByState, setGroupByState] = useState(true)
  // Only failed is expanded by default (needs attention), others collapsed
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(['running', 'success', 'other'])
  )

  const checksCount = checks?.check_runs.length || 0
  const passedChecks = checks?.check_runs.filter((c) => c.conclusion === 'success').length || 0
  const failedChecks = checks?.check_runs.filter((c) => c.conclusion === 'failure').length || 0
  const runningChecks =
    checks?.check_runs.filter((c) => c.status === 'in_progress' || c.status === 'queued').length ||
    0

  // Filter checks based on search
  const filteredChecks = useMemo(() => {
    if (!checks?.check_runs) return []
    if (!jobSearch.trim()) return checks.check_runs

    const searchLower = jobSearch.toLowerCase()
    return checks.check_runs.filter(
      (check) =>
        check.name.toLowerCase().includes(searchLower) ||
        check.conclusion?.toLowerCase().includes(searchLower) ||
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
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  return (
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
          {checksCount > 0 && (
            <Col span="auto">
              <Row gutter="sm" align="center" className="text-xs">
                {passedChecks > 0 && (
                  <Col span="auto">
                    <Row gutter="xs" align="center" className="text-success">
                      <Col span="auto">
                        <CheckCircle2 className="w-3 h-3" />
                      </Col>
                      <Col span="auto">{passedChecks}</Col>
                    </Row>
                  </Col>
                )}
                {failedChecks > 0 && (
                  <Col span="auto">
                    <Row gutter="xs" align="center" className="text-destructive">
                      <Col span="auto">
                        <XCircle className="w-3 h-3" />
                      </Col>
                      <Col span="auto">{failedChecks}</Col>
                    </Row>
                  </Col>
                )}
                {runningChecks > 0 && (
                  <Col span="auto">
                    <Row gutter="xs" align="center" className="text-warning">
                      <Col span="auto">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </Col>
                      <Col span="auto">{runningChecks}</Col>
                    </Row>
                  </Col>
                )}
              </Row>
            </Col>
          )}
        </Row>
      </Col>

      {/* Search and group toggle */}
      {checksCount > 0 && (
        <Col span="full">
          <Row gutter="sm">
            <Col>
              <div className="relative w-full">
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
            </Col>
            <Col span="auto">
              <Button
                variant={groupByState ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 px-2"
                onClick={() => setGroupByState(!groupByState)}
                title={groupByState ? 'Show flat list' : 'Group by state'}
              >
                <Layers className="w-3.5 h-3.5" />
              </Button>
            </Col>
          </Row>
        </Col>
      )}

      <Col span="full">
        {checksLoading ? (
          <Row justify="center" className="py-6">
            <Col span="auto">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </Col>
          </Row>
        ) : checks && checks.check_runs.length > 0 ? (
          <Row gutter="sm" className="flex-col">
            {filteredChecks.length > 0 ? (
              groupByState ? (
                // Grouped view
                <>
                  {groupedChecks.running.length > 0 && (
                    <Col span="full">
                      <div className="rounded-lg border border-warning/30 bg-warning/10 dark:bg-warning/15 overflow-hidden">
                        <Button
                          variant="unstyled"
                          size="none"
                          onClick={() => toggleGroup('running')}
                          className="w-full flex items-center gap-2 p-2 text-sm font-medium text-warning hover:bg-warning/20 transition-colors"
                        >
                          {collapsedGroups.has('running') ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Running ({groupedChecks.running.length})</span>
                        </Button>
                        {!collapsedGroups.has('running') && (
                          <div className="border-t border-warning/20 p-1 space-y-0.5">
                            {groupedChecks.running.map((check) => (
                              <CheckItem key={check.id} check={check} owner={owner} repo={repo} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Col>
                  )}

                  {groupedChecks.failed.length > 0 && (
                    <Col span="full">
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 dark:bg-destructive/15 overflow-hidden">
                        <Button
                          variant="unstyled"
                          size="none"
                          onClick={() => toggleGroup('failed')}
                          className="w-full flex items-center gap-2 p-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          {collapsedGroups.has('failed') ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <XCircle className="w-4 h-4" />
                          <span>Failed ({groupedChecks.failed.length})</span>
                        </Button>
                        {!collapsedGroups.has('failed') && (
                          <div className="border-t border-destructive/20 p-1 space-y-0.5">
                            {groupedChecks.failed.map((check) => (
                              <CheckItem key={check.id} check={check} owner={owner} repo={repo} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Col>
                  )}

                  {groupedChecks.success.length > 0 && (
                    <Col span="full">
                      <div className="rounded-lg border border-success/30 bg-success/10 dark:bg-success/15 overflow-hidden">
                        <Button
                          variant="unstyled"
                          size="none"
                          onClick={() => toggleGroup('success')}
                          className="w-full flex items-center gap-2 p-2 text-sm font-medium text-success hover:bg-success/20 transition-colors"
                        >
                          {collapsedGroups.has('success') ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Passed ({groupedChecks.success.length})</span>
                        </Button>
                        {!collapsedGroups.has('success') && (
                          <div className="border-t border-success/20 p-1 space-y-0.5">
                            {groupedChecks.success.map((check) => (
                              <CheckItem key={check.id} check={check} owner={owner} repo={repo} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Col>
                  )}

                  {groupedChecks.other.length > 0 && (
                    <Col span="full">
                      <div className="rounded-lg border border-border bg-muted/40 dark:bg-muted/50 overflow-hidden">
                        <Button
                          variant="unstyled"
                          size="none"
                          onClick={() => toggleGroup('other')}
                          className="w-full flex items-center gap-2 p-2 text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                        >
                          {collapsedGroups.has('other') ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <Circle className="w-4 h-4" />
                          <span>Other ({groupedChecks.other.length})</span>
                        </Button>
                        {!collapsedGroups.has('other') && (
                          <div className="border-t border-border p-1 space-y-0.5">
                            {groupedChecks.other.map((check) => (
                              <CheckItem key={check.id} check={check} owner={owner} repo={repo} />
                            ))}
                          </div>
                        )}
                      </div>
                    </Col>
                  )}
                </>
              ) : (
                // Flat list view
                <Col span="full">
                  <div className="space-y-1">
                    {filteredChecks.map((check) => (
                      <CheckItem key={check.id} check={check} owner={owner} repo={repo} />
                    ))}
                  </div>
                </Col>
              )
            ) : (
              <Col span="full">
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Search className="w-5 h-5 mx-auto mb-2 opacity-50" />
                  No jobs matching "{jobSearch}"
                </div>
              </Col>
            )}
            {jobSearch && filteredChecks.length < checksCount && (
              <Col span="full">
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing {filteredChecks.length} of {checksCount} jobs
                </p>
              </Col>
            )}
          </Row>
        ) : (
          <Row
            gutter="md"
            justify="center"
            align="center"
            className="flex-col py-6 text-sm text-muted-foreground"
          >
            <Col span="auto">
              <AlertCircle className="w-5 h-5 opacity-50" />
            </Col>
            <Col span="auto">No CI checks configured</Col>
          </Row>
        )}
      </Col>
    </Row>
  )
}
