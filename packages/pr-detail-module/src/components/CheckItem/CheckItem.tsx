/**
 * CheckItem - Displays a single CI check with status.
 */

import { Badge, Button, Col, Row, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { CheckCircle2, ChevronRight, Circle, Loader2, XCircle } from 'lucide-react'

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

export function CheckItem({ check }: CheckItemProps): React.JSX.Element {
  const getStatusIcon = () => {
    if (check.status === 'in_progress' || check.status === 'queued') {
      return <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />
    }
    switch (check.conclusion) {
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-success" />
      case 'failure':
      case 'timed_out':
        return <XCircle className="w-3.5 h-3.5 text-destructive" />
      case 'cancelled':
      case 'skipped':
        return <Circle className="w-3.5 h-3.5 text-muted-foreground" />
      default:
        return <Circle className="w-3.5 h-3.5 text-warning" />
    }
  }

  const getStatusBadge = () => {
    if (check.status === 'in_progress') {
      return (
        <Badge variant="secondary" className="bg-warning/15 text-warning text-[10px]">
          Running
        </Badge>
      )
    }
    if (check.status === 'queued') {
      return (
        <Badge variant="secondary" className="text-[10px]">
          Queued
        </Badge>
      )
    }
    switch (check.conclusion) {
      case 'success':
        return (
          <Badge variant="secondary" className="bg-success/15 text-success text-[10px]">
            Passed
          </Badge>
        )
      case 'failure':
        return (
          <Badge variant="secondary" className="bg-destructive/15 text-destructive text-[10px]">
            Failed
          </Badge>
        )
      case 'timed_out':
        return (
          <Badge variant="secondary" className="bg-destructive/15 text-destructive text-[10px]">
            Timed out
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="secondary" className="text-[10px]">
            Cancelled
          </Badge>
        )
      case 'skipped':
        return (
          <Badge variant="secondary" className="text-[10px]">
            Skipped
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[10px]">
            Pending
          </Badge>
        )
    }
  }

  return (
    <Row
      align="center"
      gutter="sm"
      className="group py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <Col span="auto">{getStatusIcon()}</Col>
      <Col span="auto" className="flex-1 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="unstyled"
              size="none"
              onClick={() => window.open(check.html_url, '_blank')}
              className="text-sm truncate max-w-full hover:text-primary transition-colors text-left"
            >
              {check.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{check.name}</TooltipContent>
        </Tooltip>
      </Col>
      <Col span="auto" className="flex items-center gap-1.5">
        {getStatusBadge()}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => window.open(check.html_url, '_blank')}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </Col>
    </Row>
  )
}
