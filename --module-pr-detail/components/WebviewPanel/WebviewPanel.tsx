/**
 * WebviewPanel - Displays a webview for a URL using Electron's webview tag
 *
 * Simple embedded browser view for preview URLs associated with PRs.
 * Includes screenshot/snip functionality for capturing regions.
 * Includes responsive testing controls for different screen sizes.
 */

import {
  Badge,
  Button,
  cn,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Maximize2,
  Monitor,
  RefreshCw,
  Scissors,
  Smartphone,
  Terminal,
  Trash2,
  XCircle
} from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export interface WebviewPanelProps {
  /** URL to display */
  url: string
  /** Optional callback when title changes */
  onTitleChange?: (title: string) => void
  /** Optional callback when screenshot is captured */
  onScreenshotCaptured?: (imageDataUrl: string) => void
}

interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

/** Console message from webview */
interface ConsoleMessage {
  id: number
  level: 'log' | 'warning' | 'error' | 'info' | 'debug'
  message: string
  timestamp: Date
}

/** Preset screen resolutions for responsive testing */
interface ScreenPreset {
  id: string
  name: string
  width: number
  icon: 'mobile' | 'desktop'
}

const SCREEN_PRESETS: ScreenPreset[] = [
  { id: 'mobile', name: 'Mobile', width: 375, icon: 'mobile' },
  { id: 'desktop', name: 'Desktop', width: 1024, icon: 'desktop' }
]

/** Map Electron's console message level to our level type */
const mapConsoleLevel = (level: number): ConsoleMessage['level'] => {
  switch (level) {
    case 0:
      return 'debug'
    case 1:
      return 'log'
    case 2:
      return 'warning'
    case 3:
      return 'error'
    default:
      return 'info'
  }
}

