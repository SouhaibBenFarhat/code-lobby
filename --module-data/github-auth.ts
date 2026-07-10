/**
 * GitHub Device Flow sign-in hook.
 *
 * Orchestrates the "Sign in with GitHub" experience from the renderer:
 *   1. Ask the main process to start the OAuth device flow (returns a user code).
 *   2. Open the system browser to the pre-filled verification page.
 *   3. Wait for the main process to report the access token, then validate it and
 *      write it into the query cache using the SAME path as `useSignIn`
 *      (keys.githubToken + keys.user), so the rest of the app can't tell how the
 *      user signed in.
 *
 * The device-flow network calls live in the main process (github.com/login/*
 * has no CORS); this hook only talks to it over IPC via `window.electron`.
 */

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as github from './github'
import { keys } from './keys'
import type { GitHubUser } from './types'

export type GitHubAuthStatus =
  | 'idle'
  | 'starting'
  | 'awaiting'
  | 'authorizing'
  | 'success'
  | 'error'

export interface GitHubDeviceAuthState {
  /** Current phase of the flow. */
  status: GitHubAuthStatus
  /** The code the user enters on github.com (also pre-filled in the browser). */
  userCode: string | null
  /** The URL the user visits to authorize (for a manual/re-open link). */
  verificationUri: string | null
  /** Human-readable error, when status is 'error'. */
  error: string | null
  /** Begin the device flow. */
  start: () => Promise<void>
  /** Abort an in-progress flow and return to idle. */
  cancel: () => void
  /** Reset back to idle (e.g. to retry after an error). */
  reset: () => void
}

export function useGitHubDeviceAuth(): GitHubDeviceAuthState {
  const qc = useQueryClient()
  const [status, setStatus] = useState<GitHubAuthStatus>('idle')
  const [userCode, setUserCode] = useState<string | null>(null)
  const [verificationUri, setVerificationUri] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Active IPC listener cleanups, detached when the flow ends or unmounts.
  const cleanupRef = useRef<Array<() => void>>([])

  const detach = useCallback(() => {
    for (const fn of cleanupRef.current) fn()
    cleanupRef.current = []
  }, [])

  const finishWithToken = useCallback(
    async (token: string) => {
      setStatus('authorizing')
      try {
        const result = await github.validateToken(token)
        if (!result.valid || !result.user) {
          setStatus('error')
          setError('GitHub returned an invalid token.')
          return
        }
        // Same cache writes as useSignIn — single source of truth for auth.
        qc.setQueryData(keys.githubToken, token)
        qc.setQueryData(keys.user, { user: result.user as GitHubUser, token })
        qc.refetchQueries({ queryKey: keys.repos })
        setStatus('success')
      } catch {
        setStatus('error')
        setError('Could not verify the GitHub token.')
      }
    },
    [qc]
  )

  const start = useCallback(async () => {
    setError(null)
    setUserCode(null)
    setVerificationUri(null)
    setStatus('starting')
    detach()

    // Attach listeners before starting so we never miss a fast completion.
    cleanupRef.current.push(
      window.electron.onGitHubAuthDone(({ token }) => {
        detach()
        void finishWithToken(token)
      })
    )
    cleanupRef.current.push(
      window.electron.onGitHubAuthError(({ error: err }) => {
        detach()
        setStatus('error')
        setError(err)
      })
    )

    const res = await window.electron.startGitHubAuth()
    if (!res.success) {
      detach()
      setStatus('error')
      setError(res.error ?? 'Could not start GitHub sign-in.')
      return
    }

    setUserCode(res.userCode ?? null)
    setVerificationUri(res.verificationUri ?? null)
    setStatus('awaiting')

    // Open the browser straight to the pre-filled verification page.
    const url = res.verificationUriComplete ?? res.verificationUri
    if (url) {
      void window.electron.shell.openExternal(url)
    }
  }, [detach, finishWithToken])

  const cancel = useCallback(() => {
    detach()
    void window.electron.cancelGitHubAuth()
    setStatus('idle')
    setUserCode(null)
    setVerificationUri(null)
    setError(null)
  }, [detach])

  const reset = useCallback(() => {
    detach()
    setStatus('idle')
    setUserCode(null)
    setVerificationUri(null)
    setError(null)
  }, [detach])

  // Detach listeners on unmount.
  useEffect(() => detach, [detach])

  return useMemo(
    () => ({ status, userCode, verificationUri, error, start, cancel, reset }),
    [status, userCode, verificationUri, error, start, cancel, reset]
  )
}
