/**
 * PostScreenshotModal - Modal for posting a screenshot comment to a PR
 *
 * Shows the captured screenshot with annotation tools and allows the user to add a comment.
 * Requires explicit upload before posting.
 */

import { useAddPRComment, useUploadScreenshot } from '@data'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea
} from '@ui-kit'
import {
  CheckCircle2,
  Eraser,
  ImageIcon,
  Loader2,
  Pencil,
  RotateCcw,
  Send,
  Upload
} from 'lucide-react'
import React, { useCallback, useRef, useState } from 'react'
import { ReactSketchCanvas, type ReactSketchCanvasRef } from 'react-sketch-canvas'

export interface PostScreenshotModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** The captured screenshot as a data URL */
  screenshotDataUrl: string | null
  /** The repository full name (owner/repo) */
  repoFullName: string
  /** The PR number */
  prNumber: number
  /** The PR node ID (for GraphQL) */
  prNodeId: string
  /** The URL that was being viewed when screenshot was taken */
  sourceUrl?: string
}

const COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' }
]

const STROKE_WIDTHS = [2, 4, 8, 12]

export function PostScreenshotModal({
  isOpen,
  onClose,
  screenshotDataUrl,
  repoFullName,
  prNumber,
  prNodeId,
  sourceUrl
}: PostScreenshotModalProps): React.JSX.Element {
  const canvasRef = useRef<ReactSketchCanvasRef>(null)
  const [comment, setComment] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Upload state
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null)

  // Drawing tools state
  const [strokeColor, setStrokeColor] = useState('#ef4444') // Red default
  const [strokeWidth, setStrokeWidth] = useState(4)
  const [isErasing, setIsErasing] = useState(false)

  // TanStack mutations
  const addComment = useAddPRComment()
  const uploadScreenshot = useUploadScreenshot()

  // Get the final image with annotations
  const getAnnotatedImage = useCallback(async (): Promise<string> => {
    if (!canvasRef.current || !screenshotDataUrl) {
      return screenshotDataUrl || ''
    }

    try {
      // Export the canvas with the background image as PNG
      const dataUrl = await canvasRef.current.exportImage('png')

      // Verify we got a PNG, not SVG
      if (dataUrl?.startsWith('data:image/png')) {
        return dataUrl
      }

      // If we got SVG or something else, fall back to original screenshot
      console.warn('Canvas export did not return PNG, using original screenshot')
      return screenshotDataUrl
    } catch (err) {
      // If export fails, return original screenshot
      console.error('Failed to export canvas:', err)
      return screenshotDataUrl
    }
  }, [screenshotDataUrl])

  const handleReset = useCallback(() => {
    setComment('')
    setError(null)
    setUploadedImageUrl(null)
    canvasRef.current?.clearCanvas()
  }, [])

  // Upload the image to GitHub using TanStack mutation
  const handleUpload = useCallback(async () => {
    if (!screenshotDataUrl) return

    setIsUploading(true)
    setError(null)

    try {
      const annotatedImage = await getAnnotatedImage()

      const result = await uploadScreenshot.mutateAsync({
        repoFullName,
        imageDataUrl: annotatedImage
      })

      setUploadedImageUrl(result.url)
    } catch (err) {
      console.error('Failed to upload image:', err)
      setError('Failed to upload image. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }, [screenshotDataUrl, getAnnotatedImage, repoFullName, uploadScreenshot])

  // Post the comment with the uploaded image
  const handlePost = useCallback(async () => {
    if (!uploadedImageUrl) {
      setError('Please upload the image first.')
      return
    }

    setIsPosting(true)
    setError(null)

    try {
      let commentBody = comment.trim()

      // Add the image
      const imageMarkdown = `![Screenshot](${uploadedImageUrl})`

      // Build the comment
      if (commentBody) {
        commentBody = `${commentBody}\n\n${imageMarkdown}`
      } else {
        commentBody = imageMarkdown
      }

      // Add source URL reference if available
      if (sourceUrl) {
        commentBody = `${commentBody}\n\n---\n📸 Screenshot from: ${sourceUrl}`
      }

      // Post the comment
      await addComment.mutateAsync({
        prNodeId,
        repoFullName,
        prNumber,
        body: commentBody
      })

      // Reset and close
      handleReset()
      onClose()
    } catch (err) {
      console.error('Failed to post comment:', err)
      setError('Failed to post comment. Please try again.')
    } finally {
      setIsPosting(false)
    }
  }, [
    uploadedImageUrl,
    comment,
    sourceUrl,
    repoFullName,
    prNumber,
    prNodeId,
    addComment,
    onClose,
    handleReset
  ])

  const handleClose = useCallback(() => {
    if (!isUploading && !isPosting) {
      handleReset()
      onClose()
    }
  }, [isUploading, isPosting, handleReset, onClose])

  const handleUndo = useCallback(() => {
    canvasRef.current?.undo()
    // Clear upload state if user makes changes after uploading
    if (uploadedImageUrl) {
      setUploadedImageUrl(null)
    }
  }, [uploadedImageUrl])

  const handleClearCanvas = useCallback(() => {
    canvasRef.current?.clearCanvas()
    // Clear upload state if user makes changes after uploading
    if (uploadedImageUrl) {
      setUploadedImageUrl(null)
    }
  }, [uploadedImageUrl])

  const handleToggleEraser = useCallback(() => {
    if (isErasing) {
      canvasRef.current?.eraseMode(false)
      setIsErasing(false)
    } else {
      canvasRef.current?.eraseMode(true)
      setIsErasing(true)
    }
  }, [isErasing])

  // When user draws, clear the upload state
  const handleCanvasChange = useCallback(() => {
    if (uploadedImageUrl) {
      setUploadedImageUrl(null)
    }
  }, [uploadedImageUrl])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Post Screenshot to PR #{prNumber}
          </DialogTitle>
          <DialogDescription>
            Draw on the screenshot to highlight issues, upload it, then post your comment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drawing toolbar */}
          <div className="flex items-center gap-2 flex-wrap p-2 bg-surface rounded-lg">
            {/* Tool buttons */}
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              <Button
                variant={!isErasing ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  canvasRef.current?.eraseMode(false)
                  setIsErasing(false)
                }}
                title="Pencil"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant={isErasing ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleEraser}
                title="Eraser"
              >
                <Eraser className="w-4 h-4" />
              </Button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    strokeColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setStrokeColor(color.value)}
                  title={color.name}
                />
              ))}
            </div>

            {/* Stroke width */}
            <div className="flex items-center gap-1 border-r pr-2 mr-2">
              {STROKE_WIDTHS.map((width) => (
                <button
                  key={width}
                  type="button"
                  className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                    strokeWidth === width ? 'bg-secondary' : 'hover:bg-interactive-hover'
                  }`}
                  onClick={() => setStrokeWidth(width)}
                  title={`${width}px`}
                >
                  <div
                    className="rounded-full bg-foreground"
                    style={{ width: width + 2, height: width + 2 }}
                  />
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleUndo}
                title="Undo"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleClearCanvas}
                title="Clear all drawings"
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Screenshot with drawing canvas */}
          {screenshotDataUrl && (
            <div className="border rounded-lg overflow-hidden bg-surface relative">
              <ReactSketchCanvas
                ref={canvasRef}
                width="100%"
                height="350px"
                strokeWidth={strokeWidth}
                strokeColor={strokeColor}
                eraserWidth={strokeWidth * 3}
                backgroundImage={screenshotDataUrl}
                exportWithBackgroundImage
                preserveBackgroundImageAspectRatio="xMidYMid meet"
                onChange={handleCanvasChange}
                style={{
                  border: 'none',
                  borderRadius: '0.5rem'
                }}
              />
            </div>
          )}

          {/* Upload section */}
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <Button
              variant={uploadedImageUrl ? 'outline' : 'default'}
              onClick={handleUpload}
              disabled={isUploading || isPosting || !screenshotDataUrl}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : uploadedImageUrl ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                  Re-upload
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </>
              )}
            </Button>

            {uploadedImageUrl ? (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Image uploaded successfully!
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                Upload the image before posting your comment
              </span>
            )}
          </div>

          {/* Comment input */}
          <div className="space-y-2">
            <label htmlFor="screenshot-comment" className="text-sm font-medium">
              Comment (optional)
            </label>
            <Textarea
              id="screenshot-comment"
              placeholder="Describe what you're highlighting..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              disabled={isPosting}
            />
          </div>

          {/* Source URL */}
          {sourceUrl && (
            <div className="text-xs text-muted-foreground">
              Source: <span className="font-mono">{sourceUrl}</span>
            </div>
          )}

          {/* Error message */}
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading || isPosting}>
            Cancel
          </Button>
          <Button onClick={handlePost} disabled={isPosting || isUploading || !uploadedImageUrl}>
            {isPosting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Post to PR
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
