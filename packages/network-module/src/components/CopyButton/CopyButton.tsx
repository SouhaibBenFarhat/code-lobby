/**
 * CopyButton Component
 *
 * A button that copies text to clipboard with visual feedback.
 * Shows a checkmark icon briefly after successful copy.
 */

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@codelobby/ui-kit'
import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

export interface CopyButtonProps {
  /** The text to copy to clipboard */
  text: string
  /** Label shown in tooltip (e.g., "request" -> "Copy request") */
  label: string
}

export function CopyButton({ text, label }: CopyButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    },
    [text]
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-60 hover:opacity-100"
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : `Copy ${label}`}
        >
          {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{copied ? 'Copied!' : `Copy ${label}`}</TooltipContent>
    </Tooltip>
  )
}
