import { LogCategory, mainLogger as logger } from '@codelobby/logger/main'
import { graphql } from '@octokit/graphql'
import { parseGitHubError, withRetryAndTimeout } from './api-client'
import { http } from './http-client'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

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
const GET_ALL_PRS_FOR_REPOS = `
  query GetAllPRsForRepos($searchQuery: String!, $cursor: String) {
    rateLimit {
      limit
      remaining
      used
      resetAt
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

function createGraphQLClient(token: string) {
  return graphql.defaults({
    headers: {
      authorization: `token ${token}`
    }
  })
}

/**
 * Execute a GraphQL query with retry logic and timeout
 * Handles GitHub's HTML error responses (Unicorn 503 pages) gracefully
 */
async function executeGraphQL<T>(
  client: ReturnType<typeof createGraphQLClient>,
  query: string,
  variables?: Record<string, unknown>,
  context?: string
): Promise<T> {
  return withRetryAndTimeout<T>(
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
    percentage: Math.round((response.rateLimit.used / response.rateLimit.limit) * 100)
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
      reviewThreads
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
      percentage: Math.round((response.rateLimit.used / response.rateLimit.limit) * 100)
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
            id: ctx.id,
            name: ctx.name,
            status: ctx.status?.toLowerCase() || 'completed',
            conclusion: ctx.conclusion?.toLowerCase() || null,
            html_url: ctx.detailsUrl || ''
          }
        } else {
          return {
            id: ctx.id,
            name: ctx.context,
            status: ctx.state === 'PENDING' ? 'in_progress' : 'completed',
            conclusion: ctx.state?.toLowerCase() || null,
            html_url: ctx.targetUrl || ''
          }
        }
      })

      // Parse comments
      const commentsList: PRComment[] = (pr.comments?.nodes || []).map((c: any) => {
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

      // Parse reviews
      const reviews: PRReview[] = (pr.reviews?.nodes || []).map((r: any) => {
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

      // Parse review threads
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

      allPRs.push({
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
        reviewThreads
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
