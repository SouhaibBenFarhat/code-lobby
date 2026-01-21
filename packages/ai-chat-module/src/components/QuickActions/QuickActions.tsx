/**
 * QuickActions - Quick action chips that users can click to send pre-defined prompts
 */

import { cn } from '@codelobby/ui-kit'
import { MessageSquare, MessageSquarePlus, X } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import type { CustomPrompt, QuickPrompt } from '../../types'
import { AddCustomPromptModal } from '../AddCustomPromptModal'

export interface QuickActionsProps {
  prompts: QuickPrompt[]
  customPrompts: CustomPrompt[]
  onSelect: (prompt: string) => void
  onAddCustomPrompt: (label: string, prompt: string) => Promise<void>
  onDeleteCustomPrompt: (id: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function QuickActions({
  prompts,
  customPrompts,
  onSelect,
  onAddCustomPrompt,
  onDeleteCustomPrompt,
  disabled = false,
  className = ''
}: QuickActionsProps): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll state on mount and when content changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: need to recalculate when prompts change
  useEffect(() => {
    const checkScroll = () => {
      const el = scrollRef.current
      if (el) {
        setCanScrollLeft(el.scrollLeft > 0)
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
      }
    }

    checkScroll()
    const el = scrollRef.current
    el?.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)

    return () => {
      el?.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [prompts.length, customPrompts.length])

  // Build mask gradient based on scroll state
  const getMaskStyle = (): React.CSSProperties => {
    const leftFade = canScrollLeft ? 'transparent, black 24px' : 'black, black'
    const rightFade = canScrollRight ? 'black calc(100% - 24px), transparent' : 'black, black'

    return {
      maskImage: `linear-gradient(to right, ${leftFade}, ${rightFade})`,
      WebkitMaskImage: `linear-gradient(to right, ${leftFade}, ${rightFade})`,
      scrollbarWidth: 'none' // Firefox
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Add Custom Prompt Modal */}
      <AddCustomPromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onAddCustomPrompt}
      />

      {/* Scrollable container with mask fade effect */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden"
        style={getMaskStyle()}
      >
        {/* Add custom prompt button - at the start */}
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0',
            'bg-transparent hover:bg-muted/60 border border-dashed border-border/50 hover:border-border',
            'text-muted-foreground/60 hover:text-muted-foreground',
            'transition-all duration-150',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          title="Add custom prompt"
        >
          <MessageSquarePlus className="w-3 h-3" />
        </button>

        {/* Custom prompts with delete button */}
        {customPrompts.map((prompt) => (
          <div key={prompt.id} className="relative group flex-shrink-0">
            <button
              type="button"
              onClick={() => onSelect(prompt.prompt)}
              disabled={disabled}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap',
                'bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50',
                'text-primary hover:text-primary',
                'transition-all duration-150 pr-7',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <MessageSquare className="w-3 h-3" />
              <span>{prompt.label}</span>
            </button>
            {/* Delete button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDeleteCustomPrompt(prompt.id)
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-destructive/80 hover:bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete prompt"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Built-in prompts */}
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => onSelect(prompt.prompt)}
            disabled={disabled}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap flex-shrink-0',
              'bg-muted/60 hover:bg-muted border border-border/50 hover:border-border',
              'text-muted-foreground hover:text-foreground',
              'transition-all duration-150',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {prompt.icon}
            <span>{prompt.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
