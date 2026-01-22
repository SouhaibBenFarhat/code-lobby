/**
 * GitHub API namespace
 *
 * All GitHub-related API calls with automatic logging
 */

/// <reference path="../../../../src/preload/electron-api.d.ts" />

import { call } from '../call'
import { LogCategory } from '../logger'

export const github = {
  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════════════════

  async getToken(): Promise<string | null> {
    return call('github.getToken', () => window.electron.getToken(), undefined, {
      category: LogCategory.AUTH,
      logResponse: false // Don't log token
    })
  },

  async setToken(token: string): Promise<{ success: boolean; user?: unknown; error?: string }> {
    return call(
      'github.setToken',
      () => window.electron.setToken(token),
      undefined, // Don't log token as param
      { category: LogCategory.AUTH, logParams: false }
    )
  },

  async validateToken(): Promise<{ valid: boolean; user?: unknown }> {
    return call('github.validateToken', () => window.electron.validateToken(), undefined, {
      category: LogCategory.AUTH
    })
  },

  async clearToken(): Promise<{ success: boolean }> {
    return call('github.clearToken', () => window.electron.clearToken(), undefined, {
      category: LogCategory.AUTH
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPOSITORIES
  // ═══════════════════════════════════════════════════════════════════════════

  async fetchContributedRepos(): Promise<{
    success: boolean
    data?: unknown[]
    error?: string
  }> {
    return call(
      'github.fetchContributedRepos',
      () => window.electron.fetchContributedRepos(),
      undefined,
      { category: LogCategory.GRAPHQL }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PULL REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════

  async fetchPRs(): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
    return call('github.fetchPRs', () => window.electron.fetchPRs(), undefined, {
      category: LogCategory.GRAPHQL
    })
  },

  async fetchAllPRsForRepos(repoFullNames: string[]): Promise<{
    success: boolean
    data?: unknown[]
    currentUser?: string
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }
    error?: string
  }> {
    return call(
      'github.fetchAllPRsForRepos',
      () => window.electron.fetchAllPRsForRepos(repoFullNames),
      { repos: repoFullNames.length },
      { category: LogCategory.GRAPHQL }
    )
  },

  async refreshRepoPRs(repoFullName: string): Promise<{
    success: boolean
    data?: unknown[]
    currentUser?: string
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }
    error?: string
  }> {
    return call(
      'github.refreshRepoPRs',
      () => window.electron.refreshRepoPRs(repoFullName),
      { repo: repoFullName },
      { category: LogCategory.GRAPHQL }
    )
  },

  async fetchPREvents(): Promise<{ success: boolean; data?: unknown[]; error?: string }> {
    return call('github.fetchPREvents', () => window.electron.fetchPREvents(), undefined, {
      category: LogCategory.GRAPHQL
    })
  },

  async fetchPRChecks(
    owner: string,
    repo: string,
    ref: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return call(
      'github.fetchPRChecks',
      () => window.electron.fetchPRChecks(owner, repo, ref),
      { owner, repo, ref },
      { category: LogCategory.GRAPHQL }
    )
  },

  async fetchPRFiles(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<{
    success: boolean
    data?: Array<{
      path: string
      additions: number
      deletions: number
      changeType: 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAMED' | 'COPIED'
      patch: string | null
    }>
    rateLimit?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }
    error?: string
  }> {
    return call(
      'github.fetchPRFiles',
      () => window.electron.fetchPRFiles(owner, repo, prNumber),
      { owner, repo, prNumber },
      { category: LogCategory.GRAPHQL }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PR COMMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  async postPRComment(
    owner: string,
    repo: string,
    prNumber: number,
    commitId: string,
    path: string,
    line: number,
    body: string
  ): Promise<{ success: boolean; commentUrl?: string; error?: string }> {
    return call(
      'github.postPRComment',
      () => window.electron.postPRComment(owner, repo, prNumber, commitId, path, line, body),
      { owner, repo, prNumber, path, line, bodyLength: body.length },
      { category: LogCategory.GRAPHQL }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RATE LIMIT
  // ═══════════════════════════════════════════════════════════════════════════

  async getRateLimit(): Promise<{
    success: boolean
    data?: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      percentage: number
    }
    error?: string
  }> {
    return call('github.getRateLimit', () => window.electron.getRateLimit(), undefined, {
      category: LogCategory.RATE_LIMIT
    })
  }
}
