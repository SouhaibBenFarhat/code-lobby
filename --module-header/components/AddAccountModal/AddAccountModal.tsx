/**
 * AddAccountModal
 *
 * Sign into an ADDITIONAL GitHub account from inside the app. Reuses the exact
 * same auth hooks as the first-run sign-in screen (`useGitHubDeviceAuth` +
 * `useSignIn`); because both now funnel through `upsertAccountAndActivate`, the
 * new account is appended and made active automatically. Closes on success.
 */

import { useGitHubDeviceAuth, useSignIn } from '@data'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input
} from '@ui-kit'
import { ChevronDown, ChevronUp, ExternalLink, Github, Key, Loader2, Shield } from 'lucide-react'
import React, { useEffect, useState } from 'react'

const GITHUB_TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo,read:org,read:user&description=CodeLobby%20App'

interface AddAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps): React.JSX.Element {
  const auth = useGitHubDeviceAuth()
  const signIn = useSignIn()
  const [token, setToken] = useState('')
  const [showPAT, setShowPAT] = useState(false)

  // Close once a device-flow sign-in completes (PAT closes via its own onSuccess).
  useEffect(() => {
    if (auth.status === 'success') {
      auth.reset()
      onOpenChange(false)
    }
  }, [auth.status, auth.reset, onOpenChange])

  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      auth.cancel()
      signIn.reset()
      setToken('')
      setShowPAT(false)
    }
    onOpenChange(next)
  }

  const handlePATSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!token.trim()) return
    signIn.mutate(token.trim(), { onSuccess: () => handleOpenChange(false) })
  }

  const isWaiting = auth.status === 'awaiting' || auth.status === 'authorizing'
  const isStarting = auth.status === 'starting'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a GitHub account</DialogTitle>
          <DialogDescription>
            Sign in to another account and switch between them anytime.
          </DialogDescription>
        </DialogHeader>

        {isWaiting ? (
          <div className="space-y-4 text-center">
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
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                {showPAT ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>

              {showPAT && (
                <form onSubmit={handlePATSubmit} className="space-y-3">
                  <Input
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
                </form>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
