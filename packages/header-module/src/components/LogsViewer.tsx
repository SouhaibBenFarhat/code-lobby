import { api } from '@codelobby/api'
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem
} from '@codelobby/ui-kit'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Filter,
  RefreshCw,
  ScrollText,
  Trash2
} from 'lucide-react'
import { useMemo, useState } from 'react'

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  category: string
  message: string
  details?: unknown
}

const levelConfig = {
  error: { color: 'text-red-500', bg: 'bg-red-500/10', dotVariant: 'error' as const },
  warn: { color: 'text-yellow-500', bg: 'bg-yellow-500/10', dotVariant: 'warning' as const },
  info: { color: 'text-blue-500', bg: 'bg-blue-500/10', dotVariant: 'info' as const },
  debug: { color: 'text-gray-500', bg: 'bg-gray-500/10', dotVariant: 'debug' as const }
}

export function LogsViewer(): React.JSX.Element {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [copied, setCopied] = useState(false)
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
  const [copyPopoverOpen, setCopyPopoverOpen] = useState(false)
  const [lastNCount, setLastNCount] = useState<string>('50')

  const {
    data: logs = [],
    refetch,
    isLoading
  } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      return (await api.logs.getLogs()) as LogEntry[]
    },
    enabled: open,
    refetchInterval: open ? 2000 : false // Auto-refresh every 2s when open
  })

  const { data: summary } = useQuery({
    queryKey: ['logs-summary'],
    queryFn: async () => {
      return await api.logs.getLogsSummary()
    },
    enabled: open
  })

  // Get unique categories from logs
  const categories = useMemo(() => {
    const cats = new Set<string>()
    logs.forEach((log) => {
      cats.add(log.category)
    })
    return Array.from(cats).sort()
  }, [logs])

  // Filter and sort logs (newest first)
  const filteredLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (levelFilter !== 'all' && log.level !== levelFilter) return false
        if (categoryFilter !== 'all' && log.category !== categoryFilter) return false
        if (search) {
          const searchLower = search.toLowerCase()
          return (
            log.message.toLowerCase().includes(searchLower) ||
            log.category.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.details || '')
              .toLowerCase()
              .includes(searchLower)
          )
        }
        return true
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [logs, levelFilter, categoryFilter, search])

  // Clear logs
  const handleClear = async () => {
    await api.logs.clearLogs()
    queryClient.invalidateQueries({ queryKey: ['logs'] })
    queryClient.invalidateQueries({ queryKey: ['logs-summary'] })
  }

  // Export logs
  const handleExport = async () => {
    const logsJson = await api.logs.exportLogs()
    const blob = new Blob([logsJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `codelobby-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Format logs as text for copying
  const formatLogsForCopy = (logsToFormat: LogEntry[]): string => {
    return logsToFormat
      .map(
        (log) =>
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? `\n${JSON.stringify(log.details, null, 2)}` : ''}`
      )
      .join('\n\n')
  }

  // Copy all filtered logs to clipboard
  const handleCopyAll = async () => {
    const text = formatLogsForCopy(filteredLogs)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setCopyPopoverOpen(false)
    setTimeout(() => setCopied(false), 2000)
  }

  // Copy last N logs to clipboard
  const handleCopyLastN = async () => {
    const n = Number.parseInt(lastNCount, 10) || 50
    const lastNLogs = filteredLogs.slice(0, n)
    const text = formatLogsForCopy(lastNLogs)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setCopyPopoverOpen(false)
    setTimeout(() => setCopied(false), 2000)
  }

  // Copy single log entry to clipboard
  const handleCopyLog = async (log: LogEntry, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent expanding/collapsing when clicking copy
    const logText = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.details ? `\n${JSON.stringify(log.details, null, 2)}` : ''}`
    await navigator.clipboard.writeText(logText)
    setCopiedLogId(log.id)
    setTimeout(() => setCopiedLogId(null), 2000)
  }

  // Toggle log details expansion
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedLogs(newExpanded)
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <ScrollText className="h-4 w-4" />
          {summary && summary.byLevel?.error > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Application Logs
            {summary && (
              <div className="flex gap-2 ml-4 text-sm font-normal">
                <Badge variant="secondary" className="text-xs">
                  {summary.total} total
                </Badge>
                {summary.byLevel?.error > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {summary.byLevel.error} errors
                  </Badge>
                )}
                {summary.byLevel?.warn > 0 && (
                  <Badge className="text-xs bg-yellow-500">{summary.byLevel.warn} warnings</Badge>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-2 items-center py-2 border-b border-border">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8" onClick={() => refetch()}>
              <RefreshCw className={cn('h-3 w-3 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>

            {/* Copy dropdown */}
            <Popover open={copyPopoverOpen} onOpenChange={setCopyPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="start">
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={handleCopyAll}
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copy all ({filteredLogs.length} logs)
                  </Button>
                  <div className="border-t border-border pt-2">
                    <p className="text-[10px] text-muted-foreground mb-1.5 px-2">
                      Copy last N logs
                    </p>
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min="1"
                        max={filteredLogs.length}
                        value={lastNCount}
                        onChange={(e) => setLastNCount(e.target.value)}
                        className="h-7 text-xs flex-1"
                        placeholder="50"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={handleCopyLastN}
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="h-8" onClick={handleExport}>
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-red-500 hover:text-red-600"
              onClick={handleClear}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        </div>

        {/* Logs Timeline */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {logs.length === 0 ? 'No logs yet' : 'No logs match your filters'}
              </div>
            ) : (
              <Timeline>
                {filteredLogs.map((log, index) => {
                  const config = levelConfig[log.level]
                  const isExpanded = expandedLogs.has(log.id)
                  const hasDetails = log.details !== undefined
                  const isCopied = copiedLogId === log.id
                  const isLast = index === filteredLogs.length - 1

                  return (
                    <TimelineItem key={log.id}>
                      <TimelineConnector isLast={isLast} />
                      <TimelineDot variant={config.dotVariant} />
                      <TimelineContent>
                        {/* biome-ignore lint/a11y/noStaticElementInteractions: conditionally interactive based on hasDetails */}
                        <div
                          className={cn(
                            'rounded px-2 py-1 transition-colors text-xs',
                            config.bg,
                            hasDetails && 'cursor-pointer hover:opacity-80'
                          )}
                          onClick={hasDetails ? () => toggleExpand(log.id) : undefined}
                          onKeyDown={
                            hasDetails
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    toggleExpand(log.id)
                                  }
                                }
                              : undefined
                          }
                          role={hasDetails ? 'button' : undefined}
                          tabIndex={hasDetails ? 0 : undefined}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                              {formatTime(log.timestamp)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn('text-[9px] h-4 px-1 py-0', config.color)}
                            >
                              {log.category}
                            </Badge>
                            <span className="font-mono truncate flex-1">{log.message}</span>
                            {/* Copy button */}
                            <Button
                              variant="unstyled"
                              size="none"
                              onClick={(e) => handleCopyLog(log, e)}
                              className="p-0.5 rounded hover:bg-black/20 transition-colors shrink-0 opacity-50 hover:opacity-100"
                              title="Copy this log"
                              aria-label={isCopied ? 'Copied log' : 'Copy log'}
                            >
                              {isCopied ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            {hasDetails && (
                              <span className="text-muted-foreground shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </span>
                            )}
                          </div>
                          {isExpanded && hasDetails && (
                            <pre className="mt-1.5 p-2 bg-black/30 rounded text-[10px] overflow-x-auto font-mono">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      </TimelineContent>
                    </TimelineItem>
                  )
                })}
              </Timeline>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="pt-2 border-t border-border text-xs text-muted-foreground text-center">
          Showing {filteredLogs.length} of {logs.length} logs
          {search || levelFilter !== 'all' || categoryFilter !== 'all' ? (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 ml-2 text-xs"
              onClick={() => {
                setSearch('')
                setLevelFilter('all')
                setCategoryFilter('all')
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
