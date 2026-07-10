/**
 * TokenInput - GitHub authentication screen.
 *
 * Primary path: "Sign in with GitHub" via the OAuth device flow (no token
 * copy-paste, no scope picking — the app requests the scopes for you). Falls
 * back to a Personal Access Token under an "Advanced" toggle for power users and
 * SSO-restricted orgs. Both paths end at the same auth cache (useSignIn / the
 * device-flow hook write keys.githubToken + keys.user identically).
 */

import { useGitHubDeviceAuth, useSignIn } from '@data'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CodeLobbyLogo,
  Input
} from '@ui-kit'
import { ChevronDown, ChevronUp, ExternalLink, Github, Key, Loader2, Shield } from 'lucide-react'
import React, { useState } from 'react'

const GITHUB_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo,read:org,read:user&description=CodeLobby%20App'

export function TokenInput(): React.JSX.Element {
  const auth = useGitHubDeviceAuth()
  const [token, setToken] = useState('')
  const [showPAT, setShowPAT] = useState(false)
  const signIn = useSignIn()

  const handlePATSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    signIn.mutate(token.trim())
  }

  const isWaiting = auth.status === 'awaiting' || auth.status === 'authorizing'
  const isStarting = auth.status === 'starting'

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <Card className="w-full max-w-md relative animate-slideUp border-border bg-surface backdrop-blur-sm">
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
          {isWaiting ? (
            /* ---- Device flow: waiting for the user to authorize in the browser ---- */
            <div className="space-y-4 text-center animate-slideUp">
              <p className="text-sm text-muted-foreground">
                We opened GitHub in your browser. Enter this code to authorize:
              </p>
              <div className="text-3xl font-mono font-bold tracking-[0.3em] bg-background border border-border rounded-lg py-4 select-all">
                {auth.userCode ?? '········'}
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Waiting for authorization…</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-9 text-sm"
                  disabled={!auth.verificationUri}
                  onClick={() => {
                    if (auth.verificationUri) window.open(auth.verificationUri, '_blank')
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open GitHub
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 h-9 text-sm"
                  onClick={auth.cancel}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* ---- Default: Sign in with GitHub, with PAT fallback ---- */
            <>
              <Button
                type="button"
                className="w-full h-11 font-medium"
                onClick={auth.start}
                disabled={isStarting}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Github className="w-4 h-4 mr-2" />
                    Sign in with GitHub
                  </>
                )}
              </Button>

              {auth.status === 'error' && auth.error && (
                <p className="text-sm text-destructive text-center">{auth.error}</p>
              )}

              {/* Advanced: Personal Access Token fallback */}
              <div className="border-t border-border pt-4 space-y-3">
                <Button
                  type="button"
                  variant="unstyled"
                  size="none"
                  onClick={() => setShowPAT(!showPAT)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Key className="w-3.5 h-3.5" />
                    Use a Personal Access Token instead
                  </span>
                  {showPAT ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>

                {showPAT && (
                  <div className="space-y-4 animate-slideUp">
                    <form onSubmit={handlePATSubmit} className="space-y-3">
                      <Input
                        id="token"
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        className="font-mono text-sm bg-background"
                        disabled={signIn.isPending}
                      />
                      {signIn.isError && (
                        <p className="text-sm text-destructive">
                          {signIn.error?.message || 'Invalid token. Please try again.'}
                        </p>
                      )}
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full h-10 font-medium"
                        disabled={signIn.isPending || !token.trim()}
                      >
                        {signIn.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting…
                          </>
                        ) : (
                          <>
                            <Shield className="w-4 h-4 mr-2" />
                            Connect with Token
                          </>
                        )}
                      </Button>
                    </form>

                    <Button
                      type="button"
                      variant="unstyled"
                      size="none"
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                      onClick={() => window.open(GITHUB_TOKEN_URL, '_blank')}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Create a token (scopes pre-filled)
                    </Button>

                    <p className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-success">🔒</span>
                      <span>Your token is stored locally on your machine only.</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
