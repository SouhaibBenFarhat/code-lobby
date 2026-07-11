/**
 * GitHub API Client
 * All functions receive token as parameter (pure functions)
 */

import { GITHUB_API, GITHUB_GRAPHQL } from './endpoints'
import { type HttpError, http } from './http'
import type { GitHubUser, PRCommit, PRFile, PullRequest, Repository } from './types'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ValidateTokenResult {
  valid: boolean
  user: GitHubUser | null
}

interface RateLimitResult {
  limit: number
  remaining: number
  used: number
  resetAt: string
  percentage: number
}

export interface MutationResult {
  success: boolean
}

export interface MergeResult extends MutationResult {
  mergedAt: string
  sha: string | undefined
}

export interface ReviewResult extends MutationResult {
  reviewId: string
  state: string
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH HEADERS
// ═══════════════════════════════════════════════════════════════════════════

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPHQL HELPER
// ═══════════════════════════════════════════════════════════════════════════

async function graphql<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await http.post<{ data: T; errors?: Array<{ message: string }> }>(
    GITHUB_GRAPHQL,
    { query, variables },
    authHeaders(token)
  )

  if (response.errors?.length) {
    console.error('[graphql] GraphQL errors:', response.errors)
    throw new Error(response.errors.map((e) => e.message).join(', '))
  }

  return response.data
}

// ═══════════════════════════════════════════════════════════════════════════
// REST API
// ═══════════════════════════════════════════════════════════════════════════

