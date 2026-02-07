/**
 * ClaudeCodeBanner - Shows installation instructions when Claude Code CLI is not installed
 */

import { Button } from '@ui-kit'
import { ExternalLink, Terminal } from 'lucide-react'

interface ClaudeCodeBannerProps {
  onOpenExternal?: (url: string) => void
}

export function ClaudeCodeBanner({ onOpenExternal }: ClaudeCodeBannerProps): React.JSX.Element {
  const handleInstallClick = () => {
    onOpenExternal?.('https://docs.anthropic.com/en/docs/claude-code')
  }

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('npm install -g @anthropic-ai/claude-code')
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
        <Terminal className="w-8 h-8 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-semibold mb-2">Claude Code Required</h3>

      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        AI chat is powered by Claude Code CLI, which provides powerful code analysis capabilities
        including file access, code search, and web browsing.
      </p>

      <div className="bg-surface rounded-lg p-3 mb-4 font-mono text-sm">
        <code>npm install -g @anthropic-ai/claude-code</code>
        <Button variant="ghost" size="sm" className="ml-2" onClick={handleCopyCommand}>
          Copy
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        After installing, restart CodeLobby to enable AI features.
      </p>

      <Button variant="outline" size="sm" onClick={handleInstallClick} className="gap-2">
        <ExternalLink className="w-4 h-4" />
        View Documentation
      </Button>
    </div>
  )
}
