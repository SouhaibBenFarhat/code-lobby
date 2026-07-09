/**
 * ApiKeyInput - Form to enter Claude API key when not configured
 */

import { useSetClaudeApiKey } from '@data'
import { Button, Input } from '@ui-kit'
import { ExternalLink, Key, Loader2, Terminal } from 'lucide-react'
import { useState } from 'react'

interface ApiKeyInputProps {
  onOpenExternal?: (url: string) => void
  onSwitchToCliMode?: () => void
  isClaudeCodeInstalled?: boolean
}

export function ApiKeyInput({
  onOpenExternal,
  onSwitchToCliMode,
  isClaudeCodeInstalled
}: ApiKeyInputProps): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const setClaudeApiKey = useSetClaudeApiKey()

  const handleSubmit = () => {
    if (!apiKey.trim()) return
    setClaudeApiKey.mutate(apiKey.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-warning-subtle flex items-center justify-center">
            <Key className="w-8 h-8 text-warning" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Claude API Key Required</h3>
          <p className="text-sm text-muted-foreground">
            Enter your Anthropic API key to enable AI-powered features. Your key is stored locally
            and never shared.
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            placeholder="sk-ant-api03-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-center"
            autoFocus
          />

          <Button
            onClick={handleSubmit}
            disabled={!apiKey.trim() || setClaudeApiKey.isPending}
            className="w-full"
          >
            {setClaudeApiKey.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Save API Key
              </>
            )}
          </Button>

          {setClaudeApiKey.isError && (
            <p className="text-sm text-destructive">Failed to save API key. Please try again.</p>
          )}
        </div>

        <div className="pt-4 border-t space-y-3">
          <button
            type="button"
            onClick={() => onOpenExternal?.('https://console.anthropic.com/settings/keys')}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            Get an API key from Anthropic Console
            <ExternalLink className="w-3 h-3" />
          </button>

          {/* CLI Subscription Alternative */}
          {onSwitchToCliMode && (
            <div className="pt-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">
                Have a Claude Pro/Max subscription?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToCliMode}
                disabled={!isClaudeCodeInstalled}
                className="text-xs"
              >
                <Terminal className="w-3.5 h-3.5 mr-1.5" />
                {isClaudeCodeInstalled
                  ? 'Use Claude Code CLI instead'
                  : 'Install Claude Code CLI first'}
              </Button>
              {!isClaudeCodeInstalled && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Run: npm install -g @anthropic-ai/claude-code
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
