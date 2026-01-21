/// <reference path="../../../../src/preload/electron-api.d.ts" />

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
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@codelobby/ui-kit'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  AlertTriangle,
  Bug,
  Check,
  Copy,
  Download,
  Filter,
  Info,
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
  error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  warn: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  debug: { icon: Bug, color: 'text-gray-500', bg: 'bg-gray-500/10' }
}

export function LogsViewer(): React.JSX.Element {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [copied, setCopied] = useState(false)
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  const {
    data: logs = [],
    refetch,
    isLoading
  } = useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      return (await window.electron.getLogs()) as LogEntry[]
    },
    enabled: open,
    refetchInterval: open ? 2000 : false // Auto-refresh every 2s when open
  })

  const { data: summary } = useQuery({
    queryKey: ['logs-summary'],
    queryFn: async () => {
      return await window.electron.getLogsSummary()
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

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
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
  }, [logs, levelFilter, categoryFilter, search])

  // Clear logs
  const handleClear = async () => {
    await window.electron.clearLogs()
    queryClient.invalidateQueries({ queryKey: ['logs'] })
    queryClient.invalidateQueries({ queryKey: ['logs-summary'] })
  }

  // Export logs
  const handleExport = async () => {
    const logsJson = await window.electron.exportLogs()
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

  // Copy logs to clipboard
  const handleCopy = async () => {
    const logsJson = await window.electron.exportLogs()
    await navigator.clipboard.writeText(logsJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
            <Button variant="outline" size="sm" className="h-8" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
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

        {/* Logs list */}
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-1">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {logs.length === 0 ? 'No logs yet' : 'No logs match your filters'}
              </div>
            ) : (
              filteredLogs.map((log) => {
                const config = levelConfig[log.level]
                const LevelIcon = config.icon
                const isExpanded = expandedLogs.has(log.id)
                const hasDetails = log.details !== undefined

                const logContent = (
                  <>
                    <div className="flex items-start gap-2">
                      <LevelIcon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
                      <span className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatTime(log.timestamp)}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-5 px-1.5 flex-shrink-0">
                        {log.category}
                      </Badge>
                      <span className="flex-1 break-words">{log.message}</span>
                      {hasDetails && (
                        <span className="text-muted-foreground text-xs">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                    </div>
                    {isExpanded && hasDetails && (
                      <pre className="mt-2 ml-6 p-2 bg-black/20 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </>
                )

                if (hasDetails) {
                  return (
                    <button
                      type="button"
                      key={log.id}
                      className={cn(
                        'rounded-md p-2 text-sm font-mono w-full text-left',
                        config.bg,
                        'cursor-pointer hover:opacity-80'
                      )}
                      onClick={() => toggleExpand(log.id)}
                    >
                      {logContent}
                    </button>
                  )
                }

                return (
                  <div key={log.id} className={cn('rounded-md p-2 text-sm font-mono', config.bg)}>
                    {logContent}
                  </div>
                )
              })
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
