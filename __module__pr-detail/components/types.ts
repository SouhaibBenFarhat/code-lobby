/**
 * Shared types for PR Detail components
 */

import type { PRFile } from '@data'

/** Check run data */
export interface CheckRun {
  id: string
  name: string
  status: string
  conclusion: string | null
  html_url: string
}

/** Grouped checks by state */
export interface GroupedChecks {
  running: CheckRun[]
  failed: CheckRun[]
  success: CheckRun[]
  other: CheckRun[]
}

/** Comment data for timeline */
export interface CommentData {
  id: string
  body: string
  created_at: string
  actor: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  event: 'commented' | 'approved' | 'changes_requested' | 'reviewed'
}

/** Reviewer feedback data */
export interface ReviewerFeedback {
  login: string
  avatar_url: string
  isBot: boolean
  reviewState: 'approved' | 'changes_requested' | 'commented' | null
  reviewBody: string | null
  reviewDate: string | null
  inlineComments: Array<{
    id: string
    body: string
    created_at: string
    path: string
    line: number | null
    diffHunk?: string
    isResolved: boolean
  }>
}

/** Diff line type for syntax highlighting */
export interface DiffLine {
  type: 'addition' | 'deletion' | 'context' | 'header' | 'info'
  content: string
  oldLineNum?: number
  newLineNum?: number
}

/** Tree node structure for file tree */
export interface FileTreeNode {
  name: string
  path: string
  isFile: boolean
  file?: PRFile
  children: Map<string, FileTreeNode>
}
