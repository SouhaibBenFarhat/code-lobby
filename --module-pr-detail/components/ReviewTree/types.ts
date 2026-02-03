/**
 * Types for the ReviewTree component hierarchy
 */

/** Inline comment data */
export interface InlineComment {
  id: string
  body: string
  created_at: string
  path: string
  line: number | null
  diffHunk?: string
  isResolved: boolean
}

/** Comments grouped by file path */
export interface FileComments {
  path: string
  fileName: string
  comments: InlineComment[]
  unresolvedCount: number
  resolvedCount: number
}

/** Reviewer data with comments grouped by file */
export interface ReviewerData {
  login: string
  avatar_url: string
  isBot: boolean
  reviewState: 'approved' | 'changes_requested' | 'commented' | null
  reviewBody: string | null
  reviewDate: string | null
  files: FileComments[]
  totalComments: number
  totalUnresolved: number
  totalResolved: number
}
