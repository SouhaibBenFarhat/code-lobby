/**
 * ApiKeyInput - Form to enter Claude API key when not configured
 */

import { useSetClaudeApiKey } from '@data'
import { Button, Input } from '@ui-kit'
import { ExternalLink, Key, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ApiKeyInputProps {
  onOpenExternal?: (url: string) => void
}

export function ApiKeyInput({ onOpenExternal }: ApiKeyInputProps): React.JSX.Element {
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
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
            <Key className="w-8 h-8 text-orange-500" />
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

        <div className="pt-4 border-t">
          <button
            type="button"
            onClick={() => onOpenExternal?.('https://console.anthropic.com/settings/keys')}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            Get an API key from Anthropic Console
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
