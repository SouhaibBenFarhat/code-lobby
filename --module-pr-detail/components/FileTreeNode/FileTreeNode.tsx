/**
 * FileTreeNode - Recursive component for displaying file tree structure.
 */

import type { PRFile } from '@data'
import { Badge, Button, DiffViewer, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileDiff,
  FileEdit,
  FileMinus,
  FilePlus,
  FolderOpen
} from 'lucide-react'
import type { FileTreeNode as FileTreeNodeType } from '../types'

export interface FileTreeNodeProps {
  node: FileTreeNodeType
  isLast: boolean
  prefix: string
  expandedDirs: Set<string>
  expandedFiles: Set<string>
  toggleDir: (path: string) => void
  toggleFile: (path: string) => void
  searchQuery: string
  /** Called when "Open in Viewer" is clicked */
  onOpenInViewer?: (path: string) => void
}

/** Get icon based on file change type */
function getFileIcon(changeType: PRFile['changeType']): React.JSX.Element {
  switch (changeType) {
    case 'ADDED':
      return <FilePlus className="w-4 h-4 text-success" />
    case 'DELETED':
      return <FileMinus className="w-4 h-4 text-destructive" />
    case 'RENAMED':
    case 'COPIED':
      return <FileEdit className="w-4 h-4 text-warning" />
    default:
      return <FileDiff className="w-4 h-4 text-primary" />
  }
}

/** Get file extension from path */
function getFileExtension(path: string): string {
  const parts = path.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/** Get sorted children: directories first, then files, alphabetically */
function getSortedChildren(node: FileTreeNodeType): FileTreeNodeType[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

export function FileTreeNode({
  node,
  isLast,
  prefix,
  expandedDirs,
  expandedFiles,
  toggleDir,
  toggleFile,
  searchQuery,
  onOpenInViewer
}: FileTreeNodeProps): React.JSX.Element | null {
  const isExpanded = node.isFile ? expandedFiles.has(node.path) : expandedDirs.has(node.path)
  const connector = isLast ? '└── ' : '├── '
  const childPrefix = prefix + (isLast ? '    ' : '│   ')
  const children = getSortedChildren(node)

  // Auto-expand directories when searching
  const shouldAutoExpand = searchQuery.trim() !== '' && !node.isFile

  if (node.isFile && node.file) {
    const file = node.file
    return (
      <div>
        <div className="flex items-center group">
          <Button
            variant="unstyled"
            size="none"
            onClick={() => toggleFile(node.path)}
            className="flex-1 flex items-center gap-1 py-1 text-xs hover:bg-interactive-hover transition-colors text-left"
          >
            <span className="text-foreground-subtle font-mono text-[10px] whitespace-pre select-none">
              {prefix}
              {connector}
            </span>
            {file.patch &&
              (isExpanded ? (
                <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
              ))}
            {!file.patch && <span className="w-3" />}
            {getFileIcon(file.changeType)}
            <span className="flex-1 truncate font-mono text-foreground">{node.name}</span>
            <div className="flex items-center gap-1.5 text-[10px] font-mono opacity-70 group-hover:opacity-100">
              {file.additions > 0 && <span className="text-success">+{file.additions}</span>}
              {file.deletions > 0 && <span className="text-destructive">−{file.deletions}</span>}
            </div>
            {getFileExtension(file.path) && (
              <Badge variant="outline" className="text-[8px] h-4 px-1 font-mono opacity-50">
                {getFileExtension(file.path)}
              </Badge>
            )}
          </Button>
          {/* Open in Viewer button */}
          {onOpenInViewer && file.changeType !== 'DELETED' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenInViewer(node.path)
                  }}
                >
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Open in Code Viewer
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {isExpanded && file.patch && (
          <div className="ml-4 mb-2">
            <DiffViewer patch={file.patch} fileName={file.path} />
          </div>
        )}
      </div>
    )
  }

  // Directory node
  const actualExpanded = shouldAutoExpand || isExpanded
  return (
    <div>
      <Button
        variant="unstyled"
        size="none"
        onClick={() => toggleDir(node.path)}
        className="w-full flex items-center gap-1 py-1 text-xs hover:bg-interactive-hover transition-colors text-left"
      >
        <span className="text-foreground-subtle font-mono text-[10px] whitespace-pre select-none">
          {prefix}
          {connector}
        </span>
        {actualExpanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        <FolderOpen className="w-3.5 h-3.5 text-warning flex-shrink-0" />
        <span className="flex-1 truncate text-muted-foreground font-medium">{node.name}/</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1 opacity-60">
          {children.length}
        </Badge>
      </Button>
      {actualExpanded && children.length > 0 && (
        <div>
          {children.map((child, idx) => (
            <FileTreeNode
              key={child.path}
              node={child}
              isLast={idx === children.length - 1}
              prefix={childPrefix}
              expandedDirs={expandedDirs}
              expandedFiles={expandedFiles}
              toggleDir={toggleDir}
              toggleFile={toggleFile}
              searchQuery={searchQuery}
              onOpenInViewer={onOpenInViewer}
            />
          ))}
        </div>
      )}
    </div>
  )
}
