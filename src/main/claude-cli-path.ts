/**
 * Claude CLI Path Resolution Cache
 *
 * Caches the resolved claude binary path so we don't re-detect on every call.
 * Updated when check-claude-code-installed runs.
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { LogCategory, mainLogger as logger } from '@logger/main'

let cachedClaudePath: string | null = null

export function setCachedClaudePath(path: string | null): void {
  cachedClaudePath = path
  logger.debug(LogCategory.AI, 'Claude CLI path cached', { path })
}

export function getCachedClaudePath(): string | null {
  return cachedClaudePath
}

/**
 * Build enhanced PATH including common binary locations.
 * Reuses the same logic from check-claude-code-installed handler.
 */
export function getEnhancedPath(): string {
  const home = homedir()
  return [
    process.env.PATH,
    `${home}/.volta/bin`,
    `${home}/.local/bin`,
    '/usr/local/bin',
    '/opt/homebrew/bin',
    `${home}/.npm-global/bin`,
    `${home}/n/bin`
  ]
    .filter(Boolean)
    .join(':')
}

/**
 * Get the claude binary path to use for spawning.
 * Returns cached path if available, otherwise falls back to 'claude'.
 */
export function getClaudeBinaryPath(): string {
  if (cachedClaudePath) return cachedClaudePath

  // Try common locations as fallback
  const home = homedir()
  const possiblePaths = [
    `${home}/.volta/bin/claude`,
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    `${home}/.local/bin/claude`,
    `${home}/.npm-global/bin/claude`,
    `${home}/n/bin/claude`
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      setCachedClaudePath(p)
      return p
    }
  }

  // Fall back to hoping it's in PATH
  return 'claude'
}
