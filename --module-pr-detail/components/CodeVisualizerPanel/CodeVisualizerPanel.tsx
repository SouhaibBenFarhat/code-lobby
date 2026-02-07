/**
 * CodeVisualizerPanel - Floating panel for viewing full file content.
 *
 * Features:
 * - Floating draggable/resizable window
 * - File tree sidebar showing changed files
 * - Tab bar for open files
 * - Full file content with syntax highlighting
 */

import { type PRFile, useFileContent } from '@data'
import {
  Badge,
  Button,
  CodeViewer,
  cn,
  FloatingWindow,
  ScrollArea,
  ScrollBar,
  Tabs,
  TabsList,
  TabsTrigger
} from '@ui-kit'
import {
  ChevronDown,
  ChevronRight,
  Code2,
  FileCode,
  FileDiff,
  FileEdit,
  FileJson,
  FileMinus,
  FilePlus,
  FileText,
  FileType,
  FolderOpen,
  X
} from 'lucide-react'
import React, { useCallback, useMemo, useState } from 'react'
import type { FileTreeNode as FileTreeNodeType } from '../types'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CodeVisualizerPanelProps {
  /** Repository full name (owner/repo) */
  repoFullName: string
  /** PR head branch ref (e.g., 'feature/my-branch') */
  headRef: string
  /** Changed files from the PR */
  files: PRFile[]
  /** Called when the panel is closed */
  onClose: () => void
  /** Initial file to open (optional) */
  initialFilePath?: string
}

