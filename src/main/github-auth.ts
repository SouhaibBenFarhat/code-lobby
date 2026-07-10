/**
 * GitHub OAuth Device Flow
 *
 * Lets users sign in with a "Sign in with GitHub" button instead of manually
 * creating a Personal Access Token. Uses the OAuth Device Authorization flow,
 * which needs ONLY a public client_id (no client secret) — safe to ship in a
 * distributed desktop app and requires no backend server.
 *
 * Flow:
 *  1. requestDeviceCode(): POST /login/device/code → { user_code, verification_uri, device_code, interval, expires_in }
 *  2. Renderer shows the code + opens the browser to verification_uri_complete.
 *  3. pollForAccessToken(): poll POST /login/oauth/access_token until the user
 *     authorizes (or it expires / is denied), then emit the access token.
 *
 * These endpoints live on github.com (NOT api.github.com) and do not send CORS
 * headers, so this MUST run in the main process, not the renderer.
 */

import { LogCategory, mainLogger as logger } from '@logger/main'
import type { BrowserWindow } from 'electron'

// =============================================================================
// Config
// =============================================================================

/**
 * OAuth App Client ID. This is a PUBLIC value — safe to commit and ship (OAuth
 * App client IDs are not secrets, and the device flow uses no client secret).
 * Ships as the default so sign-in works in dev and in packaged builds; override
 * with the GITHUB_CLIENT_ID env var (e.g. to point at your own OAuth App).
 *
 * Read at call time (not module load) so it can be overridden at runtime and by
 * tests without re-importing the module. Uses `??` so an explicit empty env var
 * (GITHUB_CLIENT_ID="") disables sign-in, while unset falls back to the default.
 */
const DEFAULT_CLIENT_ID = 'Ov23livdCWnp0uf0BMvt'

function getClientId(): string {
  return process.env.GITHUB_CLIENT_ID ?? DEFAULT_CLIENT_ID
}

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

/** Scopes CodeLobby needs: repos, org membership, and profile. */
const SCOPES = 'repo read:org read:user'

/** Minimum poll interval GitHub allows (seconds). */
const MIN_INTERVAL_SECONDS = 5

// =============================================================================
// Types
// =============================================================================

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete?: string
  expires_in: number
  interval: number
}

export interface StartDeviceAuthResult {
  success: boolean
  userCode?: string
  verificationUri?: string
  verificationUriComplete?: string
  expiresIn?: number
  error?: string
}

// =============================================================================
// State
// =============================================================================

/** Set true to stop the active polling loop (user closed the sign-in screen). */
let cancelled = false

// =============================================================================
// Helpers
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// =============================================================================
// Device Code Request
// =============================================================================

/**
 * Request a device + user code from GitHub. Throws on network/config errors.
 */
export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ client_id: getClientId(), scope: SCOPES })
  })

  if (!response.ok) {
    throw new Error(`GitHub device code request failed (HTTP ${response.status})`)
  }

  const data = (await response.json()) as DeviceCodeResponse & {
    error?: string
    error_description?: string
  }

  if (data.error) {
    throw new Error(data.error_description || data.error)
  }

  return data
}

// =============================================================================
// Token Polling
// =============================================================================

/**
 * Poll GitHub until the user authorizes the device, then emit the access token.
 * Emits `github-auth:done` { token } on success, `github-auth:error` { error }
 * otherwise. Runs in the background — do NOT await from the IPC handler.
 */
export async function pollForAccessToken(
  mainWindow: BrowserWindow,
  deviceCode: string,
  intervalSeconds: number,
  expiresInSeconds: number
): Promise<void> {
  cancelled = false
  let intervalMs = Math.max(intervalSeconds, MIN_INTERVAL_SECONDS) * 1000
  const deadline = Date.now() + expiresInSeconds * 1000

  const fail = (error: string): void => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('github-auth:error', { error })
    }
  }

  while (!cancelled) {
    await sleep(intervalMs)
    if (cancelled) return

    if (Date.now() > deadline) {
      logger.warn(LogCategory.AUTH, '[OAuth] Device code expired before authorization')
      fail('The sign-in code expired. Please try again.')
      return
    }

    let data: { access_token?: string; error?: string; error_description?: string }
    try {
      const response = await fetch(ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: getClientId(),
          device_code: deviceCode,
          grant_type: GRANT_TYPE
        })
      })
      data = (await response.json()) as typeof data
    } catch (err) {
      // Transient network error — keep polling until the deadline.
      logger.debug(LogCategory.AUTH, '[OAuth] Poll network error, retrying', {
        error: (err as Error).message
      })
      continue
    }

    if (data.access_token) {
      logger.info(LogCategory.AUTH, '[OAuth] Device flow authorized, token received')
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('github-auth:done', { token: data.access_token })
      }
      return
    }

    switch (data.error) {
      case 'authorization_pending':
        // User hasn't authorized yet — keep waiting.
        break
      case 'slow_down':
        // GitHub asks us to back off — add 5s per the device-flow spec.
        intervalMs += 5000
        break
      case 'expired_token':
        fail('The sign-in code expired. Please try again.')
        return
      case 'access_denied':
        fail('Authorization was cancelled.')
        return
      default:
        fail(data.error_description || data.error || 'GitHub sign-in failed.')
        return
    }
  }
}

// =============================================================================
// Public API (called from IPC handlers)
// =============================================================================

/**
 * Kick off the device flow: request a code, start background polling, and return
 * the user-facing code + verification URL so the renderer can display them.
 */
export async function startGitHubDeviceAuth(
  mainWindow: BrowserWindow
): Promise<StartDeviceAuthResult> {
  if (!getClientId()) {
    return {
      success: false,
      error:
        'GitHub sign-in is not configured (missing OAuth App client ID). Use a Personal Access Token, or set GITHUB_CLIENT_ID.'
    }
  }

  try {
    logger.info(LogCategory.AUTH, '[OAuth] Starting GitHub device flow')
    const code = await requestDeviceCode()

    // Start polling in the background — do NOT await.
    void pollForAccessToken(mainWindow, code.device_code, code.interval, code.expires_in)

    return {
      success: true,
      userCode: code.user_code,
      verificationUri: code.verification_uri,
      verificationUriComplete: code.verification_uri_complete,
      expiresIn: code.expires_in
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.AUTH, '[OAuth] Failed to start device flow', { error: message })
    return { success: false, error: message }
  }
}

/** Cancel any in-progress polling (user closed the sign-in screen). */
export function cancelGitHubDeviceAuth(): void {
  cancelled = true
  logger.info(LogCategory.AUTH, '[OAuth] Device flow cancelled')
}
