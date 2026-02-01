/**
 * Persistence Utilities
 *
 * Helper functions for session ID generation and parsing.
 */

/**
 * Generate a PR session ID
 */
export function getPRSessionId(owner: string, repo: string, prNumber: number): string {
  return `pr-${owner}-${repo}-${prNumber}`
}

/**
 * Generate a general chat session ID
 */
export function getGeneralSessionId(): string {
  return 'general'
}

/**
 * Parse a PR session ID
 */
export function parsePRSessionId(
  sessionId: string
): { owner: string; repo: string; prNumber: number } | null {
  const match = sessionId.match(/^pr-(.+)-(.+)-(\d+)$/)
  if (!match) return null

  return {
    owner: match[1],
    repo: match[2],
    prNumber: parseInt(match[3], 10)
  }
}

/**
 * Check if a session ID is for a PR
 */
export function isPRSession(sessionId: string): boolean {
  return sessionId.startsWith('pr-')
}

/**
 * Check if a session ID is for general chat
 */
export function isGeneralSession(sessionId: string): boolean {
  return sessionId === 'general'
}