export function WebviewPanel({
  url,
  onTitleChange,
  onScreenshotCaptured
}: WebviewPanelProps): React.JSX.Element {
  const webviewRef = useRef<Electron.WebviewTag | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUrl, setCurrentUrl] = useState(url)
  const [urlInputValue, setUrlInputValue] = useState(url)
  const [isEditingUrl, setIsEditingUrl] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)

  // Screenshot selection state
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<SelectionBox | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Responsive testing state (null = full width)
  const [selectedPreset, setSelectedPreset] = useState<ScreenPreset | null>(null)

  // Console messages state
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([])
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const messageIdRef = useRef(0)

  // Count warnings and errors
  const warningCount = consoleMessages.filter((m) => m.level === 'warning').length
  const errorCount = consoleMessages.filter((m) => m.level === 'error').length
  const totalIssues = warningCount + errorCount

  // Trigger ripple effect when new messages arrive
  useEffect(() => {
    if (consoleMessages.length > 0 && !consoleOpen) {
      setHasNewMessage(true)
      const timer = setTimeout(() => setHasNewMessage(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [consoleMessages.length, consoleOpen])

  const clearConsole = useCallback(() => {
    setConsoleMessages([])
  }, [])

  const getPresetIcon = (icon: ScreenPreset['icon']) => {
    switch (icon) {
      case 'mobile':
        return <Smartphone className="w-3.5 h-3.5" />
      case 'desktop':
        return <Monitor className="w-3.5 h-3.5" />
    }
  }

  // Handle Escape key to cancel selection
  useEffect(() => {
    if (!isSelecting) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setIsSelecting(false)
        setSelection(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isSelecting])

  // Handle webview events
  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) return

    const handleStartLoading = (): void => {
      setIsLoading(true)
      // Clear console on navigation
      setConsoleMessages([])
    }

    const handleStopLoading = (): void => {
      setIsLoading(false)
      // Update navigation state after loading completes
      if (webview) {
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      }
    }

    const handleDidNavigate = (event: Electron.DidNavigateEvent): void => {
      setCurrentUrl(event.url)
      setUrlInputValue(event.url)
      setIsEditingUrl(false)
      // Update navigation state after navigation
      if (webview) {
        setCanGoBack(webview.canGoBack())
        setCanGoForward(webview.canGoForward())
      }
    }

    const handlePageTitleUpdated = (event: Electron.PageTitleUpdatedEvent): void => {
      if (onTitleChange) {
        onTitleChange(event.title)
      }
    }

    const handleConsoleMessage = (event: Electron.ConsoleMessageEvent): void => {
      const newMessage: ConsoleMessage = {
        id: messageIdRef.current++,
        level: mapConsoleLevel(event.level),
        message: event.message,
        timestamp: new Date()
      }
      setConsoleMessages((prev) => [...prev.slice(-99), newMessage]) // Keep last 100 messages
    }

    webview.addEventListener('did-start-loading', handleStartLoading)
    webview.addEventListener('did-stop-loading', handleStopLoading)
    webview.addEventListener('did-navigate', handleDidNavigate)
    webview.addEventListener('did-navigate-in-page', handleDidNavigate as EventListener)
    webview.addEventListener('page-title-updated', handlePageTitleUpdated)
    webview.addEventListener('console-message', handleConsoleMessage)

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading)
      webview.removeEventListener('did-stop-loading', handleStopLoading)
      webview.removeEventListener('did-navigate', handleDidNavigate)
      webview.removeEventListener('did-navigate-in-page', handleDidNavigate as EventListener)
      webview.removeEventListener('page-title-updated', handlePageTitleUpdated)
      webview.removeEventListener('console-message', handleConsoleMessage)
    }
  }, [onTitleChange])

  const handleRefresh = useCallback(() => {
    webviewRef.current?.reload()
  }, [])

  const handleGoBack = useCallback(() => {
    webviewRef.current?.goBack()
  }, [])

  const handleGoForward = useCallback(() => {
    webviewRef.current?.goForward()
  }, [])

  const handleNavigateToUrl = useCallback((newUrl: string) => {
    if (!webviewRef.current) return
    // Add protocol if missing
    let finalUrl = newUrl.trim()
    if (finalUrl && !finalUrl.match(/^https?:\/\//i)) {
      finalUrl = `https://${finalUrl}`
    }
    if (finalUrl) {
      webviewRef.current.src = finalUrl
      setIsEditingUrl(false)
    }
  }, [])

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleNavigateToUrl(urlInputValue)
        urlInputRef.current?.blur()
      } else if (e.key === 'Escape') {
        setUrlInputValue(currentUrl)
        setIsEditingUrl(false)
        urlInputRef.current?.blur()
      }
    },
    [urlInputValue, currentUrl, handleNavigateToUrl]
  )

  const handleUrlFocus = useCallback(() => {
    setIsEditingUrl(true)
    // Select all text on focus for easy replacement
    setTimeout(() => urlInputRef.current?.select(), 0)
  }, [])

  const handleUrlBlur = useCallback(() => {
    setIsEditingUrl(false)
    // Reset to current URL if not navigating
    setUrlInputValue(currentUrl)
  }, [currentUrl])

  const handleOpenExternal = useCallback(() => {
    if (window.electron?.shell?.openExternal) {
      window.electron.shell.openExternal(currentUrl)
    } else {
      window.open(currentUrl, '_blank')
    }
  }, [currentUrl])

  // Start screenshot selection mode
  const handleStartScreenshot = useCallback(() => {
    setIsSelecting(true)
    setSelection(null)
  }, [])

  // Cancel screenshot selection
  const handleCancelScreenshot = useCallback(() => {
    setIsSelecting(false)
    setSelection(null)
  }, [])

  // Handle mouse down to start selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const startX = e.clientX - rect.left
      const startY = e.clientY - rect.top

      setSelection({
        startX,
        startY,
        endX: startX,
        endY: startY
      })
    },
    [isSelecting]
  )

  // Handle mouse move to update selection
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selection || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
      const endY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

      setSelection((prev) => (prev ? { ...prev, endX, endY } : null))
    },
    [isSelecting, selection]
  )

  // Handle mouse up to complete selection and capture
  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection || !webviewRef.current || !containerRef.current) return

    // Calculate the selection rectangle
    const x = Math.min(selection.startX, selection.endX)
    const y = Math.min(selection.startY, selection.endY)
    const width = Math.abs(selection.endX - selection.startX)
    const height = Math.abs(selection.endY - selection.startY)

    // Ignore tiny selections (accidental clicks)
    if (width < 10 || height < 10) {
      setSelection(null)
      return
    }

    setIsCapturing(true)

    try {
      // Capture the entire webview
      const image = await webviewRef.current.capturePage()
      const fullDataUrl = image.toDataURL()

      // Get the container dimensions to calculate scale
      const containerRect = containerRef.current.getBoundingClientRect()
      const imageSize = image.getSize()

      // Calculate scale factor (webview might be scaled)
      const scaleX = imageSize.width / containerRect.width
      const scaleY = imageSize.height / containerRect.height

      // Crop the image using canvas
      const canvas = document.createElement('canvas')
      canvas.width = width * scaleX
      canvas.height = height * scaleY
      const ctx = canvas.getContext('2d')

      if (ctx) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(
            img,
            x * scaleX,
            y * scaleY,
            width * scaleX,
            height * scaleY,
            0,
            0,
            width * scaleX,
            height * scaleY
          )

          const croppedDataUrl = canvas.toDataURL('image/png')

          // Reset state
          setIsSelecting(false)
          setSelection(null)
          setIsCapturing(false)

          // Trigger callback with captured image
          if (onScreenshotCaptured) {
            onScreenshotCaptured(croppedDataUrl)
          }
        }
        img.src = fullDataUrl
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error)
      setIsCapturing(false)
      setIsSelecting(false)
      setSelection(null)
    }
  }, [isSelecting, selection, onScreenshotCaptured])

  // Calculate selection box style
  const selectionStyle = selection
    ? {
        left: Math.min(selection.startX, selection.endX),
        top: Math.min(selection.startY, selection.endY),
        width: Math.abs(selection.endX - selection.startX),
        height: Math.abs(selection.endY - selection.startY)
      }
    : null

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 border-b">
        {/* Navigation buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleGoBack}
              disabled={!canGoBack}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleGoForward}
              disabled={!canGoForward}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Forward</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>

        {/* URL input */}
        <input
          ref={urlInputRef}
          type="text"
          value={urlInputValue}
          onChange={(e) => setUrlInputValue(e.target.value)}
          onKeyDown={handleUrlKeyDown}
          onFocus={handleUrlFocus}
          onBlur={handleUrlBlur}
          className={cn(
            'flex-1 mx-2 px-3 py-1 bg-background rounded-full text-xs border outline-none',
            'focus:ring-1 focus:ring-ring focus:border-primary',
            isEditingUrl ? 'text-foreground' : 'text-muted-foreground'
          )}
          placeholder="Enter URL..."
        />

        {/* Responsive testing buttons */}
        <div className="flex items-center gap-0.5 border-l pl-2 mr-1">
          {/* Full width button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedPreset === null ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedPreset(null)}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Full width</TooltipContent>
          </Tooltip>

          {/* Screen presets */}
          {SCREEN_PRESETS.map((preset) => (
            <Tooltip key={preset.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={selectedPreset?.id === preset.id ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setSelectedPreset(preset)}
                >
                  {getPresetIcon(preset.icon)}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {preset.name} ({preset.width}px wide)
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Screenshot button */}
        {onScreenshotCaptured && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isSelecting ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={isSelecting ? handleCancelScreenshot : handleStartScreenshot}
                disabled={isCapturing}
              >
                <Scissors className={cn('w-4 h-4', isSelecting && 'text-primary')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isSelecting ? 'Cancel' : 'Screenshot region'}</TooltipContent>
          </Tooltip>
        )}

        {/* Console messages */}
        <Popover open={consoleOpen} onOpenChange={setConsoleOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={totalIssues > 0 ? 'secondary' : 'ghost'}
              size="icon"
              className={cn('h-7 w-7 relative', errorCount > 0 && 'text-destructive')}
            >
              <Terminal className="w-4 h-4" />
              {totalIssues > 0 && (
                <>
                  {/* Ripple effect on new messages */}
                  {hasNewMessage && (
                    <span
                      className={cn(
                        'absolute inset-0 rounded-md animate-ping',
                        errorCount > 0 ? 'bg-destructive/40' : 'bg-warning/40'
                      )}
                    />
                  )}
                  <Badge
                    variant={errorCount > 0 ? 'destructive' : 'default'}
                    className={cn(
                      'absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center',
                      hasNewMessage && 'animate-bounce'
                    )}
                  >
                    {totalIssues}
                  </Badge>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0" align="end">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
              <span className="text-sm font-medium">Console</span>
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <span className="text-xs text-destructive flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {errorCount}
                  </span>
                )}
                {warningCount > 0 && (
                  <span className="text-xs text-warning flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {warningCount}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={clearConsole}
                  disabled={consoleMessages.length === 0}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <ScrollArea className="h-64">
              {consoleMessages.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  No console messages
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {consoleMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'text-xs font-mono px-2 py-1 rounded',
                        msg.level === 'error' && 'bg-destructive/10 text-destructive',
                        msg.level === 'warning' && 'bg-warning/10 text-warning',
                        msg.level === 'log' && 'bg-muted/50',
                        msg.level === 'info' && 'bg-blue-500/10 text-blue-500',
                        msg.level === 'debug' && 'bg-muted/30 text-muted-foreground'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="shrink-0 opacity-50">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="break-all">{msg.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenExternal}>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open in browser</TooltipContent>
        </Tooltip>
      </div>

      {/* Webview Content */}
      <section
        ref={containerRef}
        className={cn('flex-1 relative overflow-auto', selectedPreset && 'bg-muted/30')}
        aria-label="Web content"
        onMouseDown={isSelecting ? handleMouseDown : undefined}
        onMouseMove={isSelecting ? handleMouseMove : undefined}
        onMouseUp={isSelecting ? handleMouseUp : undefined}
        onMouseLeave={
          isSelecting
            ? () => {
                if (selection) handleMouseUp()
              }
            : undefined
        }
      >
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden z-10">
            <div className="h-full w-1/3 bg-primary animate-[loading_1s_ease-in-out_infinite]" />
          </div>
        )}

        {/* Responsive container */}
        <div
          className={cn(
            'h-full',
            selectedPreset ? 'mx-auto border-x border-border shadow-lg bg-background' : 'w-full'
          )}
          style={
            selectedPreset
              ? {
                  width: selectedPreset.width,
                  maxWidth: '100%'
                }
              : undefined
          }
        >
          {/* Resolution indicator */}
          {selectedPreset && (
            <div className="sticky top-0 left-0 right-0 bg-muted/80 backdrop-blur-sm border-b px-2 py-1 text-xs text-muted-foreground text-center z-10">
              {selectedPreset.name} • {selectedPreset.width}px
            </div>
          )}

          <webview
            ref={webviewRef as React.RefObject<Electron.WebviewTag>}
            src={url}
            className="w-full h-full"
            // @ts-expect-error - webview attributes not in React types
            allowpopups="true"
          />
        </div>

        {/* Selection overlay */}
        {isSelecting && (
          <div
            className="absolute inset-0 bg-black/30 cursor-crosshair z-20"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Instructions */}
            {!selection && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 px-4 py-2 rounded-lg shadow-lg text-sm">
                Drag to select region • Press Esc to cancel
              </div>
            )}

            {/* Selection box */}
            {selectionStyle && (
              <div
                className="absolute border-2 border-primary bg-primary/10"
                style={selectionStyle}
              >
                {/* Dimension label */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-background/90 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                  {Math.round(selectionStyle.width)} × {Math.round(selectionStyle.height)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Capturing indicator */}
        {isCapturing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
            <div className="bg-background px-4 py-2 rounded-lg shadow-lg text-sm">Capturing...</div>
          </div>
        )}
      </section>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  )
}
