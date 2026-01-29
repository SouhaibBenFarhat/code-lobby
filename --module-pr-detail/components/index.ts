/**
 * PR Detail Module - Component Exports
 *
 * Each component is in its own folder following the folder-per-component pattern.
 */

// DiffViewer is now in @ui-kit - re-export for backwards compatibility
export { type DiffLine, DiffViewer, type DiffViewerProps } from '@ui-kit'

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
export { FileTreeNode, type FileTreeNodeProps } from './FileTreeNode'
export { FindPreviewButton } from './FindPreviewButton'
export { MergeButton, type MergeButtonProps } from './MergeButton'
export { PostCommentForm, type PostCommentFormProps } from './PostCommentForm'
export { PRDescription, type PRDescriptionProps } from './PRDescription'
// Main component
export { PRDetail, type PRDetailProps } from './PRDetail'
export { PRDetailSkeleton, type PRDetailSkeletonProps } from './PRDetailSkeleton'
export {
  ReadyForReviewButton,
  type ReadyForReviewButtonProps
} from './ReadyForReviewButton'
export { ReopenButton, type ReopenButtonProps } from './ReopenButton'
export { ReviewerCard, type ReviewerCardProps } from './ReviewerCard'
// Types (DiffLine is now in @ui-kit)
export type {
  CheckRun,
  CommentData,
  FileTreeNode as FileTreeNodeType,
  GroupedChecks,
  ReviewerFeedback
} from './types'
export { UpdateBranchButton, type UpdateBranchButtonProps } from './UpdateBranchButton'
