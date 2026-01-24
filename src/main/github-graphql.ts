import { LogCategory, mainLogger as logger } from '@codelobby/logger/main'
import { parseGitHubError, withRetryAndTimeout } from './api-client'
import { http, type RateLimitUpdate } from './http-client'

// Note: We use our own http.post() for GraphQL instead of @octokit/graphql
// This ensures ALL API calls go through httpFetch() for unified tracking

// Callback to notify about rate limit updates from GraphQL responses
let rateLimitNotifier: ((rateLimit: RateLimitUpdate) => void) | null = null

/**
 * Set a callback to be notified when GraphQL responses include rate limit info
 */
export function setGraphQLRateLimitNotifier(
  callback: ((rateLimit: RateLimitUpdate) => void) | null
): void {
  rateLimitNotifier = callback
}

// NOTE: Network request tracking is now handled by httpFetch() in http-client.ts
// ALL API calls (GraphQL and REST) go through that single function

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

// Merge status types from GitHub GraphQL API
export type MergeableState = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
export type MergeStateStatus =
  | 'BEHIND'
  | 'BLOCKED'
  | 'CLEAN'
  | 'DIRTY'
  | 'DRAFT'
  | 'HAS_HOOKS'
  | 'UNKNOWN'
  | 'UNSTABLE'
export type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null

export interface PullRequest {
  id: string
  number: number
  title: string
  body: string | null
  html_url: string
  state: string
  created_at: string
  updated_at: string
  draft: boolean
  merged_at: string | null
  user: {
    login: string
    avatar_url: string
  }
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    repo: {
      name: string
      full_name: string
      owner: {
        login: string
        avatar_url: string
      }
    }
  }
  labels: Array<{
    name: string
    color: string
  }>
  comments: number
  review_comments: number
  additions: number
  deletions: number
  changed_files: number
  // GraphQL additions
  checks: CheckStatus
  commentsList: PRComment[]
  reviews: PRReview[]
  reviewThreads: ReviewThread[]
  // Merge status
  mergeable: MergeableState
  mergeStateStatus: MergeStateStatus
  reviewDecision: ReviewDecision
}

export interface ReviewThread {
  id: string
  isResolved: boolean
  path: string
  line: number | null
  comments: ReviewComment[]
}

export interface ReviewComment {
  id: string
  body: string
  created_at: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  path: string
  line: number | null
  diffHunk?: string
}

export interface CheckStatus {
  state: 'pending' | 'success' | 'failure' | 'error'
  total_count: number
  check_runs: Array<{
    id: string
    name: string
    status: string
    conclusion: string | null
    html_url: string
  }>
}

export interface PRFile {
  path: string
  additions: number
  deletions: number
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAMED' | 'COPIED'
  /** The unified diff patch content for this file */
  patch: string | null
}

export interface PRComment {
  id: string
  body: string
  created_at: string
  author: {
    login: string
    avatar_url: string
    isBot: boolean
  }
}

export interface PRReview {
  id: string
  state: string
  created_at: string
  author: {
    login: string
    avatar_url: string
    isBot: boolean
  }
  body: string | null
}

export interface PREvent {
  id: string
  event: string
  created_at: string
  actor?: {
    login: string
    avatar_url: string
  }
  body?: string
  state?: string
}

export interface Repository {
  id: string
  name: string
  full_name: string
  html_url: string
  description: string | null
  owner: {
    login: string
    avatar_url: string
  }
  stargazers_count: number
  language: string | null
  updated_at: string
}

export interface RateLimitInfo {
  limit: number
  remaining: number
  used: number
  resetAt: string
  percentage: number
  cost?: number // Points this query cost (from GraphQL)
}

/**
 * Fetch rate limit info using GitHub REST API
 * This endpoint doesn't count against the rate limit!
 * We check the GraphQL rate limit since that's what the app uses.
 */
export async function fetchRateLimitOnly(token: string): Promise<RateLimitInfo> {
  const response = await http.get<{
    resources: {
      core: { limit: number; remaining: number; reset: number }
      graphql: { limit: number; remaining: number; reset: number }
      search: { limit: number; remaining: number; reset: number }
    }
  }>('https://api.github.com/rate_limit', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CodeLobby-App'
    },
    operationName: 'github.rateLimit'
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch rate limit: ${response.status}`)
  }

  const data = response.data

  // Log all rate limit resources for debugging
  logger.debug(LogCategory.API, 'Rate limit response', {
    core: data.resources.core,
    graphql: data.resources.graphql,
    search: data.resources.search
  })

  // Use GraphQL rate limit since that's what the app uses for data fetching
  const graphql = data.resources.graphql

  const result = {
    limit: graphql.limit,
    remaining: graphql.remaining,
    used: graphql.limit - graphql.remaining,
    resetAt: new Date(graphql.reset * 1000).toISOString(),
    percentage: Math.round(((graphql.limit - graphql.remaining) / graphql.limit) * 100)
  }

  logger.info(LogCategory.API, 'GraphQL rate limit status', {
    used: result.used,
    remaining: result.remaining,
    limit: result.limit,
    percentage: result.percentage,
    resetAt: result.resetAt
  })

  return result
}

// GraphQL query to get everything in one request!
const GET_ALL_DATA = `
  query GetAllPRData {
    rateLimit {
      limit
      remaining
      used
      resetAt
      cost
    }
    viewer {
      login
      avatarUrl
      name
      url
      
      pullRequests(first: 50, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
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
          merged
          mergedAt
          additions
          deletions
          changedFiles
          
          # Merge status fields
          mergeable
          mergeStateStatus
          reviewDecision
          
          author {
            login
            avatarUrl
          }
          
          headRefName
          headRefOid
          baseRefName
          
          repository {
            name
            nameWithOwner
            url
            description
            stargazerCount
            primaryLanguage {
              name
            }
            updatedAt
            owner {
              login
              avatarUrl
            }
          }
          
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                  contexts(first: 30) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        databaseId
                        name
                        status
                        conclusion
                        detailsUrl
                      }
                      ... on StatusContext {
                        id
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
          
          comments(first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) {
            totalCount
            nodes {
              id
              body
              createdAt
              author {
                __typename
                login
                avatarUrl
              }
            }
          }
          
          reviews(first: 20) {
            totalCount
            nodes {
              id
              state
              createdAt
              body
              author {
                __typename
                login
                avatarUrl
              }
            }
          }
          
          reviewThreads(first: 50) {
            totalCount
            nodes {
              id
              isResolved
              path
              line
              comments(first: 10) {
                nodes {
                  id
                  body
                  createdAt
                  author {
                    __typename
                    login
                    avatarUrl
                  }
                  path
                  line
                  diffHunk
                }
              }
            }
          }
          
          reviewRequests(first: 10) {
            nodes {
              requestedReviewer {
                ... on User {
                  login
                }
              }
            }
          }
        }
      }
    }
  }
