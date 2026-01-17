import { Octokit } from '@octokit/rest'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
  html_url: string
}

export interface PullRequest {
  id: number
  number: number
  title: string
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
}

export interface PREvent {
  id: number
  event: string
  created_at: string
  actor?: {
    login: string
    avatar_url: string
  }
  body?: string
  state?: string
  commit_id?: string
  submitted_at?: string
}

export interface CheckStatus {
  state: 'pending' | 'success' | 'failure' | 'error'
  total_count: number
  statuses: Array<{
    state: string
    context: string
    description: string | null
    target_url: string | null
  }>
  check_runs: Array<{
    id: number
    name: string
    status: string
    conclusion: string | null
    html_url: string
    started_at: string | null
    completed_at: string | null
  }>
}

export async function validateToken(token: string): Promise<GitHubUser | null> {
  const octokit = new Octokit({ auth: token })
  const { data } = await octokit.users.getAuthenticated()
  return {
    login: data.login,
    avatar_url: data.avatar_url,
    name: data.name,
    html_url: data.html_url
  }
}

export async function fetchUserPRs(token: string): Promise<PullRequest[]> {
  const octokit = new Octokit({ auth: token })
  
  // Get current user
  const { data: user } = await octokit.users.getAuthenticated()
  
  // Search for open PRs authored by the user
  const { data: searchResults } = await octokit.search.issuesAndPullRequests({
    q: `is:pr is:open author:${user.login}`,
    sort: 'updated',
    order: 'desc',
    per_page: 100
  })

  // Fetch full PR details for each result
  const prs: PullRequest[] = await Promise.all(
    searchResults.items.map(async (item) => {
      const [owner, repo] = item.repository_url.split('/').slice(-2)
      const { data: pr } = await octokit.pulls.get({
        owner,
        repo,
        pull_number: item.number
      })
      
      return {
        id: pr.id,
        number: pr.number,
        title: pr.title,
        html_url: pr.html_url,
        state: pr.state,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        draft: pr.draft || false,
        merged_at: pr.merged_at,
        user: {
          login: pr.user?.login || '',
          avatar_url: pr.user?.avatar_url || ''
        },
        head: {
          ref: pr.head.ref,
          sha: pr.head.sha
        },
        base: {
          ref: pr.base.ref,
          repo: {
            name: pr.base.repo.name,
            full_name: pr.base.repo.full_name,
            owner: {
              login: pr.base.repo.owner.login,
              avatar_url: pr.base.repo.owner.avatar_url
            }
          }
        },
        labels: pr.labels.map(l => ({
          name: typeof l === 'string' ? l : l.name || '',
          color: typeof l === 'string' ? '000000' : l.color || '000000'
        })),
        comments: pr.comments,
        review_comments: pr.review_comments,
        additions: pr.additions,
        deletions: pr.deletions,
        changed_files: pr.changed_files
      }
    })
  )

  return prs.filter(pr => !pr.merged_at)
}

export async function fetchPREvents(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PREvent[]> {
  const octokit = new Octokit({ auth: token })

  // Fetch timeline events
  const { data: timeline } = await octokit.issues.listEventsForTimeline({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 50
  })

  // Fetch comments
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 20
  })

  // Fetch review comments
  const { data: reviewComments } = await octokit.pulls.listReviewComments({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 20
  })

  const events: PREvent[] = []

  // Process timeline events
  timeline.forEach((event: Record<string, unknown>) => {
    const actor = event.actor as { login: string; avatar_url: string } | undefined
    events.push({
      id: event.id as number || Math.random(),
      event: event.event as string || 'unknown',
      created_at: event.created_at as string || new Date().toISOString(),
      actor: actor ? {
        login: actor.login,
        avatar_url: actor.avatar_url
      } : undefined,
      body: event.body as string | undefined,
      state: event.state as string | undefined,
      commit_id: event.commit_id as string | undefined,
      submitted_at: event.submitted_at as string | undefined
    })
  })

  // Process comments
  comments.forEach(comment => {
    events.push({
      id: comment.id,
      event: 'commented',
      created_at: comment.created_at,
      actor: comment.user ? {
        login: comment.user.login,
        avatar_url: comment.user.avatar_url
      } : undefined,
      body: comment.body || undefined
    })
  })

  // Process review comments
  reviewComments.forEach(comment => {
    events.push({
      id: comment.id,
      event: 'review_comment',
      created_at: comment.created_at,
      actor: comment.user ? {
        login: comment.user.login,
        avatar_url: comment.user.avatar_url
      } : undefined,
      body: comment.body
    })
  })

  // Sort by date, most recent first
  return events.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export interface Repository {
  id: number
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
  open_issues_count: number
}

