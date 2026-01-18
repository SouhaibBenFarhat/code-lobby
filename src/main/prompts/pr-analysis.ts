/**
 * PR Analysis Prompt
 *
 * Used by the "Why Is This PR Still Open?" feature.
 * Analyzes a PR and explains what's blocking it from being merged.
 */

export interface PRAnalysisContext {
  number: number
  title: string
  author: string
  headBranch: string
  baseBranch: string
  draft: boolean
  createdAt: string
  changedFiles: number
  additions: number
  deletions: number
  body: string | null
  checks: Array<{
    name: string
    status: string
    conclusion: string | null
  }>
  reviews: Array<{
    author: string
    state: string
    body: string | null
  }>
  reviewThreads: Array<{
    path: string
    isResolved: boolean
  }>
  comments: Array<{
    author: string
    body: string
  }>
}

/**
 * Build the CI summary section
 */
export function buildCISummary(checks: PRAnalysisContext['checks']): string {
  if (checks.length === 0) {
    return 'No CI checks found'
  }

  return checks
    .map((c) => {
      const status = c.conclusion || c.status
      const icon = status === 'success' ? '✅' : status === 'failure' ? '❌' : '⏳'
      return `${icon} ${c.name}: ${status}`
    })
    .join('\n')
}

/**
 * Build the reviews summary section with full review content
 */
export function buildReviewsSummary(reviews: PRAnalysisContext['reviews']): string {
  if (reviews.length === 0) {
    return 'No reviews yet'
  }

  return reviews
    .map((r) => {
      const icon = r.state === 'approved' ? '✅' : r.state === 'changes_requested' ? '🔄' : '💬'
      const body = r.body ? `\n${r.body}` : ''
      return `${icon} **${r.author}**: ${r.state}${body}`
    })
    .join('\n\n')
}

/**
 * Build the review threads summary section
 */
export function buildThreadsSummary(reviewThreads: PRAnalysisContext['reviewThreads']): string {
  const unresolvedThreads = reviewThreads.filter((t) => !t.isResolved)

  if (unresolvedThreads.length === 0) {
    return 'All review threads resolved'
  }

  return `${unresolvedThreads.length} unresolved thread(s) in: ${unresolvedThreads.map((t) => t.path).join(', ')}`
}

/**
 * Build the comments section with all comments and full content
 */
export function buildCommentsSummary(comments: PRAnalysisContext['comments']): string {
  if (comments.length === 0) {
    return 'No comments'
  }

  return comments.map((c) => `**${c.author}**:\n${c.body}`).join('\n\n---\n\n')
}

/**
 * Build the full PR analysis prompt
 */
export function buildPRAnalysisPrompt(context: PRAnalysisContext): string {
  const ciSummary = buildCISummary(context.checks)
  const reviewsSummary = buildReviewsSummary(context.reviews)
  const threadsSummary = buildThreadsSummary(context.reviewThreads)
  const commentsSummary = buildCommentsSummary(context.comments)

  return `Analyze this Pull Request and explain why it's still open. Provide a concise, actionable summary.

## PR #${context.number}: ${context.title}
- **Author**: ${context.author}
- **Branch**: ${context.headBranch} → ${context.baseBranch}
- **Status**: ${context.draft ? 'Draft' : 'Ready for review'}
- **Created**: ${context.createdAt}
- **Changes**: ${context.changedFiles} files (+${context.additions} -${context.deletions})

## Description
${context.body || 'No description provided'}

## CI/CD Status
${ciSummary}

## Code Reviews
${reviewsSummary}

## Review Threads
${threadsSummary}

## Comments (${context.comments.length} total)
${commentsSummary}

---

Based on this information, provide a brief analysis (2-4 sentences) explaining:
1. Why this PR is still open (e.g., failing CI, pending reviews, unresolved discussions, draft status)
2. What action is needed to move it forward

Be direct and specific. Use bullet points if there are multiple blockers.`
}
