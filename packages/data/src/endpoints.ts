/**
 * API Endpoints - All external URLs used by the data module
 */

// ═══════════════════════════════════════════════════════════════════════════
// GITHUB
// ═══════════════════════════════════════════════════════════════════════════

export const GITHUB_API = 'https://api.github.com'
export const GITHUB_GRAPHQL = 'https://api.github.com/graphql'

// ═══════════════════════════════════════════════════════════════════════════
// CLAUDE / ANTHROPIC
// ═══════════════════════════════════════════════════════════════════════════

export const CLAUDE_API = 'https://api.anthropic.com/v1'
export const CLAUDE_MODELS: string = `${CLAUDE_API}/models`
export const CLAUDE_MESSAGES: string = `${CLAUDE_API}/messages`
