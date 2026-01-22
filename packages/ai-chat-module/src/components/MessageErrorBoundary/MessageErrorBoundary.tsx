/**
 * Error boundary for message content rendering.
 * Catches React errors during rendering and logs them.
 */

import { api } from '@codelobby/api'
import { AlertCircle } from 'lucide-react'
import React from 'react'

interface MessageErrorBoundaryProps {
  children: React.ReactNode
  messageId?: string
  content?: string
}

interface MessageErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class MessageErrorBoundary extends React.Component<
  MessageErrorBoundaryProps,
  MessageErrorBoundaryState
> {
  constructor(props: MessageErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): MessageErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log to console for debugging
    console.error('[AIChat] Message render error:', error)
    console.error('[AIChat] Error info:', errorInfo)
    console.error('[AIChat] Message ID:', this.props.messageId)
    console.error('[AIChat] Content preview:', this.props.content?.slice(0, 500))

    // Log to app logs via the centralized API
    api.logs.logFromRenderer('error', 'AI Chat', `Message render error: ${error.message}`, {
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      messageId: this.props.messageId,
      contentPreview: this.props.content?.slice(0, 200)
    })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
          <div className="flex items-center gap-2 text-destructive font-medium mb-1">
            <AlertCircle className="w-4 h-4" />
            Failed to render message
          </div>
          <p className="text-muted-foreground text-xs">
            {this.state.error?.message || 'Unknown rendering error'}
          </p>
          {this.props.content && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Show raw content
              </summary>
              <pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
                {this.props.content}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}
