/**
 * MemoryUsageIndicator - Shows Electron app memory usage in header
 */

import { useMemoryUsage } from '@data'
import { cn, Separator, Tooltip, TooltipContent, TooltipTrigger } from '@ui-kit'
import { HardDrive } from 'lucide-react'

export function MemoryUsageIndicator(): React.JSX.Element | null {
  const { data: memoryUsage } = useMemoryUsage()

  if (!memoryUsage) return null

  const { rssMB, heapUsedMB, heapTotalMB, heapPercentage } = memoryUsage

  // Color based on heap usage percentage
  const isHigh = heapPercentage >= 80
  const isMedium = heapPercentage >= 50

  return (
    <>
      <Separator orientation="vertical" className="h-6" />
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 no-drag cursor-default px-2 py-1 rounded-md transition-colors',
              isHigh && 'bg-destructive/10 border border-destructive/30',
              isMedium && !isHigh && 'bg-warning/10 border border-warning/30'
            )}
          >
            <HardDrive
              className={cn(
                'w-3.5 h-3.5',
                isHigh ? 'text-destructive' : isMedium ? 'text-warning' : 'text-muted-foreground'
              )}
            />
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    isHigh ? 'bg-destructive' : isMedium ? 'bg-yellow-500' : 'bg-green-500'
                  )}
                  style={{ width: `${Math.min(heapPercentage, 100)}%` }}
                />
              </div>
              <span
                className={cn(
                  'text-[10px] w-12',
                  isHigh
                    ? 'text-destructive font-medium'
                    : isMedium
                      ? 'text-warning'
                      : 'text-muted-foreground'
                )}
              >
                {rssMB} MB
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1.5">
            <p className="font-medium">Memory Usage</p>
            <div className="space-y-0.5">
              <p>
                <span className="text-muted-foreground">RSS:</span> {rssMB} MB
              </p>
              <p>
                <span className="text-muted-foreground">Heap:</span> {heapUsedMB} / {heapTotalMB} MB
                ({heapPercentage}%)
              </p>
            </div>
            <Separator className="my-1" />
            <p className="text-muted-foreground text-[10px]">
              RSS = Total memory allocated to process
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </>
  )
}