interface OpenTab {
  id: string
  path: string
  fileName: string
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE TREE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function buildFileTree(files: PRFile[]): FileTreeNodeType {
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

function getSortedChildren(node: FileTreeNodeType): FileTreeNodeType[] {
  return Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE TREE COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function getFileIcon(changeType: PRFile['changeType']): React.JSX.Element {
  switch (changeType) {
    case 'ADDED':
      return <FilePlus className="w-4 h-4 text-success flex-shrink-0" />
    case 'DELETED':
      return <FileMinus className="w-4 h-4 text-destructive flex-shrink-0" />
    case 'RENAMED':
    case 'COPIED':
      return <FileEdit className="w-4 h-4 text-warning flex-shrink-0" />
    default:
      return <FileDiff className="w-4 h-4 text-primary flex-shrink-0" />
  }
}

/** Get file icon based on file extension for tabs */
function getTabFileIcon(fileName: string): React.JSX.Element {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return <FileCode className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
    case 'json':
      return <FileJson className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
    case 'md':
    case 'mdx':
      return <FileText className="w-3.5 h-3.5 text-foreground-ghost flex-shrink-0" />
    case 'css':
    case 'scss':
    case 'less':
      return <FileType className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
    case 'html':
    case 'htm':
      return <FileCode className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
    case 'py':
      return <FileCode className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
    case 'go':
      return <FileCode className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
    case 'rs':
      return <FileCode className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
    case 'java':
    case 'kt':
      return <FileCode className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
    case 'yaml':
    case 'yml':
      return <FileText className="w-3.5 h-3.5 text-pink-400 flex-shrink-0" />
    default:
      return <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
  }
}

interface FileTreeItemProps {
  node: FileTreeNodeType
  level: number
  expandedDirs: Set<string>
  selectedPath: string | null
  onToggleDir: (path: string) => void
  onSelectFile: (path: string) => void
}

function FileTreeItem({
  node,
  level,
  expandedDirs,
  selectedPath,
  onToggleDir,
  onSelectFile
}: FileTreeItemProps): React.JSX.Element | null {
  const children = getSortedChildren(node)
  const isExpanded = expandedDirs.has(node.path)
  const paddingLeft = level * 12 + 8

  if (node.isFile && node.file) {
    const isSelected = selectedPath === node.path

    return (
      <Button
        type="button"
        variant="unstyled"
        size="none"
        onClick={() => onSelectFile(node.path)}
        className={`w-full flex items-center gap-2 py-1.5 px-2 text-xs hover:bg-interactive-hover transition-colors text-left ${
          isSelected ? 'bg-info-subtle text-primary' : ''
        }`}
        style={{ paddingLeft }}
      >
        {getFileIcon(node.file.changeType)}
        <span className="flex-1 truncate font-mono">{node.name}</span>
        <div className="flex items-center gap-1 text-[10px] font-mono opacity-70">
          {node.file.additions > 0 && <span className="text-success">+{node.file.additions}</span>}
          {node.file.deletions > 0 && (
            <span className="text-destructive">−{node.file.deletions}</span>
          )}
        </div>
      </Button>
    )
  }

  // Directory node
  return (
    <div>
      <Button
        type="button"
        variant="unstyled"
        size="none"
        onClick={() => onToggleDir(node.path)}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-xs hover:bg-interactive-hover transition-colors text-left"
        style={{ paddingLeft }}
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        )}
        <FolderOpen className="w-4 h-4 text-warning flex-shrink-0" />
        <span className="flex-1 truncate text-muted-foreground font-medium">{node.name}/</span>
        <Badge variant="outline" className="text-[9px] h-4 px-1 opacity-60">
          {children.length}
        </Badge>
      </Button>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              expandedDirs={expandedDirs}
              selectedPath={selectedPath}
              onToggleDir={onToggleDir}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE CONTENT VIEWER
// ═══════════════════════════════════════════════════════════════════════════

interface FileContentViewerProps {
  repoFullName: string
  headRef: string
  filePath: string
  file: PRFile | undefined
}

function FileContentViewer({
  repoFullName,
  headRef,
  filePath,
  file
}: FileContentViewerProps): React.JSX.Element {
  const { data: fileContent, isLoading, error } = useFileContent(repoFullName, headRef, filePath)

  // For deleted files, we can't fetch from head ref - show message
  if (file?.changeType === 'DELETED') {
    return (
      <div className="flex items-center justify-center h-full bg-code text-code-foreground">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <FileMinus className="w-8 h-8 text-destructive/50" />
          <span className="text-sm">This file was deleted in this PR</span>
          <span className="text-xs opacity-70">Cannot view deleted file content</span>
        </div>
      </div>
    )
  }

  return (
    <CodeViewer
      code={fileContent?.content || ''}
      fileName={filePath}
      isLoading={isLoading}
      error={error ? (error as Error).message : undefined}
      className="h-full"
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function CodeVisualizerPanel({
  repoFullName,
  headRef,
  files,
  onClose,
  initialFilePath
}: CodeVisualizerPanelProps): React.JSX.Element {
  // Build file tree
  const fileTree = useMemo(() => buildFileTree(files), [files])

  // File lookup map
  const fileMap = useMemo(() => {
    const map = new Map<string, PRFile>()
    for (const file of files) {
      map.set(file.path, file)
    }
    return map
  }, [files])

  // State
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => {
    // Auto-expand first few levels
    const expanded = new Set<string>()
    function expandLevel(node: FileTreeNodeType, level: number): void {
      if (level > 2) return
      for (const child of node.children.values()) {
        if (!child.isFile) {
          expanded.add(child.path)
          expandLevel(child, level + 1)
        }
      }
    }
    expandLevel(fileTree, 0)
    return expanded
  })

  // Tabs state
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(() => {
    if (initialFilePath) {
      const fileName = initialFilePath.split('/').pop() || initialFilePath
      return [{ id: initialFilePath, path: initialFilePath, fileName }]
    }
    return []
  })
  const [activeTabId, setActiveTabId] = useState<string | null>(initialFilePath || null)

  // Window state
  const [isMinimized, setIsMinimized] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  // Get root children for file tree
  const rootChildren = useMemo(() => getSortedChildren(fileTree), [fileTree])

  // Handlers
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

  const selectFile = useCallback(
    (path: string) => {
      // Check if tab already exists
      const existingTab = openTabs.find((t) => t.path === path)
      if (existingTab) {
        setActiveTabId(existingTab.id)
      } else {
        // Open new tab
        const fileName = path.split('/').pop() || path
        const newTab: OpenTab = { id: path, path, fileName }
        setOpenTabs((prev) => [...prev, newTab])
        setActiveTabId(path)
      }
    },
    [openTabs]
  )

  const closeTab = useCallback(
    (tabId: string) => {
      setOpenTabs((prev) => {
        const index = prev.findIndex((t) => t.id === tabId)
        const newTabs = prev.filter((t) => t.id !== tabId)

        // If closing active tab, switch to adjacent tab
        if (activeTabId === tabId && newTabs.length > 0) {
          const newIndex = Math.min(index, newTabs.length - 1)
          setActiveTabId(newTabs[newIndex].id)
        } else if (newTabs.length === 0) {
          setActiveTabId(null)
        }

        return newTabs
      })
    },
    [activeTabId]
  )

  const handleTabSelect = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  // Get active file for viewer
  const activeFile = activeTabId ? fileMap.get(activeTabId) : undefined

  return (
    <FloatingWindow
      title="Code Visualizer"
      icon={<Code2 className="w-4 h-4" />}
      defaultPosition={{ x: 50, y: 50 }}
      defaultSize={{ width: 1000, height: 700 }}
      minWidth={600}
      minHeight={400}
      onClose={onClose}
      onMinimize={() => setIsMinimized(!isMinimized)}
      isMinimized={isMinimized}
      onMaximize={() => setIsMaximized(!isMaximized)}
      isMaximized={isMaximized}
      zIndex={100}
      bounds="parent"
    >
      <div className="flex h-full">
        {/* Sidebar - File Tree */}
        <div className="w-64 flex-shrink-0 border-r border-border-subtle flex flex-col bg-background">
          {/* File count */}
          <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border-subtle">
            {files.length} file{files.length !== 1 ? 's' : ''} changed
          </div>

          {/* File tree */}
          <ScrollArea className="flex-1">
            <div className="py-1">
              {rootChildren.map((child) => (
                <FileTreeItem
                  key={child.path}
                  node={child}
                  level={0}
                  expandedDirs={expandedDirs}
                  selectedPath={activeTabId}
                  onToggleDir={toggleDir}
                  onSelectFile={selectFile}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar using shadcn Tabs */}
          {openTabs.length > 0 ? (
            <Tabs
              value={activeTabId || undefined}
              onValueChange={handleTabSelect}
              className="flex flex-col h-full"
            >
              <div className="border-b border-border-subtle bg-surface overflow-hidden">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="w-max">
                    <TabsList className="h-9 w-max rounded-none bg-transparent p-0 justify-start inline-flex">
                      {openTabs.map((tab, index) => (
                        <TabsTrigger
                          key={tab.id}
                          value={tab.id}
                          className={cn(
                            'relative h-9 w-[160px] rounded-none border-b-2 border-b-transparent px-3 pb-2 pt-2 font-normal text-muted-foreground shadow-none transition-none gap-2 group flex-shrink-0',
                            'data-[state=active]:border-b-primary data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:bg-background',
                            'hover:bg-interactive-hover',
                            // Right border for visual separation (except last tab)
                            index < openTabs.length - 1 && 'border-r border-r-border-muted'
                          )}
                        >
                          {getTabFileIcon(tab.fileName)}
                          <span className="text-xs flex-1 truncate text-left">{tab.fileName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-4 h-4 p-0 rounded-sm opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-70 hover:opacity-100 hover:bg-interactive-hover transition-opacity flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              closeTab(tab.id)
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>
                  <ScrollBar orientation="horizontal" className="h-1.5" />
                </ScrollArea>
              </div>

              {/* Code viewer */}
              <div className="flex-1 overflow-hidden">
                {activeTabId && (
                  <FileContentViewer
                    repoFullName={repoFullName}
                    headRef={headRef}
                    filePath={activeTabId}
                    file={activeFile}
                  />
                )}
              </div>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full bg-code text-code-foreground">
              <div className="flex flex-col items-center gap-3 text-center">
                <Code2 className="w-12 h-12 opacity-30" />
                <span className="text-sm">Select a file to view</span>
                <span className="text-xs opacity-70">
                  Click on a file in the sidebar to view its contents
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </FloatingWindow>
  )
}
