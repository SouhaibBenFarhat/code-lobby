/**
 * GitHub API Client
 * All functions receive token as parameter (pure functions)
 */

import { GITHUB_API, GITHUB_GRAPHQL } from './endpoints'
import { type HttpError, http } from './http'
import type { GitHubUser, PRFile, PullRequest, Repository } from './types'

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
  console.log('[graphql] Making request to GitHub API...')

  const response = await http.post<{ data: T; errors?: Array<{ message: string }> }>(
    GITHUB_GRAPHQL,
    { query, variables },
    authHeaders(token)
  )

  if (response.errors?.length) {
    console.error('[graphql] GraphQL errors:', response.errors)
    throw new Error(response.errors.map((e) => e.message).join(', '))
  }

  console.log('[graphql] Response received')
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
  console.log('[fetchRepos] Starting fetch with token:', `${token.substring(0, 10)}...`)

  // Fetch all repos from organizations the user belongs to
  const query = `
    query {
      viewer {
        login
        organizations(first: 100) {
          nodes {
            login
            repositories(first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
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
      }
    }
  `

  const data = await graphql<{
    viewer: {
      login: string
      organizations: {
        nodes: Array<{
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
        }>
      }
    }
  }>(token, query)

  // Flatten all org repos into a single array
  const allRepos = data.viewer.organizations.nodes.flatMap((org) => org.repositories.nodes)

  console.log(
    '[fetchRepos] API Response - viewer:',
    data.viewer.login,
    'orgs:',
    data.viewer.organizations.nodes.length,
    'total repos:',
    allRepos.length
  )

  return allRepos.map((r) => ({
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
  const checkRuns =
    statusRollup?.contexts?.nodes?.map((ctx: any) => {
      if (ctx.name) {
        // CheckRun
        return {
          id: ctx.name,
          name: ctx.name,
          status: ctx.status?.toLowerCase() || 'pending',
          conclusion: ctx.conclusion?.toLowerCase() || null,
          html_url: ctx.detailsUrl || ''
        }
      } else {
        // StatusContext
        return {
          id: ctx.context,
          name: ctx.context,
          status: ctx.state?.toLowerCase() || 'pending',
          conclusion: ctx.state?.toLowerCase() || null,
          html_url: ctx.targetUrl || ''
        }
      }
    }) || []

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
          comments(first: 100) {
            nodes {
              id
              body
              createdAt
              author { login avatarUrl }
            }
          }
          reviews(first: 50) {
            nodes {
              id
              state
              createdAt
              author { login avatarUrl }
              body
            }
          }
          reviewThreads(first: 50) {
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
                  author { login avatarUrl }
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

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const data = await graphql<{ repository: { pullRequest: any } }>(token, query, {
    owner,
    name,
    number: prNumber
  })
  const pr = data.repository.pullRequest

  return {
    ...transformPR(pr),
    commentsList: (pr.comments?.nodes || []).map((c: any) => ({
      id: c.id,
      body: c.body,
      created_at: c.createdAt,
      author: { login: c.author?.login || 'ghost', avatar_url: c.author?.avatarUrl || '' }
    })),
    reviews: (pr.reviews?.nodes || []).map((r: any) => ({
      id: r.id,
      state: r.state?.toLowerCase(),
      created_at: r.createdAt,
      author: { login: r.author?.login || 'ghost', avatar_url: r.author?.avatarUrl || '' },
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
        author: { login: c.author?.login || 'ghost', avatar_url: c.author?.avatarUrl || '' },
        diffHunk: c.diffHunk
      }))
    }))
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
