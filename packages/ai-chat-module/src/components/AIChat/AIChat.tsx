/**
 * AIChat - AI chat panel (simplified - API integration pending)
 */

import { Button, ScrollArea } from '@codelobby/ui-kit'
import { Bot, X } from 'lucide-react'

import type { AIChatPanelProps } from '../../types'

export type { AIChatPanelProps } from '../../types'

export function AIChatPanel({
  onClose,
  linkedPRChat,
  selectedPR
}: AIChatPanelProps): React.JSX.Element {
  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border bg-card/80">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="font-semibold text-sm">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg mb-2">AI Chat</h3>
          <p className="text-sm text-muted-foreground max-w-[300px]">
            The AI assistant is being refactored. It will be available soon with full Claude
            integration.
          </p>
          {linkedPRChat && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              Linked to PR: {linkedPRChat.prTitle}
            </div>
          )}
          {selectedPR && !linkedPRChat && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              Selected PR: #{selectedPR.number} - {selectedPR.title}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
