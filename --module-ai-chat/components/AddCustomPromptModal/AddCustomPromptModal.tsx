/**
 * Modal for creating or editing custom prompts with better UX
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input
} from '@ui-kit'
import { AlertCircle, Check, Loader2, MessageSquarePlus, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface AddCustomPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (label: string, prompt: string) => Promise<void>
  /** If provided, modal is in edit mode */
  editPrompt?: {
    id: string
    label: string
    prompt: string
  } | null
}

export function AddCustomPromptModal({
  isOpen,
  onClose,
  onSave,
  editPrompt
}: AddCustomPromptModalProps): React.JSX.Element {
  const isEditMode = !!editPrompt
  const [label, setLabel] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const labelInputRef = useRef<HTMLInputElement>(null)

  // Focus label input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => labelInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Initialize form with edit data or reset when modal opens/closes
  useEffect(() => {
    if (isOpen && editPrompt) {
      setLabel(editPrompt.label)
      setPrompt(editPrompt.prompt)
    } else if (!isOpen) {
      setLabel('')
      setPrompt('')
      setError(null)
    }
  }, [isOpen, editPrompt])

  const handleSave = async () => {
    if (!label.trim()) {
      setError('Please enter a label')
      return
    }
    if (!prompt.trim()) {
      setError('Please enter a prompt')
      return
    }
    if (label.length > 30) {
      setError('Label must be 30 characters or less')
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSave(label.trim(), prompt.trim())
      onClose()
    } catch {
      setError('Failed to save prompt')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleSave()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Pencil className="w-5 h-5 text-primary" />
                Edit Custom Prompt
              </>
            ) : (
              <>
                <MessageSquarePlus className="w-5 h-5 text-primary" />
                Create Custom Prompt
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update your custom prompt. Changes are saved locally.'
              : 'Create a reusable prompt for quick access. Your prompts are saved locally and persist across sessions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Label input */}
          <div className="space-y-2">
            <label htmlFor="prompt-label" className="text-sm font-medium">
              Label <span className="text-muted-foreground">(button text)</span>
            </label>
            <Input
              ref={labelInputRef}
              id="prompt-label"
              placeholder="e.g., Check types, Find bugs, Optimize..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={30}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">{label.length}/30 characters</p>
          </div>

          {/* Prompt textarea */}
          <div className="space-y-2">
            <label htmlFor="prompt-content" className="text-sm font-medium">
              Prompt <span className="text-muted-foreground">(what to send to AI)</span>
            </label>
            <textarea
              id="prompt-content"
              placeholder="Write your prompt here...&#10;&#10;Example: Review this code for TypeScript errors. Check for:&#10;- Missing type annotations&#10;- Incorrect type usage&#10;- Potential null/undefined issues&#10;&#10;Show me the problematic code and how to fix it."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={8}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Tip: Be specific! "Find performance issues in loops" works better than "Review code"
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !label.trim() || !prompt.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? 'Updating...' : 'Saving...'}
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                {isEditMode ? 'Update Prompt' : 'Save Prompt'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
