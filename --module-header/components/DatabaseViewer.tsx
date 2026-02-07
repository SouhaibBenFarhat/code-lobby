/**
 * Database Viewer - Debug panel to view SQLite data
 */

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Flex,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Database, Table } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface TableData {
  name: string
  count: number
  rows: Record<string, unknown>[]
}

export function DatabaseViewer(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [tables, setTables] = useState<TableData[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [_loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Dynamically discover all tables
      const tablesResult = await window.electron.db.tables.list()
      if (!tablesResult.success || !tablesResult.data) {
        throw new Error(tablesResult.error || 'Failed to list tables')
      }

      const tableNames = tablesResult.data

      // Fetch count and data for each table
      const tableDataPromises = tableNames.map(async (name) => {
        const [countResult, dataResult] = await Promise.all([
          window.electron.db.tables.count(name),
          window.electron.db.tables.query(name, 1000)
        ])
        return {
          name,
          count: countResult.success ? (countResult.data ?? 0) : 0,
          rows: dataResult.success ? (dataResult.data ?? []) : []
        }
      })

      const allTables = await Promise.all(tableDataPromises)
      setTables(allTables)

      if (!selectedTable && allTables.length > 0) {
        setSelectedTable(allTables[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [selectedTable])

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open, fetchData])

  const selectedTableData = tables.find((t) => t.name === selectedTable)

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 50)
    if (typeof value === 'string' && value.length > 50) return `${value.slice(0, 50)}...`
    return String(value)
  }

  const formatTimestamp = (value: unknown): string => {
    if (typeof value === 'number') {
      return new Date(value).toLocaleString()
    }
    return formatValue(value)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Database className="w-4 h-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Database Viewer</TooltipContent>
      </Tooltip>

      <DialogContent className="max-w-6xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>
            <Flex align="center" gap="sm">
              <Database className="w-5 h-5" />
              <span>SQLite Database Viewer</span>
            </Flex>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Flex className="p-3 rounded-md bg-destructive-subtle text-destructive text-sm">
            {error}
          </Flex>
        )}

        <Flex gap="md" className="h-[65vh] overflow-hidden">
          {/* Tables sidebar */}
          <Flex direction="col" gap="xs" className="w-44 shrink-0 pr-4 border-r border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-2">
              Tables
            </span>
            {tables.map((table) => (
              <Button
                key={table.name}
                variant={selectedTable === table.name ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setSelectedTable(table.name)}
              >
                <Flex align="center" gap="xs">
                  <Table className="w-3 h-3" />
                  <span className="text-xs">{table.name}</span>
                </Flex>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {table.count}
                </Badge>
              </Button>
            ))}
          </Flex>

          {/* Table data */}
          <div className="flex-1 min-w-0 overflow-auto">
            {selectedTableData ? (
              selectedTableData.rows.length === 0 ? (
                <Flex align="center" justify="center" className="h-full text-muted-foreground">
                  No data in this table
                </Flex>
              ) : (
                <table className="text-xs border-collapse">
                  <thead className="sticky top-0 bg-background z-10">
                    <tr className="border-b">
                      {Object.keys(selectedTableData.rows[0] || {}).map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTableData.rows.map((row) => (
                      <tr
                        key={JSON.stringify(row)}
                        className="border-b border-border-muted hover:bg-interactive-hover transition-colors"
                      >
                        {Object.entries(row).map(([key, value]) => (
                          <td
                            key={key}
                            className="px-3 py-2 font-mono whitespace-nowrap"
                            title={formatValue(value)}
                          >
                            <span className="block max-w-[180px] truncate">
                              {key.includes('_at') || key.includes('At')
                                ? formatTimestamp(value)
                                : formatValue(value)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              <Flex align="center" justify="center" className="h-full text-muted-foreground">
                Select a table to view data
              </Flex>
            )}
          </div>
        </Flex>

        <span className="text-xs text-muted-foreground pt-3 border-t border-border">
          ~/Library/Application Support/codelobby/codelobby.db
        </span>
      </DialogContent>
    </Dialog>
  )
}