export async function validateToken(token: string): Promise<ValidateTokenResult> {
  try {
    const user = await http.get<GitHubUser>(`${GITHUB_API}/user`, authHeaders(token))
    return { valid: true, user }
  } catch (error) {
    const httpError = error as HttpError
    if (httpError.status === 401) {
      return { valid: false, user: null }
    }
    return { valid: false, user: null }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRENT USER
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchCurrentUser(token: string): Promise<GitHubUser> {
  const user = await http.get<{
    login: string
    avatar_url: string
    name: string | null
    html_url: string
  }>(`${GITHUB_API}/user`, authHeaders(token))
  return {
    login: user.login,
    avatar_url: user.avatar_url,
    name: user.name,
    html_url: user.html_url
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMIT
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchRateLimit(token: string): Promise<RateLimitResult> {
  const query = `
    query {
      rateLimit {
        limit
        remaining
        used
        resetAt
      }
    }
  `

  const data = await graphql<{
    rateLimit: {
      limit: number
      remaining: number
      used: number
      resetAt: string
    }
  }>(token, query)

  return {
    limit: data.rateLimit.limit,
    remaining: data.rateLimit.remaining,
    used: data.rateLimit.used,
    resetAt: data.rateLimit.resetAt,
    percentage: Math.round((data.rateLimit.used / data.rateLimit.limit) * 100)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORIES
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchRepos(token: string): Promise<Repository[]> {
  // Fetch every repo the viewer can access: their own (OWNER), repos they
  // collaborate on (COLLABORATOR), and repos from orgs they belong to
  // (ORGANIZATION_MEMBER). A single flat list — the previous org-only query
  // missed personal repos entirely.
  const query = `
    query {
      viewer {
        login
        repositories(
          first: 100
          affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]
          orderBy: { field: UPDATED_AT, direction: DESC }
        ) {
          nodes {
            id
            name
            nameWithOwner
            url
            description
            owner { login avatarUrl }
            stargazerCount
            primaryLanguage { name }
            updatedAt
          }
        }
      }
    }
  `

  const data = await graphql<{
    viewer: {
      login: string
      repositories: {
        nodes: Array<{
          id: string
          name: string
          nameWithOwner: string
          url: string
          description: string | null
          owner: { login: string; avatarUrl: string }
          stargazerCount: number
          primaryLanguage: { name: string } | null
          updatedAt: string
        }>
      }
    }
  }>(token, query)

  const nodes = data.viewer.repositories.nodes ?? []

  return nodes.map((r) => ({
    id: r.id,
    name: r.name,
    full_name: r.nameWithOwner,
    html_url: r.url,
    description: r.description,
    owner: { login: r.owner.login, avatar_url: r.owner.avatarUrl },
    stargazers_count: r.stargazerCount,
    language: r.primaryLanguage?.name || null,
    updated_at: r.updatedAt
  }))
}

// ═══════════════════════════════════════════════════════════════════════════
// PULL REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

/* eslint-disable @typescript-eslint/no-explicit-any */
function transformPR(pr: any): PullRequest {
  // Extract status checks from the last commit
  const lastCommit = pr.commits?.nodes?.[0]?.commit
  const statusRollup = lastCommit?.statusCheckRollup
  // Map check runs and deduplicate by name, keeping only the most recent run.
  // When a check is re-run, GitHub's statusCheckRollup returns both old and new
  // runs in no guaranteed order. We use startedAt to pick the latest.
  const allCheckRuns =
    statusRollup?.contexts?.nodes?.map((ctx: any) => {
      if (ctx.name) {
        // CheckRun
        return {
          id: ctx.name,
          name: ctx.name,
          status: ctx.status?.toLowerCase() || 'pending',
          conclusion: ctx.conclusion?.toLowerCase() || null,
          html_url: ctx.detailsUrl || '',
          startedAt: ctx.startedAt || null
        }
      } else {
        // StatusContext (no startedAt available)
        return {
          id: ctx.context,
          name: ctx.context,
          status: ctx.state?.toLowerCase() || 'pending',
          conclusion: ctx.state?.toLowerCase() || null,
          html_url: ctx.targetUrl || '',
          startedAt: null
        }
      }
    }) || []

  // Deduplicate by name: keep the most recently started run for each check name.
  // This correctly handles re-runs regardless of array order.
  const checkRunMap = new Map<string, (typeof allCheckRuns)[number]>()
  for (const run of allCheckRuns) {
    const existing = checkRunMap.get(run.name)
    if (!existing) {
      checkRunMap.set(run.name, run)
    } else {
      // Compare startedAt timestamps — more recent wins
      const existingTime = existing.startedAt ? new Date(existing.startedAt).getTime() : 0
      const newTime = run.startedAt ? new Date(run.startedAt).getTime() : 0
      if (newTime > existingTime) {
        checkRunMap.set(run.name, run)
      }
    }
  }
  const checkRuns = Array.from(checkRunMap.values()).map(({ startedAt, ...rest }) => rest)

  const stateMap: Record<string, 'pending' | 'success' | 'failure' | 'error'> = {
    EXPECTED: 'pending',
    PENDING: 'pending',
    SUCCESS: 'success',
    FAILURE: 'failure',
    ERROR: 'error'
  }

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body,
    html_url: pr.url,
    state: pr.state,
    created_at: pr.createdAt,
    updated_at: pr.updatedAt,
    draft: pr.isDraft,
    merged_at: pr.mergedAt,
    user: { login: pr.author?.login || 'ghost', avatar_url: pr.author?.avatarUrl || '' },
    head: { ref: pr.headRefName, sha: pr.headRefOid },
    base: {
      ref: pr.baseRefName,
      repo: {
        name: pr.baseRepository?.name || '',
        full_name: pr.baseRepository?.nameWithOwner || '',
        owner: {
          login: pr.baseRepository?.owner?.login || '',
          avatar_url: pr.baseRepository?.owner?.avatarUrl || ''
        }
      }
    },
    labels: (pr.labels?.nodes || []).map((l: any) => ({ name: l.name, color: l.color })),
    assignees: (pr.assignees?.nodes || []).map((a: any) => ({
      login: a.login,
      avatar_url: a.avatarUrl
    })),
    comments: pr.comments?.totalCount || 0,
    review_comments: pr.reviewThreads?.totalCount || 0,
    additions: pr.additions || 0,
    deletions: pr.deletions || 0,
    changed_files: pr.changedFiles || 0,
    mergeable: pr.mergeable,
    mergeStateStatus: pr.mergeStateStatus,
    reviewDecision: pr.reviewDecision,
    checks: statusRollup
      ? {
          state: stateMap[statusRollup.state] || 'pending',
          total_count: checkRuns.length,
          check_runs: checkRuns
        }
      : undefined
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchPRsForRepos(
  token: string,
  repoFullNames: string[]
): Promise<PullRequest[]> {
  // Build query for multiple repos
  const repoQueries = repoFullNames.map((fullName, i) => {
    const [owner, name] = fullName.split('/')
    return `
      repo${i}: repository(owner: "${owner}", name: "${name}") {
        pullRequests(first: 50, states: [OPEN], orderBy: { field: CREATED_AT, direction: DESC }) {
          nodes {
            id
            number
            title
            body
            url
            state
            createdAt
            updatedAt
            isDraft
            mergedAt
            author { login avatarUrl }
            headRefName
            headRefOid
            baseRefName
            baseRepository {
              name
              nameWithOwner
              owner { login avatarUrl }
            }
            labels(first: 10) { nodes { name color } }
            assignees(first: 10) { nodes { login avatarUrl } }
            comments { totalCount }
            reviewThreads { totalCount }
            additions
            deletions
            changedFiles
            mergeable
            mergeStateStatus
            reviewDecision
            commits(last: 1) {
              nodes {
                commit {
                  statusCheckRollup {
                    state
                    contexts(first: 50) {
                      nodes {
                        ... on CheckRun {
                          name
                          status
                          conclusion
                          startedAt
                          detailsUrl
                        }
                        ... on StatusContext {
                          context
                          state
                          targetUrl
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `
  })

  const query = `query { ${repoQueries.join('\n')} }`
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = await graphql<Record<string, { pullRequests: { nodes: any[] } }>>(token, query)

  const allPRs: PullRequest[] = []
  for (const key of Object.keys(data)) {
    const prs = data[key]?.pullRequests?.nodes || []
    allPRs.push(...prs.map(transformPR))
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return allPRs
}

export async function fetchSinglePR(
  token: string,
  repoFullName: string,
  prNumber: number
): Promise<PullRequest> {
  const [owner, name] = repoFullName.split('/')

  const query = `
    query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        pullRequest(number: $number) {
          id
          number
          title
          body
          url
          state
          createdAt
          updatedAt
          isDraft
          mergedAt
          author { login avatarUrl }
          headRefName
          headRefOid
          baseRefName
          baseRepository {
            name
            nameWithOwner
            owner { login avatarUrl }
          }
          labels(first: 10) { nodes { name color } }
          assignees(first: 10) { nodes { login avatarUrl } }
          comments(first: 100) {
            totalCount
            nodes {
              id
              body
              createdAt
              author { __typename login avatarUrl }
            }
          }
          reviews(first: 50) {
            nodes {
              id
              state
              createdAt
              author { __typename login avatarUrl }
              body
            }
          }
          reviewThreads(first: 50) {
            totalCount
            nodes {
              id
              isResolved
              path
              line
              comments(first: 20) {
                nodes {
                  id
                  body
                  createdAt
                  author { __typename login avatarUrl }
                  pullRequestReview { id }
                  diffHunk
                }
              }
            }
          }
          additions
          deletions
          changedFiles
          mergeable
          mergeStateStatus
          reviewDecision
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 50) {
                    nodes {
                      ... on CheckRun {
                        name
                        status
                        conclusion
                        startedAt
                        detailsUrl
                      }
                      ... on StatusContext {
                        context
                        state
                        targetUrl
                      }
                    }
                  }
                }
              }
            }
          }
          allCommits: commits(first: 250) {
            totalCount
            nodes {
              commit {
                oid
                messageHeadline
                message
                committedDate
                author {
                  name
                  email
                  user { login avatarUrl }
                }
                additions
                deletions
                changedFilesIfAvailable
              }
            }
          }
        }
      }
    }
  `

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = await graphql<{ repository: { pullRequest: any } }>(token, query, {
    owner,
    name,
    number: prNumber
  })
  const pr = data.repository.pullRequest

  // Helper to detect if an author is a bot
  const isBot = (author: any): boolean => {
    if (!author) return false
    // Check __typename from GraphQL
    if (author.__typename === 'Bot') return true
    // Check common bot patterns in login
    const login = author.login?.toLowerCase() || ''
    return login.endsWith('[bot]') || login.endsWith('-bot') || login.includes('github-actions')
  }

  return {
    ...transformPR(pr),
    commentsList: (pr.comments?.nodes || []).map((c: any) => ({
      id: c.id,
      body: c.body,
      created_at: c.createdAt,
      author: {
        login: c.author?.login || 'ghost',
        avatar_url: c.author?.avatarUrl || '',
        isBot: isBot(c.author)
      }
    })),
    reviews: (pr.reviews?.nodes || []).map((r: any) => ({
      id: r.id,
      state: r.state?.toLowerCase(),
      created_at: r.createdAt,
      author: {
        login: r.author?.login || 'ghost',
        avatar_url: r.author?.avatarUrl || '',
        isBot: isBot(r.author)
      },
      body: r.body
    })),
    reviewThreads: (pr.reviewThreads?.nodes || []).map((t: any) => ({
      id: t.id,
      isResolved: t.isResolved,
      path: t.path,
      line: t.line,
      comments: (t.comments?.nodes || []).map((c: any) => ({
        id: c.id,
        body: c.body,
        created_at: c.createdAt,
        author: {
          login: c.author?.login || 'ghost',
          avatar_url: c.author?.avatarUrl || '',
          isBot: isBot(c.author)
        },
        reviewId: c.pullRequestReview?.id ?? null,
        diffHunk: c.diffHunk
      }))
    })),
    totalCommits: pr.allCommits?.totalCount || 0,
    commits: (pr.allCommits?.nodes || []).map(
      (node: any): PRCommit => ({
        oid: node.commit.oid,
        messageHeadline: node.commit.messageHeadline,
        message: node.commit.message,
        committedDate: node.commit.committedDate,
        author: {
          name: node.commit.author?.name || 'Unknown',
          email: node.commit.author?.email || '',
          user: node.commit.author?.user
            ? {
                login: node.commit.author.user.login,
                avatar_url: node.commit.author.user.avatarUrl || ''
              }
            : null
        },
        additions: node.commit.additions || 0,
        deletions: node.commit.deletions || 0,
        changedFilesCount: node.commit.changedFilesIfAvailable || 0
      })
    )
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

// REST API response type for PR files
interface GitHubPRFileResponse {
  sha: string
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  additions: number
  deletions: number
  changes: number
  patch?: string
  previous_filename?: string
}

/**
 * Fetch PR files with diff patches using REST API
 * REST API includes the actual patch content, GraphQL doesn't
 */
// Max files to fetch (soft limit to avoid huge PRs overwhelming the system)
const MAX_FILES = 500

/**
 * Fetch PR files with parallel pagination
 * GitHub limits to 100 per page, but we can fetch all pages in parallel
 */
export async function fetchPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  totalFiles?: number
): Promise<PRFile[]> {
  const baseUrl = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`

  // If we know total count, fetch all pages in parallel
  if (totalFiles && totalFiles > 100) {
    const filesToFetch = Math.min(totalFiles, MAX_FILES)
    const pageCount = Math.ceil(filesToFetch / 100)

    // Fetch all pages in parallel
    const pagePromises = Array.from({ length: pageCount }, (_, i) =>
      http.get<GitHubPRFileResponse[]>(`${baseUrl}&page=${i + 1}`, authHeaders(token))
    )

    const pages = await Promise.all(pagePromises)
    const allFiles = pages.flat()

    return allFiles.map((file) => ({
      path: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      changeType: mapFileStatus(file.status),
      patch: file.patch
    }))
  }

  // Simple case: just fetch first page
  const files = await http.get<GitHubPRFileResponse[]>(baseUrl, authHeaders(token))

  return files.map((file) => ({
    path: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    changeType: mapFileStatus(file.status),
    patch: file.patch
  }))
}

/** Map GitHub REST API file status to our changeType */
function mapFileStatus(status: GitHubPRFileResponse['status']): PRFile['changeType'] {
  switch (status) {
    case 'added':
      return 'ADDED'
    case 'removed':
      return 'DELETED'
    case 'renamed':
      return 'RENAMED'
    case 'copied':
      return 'COPIED'
    default:
      return 'MODIFIED'
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PR MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function closePR(token: string, prNodeId: string): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!) {
      closePullRequest(input: { pullRequestId: $id }) {
        pullRequest { id state }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId })
  return { success: true }
}

export async function reopenPR(token: string, prNodeId: string): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!) {
      reopenPullRequest(input: { pullRequestId: $id }) {
        pullRequest { id state }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId })
  return { success: true }
}

export async function markPRReady(token: string, prNodeId: string): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!) {
      markPullRequestReadyForReview(input: { pullRequestId: $id }) {
        pullRequest { id isDraft }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId })
  return { success: true }
}

export async function convertPRToDraft(token: string, prNodeId: string): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!) {
      convertPullRequestToDraft(input: { pullRequestId: $id }) {
        pullRequest { id isDraft }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId })
  return { success: true }
}

export async function updatePRBody(
  token: string,
  prNodeId: string,
  body: string
): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!, $body: String!) {
      updatePullRequest(input: { pullRequestId: $id, body: $body }) {
        pullRequest { id body }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId, body })
  return { success: true }
}

export async function updatePRTitle(
  token: string,
  prNodeId: string,
  title: string
): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!, $title: String!) {
      updatePullRequest(input: { pullRequestId: $id, title: $title }) {
        pullRequest { id title }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId, title })
  return { success: true }
}

export async function addPRComment(
  token: string,
  prNodeId: string,
  body: string
): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!, $body: String!) {
      addComment(input: { subjectId: $id, body: $body }) {
        commentEdge { node { id } }
      }
    }
  `
  await graphql(token, mutation, { id: prNodeId, body })
  return { success: true }
}

/**
 * Delete a comment from a PR/issue using GraphQL
 * @param token GitHub token
 * @param commentNodeId The GraphQL node ID of the comment
 */
export async function deletePRComment(
  token: string,
  commentNodeId: string
): Promise<MutationResult> {
  const mutation = `
    mutation($id: ID!) {
      deleteIssueComment(input: { id: $id }) {
        clientMutationId
      }
    }
  `
  await graphql(token, mutation, { id: commentNodeId })
  return { success: true }
}

/**
 * Reply to a PR review thread (inline review conversation).
 *
 * Uses GitHub GraphQL, which accepts the thread node id directly.
 */
export async function replyToReviewThread(
  token: string,
  threadId: string,
  body: string
): Promise<MutationResult> {
  const mutation = `
    mutation($threadId: ID!, $body: String!) {
      addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) {
        comment { id }
      }
    }
  `

  await graphql(token, mutation, { threadId, body })
  return { success: true }
}

export type MergeMethod = 'MERGE' | 'SQUASH' | 'REBASE'

export async function mergePR(
  token: string,
  prNodeId: string,
  mergeMethod: MergeMethod = 'SQUASH',
  commitHeadline?: string,
  commitBody?: string
): Promise<MergeResult> {
  const mutation = `
    mutation($id: ID!, $mergeMethod: PullRequestMergeMethod!, $commitHeadline: String, $commitBody: String) {
      mergePullRequest(input: { 
        pullRequestId: $id, 
        mergeMethod: $mergeMethod,
        commitHeadline: $commitHeadline,
        commitBody: $commitBody
      }) {
        pullRequest { 
          id 
          merged 
          mergedAt
          mergeCommit { oid }
        }
      }
    }
  `
  const data = await graphql<{
    mergePullRequest: {
      pullRequest: { id: string; merged: boolean; mergedAt: string; mergeCommit: { oid: string } }
    }
  }>(token, mutation, { id: prNodeId, mergeMethod, commitHeadline, commitBody })

  return {
    success: true,
    mergedAt: data.mergePullRequest.pullRequest.mergedAt,
    sha: data.mergePullRequest.pullRequest.mergeCommit?.oid
  }
}

export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'

/**
 * Review comment for inline feedback
 */
export interface ReviewCommentInput {
  path: string // File path relative to repo root
  line: number // Line number in the diff
  body: string // Comment body (markdown supported)
}

export async function submitPRReview(
  token: string,
  prNodeId: string,
  event: ReviewEvent,
  body?: string
): Promise<ReviewResult> {
  const mutation = `
    mutation($id: ID!, $event: PullRequestReviewEvent!, $body: String) {
      addPullRequestReview(input: { 
        pullRequestId: $id, 
        event: $event,
        body: $body
      }) {
        pullRequestReview { 
          id 
          state
        }
      }
    }
  `
  const data = await graphql<{
    addPullRequestReview: {
      pullRequestReview: { id: string; state: string }
    }
  }>(token, mutation, { id: prNodeId, event, body })

  return {
    success: true,
    reviewId: data.addPullRequestReview.pullRequestReview.id,
    state: data.addPullRequestReview.pullRequestReview.state
  }
}

/**
 * Submit a PR review with inline comments
 * Uses GitHub REST API as GraphQL requires commitOID for each comment
 */
export async function submitPRReviewWithComments(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  event: ReviewEvent,
  body: string,
  comments: ReviewCommentInput[]
): Promise<ReviewResult> {
  // GitHub REST API endpoint for creating a review
  const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`

  const response = await http.post<{ id: number; state: string }>(
    url,
    {
      body,
      event,
      comments: comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body
      }))
    },
    authHeaders(token)
  )

  return {
    success: true,
    reviewId: String(response.id),
    state: response.state
  }
}

/**
 * Update a PR branch with the base branch (like GitHub's "Update branch" button)
 * Uses PUT /repos/{owner}/{repo}/pulls/{pull_number}/update-branch
 */
export async function updatePRBranch(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<MutationResult> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/update-branch`

  await http.put(url, {}, authHeaders(token))

  return { success: true }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTRIBUTIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ContributionDay {
  date: string
  contributionCount: number
  weekday: number
}

export interface ContributionWeek {
  contributionDays: ContributionDay[]
}

export interface ContributionsData {
  totalContributions: number
  weeks: ContributionWeek[]
  // Breakdown by type
  totalCommitContributions: number
  totalPullRequestContributions: number
  totalPullRequestReviewContributions: number
  totalIssueContributions: number
  // Streaks and stats
  currentStreak: number
  longestStreak: number
  averagePerDay: number
  mostActiveDay: string
  mostActiveDayCount: number
}

/**
 * Fetch user contribution data from GitHub GraphQL API
 * Includes both public and private contributions
 */
export async function fetchContributions(token: string): Promise<ContributionsData> {
  // Calculate date range for the last year
  const to = new Date()
  const from = new Date()
  from.setFullYear(from.getFullYear() - 1)

  const query = `
    query($from: DateTime!, $to: DateTime!) {
      viewer {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                weekday
              }
            }
          }
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalIssueContributions
          restrictedContributionsCount
          hasAnyContributions
        }
      }
    }
  `

  const data = await graphql<{
    viewer: {
      contributionsCollection: {
        contributionCalendar: {
          totalContributions: number
          weeks: ContributionWeek[]
        }
        totalCommitContributions: number
        totalPullRequestContributions: number
        totalPullRequestReviewContributions: number
        totalIssueContributions: number
        restrictedContributionsCount: number
        hasAnyContributions: boolean
      }
    }
  }>(token, query, {
    from: from.toISOString(),
    to: to.toISOString()
  })

  const collection = data.viewer.contributionsCollection
  const calendar = collection.contributionCalendar

  // Calculate streaks and stats
  const allDays = calendar.weeks.flatMap((w) => w.contributionDays)
  const today = new Date().toISOString().split('T')[0]

  // Current streak
  let currentStreak = 0
  for (let i = allDays.length - 1; i >= 0; i--) {
    const day = allDays[i]
    // Skip future days
    if (day.date > today) continue
    if (day.contributionCount > 0) {
      currentStreak++
    } else {
      // Allow one "grace" day for today if no contributions yet
      if (day.date === today) continue
      break
    }
  }

  // Longest streak
  let longestStreak = 0
  let tempStreak = 0
  for (const day of allDays) {
    if (day.contributionCount > 0) {
      tempStreak++
      longestStreak = Math.max(longestStreak, tempStreak)
    } else {
      tempStreak = 0
    }
  }

  // Average per day (only count days up to today)
  const pastDays = allDays.filter((d) => d.date <= today)
  const averagePerDay =
    pastDays.length > 0 ? Math.round((calendar.totalContributions / pastDays.length) * 10) / 10 : 0

  // Most active day
  let mostActiveDay = ''
  let mostActiveDayCount = 0
  for (const day of allDays) {
    if (day.contributionCount > mostActiveDayCount) {
      mostActiveDayCount = day.contributionCount
      mostActiveDay = day.date
    }
  }

  return {
    totalContributions: calendar.totalContributions,
    weeks: calendar.weeks,
    totalCommitContributions: collection.totalCommitContributions,
    totalPullRequestContributions: collection.totalPullRequestContributions,
    totalPullRequestReviewContributions: collection.totalPullRequestReviewContributions,
    totalIssueContributions: collection.totalIssueContributions,
    currentStreak,
    longestStreak,
    averagePerDay,
    mostActiveDay,
    mostActiveDayCount
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER EVENTS (Daily Activity)
// ═══════════════════════════════════════════════════════════════════════════

export interface GitHubEvent {
  id: string
  type: string
  actor: {
    login: string
    avatar_url: string
  }
  repo: {
    name: string
  }
  payload: {
    action?: string
    ref?: string
    ref_type?: string
    commits?: Array<{ sha: string; message: string }>
    pull_request?: {
      number: number
      title: string
      state: string
    }
    review?: {
      state: string
      body: string
    }
    comment?: {
      body: string
    }
    issue?: {
      number: number
      title: string
    }
  }
  created_at: string
}

export interface UserEvent {
  id: string
  type: string
  repoName: string
  title: string
  description: string
  timestamp: string
  icon: 'commit' | 'pr' | 'review' | 'comment' | 'issue' | 'branch' | 'other'
  /** PR number if this event is related to a PR */
  prNumber?: number
  /** Who performed the event — used for avatars in activity feeds */
  actor?: { login: string; avatar_url: string }
}

/**
 * Fetch user events (up to 100 most recent)
 * Uses GET /users/{username}/events endpoint
 */
export async function fetchUserEvents(token: string, username: string): Promise<UserEvent[]> {
  const events = await http.get<GitHubEvent[]>(
    `${GITHUB_API}/users/${username}/events?per_page=100`,
    authHeaders(token)
  )

  if (!events) {
    return []
  }

  // Filter and transform events
  const transformedEvents = events
    .filter((event: GitHubEvent) => {
      // Skip PushEvents with 0 commits (force pushes, branch syncs, etc.)
      if (event.type === 'PushEvent') {
        const commits = event.payload.commits || []
        if (commits.length === 0) return false
      }
      return true
    })
    .map((event: GitHubEvent) => transformEvent(event))

  return transformedEvents
}

/**
 * Fetch recent activity events for a single repository (up to 100 most recent).
 * Uses GET /repos/{owner}/{repo}/events — real GitHub activity across everyone
 * active on the repo (pushes, PRs, reviews, comments, issues, branch changes).
 *
 * Note: GitHub's Events API only returns the last ~90 days / 300 events and is
 * cached with a short propagation delay.
 */
export async function fetchRepoEvents(token: string, repoFullName: string): Promise<UserEvent[]> {
  const [owner, repo] = repoFullName.split('/')
  if (!owner || !repo) return []

  const events = await http.get<GitHubEvent[]>(
    `${GITHUB_API}/repos/${owner}/${repo}/events?per_page=100`,
    authHeaders(token)
  )

  if (!events) return []

  return events
    .filter((event: GitHubEvent) => {
      // Skip PushEvents with 0 commits (branch syncs, force pushes, etc.)
      if (event.type === 'PushEvent') {
        const commits = event.payload.commits || []
        if (commits.length === 0) return false
      }
      return true
    })
    .map((event: GitHubEvent) => transformEvent(event))
}

function transformEvent(event: GitHubEvent): UserEvent {
  const base = {
    id: event.id,
    repoName: event.repo.name,
    timestamp: event.created_at,
    actor: { login: event.actor.login, avatar_url: event.actor.avatar_url }
  }

  switch (event.type) {
    case 'PushEvent': {
      const commits = event.payload.commits || []
      const commitCount = commits.length
      return {
        ...base,
        type: 'Push',
        title: `Pushed ${commitCount} commit${commitCount !== 1 ? 's' : ''}`,
        description: commits[0]?.message || '',
        icon: 'commit'
      }
    }

    case 'PullRequestEvent': {
      const pr = event.payload.pull_request
      const action = event.payload.action || 'updated'
      return {
        ...base,
        type: 'Pull Request',
        title: `${capitalizeFirst(action)} PR #${pr?.number}`,
        description: pr?.title || '',
        icon: 'pr',
        prNumber: pr?.number
      }
    }

    case 'PullRequestReviewEvent': {
      const pr = event.payload.pull_request
      const reviewState = event.payload.review?.state || 'reviewed'
      return {
        ...base,
        type: 'Review',
        title: `${capitalizeFirst(reviewState)} PR #${pr?.number}`,
        description: pr?.title || '',
        icon: 'review',
        prNumber: pr?.number
      }
    }

    case 'PullRequestReviewCommentEvent':
    case 'IssueCommentEvent':
    case 'CommitCommentEvent': {
      const comment = event.payload.comment?.body || ''
      const prOrIssue = event.payload.pull_request || event.payload.issue
      return {
        ...base,
        type: 'Comment',
        title: `Commented on #${prOrIssue?.number || '?'}`,
        prNumber: event.payload.pull_request?.number,
        description: comment.slice(0, 100) + (comment.length > 100 ? '...' : ''),
        icon: 'comment'
      }
    }

    case 'CreateEvent': {
      const refType = event.payload.ref_type || 'reference'
      const ref = event.payload.ref || ''
      return {
        ...base,
        type: 'Create',
        title: `Created ${refType}${ref ? `: ${ref}` : ''}`,
        description: '',
        icon: 'branch'
      }
    }

    case 'DeleteEvent': {
      const refType = event.payload.ref_type || 'reference'
      const ref = event.payload.ref || ''
      return {
        ...base,
        type: 'Delete',
        title: `Deleted ${refType}${ref ? `: ${ref}` : ''}`,
        description: '',
        icon: 'branch'
      }
    }

    case 'IssuesEvent': {
      const issue = event.payload.issue
      const action = event.payload.action || 'updated'
      return {
        ...base,
        type: 'Issue',
        title: `${capitalizeFirst(action)} issue #${issue?.number}`,
        description: issue?.title || '',
        icon: 'issue'
      }
    }

    default:
      return {
        ...base,
        type: event.type.replace('Event', ''),
        title: event.type.replace('Event', ''),
        description: '',
        icon: 'other'
      }
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// ═══════════════════════════════════════════════════════════════════════════
// LABELS
// ═══════════════════════════════════════════════════════════════════════════

export interface RepoLabel {
  id: number
  name: string
  color: string
  description: string | null
  default: boolean
}

/**
 * Fetch all labels for a repository
 * Uses GitHub REST API: GET /repos/{owner}/{repo}/labels
 */
export async function fetchRepoLabels(
  token: string,
  owner: string,
  repo: string
): Promise<RepoLabel[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/labels?per_page=100`

  const response = await http.get<
    Array<{
      id: number
      name: string
      color: string
      description: string | null
      default: boolean
    }>
  >(url, authHeaders(token))

  return response.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
    default: label.default
  }))
}

/**
 * Add labels to a PR/Issue
 * Uses GitHub REST API: POST /repos/{owner}/{repo}/issues/{issue_number}/labels
 * Note: PRs use the issues API for labels
 */
export async function addLabelsToIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
): Promise<RepoLabel[]> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/labels`

  const response = await http.post<
    Array<{
      id: number
      name: string
      color: string
      description: string | null
      default: boolean
    }>
  >(url, { labels }, authHeaders(token))

  return response.map((label) => ({
    id: label.id,
    name: label.name,
    color: label.color,
    description: label.description,
    default: label.default
  }))
}

/**
 * Remove a label from a PR/Issue
 * Uses GitHub REST API: DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}
 */
export async function removeLabelFromIssue(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  labelName: string
): Promise<void> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(labelName)}`

  await http.delete(url, authHeaders(token))
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE CONTENT
// ═══════════════════════════════════════════════════════════════════════════

export interface FileContentResult {
  content: string
  encoding: string
  size: number
  name: string
  path: string
  sha: string
}

/**
 * Fetch full file content from a specific branch/ref
 * Uses GitHub REST API: GET /repos/{owner}/{repo}/contents/{path}?ref={ref}
 */
export async function fetchFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<FileContentResult> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`

  const response = await http.get<{
    content: string
    encoding: string
    size: number
    name: string
    path: string
    sha: string
    type: string
  }>(url, authHeaders(token))

  // GitHub returns base64 encoded content
  let decodedContent = ''
  if (response.encoding === 'base64' && response.content) {
    // Remove newlines from base64 string and decode
    const cleanBase64 = response.content.replace(/\n/g, '')
    decodedContent = atob(cleanBase64)
  } else {
    decodedContent = response.content || ''
  }

  return {
    content: decodedContent,
    encoding: response.encoding,
    size: response.size,
    name: response.name,
    path: response.path,
    sha: response.sha
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGE UPLOAD - For PR screenshots (using GitHub's internal upload API)
// ═══════════════════════════════════════════════════════════════════════════

export interface UploadImageResult {
  url: string
}

interface AssetPolicyResponse {
  id: number
  name: string
  size: number
  content_type: string
  href: string
  upload_url: string
  upload_authenticity_token: string
  form: Record<string, string>
  same_origin: boolean
  asset_upload_url: string
  asset_upload_authenticity_token: string
}

/**
 * Upload an image using GitHub's internal upload API.
 * This is the same API used by GitHub's web UI when you paste/drag images.
 *
 * Returns a URL in the format: https://github.com/user-attachments/assets/<UUID>
 *
 * NOTE: This API may require web session authentication and might not work
 * with just a Bearer token. If it fails, we'll need to use an alternative approach.
 *
 * @param token GitHub token
 * @param owner Repository owner
 * @param repo Repository name
 * @param imageDataUrl The image as a data URL (e.g., "data:image/png;base64,...")
 * @param filename Optional filename
 * @returns The GitHub user-attachments URL
 */
export async function uploadScreenshot(
  token: string,
  owner: string,
  repo: string,
  imageDataUrl: string,
  filename?: string
): Promise<UploadImageResult> {
  // Extract the base64 data and mime type from the data URL
  const matches = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid image data URL format')
  }

  const mimeType = matches[1]
  const base64Data = matches[2]

  // Convert base64 to binary
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: mimeType })

  // Determine file extension from mime type
  // Handle cases like 'image/svg+xml' -> 'svg', 'image/png' -> 'png'
  let ext = mimeType.split('/')[1] || 'png'
  if (ext.includes('+')) {
    ext = ext.split('+')[0] // 'svg+xml' -> 'svg'
  }
  const actualFilename = filename || `screenshot-${Date.now()}.${ext}`

  // Step 1: Request upload policy from GitHub
  // This is GitHub's internal API - may require web session cookies
  const policyUrl = 'https://github.com/upload/policies/assets'

  const policyResponse = await fetch(policyUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      name: actualFilename,
      size: blob.size,
      content_type: mimeType,
      repository_id: `${owner}/${repo}`
    })
  })

  if (!policyResponse.ok) {
    const errorText = await policyResponse.text()
    throw new Error(
      `GitHub upload API failed (may require web session): ${policyResponse.status} - ${errorText}`
    )
  }

  const policy: AssetPolicyResponse = await policyResponse.json()

  // Step 2: Upload file to S3
  const formData = new FormData()

  // Add all form fields from the policy
  for (const [key, value] of Object.entries(policy.form)) {
    formData.append(key, value)
  }

  // Add the file last (required by S3)
  formData.append('file', blob, actualFilename)

  const uploadResponse = await fetch(policy.upload_url, {
    method: 'POST',
    body: formData
  })

  if (!uploadResponse.ok && uploadResponse.status !== 204) {
    throw new Error(`Failed to upload to S3: ${uploadResponse.status} ${uploadResponse.statusText}`)
  }

  // Step 3: Confirm the upload with GitHub
  const confirmResponse = await fetch(policy.asset_upload_url, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({
      authenticity_token: policy.asset_upload_authenticity_token
    })
  })

  if (!confirmResponse.ok) {
    const errorText = await confirmResponse.text()
    throw new Error(`Failed to confirm upload: ${confirmResponse.status} - ${errorText}`)
  }

  // The final URL is the asset href
  return {
    url: policy.href
  }
}

/**
 * Resolve a review thread
 */
export async function resolveReviewThread(
  token: string,
  threadId: string
): Promise<MutationResult> {
  const mutation = `
    mutation($threadId: ID!) {
      resolveReviewThread(input: { threadId: $threadId }) {
        thread { id isResolved }
      }
    }
  `
  await graphql(token, mutation, { threadId })
  return { success: true }
}

/**
 * Unresolve a review thread
 */
export async function unresolveReviewThread(
  token: string,
  threadId: string
): Promise<MutationResult> {
  const mutation = `
    mutation($threadId: ID!) {
      unresolveReviewThread(input: { threadId: $threadId }) {
        thread { id isResolved }
      }
    }
  `
  await graphql(token, mutation, { threadId })
  return { success: true }
}
