/**
 * AgenticSettingsSidebar - Configuration panel for AI-powered agentic actions
 *
 * Allows users to customize system prompts for:
 * - CI Failure Analysis
 * - PR Status Analysis
 * - Jira Ticket Extraction
 * - Preview URL Extraction
 *
 * All prompts are persisted to localStorage via TanStack Query.
 */

import {
  type AgenticPrompts,
  useAgenticPrompts,
  useAgenticSettingsOpen,
  useSetAgenticPrompts,
  useSetAgenticSettingsOpen
} from '@data'
import {
  Button,
  Label,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea
} from '@ui-kit'
import { AlertCircle, Bot, Eye, HelpCircle, RotateCcw, Save, Sparkles, Ticket } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface PromptConfig {
  key: keyof AgenticPrompts
  label: string
  description: string
  placeholder: string
  icon: React.ReactNode
}

const PROMPT_CONFIGS: PromptConfig[] = [
  {
    key: 'ciFailureAnalysis',
    label: 'CI Failure Analysis',
    description: 'Analyze failed CI checks',
    placeholder: 'Custom system prompt for CI failure analysis...',
    icon: <AlertCircle className="w-3.5 h-3.5 text-destructive" />
  },
  {
    key: 'prStatusAnalysis',
    label: 'PR Status Analysis',
    description: 'Explain PR blockers',
    placeholder: 'Custom system prompt for PR status analysis...',
    icon: <HelpCircle className="w-3.5 h-3.5 text-primary" />
  },
  {
    key: 'jiraTicketExtraction',
    label: 'Jira Ticket Extraction',
    description: 'Find linked Jira tickets',
    placeholder: 'Custom system prompt for Jira extraction...',
    icon: <Ticket className="w-3.5 h-3.5 text-blue-500" />
  },
  {
    key: 'previewUrlExtraction',
    label: 'Preview URL Extraction',
    description: 'Find preview/staging URLs',
    placeholder: 'Custom system prompt for preview URL extraction...',
    icon: <Eye className="w-3.5 h-3.5 text-emerald-500" />
  }
]

export function AgenticSettingsSidebar(): React.JSX.Element {
  const { data: isOpen } = useAgenticSettingsOpen()
  const setIsOpen = useSetAgenticSettingsOpen()
  const { data: prompts } = useAgenticPrompts()
  const setPrompts = useSetAgenticPrompts()

  // Local state for editing (allows cancel without saving)
  const [editedPrompts, setEditedPrompts] = useState<Partial<AgenticPrompts>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Sync local state when sidebar opens
  useEffect(() => {
    if (isOpen && prompts) {
      setEditedPrompts(prompts)
      setHasChanges(false)
    }
  }, [isOpen, prompts])

  const handlePromptChange = useCallback((key: keyof AgenticPrompts, value: string) => {
    setEditedPrompts((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }, [])

  const handleSave = useCallback(() => {
    setPrompts.mutate(editedPrompts)
    setHasChanges(false)
  }, [editedPrompts, setPrompts])

  const handleReset = useCallback((key: keyof AgenticPrompts) => {
    setEditedPrompts((prev) => ({ ...prev, [key]: '' }))
    setHasChanges(true)
  }, [])

  const handleResetAll = useCallback(() => {
    setEditedPrompts({
      ciFailureAnalysis: '',
      prStatusAnalysis: '',
      jiraTicketExtraction: '',
      previewUrlExtraction: ''
    })
    setHasChanges(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen.mutate(false)
  }, [setIsOpen])

  return (
    <Sheet open={isOpen ?? false} onOpenChange={(open) => setIsOpen.mutate(open)}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-3 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" />
            <SheetTitle className="text-sm">Agentic Settings</SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Custom AI prompts. Leave empty for defaults.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-3">
            {PROMPT_CONFIGS.map((config) => (
              <div key={config.key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {config.icon}
                    <Label htmlFor={config.key} className="text-xs">
                      {config.label}
                    </Label>
                  </div>
                  {editedPrompts[config.key] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => handleReset(config.key)}
                    >
                      <RotateCcw className="w-2.5 h-2.5 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
                <Textarea
                  id={config.key}
                  value={editedPrompts[config.key] || ''}
                  onChange={(e) => handlePromptChange(config.key, e.target.value)}
                  placeholder={config.placeholder}
                  className="min-h-[60px] text-xs font-mono leading-relaxed"
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="px-3 py-2 border-t bg-surface flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetAll}
            className="h-6 text-[10px] px-2 text-muted-foreground"
          >
            <RotateCcw className="w-2.5 h-2.5 mr-1" />
            Reset All
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="h-6 text-[11px] px-2"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!hasChanges || setPrompts.isPending}
              className="h-6 text-[11px] px-2 gap-1"
            >
              {setPrompts.isPending ? (
                <Sparkles className="w-2.5 h-2.5 animate-pulse" />
              ) : (
                <Save className="w-2.5 h-2.5" />
              )}
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
