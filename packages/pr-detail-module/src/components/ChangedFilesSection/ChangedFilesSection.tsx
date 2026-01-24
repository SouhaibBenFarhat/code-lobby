/**
 * ChangedFilesSection - Displays changed files in a tree structure with diff viewer.
 */

import type { PRFile } from '@codelobby/queries'
import { usePRFiles } from '@codelobby/queries'
import { Badge, Button, Input } from '@codelobby/ui-kit'
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileDiff,
  FileEdit,
  FileMinus,
  FilePlus,
  Loader2,
  Search,
  X
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { FileTreeNode } from '../FileTreeNode'
import type { FileTreeNode as FileTreeNodeType } from '../types'

export interface ChangedFilesSectionProps {
  owner: string
  repo: string
  prNumber: number
  totalChanged: number
}

/** Build tree structure from files */
function buildFileTreeFromFiles(files: PRFile[]): FileTreeNodeType {
  const root: FileTreeNodeType = { name: '', path: '', isFile: false, children: new Map() }

  for (const file of files) {
    const parts = file.path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLastPart = i === parts.length - 1
      const currentPath = parts.slice(0, i + 1).join('/')

      let child = current.children.get(part)
      if (!child) {
        child = {
          name: part,
          path: currentPath,
          isFile: isLastPart,
          file: isLastPart ? file : undefined,
          children: new Map()
        }
        current.children.set(part, child)
      }
      current = child
    }
  }

  return root
}

/** Get sorted children: directories first, then files, alphabetically */
function getSortedChildren(node: FileTreeNodeType): FileTreeNodeType[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

export function ChangedFilesSection({
  owner,
  repo,
  prNumber,
  totalChanged
}: ChangedFilesSectionProps): React.JSX.Element {
  const { data: files = [], isLoading, error } = usePRFiles(owner, repo, prNumber)
  const [searchQuery, setSearchQuery] = useState('')
  const [isExpanded, setIsExpanded] = useState(true)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const query = searchQuery.toLowerCase()
    return files.filter((f) => f.path.toLowerCase().includes(query))
  }, [files, searchQuery])

  // Build file tree from filtered files
  const fileTree = useMemo(() => buildFileTreeFromFiles(filteredFiles), [filteredFiles])
  const rootChildren = useMemo(() => getSortedChildren(fileTree), [fileTree])

  // Toggle directory expansion
  const toggleDir = useCallback((path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Toggle file diff expansion
  const toggleFile = useCallback((path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // File statistics by type
  const fileStats = useMemo(() => {
    const stats = { added: 0, deleted: 0, modified: 0, renamed: 0 }
    for (const file of files) {
      switch (file.changeType) {
        case 'ADDED':
          stats.added++
          break
        case 'DELETED':
          stats.deleted++
          break
        case 'RENAMED':
        case 'COPIED':
          stats.renamed++
          break
        default:
          stats.modified++
      }
    }
    return stats
  }, [files])

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <Button
        variant="unstyled"
        size="none"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-primary" />
          ) : (
            <ChevronRight className="w-4 h-4 text-primary" />
          )}
          <FileDiff className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Changed Files</h3>
          <Badge variant="secondary" className="text-[10px] h-5">
            {totalChanged}
          </Badge>
        </div>
      </Button>

      {isExpanded && (
        <div className="flex flex-col gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          {/* File type stats */}
          {files.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {fileStats.added > 0 && (
                <Badge variant="secondary" className="bg-success/15 text-success gap-1">
                  <FilePlus className="w-3 h-3" />
                  {fileStats.added} added
                </Badge>
              )}
              {fileStats.modified > 0 && (
                <Badge variant="secondary" className="bg-primary/15 text-primary gap-1">
                  <FileDiff className="w-3 h-3" />
                  {fileStats.modified} modified
                </Badge>
              )}
              {fileStats.deleted > 0 && (
                <Badge variant="secondary" className="bg-destructive/15 text-destructive gap-1">
                  <FileMinus className="w-3 h-3" />
                  {fileStats.deleted} deleted
                </Badge>
              )}
              {fileStats.renamed > 0 && (
                <Badge variant="secondary" className="bg-warning/15 text-warning gap-1">
                  <FileEdit className="w-3 h-3" />
                  {fileStats.renamed} renamed
                </Badge>
              )}
            </div>
          )}

          {/* Content - File Tree */}
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <span>Failed to load files</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {searchQuery ? 'No files match your search' : 'No changed files'}
            </div>
          ) : (
            <div className="rounded-lg border bg-card/50 p-3 max-h-[400px] overflow-y-auto">
              <div className="flex flex-col gap-0.5">
                {rootChildren.map((child, idx) => (
                  <FileTreeNode
                    key={child.path}
                    node={child}
                    isLast={idx === rootChildren.length - 1}
                    prefix=""
                    expandedDirs={expandedDirs}
                    expandedFiles={expandedFiles}
                    toggleDir={toggleDir}
                    toggleFile={toggleFile}
                    searchQuery={searchQuery}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