`

const GET_USER = `
  query GetUser {
    viewer {
      login
      avatarUrl
      name
      url
    }
  }
`

// Query to fetch ALL open PRs from specific repositories using search
// OPTIMIZED: Only fetches data needed for PR card display (reduced API cost ~50-70%)
// - Removed: body, comments.nodes, reviews.nodes, reviewThreads.nodes, reviewRequests
// - Reduced: labels (5 vs 10), contexts (15 vs 30)
// - Kept: totalCount for comments/reviewThreads (needed for UI badges)
const GET_ALL_PRS_FOR_REPOS = `
  query GetAllPRsForRepos($searchQuery: String!, $cursor: String) {
    rateLimit {
      limit
      remaining
      used
      resetAt
      cost
    }
    viewer {
      login
    }
    search(query: $searchQuery, type: ISSUE, first: 50, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      issueCount
      nodes {
        ... on PullRequest {
          id
          number
          title
          url
          state
          createdAt
          updatedAt
          isDraft
          merged
          mergedAt
          additions
          deletions
          changedFiles
          
          # Merge status fields
          mergeable
          mergeStateStatus
          reviewDecision
          
          author {
            login
            avatarUrl
          }
          
          headRefName
          headRefOid
          baseRefName
          
          repository {
            name
            nameWithOwner
            owner {
              login
              avatarUrl
            }
          }
          
          # Reduced from 10 to 5 (UI only shows first 3)
          labels(first: 5) {
            nodes {
              name
              color
            }
          }
          
          commits(last: 1) {
            nodes {
              commit {
                statusCheckRollup {
                  state
                  # Reduced from 30 to 15 (enough to show status)
                  contexts(first: 15) {
                    nodes {
                      __typename
                      ... on CheckRun {
                        id
                        databaseId
                        name
                        status
                        conclusion
                        detailsUrl
                      }
                      ... on StatusContext {
                        id
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
          
          # Only fetch count, not content (for badge display)
          comments {
            totalCount
          }
          
          # Only fetch count, not content (for badge display)
          reviewThreads {
            totalCount
          }
        }
      }
    }
  }
`

const GET_USER_ORGS = `
  query GetUserOrgs {
    viewer {
      login
      organizations(first: 100) {
        nodes {
          login
        }
      }
    }
  }
`

// Query to fetch a SINGLE PR by owner, repo, and number (efficient for detail refresh)
// Cost: ~1 point vs 5-10 points for fetching all PRs
const GET_SINGLE_PR = `
  query GetSinglePR($owner: String!, $name: String!, $number: Int!) {
    rateLimit {
      limit
      remaining
      used
      resetAt
      cost
    }
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
        merged
        mergedAt
        additions
        deletions
        changedFiles
        
        # Merge status fields
        mergeable
        mergeStateStatus
        reviewDecision
        
        author {
          login
          avatarUrl
        }
        
        headRefName
        headRefOid
        baseRefName
        
        repository {
          name
          nameWithOwner
          url
          description
          stargazerCount
          primaryLanguage {
            name
          }
          updatedAt
          owner {
            login
            avatarUrl
          }
        }
        
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
        
        commits(last: 1) {
          nodes {
            commit {
              statusCheckRollup {
                state
                contexts(first: 30) {
                  nodes {
                    __typename
                    ... on CheckRun {
                      id
                      databaseId
                      name
                      status
                      conclusion
                      detailsUrl
                    }
                    ... on StatusContext {
                      id
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
        
        comments(first: 30, orderBy: {field: UPDATED_AT, direction: DESC}) {
          totalCount
          nodes {
            id
            body
            createdAt
            author {
              __typename
              login
              avatarUrl
            }
          }
        }
        
        reviews(first: 20) {
          totalCount
          nodes {
            id
            state
            createdAt
            body
            author {
              __typename
              login
              avatarUrl
            }
          }
        }
        
        reviewThreads(first: 50) {
          totalCount
          nodes {
            id
            isResolved
            path
            line
            comments(first: 10) {
              nodes {
                id
                body
                createdAt
                author {
                  __typename
                  login
                  avatarUrl
                }
                path
                line
                diffHunk
              }
            }
          }
        }
        
        reviewRequests(first: 10) {
          nodes {
            requestedReviewer {
              ... on User {
                login
              }
            }
          }
        }
      }
    }
  }
`

// Query to fetch ALL repos using search (more reliable than viewer.repositories)
const GET_REPOS_BY_SEARCH = `
  query SearchRepos($searchQuery: String!, $cursor: String) {
    search(query: $searchQuery, type: REPOSITORY, first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      repositoryCount
      nodes {
        ... on Repository {
          id
          name
          nameWithOwner
          url
          description
          stargazerCount
          primaryLanguage {
            name
          }
          updatedAt
          owner {
            login
            avatarUrl
          }
          isArchived
          isPrivate
        }
      }
    }
  }
`

// Note: PR files with patches are fetched via REST API (GraphQL doesn't provide patch content)

/**
 * Create a GraphQL client function that uses our http.post()
 * This ensures ALL API calls go through httpFetch() for unified tracking
 */
function createGraphQLClient(token: string) {
  return async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await http.post<{ data?: T; errors?: Array<{ message: string }> }>(
      'https://api.github.com/graphql',
      {
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables })
      }
    )

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(response.data.errors.map((e) => e.message).join(', '))
    }

    if (!response.data.data) {
      throw new Error('GraphQL response missing data')
    }

    return response.data.data
  }
}

/**
 * Execute a GraphQL query with retry logic and timeout
 * Handles GitHub's HTML error responses (Unicorn 503 pages) gracefully
 * Also extracts rate limit from response and notifies if present
 *
 * NOTE: Network request tracking is handled by httpFetch() - ALL calls go through there
 */
async function executeGraphQL<T>(
  client: ReturnType<typeof createGraphQLClient>,
  query: string,
  variables?: Record<string, unknown>,
  context?: string
): Promise<T> {
  const result = await withRetryAndTimeout<T>(
    async () => {
      try {
        return (await client(query, variables)) as T
      } catch (error) {
        // Re-throw parsed error for better handling
        throw parseGitHubError(error)
      }
    },
    {
      retry: {
        maxRetries: 3,
        initialDelayMs: 2000, // Start with 2 second delay for GitHub
        maxDelayMs: 15000,
        backoffMultiplier: 2
      },
      timeoutMs: 45000, // 45 second timeout per request
      context: context || 'GraphQL request'
    }
  )

  // Extract rate limit from GraphQL response (includes cost - REST headers don't have this)
  if (result && typeof result === 'object') {
    const response = result as {
      rateLimit?: { limit: number; remaining: number; used: number; resetAt: string; cost?: number }
    }
    if (response.rateLimit) {
      const rl = response.rateLimit

      logger.debug(LogCategory.API, 'GraphQL rate limit extracted', {
        used: rl.used,
        remaining: rl.remaining,
        limit: rl.limit,
        cost: rl.cost,
        hasNotifier: !!rateLimitNotifier
      })

      if (rateLimitNotifier) {
        rateLimitNotifier({
          limit: rl.limit,
          remaining: rl.remaining,
          used: rl.used,
          resetAt: rl.resetAt,
          percentage: Math.round((rl.used / rl.limit) * 100),
          resource: 'graphql'
        })
      }
    }
  }

  return result
}

// Type for GraphQL PR response (used by both bulk and single PR queries)
interface GraphQLPullRequest {
  id: string
  number: number
  title: string
  body?: string | null
  url: string
  state: string
  createdAt: string
  updatedAt: string
  isDraft: boolean
  merged: boolean
  mergedAt: string | null
  additions: number
  deletions: number
  changedFiles: number
  mergeable: MergeableState
  mergeStateStatus: MergeStateStatus
  reviewDecision: ReviewDecision
  author: { login: string; avatarUrl: string } | null
  headRefName: string
  headRefOid: string
  baseRefName: string
  repository: {
    name: string
    nameWithOwner: string
    url?: string
    description?: string | null
    stargazerCount?: number
    primaryLanguage?: { name: string } | null
    updatedAt?: string
    owner: { login: string; avatarUrl: string }
  }
  labels?: { nodes: Array<{ name: string; color: string }> }
  commits?: {
    nodes: Array<{
      commit: {
        statusCheckRollup?: {
          state: string
          contexts?: {
            nodes: Array<{
              __typename: string
              id: string
              databaseId?: number
              name?: string
              context?: string
              status?: string
              conclusion?: string | null
              state?: string
              detailsUrl?: string
              targetUrl?: string
            }>
          }
        }
      }
    }>
  }
  comments?: {
    totalCount: number
    nodes?: Array<{
      id: string
      body: string
      createdAt: string
      author: { __typename?: string; login: string; avatarUrl: string } | null
    }>
  }
  reviews?: {
    totalCount: number
    nodes?: Array<{
      id: string
      state: string
      createdAt: string
      body: string | null
      author: { __typename?: string; login: string; avatarUrl: string } | null
    }>
  }
  reviewThreads?: {
    totalCount: number
    nodes?: Array<{
      id: string
      isResolved: boolean
      path: string
      line: number | null
      comments?: {
        nodes: Array<{
          id: string
          body: string
          createdAt: string
          author: { __typename?: string; login: string; avatarUrl: string } | null
          path: string
          line: number | null
          diffHunk: string | null
        }>
      }
    }>
  }
  reviewRequests?: {
    nodes: Array<{
      requestedReviewer: { login: string } | null
    }>
  }
}

/**
 * Transform a GraphQL PR response to our internal PullRequest format
 * Used by both fetchAllPRData, fetchAllPRsForRepos, and fetchSinglePR
 */
function transformGraphQLPR(pr: GraphQLPullRequest, includeDetails = true): PullRequest {
  const repo = pr.repository
  const repoFullName = repo.nameWithOwner

  // Parse check runs
  const statusRollup = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup
  const checkContexts = statusRollup?.contexts?.nodes || []
  const checkState = statusRollup?.state?.toLowerCase() || 'pending'

  const checkRuns = checkContexts.map((ctx) => {
    if (ctx.__typename === 'CheckRun') {
      return {
        id: ctx.id,
        name: ctx.name || '',
        status: ctx.status?.toLowerCase() || 'completed',
        conclusion: ctx.conclusion?.toLowerCase() || null,
        html_url: ctx.detailsUrl || ''
      }
    } else {
      // StatusContext (older status API)
      return {
        id: ctx.id,
        name: ctx.context || '',
        status: ctx.state === 'PENDING' ? 'in_progress' : 'completed',
        conclusion: ctx.state?.toLowerCase() || null,
        html_url: ctx.targetUrl || ''
      }
    }
  })

  // Parse comments, reviews, and review threads if available (for detail view)
  let commentsList: PRComment[] = []
  let reviews: PRReview[] = []
  let reviewThreads: ReviewThread[] = []

  if (includeDetails) {
    commentsList = (pr.comments?.nodes || []).map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.createdAt,
      author: {
        login: c.author?.login || 'ghost',
        avatar_url: c.author?.avatarUrl || '',
        isBot: c.author?.__typename === 'Bot'
      }
    }))

    reviews = (pr.reviews?.nodes || []).map((r) => ({
      id: r.id,
      state: r.state,
      created_at: r.createdAt,
      body: r.body,
      author: {
        login: r.author?.login || 'ghost',
        avatar_url: r.author?.avatarUrl || '',
        isBot: r.author?.__typename === 'Bot'
      }
    }))

    reviewThreads = (pr.reviewThreads?.nodes || []).map((t) => ({
      id: t.id,
      isResolved: t.isResolved,
      path: t.path,
      line: t.line,
      comments: (t.comments?.nodes || []).map((c) => ({
        id: c.id,
        body: c.body,
        created_at: c.createdAt, // Map GraphQL camelCase to our snake_case
        author: {
          login: c.author?.login || 'ghost',
          avatar_url: c.author?.avatarUrl || '',
          isBot: c.author?.__typename === 'Bot'
        },
        path: c.path,
        line: c.line,
        diffHunk: c.diffHunk ?? undefined // Convert null to undefined
      }))
    }))
  }

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    body: pr.body ?? null,
    html_url: pr.url,
    state: pr.state.toLowerCase(),
    created_at: pr.createdAt,
    updated_at: pr.updatedAt,
    draft: pr.isDraft,
    merged_at: pr.mergedAt,
    user: {
      login: pr.author?.login || 'ghost',
      avatar_url: pr.author?.avatarUrl || ''
    },
    head: {
      ref: pr.headRefName,
      sha: pr.headRefOid
    },
    base: {
      ref: pr.baseRefName,
      repo: {
        name: repo.name,
        full_name: repoFullName,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatarUrl
        }
      }
    },
    labels: (pr.labels?.nodes || []).map((l) => ({
      name: l.name,
      color: l.color
    })),
    comments: pr.comments?.totalCount || 0,
    review_comments: pr.reviewThreads?.totalCount || 0,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changedFiles,
    checks: {
      state: checkState as CheckStatus['state'],
      total_count: checkRuns.length,
      check_runs: checkRuns
    },
    commentsList,
    reviews,
    reviewThreads,
    // Merge status
    mergeable: pr.mergeable || 'UNKNOWN',
    mergeStateStatus: pr.mergeStateStatus || 'UNKNOWN',
    reviewDecision: pr.reviewDecision || null
  }
}

export async function validateToken(token: string): Promise<GitHubUser | null> {
  const client = createGraphQLClient(token)

  try {
    const response = await executeGraphQL<{
      viewer: { login: string; avatarUrl: string; name: string | null; url: string }
    }>(client, GET_USER, undefined, 'validateToken')

    return {
      login: response.viewer.login,
      avatar_url: response.viewer.avatarUrl,
      name: response.viewer.name,
      html_url: response.viewer.url
    }
  } catch (error) {
    logger.error(LogCategory.API, 'Failed to validate token', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function fetchAllPRData(token: string): Promise<{
  user: GitHubUser
  pullRequests: PullRequest[]
  repositories: Repository[]
  rateLimit: RateLimitInfo
}> {
  const client = createGraphQLClient(token)

  logger.info(LogCategory.API, 'Fetching all PR data', { context: 'fetchAllPRData' })

  const response: any = await executeGraphQL(client, GET_ALL_DATA, undefined, 'fetchAllPRData')

  // Parse rate limit info
  const rateLimit: RateLimitInfo = {
    limit: response.rateLimit.limit,
    remaining: response.rateLimit.remaining,
    used: response.rateLimit.used,
    resetAt: response.rateLimit.resetAt,
    percentage: Math.round((response.rateLimit.used / response.rateLimit.limit) * 100),
    cost: response.rateLimit.cost
  }

  const user: GitHubUser = {
    login: response.viewer.login,
    avatar_url: response.viewer.avatarUrl,
    name: response.viewer.name,
    html_url: response.viewer.url
  }

  const repoMap = new Map<string, Repository>()
  const pullRequests: PullRequest[] = []

  for (const pr of response.viewer.pullRequests.nodes) {
    // Skip merged PRs
    if (pr.merged) continue

    const repo = pr.repository
    const repoFullName = repo.nameWithOwner

    // Collect unique repositories
    if (!repoMap.has(repoFullName)) {
      repoMap.set(repoFullName, {
        id: repo.name,
        name: repo.name,
        full_name: repoFullName,
        html_url: repo.url,
        description: repo.description,
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatarUrl
        },
        stargazers_count: repo.stargazerCount,
        language: repo.primaryLanguage?.name || null,
        updated_at: repo.updatedAt
      })
    }

    // Parse check runs
    const statusCheckRollup = pr.commits.nodes[0]?.commit?.statusCheckRollup
    const checkState = statusCheckRollup?.state?.toLowerCase() || 'pending'
    const checkContexts = statusCheckRollup?.contexts?.nodes || []

    const checkRuns = checkContexts.map((ctx: any) => {
      if (ctx.__typename === 'CheckRun') {
        return {
          // Use GraphQL node ID - our fetchCheckRunDetails uses GraphQL which accepts node IDs
          id: ctx.id,
          name: ctx.name,
          status: ctx.status?.toLowerCase() || 'queued',
          conclusion: ctx.conclusion?.toLowerCase() || null,
          html_url: ctx.detailsUrl || ''
        }
      } else {
        // StatusContext (older status API)
        return {
          id: ctx.id,
          name: ctx.context,
          status: ctx.state === 'PENDING' ? 'in_progress' : 'completed',
          conclusion: ctx.state?.toLowerCase() || null,
          html_url: ctx.targetUrl || ''
        }
      }
    })

    // Parse comments - detect bots by __typename or username pattern
    const commentsList: PRComment[] = pr.comments.nodes.map((c: any) => {
      const login = c.author?.login || 'ghost'
      const isBot =
        c.author?.__typename === 'Bot' ||
        login.endsWith('[bot]') ||
        (login.includes('bot') && login.includes('-'))
      return {
        id: c.id,
        body: c.body,
        created_at: c.createdAt,
        author: {
          login,
          avatar_url: c.author?.avatarUrl || '',
          isBot
        }
      }
    })

    // Parse reviews - detect bots by __typename or username pattern
    const reviews: PRReview[] = pr.reviews.nodes.map((r: any) => {
      const login = r.author?.login || 'ghost'
      const isBot =
        r.author?.__typename === 'Bot' ||
        login.endsWith('[bot]') ||
        (login.includes('bot') && login.includes('-'))
      return {
        id: r.id,
        state: r.state?.toLowerCase() || 'commented',
        created_at: r.createdAt,
        author: {
          login,
          avatar_url: r.author?.avatarUrl || '',
          isBot
        },
        body: r.body
      }
    })

    // Parse review threads (inline code comments)
    const reviewThreads: ReviewThread[] = (pr.reviewThreads?.nodes || []).map((thread: any) => {
      const comments: ReviewComment[] = (thread.comments?.nodes || []).map((c: any) => {
        const login = c.author?.login || 'ghost'
        const isBot =
          c.author?.__typename === 'Bot' ||
          login.endsWith('[bot]') ||
          (login.includes('bot') && login.includes('-'))
        return {
          id: c.id,
          body: c.body,
          created_at: c.createdAt,
          author: {
            login,
            avatar_url: c.author?.avatarUrl || '',
            isBot
          },
          path: c.path,
          line: c.line,
          diffHunk: c.diffHunk
        }
      })

      return {
        id: thread.id,
        isResolved: thread.isResolved,
        path: thread.path,
        line: thread.line,
        comments
      }
    })

    pullRequests.push({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      html_url: pr.url,
      state: pr.state.toLowerCase(),
      created_at: pr.createdAt,
      updated_at: pr.updatedAt,
      draft: pr.isDraft,
      merged_at: pr.mergedAt,
      user: {
        login: pr.author?.login || 'ghost',
        avatar_url: pr.author?.avatarUrl || ''
      },
      head: {
        ref: pr.headRefName,
        sha: pr.headRefOid
      },
      base: {
        ref: pr.baseRefName,
        repo: {
          name: repo.name,
          full_name: repoFullName,
          owner: {
            login: repo.owner.login,
            avatar_url: repo.owner.avatarUrl
          }
        }
      },
      labels: pr.labels.nodes.map((l: any) => ({
        name: l.name,
        color: l.color
      })),
      comments: pr.comments.totalCount,
      review_comments: pr.reviewThreads?.totalCount || 0,
      additions: pr.additions,
      deletions: pr.deletions,
      changed_files: pr.changedFiles,
      // New GraphQL data - everything in one request!
      checks: {
        state: checkState as CheckStatus['state'],
        total_count: checkRuns.length,
        check_runs: checkRuns
      },
      commentsList,
      reviews,
      reviewThreads,
      // Merge status
      mergeable: pr.mergeable || 'UNKNOWN',
      mergeStateStatus: pr.mergeStateStatus || 'UNKNOWN',
      reviewDecision: pr.reviewDecision || null
    })
  }

  return {
    user,
    pullRequests,
    repositories: Array.from(repoMap.values()),
    rateLimit
  }
}

// Fetch ALL repositories the user has access to using search
export async function fetchAllRepositories(token: string): Promise<Repository[]> {
  const client = createGraphQLClient(token)
  const allRepos: Repository[] = []
  const seenIds = new Set<string>()

  logger.info(LogCategory.API, 'Fetching all repositories', { context: 'fetchAllRepositories' })

  // First, get the user's login
  const userResponse: any = await executeGraphQL(
    client,
    GET_USER,
    undefined,
    'fetchAllRepositories:getUser'
  )
  const userLogin = userResponse.viewer.login

  // Try to get user's organizations (requires read:org scope)
  let orgs: string[] = []
  try {
    const userOrgsResponse: any = await executeGraphQL(
      client,
      GET_USER_ORGS,
      undefined,
      'fetchAllRepositories:getOrgs'
    )
    orgs = userOrgsResponse.viewer.organizations.nodes.map((o: any) => o.login)
  } catch (error) {
    // Could not fetch orgs (may need read:org scope), continuing with user repos only
    logger.warn(LogCategory.API, 'Could not fetch user organizations', {
      error: error instanceof Error ? error.message : String(error)
    })
  }

  // Build search queries for user's repos and all their orgs
  const searchQueries = [
    `user:${userLogin}`, // Repos owned by user
    ...orgs.map((org: string) => `org:${org}`) // Repos in user's organizations
  ]

  for (const searchQuery of searchQueries) {
    let cursor: string | null = null
    let hasNextPage = true

    while (hasNextPage) {
      try {
        const response: any = await executeGraphQL(
          client,
          GET_REPOS_BY_SEARCH,
          { searchQuery: searchQuery, cursor },
          `fetchAllRepositories:search(${searchQuery.substring(0, 30)})`
        )

        const nodes = response?.search?.nodes || []

        for (const repo of nodes) {
          if (!repo || !repo.id) continue
          if (repo.isArchived) continue
          // Use full_name for deduplication (consistent identifier)
          if (seenIds.has(repo.nameWithOwner)) continue

          seenIds.add(repo.nameWithOwner)
          allRepos.push({
            id: repo.id,
            name: repo.name,
            full_name: repo.nameWithOwner,
            html_url: repo.url,
            description: repo.description,
            owner: {
              login: repo.owner.login,
              avatar_url: repo.owner.avatarUrl
            },
            stargazers_count: repo.stargazerCount,
            language: repo.primaryLanguage?.name || null,
            updated_at: repo.updatedAt
          })
        }

        hasNextPage = response.search.pageInfo.hasNextPage
        cursor = response.search.pageInfo.endCursor
      } catch (error) {
        logger.warn(LogCategory.API, 'Failed to fetch repos for query', {
          query: searchQuery,
          error: error instanceof Error ? error.message : String(error)
        })
        hasNextPage = false
      }
    }
  }

  logger.info(LogCategory.API, 'Repositories fetched (no PR data)', {
    count: allRepos.length
  })

  return allRepos
}

// For activity stream - get recent events across all PRs
export function extractEventsFromPRs(pullRequests: PullRequest[]): PREvent[] {
  const events: PREvent[] = []

  for (const pr of pullRequests) {
    // Add comments as events
    for (const comment of pr.commentsList) {
      events.push({
        id: comment.id,
        event: 'commented',
        created_at: comment.created_at,
        actor: comment.author,
        body: comment.body
      })
    }

    // Add reviews as events
    for (const review of pr.reviews) {
      events.push({
        id: review.id,
        event:
          review.state === 'approved'
            ? 'approved'
            : review.state === 'changes_requested'
              ? 'changes_requested'
              : 'reviewed',
        created_at: review.created_at,
        actor: review.author,
        body: review.body || undefined,
        state: review.state
      })
    }
  }

  // Sort by date, most recent first
  return events
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)
}

// Fetch ALL open PRs from specific repositories (not just user's PRs)
export async function fetchAllPRsForRepos(
  token: string,
  repoFullNames: string[]
): Promise<{
  pullRequests: PullRequest[]
  currentUser: string
  rateLimit: RateLimitInfo
}> {
  if (repoFullNames.length === 0) {
    return {
      pullRequests: [],
      currentUser: '',
      rateLimit: { limit: 0, remaining: 0, used: 0, resetAt: '', percentage: 0 }
    }
  }

  const client = createGraphQLClient(token)
  const allPRs: PullRequest[] = []

  // Build search query: "repo:owner/name repo:owner/name2 is:pr is:open"
  const repoQueries = repoFullNames.map((name) => `repo:${name}`).join(' ')
  const searchQuery = `${repoQueries} is:pr is:open`

  logger.info('GraphQL', `Fetching all PRs for repos`, {
    repoCount: repoFullNames.length,
    searchQuery: searchQuery.substring(0, 100)
  })

  let cursor: string | null = null
  let rateLimit: RateLimitInfo = { limit: 0, remaining: 0, used: 0, resetAt: '', percentage: 0 }
  let currentUser = ''

  // Paginate through results
  do {
    const response: any = await executeGraphQL(
      client,
      GET_ALL_PRS_FOR_REPOS,
      { searchQuery, cursor },
      'fetchAllPRsForRepos:search'
    )

    currentUser = response.viewer.login
    rateLimit = {
      limit: response.rateLimit.limit,
      remaining: response.rateLimit.remaining,
      used: response.rateLimit.used,
      resetAt: response.rateLimit.resetAt,
      percentage: Math.round((response.rateLimit.used / response.rateLimit.limit) * 100),
      cost: response.rateLimit.cost // Include the actual query cost
    }

    const searchResults = response.search

    for (const pr of searchResults.nodes) {
      if (!pr || !pr.id) continue

      const repo = pr.repository
      const repoFullName = repo.nameWithOwner

      // Parse check runs
      const statusRollup = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup
      const checkContexts = statusRollup?.contexts?.nodes || []
      const checkState = statusRollup?.state?.toLowerCase() || 'pending'

      const checkRuns = checkContexts.map((ctx: any) => {
        if (ctx.__typename === 'CheckRun') {
          return {
            // Use GraphQL node ID - our fetchCheckRunDetails uses GraphQL which accepts node IDs
            id: ctx.id,
            name: ctx.name,
            status: ctx.status?.toLowerCase() || 'completed',
            conclusion: ctx.conclusion?.toLowerCase() || null,
            html_url: ctx.detailsUrl || ''
          }
        } else {
          // StatusContext (older status API)
          return {
            id: ctx.id,
            name: ctx.context,
            status: ctx.state === 'PENDING' ? 'in_progress' : 'completed',
            conclusion: ctx.state?.toLowerCase() || null,
            html_url: ctx.targetUrl || ''
          }
        }
      })

      // OPTIMIZED: Comments, reviews, and reviewThreads content not fetched
      // Only totalCount is available (used for badge display)
      // Full content is fetched on-demand when PR detail is opened
      const commentsList: PRComment[] = []
      const reviews: PRReview[] = []
      const reviewThreads: ReviewThread[] = []

      allPRs.push({
        id: pr.id,
        number: pr.number,
        title: pr.title,
        body: null, // OPTIMIZED: Not fetched in list view (fetched on-demand for detail/AI)
        html_url: pr.url,
        state: pr.state.toLowerCase(),
        created_at: pr.createdAt,
        updated_at: pr.updatedAt,
        draft: pr.isDraft,
        merged_at: pr.mergedAt,
        user: {
          login: pr.author?.login || 'ghost',
          avatar_url: pr.author?.avatarUrl || ''
        },
        head: {
          ref: pr.headRefName,
          sha: pr.headRefOid
        },
        base: {
          ref: pr.baseRefName,
          repo: {
            name: repo.name,
            full_name: repoFullName,
            owner: {
              login: repo.owner.login,
              avatar_url: repo.owner.avatarUrl
            }
          }
        },
        labels: (pr.labels?.nodes || []).map((l: any) => ({
          name: l.name,
          color: l.color
        })),
        comments: pr.comments?.totalCount || 0,
        review_comments: pr.reviewThreads?.totalCount || 0,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changedFiles,
        checks: {
          state: checkState as CheckStatus['state'],
          total_count: checkRuns.length,
          check_runs: checkRuns
        },
        commentsList,
        reviews,
        reviewThreads,
        // Merge status
        mergeable: pr.mergeable || 'UNKNOWN',
        mergeStateStatus: pr.mergeStateStatus || 'UNKNOWN',
        reviewDecision: pr.reviewDecision || null
      })
    }

    cursor = searchResults.pageInfo.hasNextPage ? searchResults.pageInfo.endCursor : null
  } while (cursor)

  logger.info('GraphQL', `Fetched all PRs for repos`, {
    prCount: allPRs.length,
    rateLimit: `${rateLimit.remaining}/${rateLimit.limit}`
  })

  return { pullRequests: allPRs, currentUser, rateLimit }
}

/**
 * Fetch a SINGLE PR by owner, repo, and number
 * Much more efficient than fetching all PRs when only one is needed
 * Cost: ~1 point vs 5-10 points for bulk fetch
 */
export async function fetchSinglePR(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ pullRequest: PullRequest | null; rateLimit: RateLimitInfo }> {
  const client = createGraphQLClient(token)

  interface SinglePRResponse {
    rateLimit: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      cost: number
    }
    repository: {
      pullRequest: GraphQLPullRequest | null
    } | null
  }

  logger.info('GraphQL', `Fetching single PR: ${owner}/${repo}#${prNumber}`)

  const response = await executeGraphQL<SinglePRResponse>(
    client,
    GET_SINGLE_PR,
    { owner, name: repo, number: prNumber },
    `fetchSinglePR(${owner}/${repo}#${prNumber})`
  )

  const rateLimit: RateLimitInfo = {
    limit: response.rateLimit.limit,
    remaining: response.rateLimit.remaining,
    used: response.rateLimit.used,
    resetAt: response.rateLimit.resetAt,
    percentage: Math.round(
      ((response.rateLimit.limit - response.rateLimit.remaining) / response.rateLimit.limit) * 100
    ),
    cost: response.rateLimit.cost
  }

  // Notify about rate limit
  if (rateLimitNotifier) {
    rateLimitNotifier({
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      used: rateLimit.used,
      resetAt: rateLimit.resetAt,
      percentage: rateLimit.percentage,
      resource: 'graphql'
    })
  }

  const graphqlPR = response.repository?.pullRequest
  if (!graphqlPR) {
    logger.warn('GraphQL', `PR not found: ${owner}/${repo}#${prNumber}`)
    return { pullRequest: null, rateLimit }
  }

  // Transform GraphQL PR to our format (same as in fetchAllPRsForRepos)
  const pullRequest = transformGraphQLPR(graphqlPR)

  logger.info('GraphQL', `Fetched single PR: ${owner}/${repo}#${prNumber}`, {
    title: pullRequest.title,
    cost: rateLimit.cost,
    remaining: rateLimit.remaining
  })

  return { pullRequest, rateLimit }
}

/**
 * Fetch changed files for a specific PR using REST API
 * REST API provides everything: path, additions, deletions, status, AND patch content
 * (GraphQL doesn't provide patch content, so we use REST directly)
 */
export async function fetchPRFiles(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<{ files: PRFile[]; rateLimit: RateLimitInfo }> {
  const allFiles: PRFile[] = []
  let page = 1
  const perPage = 100

  type PRFileResponse = Array<{
    filename: string
    patch?: string
    additions: number
    deletions: number
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  }>

  // Fetch all pages (REST API paginates at 100 files)
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`

    const response = await http.get<PRFileResponse>(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      operationName: `github.prFiles(${owner}/${repo}#${prNumber}, page=${page})`
    })

    if (!response.ok) {
      throw new Error(`REST API error: ${response.status} ${response.statusText}`)
    }

    const files = response.data

    // Map REST status to our changeType enum
    const statusToChangeType = (status: string): PRFile['changeType'] => {
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

    for (const file of files) {
      allFiles.push({
        path: file.filename,
        additions: file.additions,
        deletions: file.deletions,
        changeType: statusToChangeType(file.status),
        patch: file.patch || null
      })
    }

    // Check if there are more pages
    if (files.length < perPage) {
      break
    }
    page++
  }

  // Get rate limit from headers (REST API provides this)
  const rateLimit: RateLimitInfo = {
    limit: 5000, // Default for authenticated requests
    remaining: 5000,
    used: 0,
    resetAt: new Date().toISOString(),
    percentage: 0
  }

  logger.info(LogCategory.API, 'Fetched PR files', {
    owner,
    repo,
    prNumber,
    fileCount: allFiles.length
  })

  return { files: allFiles, rateLimit }
}

// ═══════════════════════════════════════════════════════════════════════════
// CI CHECK ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

export interface CheckRunAnnotation {
  path: string
  startLine: number
  endLine: number
  annotationLevel: 'failure' | 'warning' | 'notice'
  message: string
  title: string | null
  rawDetails: string | null
}

export interface CheckRunDetails {
  id: string
  databaseId: number | null // Numeric ID for REST API (GitHub Actions only)
  name: string
  status: string
  conclusion: string | null
  startedAt: string | null
  completedAt: string | null
  output: {
    title: string | null
    summary: string | null
    text: string | null
    annotationsCount: number
    annotations: CheckRunAnnotation[]
  }
  htmlUrl: string
  logs?: string | null // Actual CI logs (fetched separately for GitHub Actions)
}

/**
 * Fetch detailed information about a check run including annotations (failure messages)
 * Uses GraphQL API with node ID (works for all check types, not just GitHub Actions)
 */
export async function fetchCheckRunDetails(
  token: string,
  _owner: string,
  _repo: string,
  checkRunId: string
): Promise<{ checkRun: CheckRunDetails; rateLimit: RateLimitInfo }> {
  // Use GraphQL to fetch check run details by node ID
  // This works for ALL check runs (GitHub Actions, third-party apps, etc.)
  const query = `
    query GetCheckRunDetails($nodeId: ID!) {
      node(id: $nodeId) {
        ... on CheckRun {
          id
          databaseId
          name
          status
          conclusion
          startedAt
          completedAt
          detailsUrl
          summary
          text
          title
          annotations(first: 50) {
            nodes {
              path
              location {
                start { line }
                end { line }
              }
              annotationLevel
              message
              title
              rawDetails
            }
          }
        }
      }
      rateLimit {
        limit
        remaining
        used
        resetAt
        cost
      }
    }
  `

  const client = createGraphQLClient(token)

  interface CheckRunGraphQLResponse {
    node: {
      id: string
      databaseId: number | null
      name: string
      status: string
      conclusion: string | null
      startedAt: string | null
      completedAt: string | null
      detailsUrl: string | null
      summary: string | null
      text: string | null
      title: string | null
      annotations: {
        nodes: Array<{
          path: string
          location: {
            start: { line: number }
            end: { line: number }
          } | null
          annotationLevel: string
          message: string
          title: string | null
          rawDetails: string | null
        }>
      }
    } | null
    rateLimit: {
      limit: number
      remaining: number
      used: number
      resetAt: string
      cost?: number
    }
  }

  logger.info(LogCategory.API, 'Fetching check run details via GraphQL', { checkRunId })

  const response = await executeGraphQL<CheckRunGraphQLResponse>(
    client,
    query,
    { nodeId: checkRunId },
    'fetchCheckRunDetails'
  )

  if (!response.node) {
    throw new Error(`Check run not found: ${checkRunId}`)
  }

  const node = response.node
  const annotations: CheckRunAnnotation[] = (node.annotations?.nodes || []).map((a) => ({
    path: a.path,
    startLine: a.location?.start?.line || 0,
    endLine: a.location?.end?.line || 0,
    annotationLevel: (a.annotationLevel?.toLowerCase() || 'notice') as
      | 'failure'
      | 'warning'
      | 'notice',
    message: a.message,
    title: a.title,
    rawDetails: a.rawDetails
  }))

  const checkRun: CheckRunDetails = {
    id: node.id,
    databaseId: node.databaseId,
    name: node.name,
    status: node.status?.toLowerCase() || 'completed',
    conclusion: node.conclusion?.toLowerCase() || null,
    startedAt: node.startedAt,
    completedAt: node.completedAt,
    output: {
      title: node.title,
      summary: node.summary,
      text: node.text,
      annotationsCount: annotations.length,
      annotations
    },
    htmlUrl: node.detailsUrl || ''
  }

  logger.info(LogCategory.API, 'Fetched check run details via GraphQL', {
    checkRunId,
    name: checkRun.name,
    conclusion: checkRun.conclusion,
    annotationsCount: annotations.length
  })

  const rateLimit: RateLimitInfo = {
    limit: response.rateLimit.limit,
    remaining: response.rateLimit.remaining,
    used: response.rateLimit.used,
    resetAt: response.rateLimit.resetAt,
    percentage: Math.round((response.rateLimit.used / response.rateLimit.limit) * 100),
    cost: response.rateLimit.cost
  }

  return { checkRun, rateLimit }
}

/**
 * Fetch the actual CI logs for a GitHub Actions job
 * This only works for GitHub Actions, not third-party CI providers
 *
 * @param token - GitHub token
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param jobId - The numeric job ID (databaseId from GraphQL)
 * @returns The log content as a string, or null if not available
 */
export async function fetchCheckRunLogs(
  token: string,
  owner: string,
  repo: string,
  jobId: number
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${jobId}/logs`

  logger.info(LogCategory.API, 'Fetching CI logs for job', { owner, repo, jobId })

  try {
    const response = await http.get<string>(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      operationName: `github.getJobLogs(${owner}/${repo}/${jobId})`,
      // Follow redirects - GitHub returns a 302 to the log URL
      redirect: 'follow'
    })

    if (!response.ok) {
      logger.warn(LogCategory.API, 'Failed to fetch CI logs', {
        jobId,
        status: response.status,
        statusText: response.statusText
      })
      return null
    }

    // Logs can be very large - truncate to last 20KB to get the failure context
    const logs = typeof response.data === 'string' ? response.data : String(response.data)
    const maxSize = 20 * 1024 // 20KB - enough to capture most failure output
    if (logs.length > maxSize) {
      // Keep the last part which usually contains the failure
      return `...(truncated)...\n${logs.slice(-maxSize)}`
    }
    return logs
  } catch (error) {
    logger.error(LogCategory.API, 'Error fetching CI logs', {
      jobId,
      error: (error as Error).message
    })
    return null
  }
}

/**
 * Post a review comment on a specific line of a PR
 * Uses GitHub REST API as GraphQL doesn't support creating review comments easily
 */
export async function postPRReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  commitId: string,
  path: string,
  line: number,
  body: string
): Promise<{ success: boolean; commentUrl?: string; error?: string }> {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/comments`

  try {
    const response = await http.post<{ html_url: string; message?: string }>(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body,
        commit_id: commitId,
        path,
        line,
        side: 'RIGHT' // Comment on the new version of the file
      }),
      operationName: `github.postComment(${owner}/${repo}#${prNumber})`
    })

    if (!response.ok) {
      return {
        success: false,
        error: response.data.message || `HTTP ${response.status}: ${response.statusText}`
      }
    }

    return {
      success: true,
      commentUrl: response.data.html_url
    }
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PR MERGE
// ═══════════════════════════════════════════════════════════════════════════

export type MergeMethod = 'MERGE' | 'SQUASH' | 'REBASE'

export interface MergePRResult {
  success: boolean
  mergedAt?: string
  sha?: string
  error?: string
}

/**
 * Merge a pull request using GitHub GraphQL API
 * @param token - GitHub token
 * @param prNodeId - The GraphQL node ID of the PR (not the PR number!)
 * @param mergeMethod - MERGE, SQUASH, or REBASE
 * @param commitHeadline - Optional custom commit title (for SQUASH/MERGE)
 * @param commitBody - Optional custom commit body (for SQUASH/MERGE)
 */
export async function mergePullRequest(
  token: string,
  prNodeId: string,
  mergeMethod: MergeMethod = 'SQUASH',
  commitHeadline?: string,
  commitBody?: string
): Promise<MergePRResult> {
  const mutation = `
    mutation MergePullRequest($input: MergePullRequestInput!) {
      mergePullRequest(input: $input) {
        pullRequest {
          id
          merged
          mergedAt
          mergeCommit {
            oid
          }
        }
      }
    }
  `

  const client = createGraphQLClient(token)

  const input: {
    pullRequestId: string
    mergeMethod: MergeMethod
    commitHeadline?: string
    commitBody?: string
  } = {
    pullRequestId: prNodeId,
    mergeMethod
  }

  if (commitHeadline) {
    input.commitHeadline = commitHeadline
  }
  if (commitBody) {
    input.commitBody = commitBody
  }

  try {
    logger.info(LogCategory.API, 'Merging pull request', {
      prNodeId,
      mergeMethod
    })

    const response = await executeGraphQL<{
      mergePullRequest: {
        pullRequest: {
          id: string
          merged: boolean
          mergedAt: string | null
          mergeCommit: { oid: string } | null
        }
      }
    }>(client, mutation, { input }, 'mergePullRequest')

    const pr = response.mergePullRequest.pullRequest

    if (pr.merged) {
      logger.info(LogCategory.API, 'Pull request merged successfully', {
        prNodeId,
        mergedAt: pr.mergedAt,
        sha: pr.mergeCommit?.oid
      })

      return {
        success: true,
        mergedAt: pr.mergedAt || undefined,
        sha: pr.mergeCommit?.oid
      }
    }

    return {
      success: false,
      error: 'Merge completed but PR not marked as merged'
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Failed to merge pull request', {
      prNodeId,
      error: errorMessage
    })

    // Parse common GitHub merge errors
    let friendlyError = errorMessage
    if (errorMessage.includes('BLOCKED')) {
      friendlyError = 'Merge blocked: Branch protection rules not satisfied'
    } else if (errorMessage.includes('DIRTY')) {
      friendlyError = 'Merge conflict: The PR has conflicts that must be resolved'
    } else if (errorMessage.includes('BEHIND')) {
      friendlyError = 'Branch is behind: Update from base branch required'
    } else if (errorMessage.includes('UNSTABLE')) {
      friendlyError = 'Required status checks are failing'
    } else if (errorMessage.includes('not mergeable')) {
      friendlyError = 'PR cannot be merged at this time'
    }

    return {
      success: false,
      error: friendlyError
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PR APPROVE / REQUEST CHANGES
// ═══════════════════════════════════════════════════════════════════════════

export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'

export interface SubmitReviewResult {
  success: boolean
  reviewId?: string
  state?: string
  error?: string
}

/**
 * Submit a review on a pull request (approve, request changes, or comment)
 * Uses GitHub GraphQL API addPullRequestReview mutation
 *
 * @param token - GitHub token
 * @param prNodeId - The GraphQL node ID of the PR
 * @param event - APPROVE, REQUEST_CHANGES, or COMMENT
 * @param body - Optional review comment body (required for REQUEST_CHANGES)
 */
export async function submitPullRequestReview(
  token: string,
  prNodeId: string,
  event: ReviewEvent,
  body?: string
): Promise<SubmitReviewResult> {
  const mutation = `
    mutation AddPullRequestReview($input: AddPullRequestReviewInput!) {
      addPullRequestReview(input: $input) {
        pullRequestReview {
          id
          state
          createdAt
          author {
            login
          }
        }
      }
    }
  `

  const client = createGraphQLClient(token)

  const input: {
    pullRequestId: string
    event: ReviewEvent
    body?: string
  } = {
    pullRequestId: prNodeId,
    event
  }

  // Body is required for REQUEST_CHANGES, optional for others
  if (body) {
    input.body = body
  }

  try {
    logger.info(LogCategory.API, 'Submitting pull request review', {
      prNodeId,
      event,
      hasBody: !!body
    })

    const response = await executeGraphQL<{
      addPullRequestReview: {
        pullRequestReview: {
          id: string
          state: string
          createdAt: string
          author: { login: string } | null
        }
      }
    }>(client, mutation, { input }, 'submitPullRequestReview')

    const review = response.addPullRequestReview.pullRequestReview

    logger.info(LogCategory.API, 'Pull request review submitted successfully', {
      prNodeId,
      reviewId: review.id,
      state: review.state,
      author: review.author?.login
    })

    return {
      success: true,
      reviewId: review.id,
      state: review.state
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.API, 'Failed to submit pull request review', {
      prNodeId,
      event,
      error: errorMessage
    })

    // Parse common errors
    let friendlyError = errorMessage
    if (errorMessage.includes('cannot review your own pull request')) {
      friendlyError = 'You cannot approve your own pull request'
    } else if (errorMessage.includes('not authorized')) {
      friendlyError = 'You do not have permission to review this PR'
    } else if (errorMessage.includes('already reviewed')) {
      friendlyError = 'You have already submitted a review'
    }

    return {
      success: false,
      error: friendlyError
    }
  }
}
