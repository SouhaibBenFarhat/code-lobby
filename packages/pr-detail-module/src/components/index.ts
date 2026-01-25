/**
 * PR Detail Module - Component Exports
 *
 * Each component is in its own folder following the folder-per-component pattern.
 */

// Sub-components (for reuse if needed)
export { ApproveButton, type ApproveButtonProps } from './ApproveButton'
export { ChangedFilesSection, type ChangedFilesSectionProps } from './ChangedFilesSection'
export { CheckItem, type CheckItemProps } from './CheckItem'
export { CloseButton, type CloseButtonProps } from './CloseButton'
export { CommentItem, type CommentItemProps } from './CommentItem'
export {
  ConvertToDraftButton,
  type ConvertToDraftButtonProps
} from './ConvertToDraftButton'
export { DiffViewer, type DiffViewerProps } from './DiffViewer'
export { FileTreeNode, type FileTreeNodeProps } from './FileTreeNode'
export { MergeButton, type MergeButtonProps } from './MergeButton'
export { PRDescription, type PRDescriptionProps } from './PRDescription'
// Main component
export { PRDetail, type PRDetailProps } from './PRDetail'
export {
  ReadyForReviewButton,
  type ReadyForReviewButtonProps
} from './ReadyForReviewButton'
export { ReopenButton, type ReopenButtonProps } from './ReopenButton'
export { ReviewerCard, type ReviewerCardProps } from './ReviewerCard'

// Types
export type {
  CheckRun,
  CommentData,
  DiffLine,
  FileTreeNode as FileTreeNodeType,
  GroupedChecks,
  ReviewerFeedback
} from './types'
