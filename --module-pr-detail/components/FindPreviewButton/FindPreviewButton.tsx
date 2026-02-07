/**
 * FindPreviewButton - AI-powered button to find preview/staging environment URLs
 *
 * Uses Claude (Haiku) to analyze PR description and comments to find deploy preview URLs.
 * Results are cached forever per PR ID since preview URLs don't change.
 */

import { useClaudeApiKey, useFindPreviewUrl } from '@data'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@ui-kit'
import { Check, Copy, ExternalLink, Eye, Loader2, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { useSelectedPR } from '../../hooks'

export function FindPreviewButton(): React.JSX.Element | null {
  const { pr } = useSelectedPR()
  const { data: apiKey } = useClaudeApiKey()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasTriggeredSearch, setHasTriggeredSearch] = useState(false)

  // Build params for the hook - collect ALL text content from PR
  const params = pr
    ? {
        prId: `${pr.base.repo.full_name}#${pr.number}`,
        description: pr.body,
        comments: [
          // PR conversation comments
          ...(pr.commentsList || []).map((c) => ({
            body: c.body,
            author: { login: c.author.login }
          })),
          // Review comments (often contain deploy bot messages)
          ...(pr.reviews || [])
            .filter((r) => r.body)
            .map((r) => ({
              body: r.body || '',
              author: { login: r.author.login }
            })),
          // Review thread comments (inline comments)
          ...(pr.reviewThreads || []).flatMap((t) =>
            t.comments.map((c) => ({
              body: c.body,
              author: { login: c.author.login }
            }))
          )
        ]
      }
    : null

  const { data, isFetching, search } = useFindPreviewUrl(params)

  if (!pr) return null

  // Validate URL - reject template URLs like ${PR_NUMBER}
  const isValidUrl = (url: string | null): url is string => {
    if (!url) return false
    try {
      new URL(url)
      return !url.includes('${') && !url.includes('{')
    } catch {
      return false
    }
  }

  const previewUrl = data?.found && isValidUrl(data.url) ? data.url : null
  const hasError = !!data?.error || (data?.found && !isValidUrl(data?.url))

  // Safely get hostname from URL
  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname
    } catch {
      return url.slice(0, 30)
    }
  }

  // Open URL - fallback to window.open in dev mode
  const openUrl = (url: string) => {
    if (window.electron?.shell?.openExternal) {
      window.electron.shell.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }
  // Only consider "searched" if user actually triggered it AND we have an API key
  const hasSearched = hasTriggeredSearch && !!apiKey && data !== undefined && !hasError

  const handleCopy = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClick = () => {
    if (!apiKey) {
      // No API key - show error
      alert('Please set your Claude API key in the AI Chat settings first.')
      return
    }

    if (previewUrl) {
      // Already found - toggle popover
      setPopoverOpen(!popoverOpen)
    } else {
      // Search (first time or retry)
      setHasTriggeredSearch(true)
      search()
    }
  }

  // Determine button appearance based on state
  const getButtonContent = () => {
    if (isFetching) {
      return (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Finding...</span>
        </>
      )
    }

    if (previewUrl) {
      return (
        <>
          <Eye className="w-3.5 h-3.5 text-emerald-500" />
          <span className="max-w-[100px] truncate">{getHostname(previewUrl)}</span>
        </>
      )
    }

    if (hasError) {
      return (
        <>
          <Sparkles className="w-3.5 h-3.5 text-destructive" />
          <Eye className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive">Retry</span>
        </>
      )
    }

    if (hasSearched && !data?.found) {
      return (
        <>
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          <Eye className="w-3.5 h-3.5" />
          <span>Retry</span>
        </>
      )
    }

    return (
      <>
        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
        <Eye className="w-3.5 h-3.5" />
        <span>Find Preview</span>
      </>
    )
  }

  const getTooltipContent = () => {
    if (!apiKey) return 'Set Claude API key first'
    if (hasError) return `Error: ${data?.error} - Click to retry`
    if (previewUrl) return 'Click to see preview URL'
    if (hasSearched && !data?.found) return 'No URL found - click to retry'
    return 'Use AI to find preview environment URL'
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 gap-1.5 text-xs ${previewUrl ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
              onClick={handleClick}
              disabled={isFetching}
            >
              {getButtonContent()}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{getTooltipContent()}</TooltipContent>
      </Tooltip>

      {previewUrl && (
        <PopoverContent className="w-96" align="start">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-500" />
              <span className="font-medium text-sm">Preview Environment</span>
            </div>
            <div className="flex items-start gap-2 p-2 bg-surface rounded-md">
              <button
                type="button"
                onClick={() => openUrl(previewUrl)}
                className="flex-1 text-sm text-primary hover:underline text-left break-all"
              >
                {previewUrl}
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{copied ? 'Copied!' : 'Copy URL'}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openUrl(previewUrl)}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in browser</TooltipContent>
              </Tooltip>
            </div>
            <p className="text-xs text-muted-foreground">
              Found by AI from PR comments and description.
            </p>
          </div>
        </PopoverContent>
      )}
    </Popover>
  )
}
