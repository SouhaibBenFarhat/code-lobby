/**
 * LogsViewer - Placeholder (logging removed in simplification)
 */

import { Button, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { ScrollText } from 'lucide-react'

export function LogsViewer(): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
          <ScrollText className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Logs (disabled)</TooltipContent>
    </Tooltip>
  )
}
