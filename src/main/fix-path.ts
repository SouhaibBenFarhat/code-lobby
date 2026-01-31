/**
 * Fix PATH for packaged Electron apps
 *
 * Packaged Electron apps on macOS don't inherit the user's shell PATH.
 * This module reads the PATH from the user's default shell configuration.
 *
 * This is the same approach used by the `fix-path` npm package,
 * implemented in a CommonJS-compatible way.
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Get the user's shell PATH by running their shell in interactive login mode
 */
function getShellPath(): string | null {
  const shell = process.env.SHELL || '/bin/zsh'

  try {
    // Run shell in interactive login mode to load .zshrc/.bashrc etc.
    // -i = interactive (loads rc files)
    // -l = login (loads profile files)
    // -c = command to execute
    const result = execSync(`${shell} -ilc 'echo -n $PATH'`, {
      encoding: 'utf8',
      timeout: 10000,
      // Prevent shell from hanging on prompts
      stdio: ['ignore', 'pipe', 'ignore']
    })

    return result.trim()
  } catch {
    // If shell command fails, try without -i flag (some shells don't support it)
    try {
      const result = execSync(`${shell} -lc 'echo -n $PATH'`, {
        encoding: 'utf8',
        timeout: 10000,
        stdio: ['ignore', 'pipe', 'ignore']
      })
      return result.trim()
    } catch {
      return null
    }
  }
}

/**
 * Get additional paths where Node.js tools might be installed.
 * These are fallbacks in case shell PATH detection fails.
 */
function getAdditionalPaths(): string[] {
  const home = homedir()
  const paths: string[] = []

  // Common Node version manager paths
  const possiblePaths = [
    // FNM
    join(home, '.local', 'share', 'fnm', 'aliases', 'default', 'bin'),
    // Volta
    join(home, '.volta', 'bin'),
    // NVM
    join(home, '.nvm', 'current', 'bin'),
    // Homebrew (Apple Silicon)
    '/opt/homebrew/bin',
    // Homebrew (Intel)
    '/usr/local/bin',
    // Global npm
    join(home, '.npm-global', 'bin'),
    // PNPM
    join(home, 'Library', 'pnpm'),
    // Local bin
    join(home, '.local', 'bin')
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      paths.push(p)
    }
  }

  return paths
}

/**
 * Fix the PATH environment variable for packaged Electron apps.
 * Call this early in your main process, before importing modules that spawn processes.
 */
export function fixPath(): void {
  // Only needed on macOS
  if (process.platform !== 'darwin') {
    return
  }

  const originalPath = process.env.PATH || ''

  // Try to get PATH from shell
  const shellPath = getShellPath()

  if (shellPath && shellPath.length > 0) {
    process.env.PATH = shellPath
    console.log('[fix-path] Set PATH from shell config')
  } else {
    // Fallback: add known paths
    const additionalPaths = getAdditionalPaths()
    if (additionalPaths.length > 0) {
      process.env.PATH = [...additionalPaths, originalPath].join(':')
      console.log('[fix-path] Set PATH from fallback paths:', additionalPaths)
    }
  }
}
