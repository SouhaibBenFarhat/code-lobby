/**
 * TokenInput - GitHub authentication form.
 */

/// <reference path="../../../src/preload/electron-api.d.ts" />

import { ChevronDown, ChevronUp, ExternalLink, Key, Loader2, Shield } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { CodeLobbyLogo } from './codelobby-logo'
import { Input } from './input'
import { toast } from './toaster'

const GITHUB_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo,read:org&description=CodeLobby%20App'

interface User {
  login: string
  avatar_url: string
  name: string | null
}

interface TokenInputProps {
  onAuthenticated: (user: User) => void
}

export function TokenInput({ onAuthenticated }: TokenInputProps): JSX.Element {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      toast({ title: 'Error', description: 'Please enter a token', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const result = await window.electron.setToken(token.trim())
      if (result.success && result.user) {
        toast({ title: 'Success', description: 'Connected to GitHub!' })
        onAuthenticated(result.user as User)
      } else {
        toast({
          title: 'Invalid Token',
          description: result.error || 'Could not authenticate with GitHub',
          variant: 'destructive'
        })
      }
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to validate token',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-md relative animate-slideUp border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <CodeLobbyLogo size={72} />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">CodeLobby</CardTitle>
            <CardDescription className="text-base">
              Monitor your pull requests in real-time
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Personal Access Token
              </label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-sm bg-background/50"
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-medium"
              disabled={isLoading || !token.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Connect to GitHub
                </>
              )}
            </Button>
          </form>

          <div className="border-t border-border pt-4 space-y-3">
            {/* Quick action button */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-9 text-sm"
              onClick={() => window.open(GITHUB_TOKEN_URL, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Create Token on GitHub
            </Button>

            {/* Collapsible instructions */}
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <span className="font-medium">How to get a Personal Access Token?</span>
              {showInstructions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showInstructions && (
              <div className="text-xs text-muted-foreground space-y-3 bg-muted/30 rounded-lg p-3 animate-slideUp">
                <p className="font-medium text-foreground">Step-by-step guide:</p>
                <ol className="space-y-2 list-decimal list-inside">
                  <li>
                    Go to{' '}
                    <button
                      type="button"
                      onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
                      className="text-primary hover:underline"
                    >
                      GitHub Settings → Developer settings → Personal access tokens
                    </button>
                  </li>
                  <li>
                    Click <strong>"Generate new token"</strong> →{' '}
                    <strong>"Generate new token (classic)"</strong>
                  </li>
                  <li>Give it a name (e.g., "CodeLobby App")</li>
                  <li>
                    Select these scopes:
                    <ul className="mt-1.5 ml-4 space-y-1">
                      <li>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">repo</code>
                        <span className="text-muted-foreground ml-1.5">
                          — access to repositories
                        </span>
                      </li>
                      <li>
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[10px]">read:org</code>
                        <span className="text-muted-foreground ml-1.5">
                          — access to organization repos
                        </span>
                      </li>
                    </ul>
                  </li>
                  <li>
                    Click <strong>"Generate token"</strong>
                  </li>
                  <li>
                    Copy the token (starts with{' '}
                    <code className="bg-muted px-1 py-0.5 rounded text-[10px]">ghp_</code>) and
                    paste it above
                  </li>
                </ol>

                <div className="border-t border-border pt-3 mt-3 space-y-2">
                  <p className="flex items-start gap-2">
                    <span className="text-primary">💡</span>
                    <span>
                      Or click the button above - it will pre-fill the token name and scopes for
                      you!
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-success">🔒</span>
                    <span>Your token is encrypted and stored locally on your machine only.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