export async function fetchContributedRepos(token: string): Promise<Repository[]> {
  const octokit = new Octokit({ auth: token })
  const repoMap = new Map<string, Repository>()
  
  // Get current user
  const { data: user } = await octokit.users.getAuthenticated()

  // Method 1: Get repos from user's open PRs (definitely contributed)
  try {
    const { data: prSearch } = await octokit.search.issuesAndPullRequests({
      q: `is:pr author:${user.login}`,
      sort: 'updated',
      order: 'desc',
      per_page: 100
    })

    for (const item of prSearch.items) {
      const repoFullName = item.repository_url.split('/').slice(-2).join('/')
      if (!repoMap.has(repoFullName)) {
        try {
          const [owner, repo] = repoFullName.split('/')
          const { data: repoData } = await octokit.repos.get({ owner, repo })
          repoMap.set(repoFullName, {
            id: repoData.id,
            name: repoData.name,
            full_name: repoData.full_name,
            html_url: repoData.html_url,
            description: repoData.description,
            owner: {
              login: repoData.owner.login,
              avatar_url: repoData.owner.avatar_url
            },
            stargazers_count: repoData.stargazers_count,
            language: repoData.language,
            updated_at: repoData.updated_at,
            open_issues_count: repoData.open_issues_count
          })
        } catch {
          // Skip repos we can't access
        }
      }
    }
  } catch (error) {
    console.error('Error fetching PR repos:', error)
  }

  // Method 2: Get repos from recent push events
  try {
    const { data: events } = await octokit.activity.listEventsForAuthenticatedUser({
      username: user.login,
      per_page: 100
    })

    // Only look at PushEvent and PullRequestEvent
    const contributionEvents = events.filter(e => 
      e.type === 'PushEvent' || e.type === 'PullRequestEvent'
    )

    for (const event of contributionEvents) {
      if (event.repo && !repoMap.has(event.repo.name)) {
        try {
          const [owner, repo] = event.repo.name.split('/')
          const { data: repoData } = await octokit.repos.get({ owner, repo })
          repoMap.set(event.repo.name, {
            id: repoData.id,
            name: repoData.name,
            full_name: repoData.full_name,
            html_url: repoData.html_url,
            description: repoData.description,
            owner: {
              login: repoData.owner.login,
              avatar_url: repoData.owner.avatar_url
            },
            stargazers_count: repoData.stargazers_count,
            language: repoData.language,
            updated_at: repoData.updated_at,
            open_issues_count: repoData.open_issues_count
          })
        } catch {
          // Skip repos we can't access anymore
        }
      }
    }
  } catch (error) {
    console.error('Error fetching event repos:', error)
  }

  return Array.from(repoMap.values()).sort((a, b) => 
    new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}

export async function fetchPRCheckStatus(
  token: string,
  owner: string,
  repo: string,
  ref: string
): Promise<CheckStatus> {
  const octokit = new Octokit({ auth: token })

  // Fetch combined status
  const { data: combinedStatus } = await octokit.repos.getCombinedStatusForRef({
    owner,
    repo,
    ref
  })

  // Fetch check runs
  const { data: checkRuns } = await octokit.checks.listForRef({
    owner,
    repo,
    ref
  })

  return {
    state: combinedStatus.state as CheckStatus['state'],
    total_count: combinedStatus.total_count + checkRuns.total_count,
    statuses: combinedStatus.statuses.map(s => ({
      state: s.state,
      context: s.context,
      description: s.description,
      target_url: s.target_url
    })),
    check_runs: checkRuns.check_runs.map(cr => ({
      id: cr.id,
      name: cr.name,
      status: cr.status,
      conclusion: cr.conclusion,
      html_url: cr.html_url || '',
      started_at: cr.started_at,
      completed_at: cr.completed_at
    }))
  }
}
