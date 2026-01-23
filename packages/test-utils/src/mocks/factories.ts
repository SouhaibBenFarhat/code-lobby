/**
 * Mock Factories for CodeLobby Tests
 *
 * These factories generate realistic test data for all GitHub API responses,
 * Electron IPC calls, and component props.
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface MockUser {
  id: number
  login: string
  avatar_url: string
  html_url: string
  name: string | null
  type: 'User' | 'Bot'
}

export interface MockRepository {
  id: string
  name: string
  full_name: string
  owner: { login: string; avatar_url: string }
  description: string | null
  html_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  pushed_at: string
  updated_at: string
  private: boolean
}

// Merge status types matching the actual types
export type MockMergeableState = 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN'
export type MockMergeStateStatus =
  | 'BEHIND'
  | 'BLOCKED'
  | 'CLEAN'
  | 'DIRTY'
  | 'DRAFT'
  | 'HAS_HOOKS'
  | 'UNKNOWN'
  | 'UNSTABLE'
export type MockReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REVIEW_REQUIRED' | null

export interface MockPullRequest {
  id: string
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  draft: boolean
  html_url: string
  created_at: string
  updated_at: string
  merged_at: string | null
  user: MockUser
  base: {
    repo: MockRepository
    ref: string
    sha: string
  }
  head: {
    repo: MockRepository | null
    ref: string
    sha: string
  }
  labels: Array<{ name: string; color: string }>
  additions: number
  deletions: number
  changed_files: number
  // Match the actual PullRequest type
  comments: number
  review_comments: number
  commentsList?: MockPRComment[]
  reviews?: MockPRReview[]
  reviewThreads?: MockReviewThread[]
  checks?: MockCheckStatus
  // Merge status fields
  mergeable?: MockMergeableState
  mergeStateStatus?: MockMergeStateStatus
  reviewDecision?: MockReviewDecision
}

export interface MockPRComment {
  id: string
  body: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  created_at: string
  updated_at: string
  html_url: string
}

export interface MockPRReview {
  id: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  body: string | null
  state: 'approved' | 'changes_requested' | 'commented' | 'pending' | 'dismissed'
  created_at: string
  html_url: string
}

export interface MockReviewThread {
  id: string
  path: string
  line: number | null
  diffHunk: string
  isResolved: boolean
  comments: MockReviewComment[]
}

export interface MockReviewComment {
  id: string
  body: string
  author: {
    login: string
    avatar_url: string
    isBot?: boolean
  }
  created_at: string
  html_url: string
  path: string
  line: number | null
  diffHunk?: string
}

export interface MockCheckRun {
  id: string
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'neutral' | null
  html_url: string
  started_at: string | null
  completed_at: string | null
}

export interface MockCheckStatus {
  state: 'success' | 'failure' | 'pending' | 'error'
  total_count: number
  check_runs: MockCheckRun[]
}

export interface MockRateLimit {
  limit: number
  remaining: number
  used: number
  resetAt: string
  percentage: number
}

// ============================================================================
// Counter for unique IDs
// ============================================================================

let idCounter = 1
function getNextId(): number {
  return idCounter++
}
export function resetIdCounter(): void {
  idCounter = 1
}

// ============================================================================
// User Factory
// ============================================================================

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser & { isBot: boolean } {
  const id = getNextId()
  const login = overrides.login || `user-${id}`
  const type = overrides.type || 'User'
  return {
    id,
    login,
    avatar_url: `https://avatars.githubusercontent.com/u/${id}`,
    html_url: `https://github.com/${login}`,
    name: `Test User ${id}`,
    type,
    isBot: type === 'Bot' || login.includes('[bot]'),
    ...overrides
  }
}

export function createMockBot(overrides: Partial<MockUser> = {}): MockUser {
  const id = getNextId()
  return {
    id,
    login: `bot-${id}[bot]`,
    avatar_url: `https://avatars.githubusercontent.com/in/${id}`,
    html_url: `https://github.com/apps/bot-${id}`,
    name: `Bot ${id}`,
    type: 'Bot',
    ...overrides
  }
}

// ============================================================================
// Repository Factory
// ============================================================================

export function createMockRepository(overrides: Partial<MockRepository> = {}): MockRepository {
  const id = getNextId()
  const name = overrides.name || `repo-${id}`
  const ownerLogin = overrides.owner?.login || 'test-org'

  return {
    id: `R_${id}`,
    name,
    full_name: `${ownerLogin}/${name}`,
    owner: {
      login: ownerLogin,
      avatar_url: `https://avatars.githubusercontent.com/u/${id}`
    },
    description: `Description for ${name}`,
    html_url: `https://github.com/${ownerLogin}/${name}`,
    language: 'TypeScript',
    stargazers_count: Math.floor(Math.random() * 1000),
    forks_count: Math.floor(Math.random() * 100),
    open_issues_count: Math.floor(Math.random() * 50),
    pushed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    private: false,
    ...overrides
  }
}

// ============================================================================
// Pull Request Factory
// ============================================================================

export function createMockPullRequest(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  const id = getNextId()
  const repo = overrides.base?.repo || createMockRepository()
  const user = overrides.user || createMockUser()

  return {
    id: `PR_${id}`,
    number: id,
    title: `Fix bug #${id}`,
    body: `This PR fixes issue #${id}\n\n## Changes\n- Fixed the thing\n- Added tests`,
    state: 'open',
    draft: false,
    html_url: `${repo.html_url}/pull/${id}`,
    created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    merged_at: null,
    user,
    base: {
      repo,
      ref: 'main',
      sha: `base-sha-${id}`
    },
    head: {
      repo,
      ref: `feature/fix-${id}`,
      sha: `head-sha-${id}`
    },
    labels: [],
    additions: Math.floor(Math.random() * 500),
    deletions: Math.floor(Math.random() * 200),
    changed_files: Math.floor(Math.random() * 20) + 1,
    comments: 0,
    review_comments: 0,
    commentsList: [],
    reviews: [],
    reviewThreads: [],
    // Default merge status - ready to merge
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    reviewDecision: 'APPROVED',
    ...overrides
  }
}

export function createMockDraftPR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    draft: true,
    mergeStateStatus: 'DRAFT',
    ...overrides
  })
}

// ============================================================================
// Merge Status Factories
// ============================================================================

/** Create a PR that is ready to merge (all checks pass, approved) */
export function createMockMergeablePR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'CLEAN',
    reviewDecision: 'APPROVED',
    checks: createMockCheckStatus(),
    ...overrides
  })
}

/** Create a PR with merge conflicts */
export function createMockConflictingPR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'CONFLICTING',
    mergeStateStatus: 'DIRTY',
    reviewDecision: 'APPROVED',
    ...overrides
  })
}

/** Create a PR blocked by branch protection */
export function createMockBlockedPR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BLOCKED',
    reviewDecision: null,
    ...overrides
  })
}

/** Create a PR that is behind the base branch */
export function createMockBehindPR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BEHIND',
    reviewDecision: 'APPROVED',
    ...overrides
  })
}

/** Create a PR with failing required status checks */
export function createMockUnstablePR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'UNSTABLE',
    reviewDecision: 'APPROVED',
    checks: createMockFailingChecks(),
    ...overrides
  })
}

/** Create a PR that requires review */
export function createMockReviewRequiredPR(
  overrides: Partial<MockPullRequest> = {}
): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BLOCKED',
    reviewDecision: 'REVIEW_REQUIRED',
    ...overrides
  })
}

/** Create a PR with changes requested */
export function createMockChangesRequestedPR(
  overrides: Partial<MockPullRequest> = {}
): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'MERGEABLE',
    mergeStateStatus: 'BLOCKED',
    reviewDecision: 'CHANGES_REQUESTED',
    reviews: [createMockChangesRequested()],
    ...overrides
  })
}

/** Create a PR where merge status is still being computed */
export function createMockComputingPR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    mergeable: 'UNKNOWN',
    mergeStateStatus: 'UNKNOWN',
    reviewDecision: null,
    ...overrides
  })
}

/** Create a PR that has been approved by a reviewer */
export function createMockApprovedPR(
  reviewerLogin = 'reviewer1',
  overrides: Partial<MockPullRequest> = {}
): MockPullRequest {
  return createMockPullRequest({
    reviewDecision: 'APPROVED',
    reviews: [
      createMockApproval({
        author: {
          login: reviewerLogin,
          avatar_url: `https://github.com/${reviewerLogin}.png`,
          isBot: false
        }
      })
    ],
    ...overrides
  })
}

/** Create a PR owned by a specific user */
export function createMockOwnPR(
  ownerLogin = 'testuser',
  overrides: Partial<MockPullRequest> = {}
): MockPullRequest {
  const user = createMockUser({ login: ownerLogin })
  return createMockPullRequest({
    user,
    ...overrides
  })
}

/** Create a PR that needs review (not yet approved) */
export function createMockNeedsReviewPR(overrides: Partial<MockPullRequest> = {}): MockPullRequest {
  return createMockPullRequest({
    reviewDecision: 'REVIEW_REQUIRED',
    reviews: [],
    ...overrides
  })
}

// ============================================================================
// Comment Factory
// ============================================================================

export function createMockComment(overrides: Partial<MockPRComment> = {}): MockPRComment {
  const id = getNextId()
  const user = createMockUser()
  const author = overrides.author || {
    login: user.login,
    avatar_url: user.avatar_url,
    isBot: user.isBot
  }

  return {
    id: `IC_${id}`,
    body: `This is comment ${id}. LGTM! 👍`,
    author,
    created_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    html_url: `https://github.com/test-org/repo/pull/1#issuecomment-${id}`,
    ...overrides
  }
}

export function createMockBotComment(overrides: Partial<MockPRComment> = {}): MockPRComment {
  const bot = createMockBot()
  return createMockComment({
    author: {
      login: bot.login,
      avatar_url: bot.avatar_url,
      isBot: true
    },
    body: '## CI Report\n✅ All checks passed\n\n| Test | Status |\n|------|--------|\n| Unit | ✅ |',
    ...overrides
  })
}

// ============================================================================
// Review Factory
// ============================================================================

export function createMockReview(overrides: Partial<MockPRReview> = {}): MockPRReview {
  const id = getNextId()
  const user = createMockUser()
  const author = overrides.author || {
    login: user.login,
    avatar_url: user.avatar_url,
    isBot: user.isBot
  }

  return {
    id: `PRR_${id}`,
    author,
    body: overrides.state === 'approved' ? 'Looks good to me!' : 'Please address the comments.',
    state: 'commented',
    created_at: new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString(),
    html_url: `https://github.com/test-org/repo/pull/1#pullrequestreview-${id}`,
    ...overrides
  }
}

export function createMockApproval(overrides: Partial<MockPRReview> = {}): MockPRReview {
  return createMockReview({ state: 'approved', body: 'Looks good to me!', ...overrides })
}

export function createMockChangesRequested(overrides: Partial<MockPRReview> = {}): MockPRReview {
  return createMockReview({
    state: 'changes_requested',
    body: 'Please fix the following issues:\n- [ ] Fix linting errors\n- [ ] Add tests',
    ...overrides
  })
}

// ============================================================================
// Review Thread Factory
// ============================================================================

export function createMockReviewThread(
  overrides: Partial<MockReviewThread> = {}
): MockReviewThread {
  const id = getNextId()
  const path = overrides.path || 'src/components/Button.tsx'
  const line = overrides.line ?? Math.floor(Math.random() * 100) + 1
  const diffHunk = `@@ -10,6 +10,8 @@ export function Button() {\n   return (\n-    <button>Click me</button>\n+    <button className="btn">Click me</button>\n   );\n }`

  return {
    id: `PRT_${id}`,
    path,
    line,
    diffHunk,
    isResolved: false,
    comments: overrides.comments || [createMockReviewComment({ path, line, diffHunk })],
    ...overrides
  }
}

export function createMockReviewComment(
  overrides: Partial<MockReviewComment> = {}
): MockReviewComment {
  const id = getNextId()
  const user = createMockUser()
  const author = overrides.author || {
    login: user.login,
    avatar_url: user.avatar_url,
    isBot: user.isBot
  }

  return {
    id: `PRRC_${id}`,
    body: 'Consider using a more descriptive class name here.',
    author,
    created_at: new Date().toISOString(),
    html_url: `https://github.com/test-org/repo/pull/1#discussion_r${id}`,
    path: overrides.path || 'src/components/Button.tsx',
    line: overrides.line ?? 10,
    diffHunk: overrides.diffHunk,
    ...overrides
  }
}

// ============================================================================
// Check Status Factory
// ============================================================================

export function createMockCheckRun(overrides: Partial<MockCheckRun> = {}): MockCheckRun {
  const id = getNextId()

  return {
    id: `CR_${id}`,
    name: `check-${id}`,
    status: 'completed',
    conclusion: 'success',
    html_url: `https://github.com/test-org/repo/actions/runs/${id}`,
    started_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  }
}

export function createMockCheckStatus(overrides: Partial<MockCheckStatus> = {}): MockCheckStatus {
  const check_runs = overrides.check_runs || [
    createMockCheckRun({ name: 'build', conclusion: 'success' }),
    createMockCheckRun({ name: 'test', conclusion: 'success' }),
    createMockCheckRun({ name: 'lint', conclusion: 'success' })
  ]

  const hasFailure = check_runs.some((cr) => cr.conclusion === 'failure')
  const hasPending = check_runs.some((cr) => cr.status !== 'completed')

  return {
    state: hasFailure ? 'failure' : hasPending ? 'pending' : 'success',
    total_count: check_runs.length,
    check_runs,
    ...overrides
  }
}

export function createMockFailingChecks(): MockCheckStatus {
  return createMockCheckStatus({
    state: 'failure',
    check_runs: [
      createMockCheckRun({ name: 'build', conclusion: 'success' }),
      createMockCheckRun({ name: 'test', conclusion: 'failure' }),
      createMockCheckRun({ name: 'lint', conclusion: 'success' })
    ]
  })
}

export function createMockPendingChecks(): MockCheckStatus {
  return createMockCheckStatus({
    state: 'pending',
    check_runs: [
      createMockCheckRun({ name: 'build', status: 'in_progress', conclusion: null }),
      createMockCheckRun({ name: 'test', status: 'queued', conclusion: null })
    ]
  })
}

// ============================================================================
// Rate Limit Factory
// ============================================================================

export function createMockRateLimit(overrides: Partial<MockRateLimit> = {}): MockRateLimit {
  const limit = 5000
  const used = overrides.used ?? Math.floor(Math.random() * 1000)
  const remaining = limit - used

  return {
    limit,
    remaining,
    used,
    resetAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    percentage: Math.round((used / limit) * 100),
    ...overrides
  }
}

// ============================================================================
// Composite Factories (for common test scenarios)
// ============================================================================

export function createMockPRWithComments(commentCount = 3): MockPullRequest {
  const pr = createMockPullRequest()
  pr.commentsList = Array.from({ length: commentCount }, () => createMockComment())
  pr.comments = commentCount
  return pr
}

export function createMockPRWithReviews(reviewCount = 2): MockPullRequest {
  const pr = createMockPullRequest()
  pr.reviews = Array.from({ length: reviewCount }, () => createMockReview())
  return pr
}

export function createMockPRWithMixedComments(): MockPullRequest {
  const pr = createMockPullRequest()
  pr.commentsList = [
    createMockComment(),
    createMockComment(),
    createMockBotComment(),
    createMockBotComment()
  ]
  pr.comments = 4
  return pr
}

export function createMockPRWithChecks(
  status: 'success' | 'failure' | 'pending' = 'success'
): MockPullRequest {
  const pr = createMockPullRequest()
  switch (status) {
    case 'failure':
      pr.checks = createMockFailingChecks()
      break
    case 'pending':
      pr.checks = createMockPendingChecks()
      break
    default:
      pr.checks = createMockCheckStatus()
  }
  return pr
}

export function createMockPRWithCodeReviews(): MockPullRequest {
  const pr = createMockPullRequest()
  pr.reviews = [createMockApproval(), createMockChangesRequested()]
  pr.reviewThreads = [
    createMockReviewThread({ path: 'src/index.ts', line: 10 }),
    createMockReviewThread({ path: 'src/utils.ts', line: 25 })
  ]
  return pr
}

// ============================================================================
// Full Scenario Factories
// ============================================================================

export function createMockRepoWithPRs(prCount = 3): {
  repo: MockRepository
  prs: MockPullRequest[]
} {
  const repo = createMockRepository()
  const prs = Array.from({ length: prCount }, () =>
    createMockPullRequest({ base: { repo, ref: 'main', sha: `sha-${getNextId()}` } })
  )
  return { repo, prs }
}

export function createMockDashboardData(
  repoCount = 2,
  prsPerRepo = 3
): {
  repos: MockRepository[]
  prs: MockPullRequest[]
  rateLimit: MockRateLimit
} {
  const repos: MockRepository[] = []
  const prs: MockPullRequest[] = []

  for (let i = 0; i < repoCount; i++) {
    const { repo, prs: repoPRs } = createMockRepoWithPRs(prsPerRepo)
    repos.push(repo)
    prs.push(...repoPRs)
  }

  return { repos: repos, prs: prs, rateLimit: createMockRateLimit() }
}

// ============================================================================
// Settings/Store Factories
// ============================================================================

export interface MockSettings {
  notifications: boolean
  pollInterval: number
  theme: 'light' | 'dark' | 'system'
}

export function createMockSettings(overrides: Partial<MockSettings> = {}): MockSettings {
  return {
    notifications: true,
    pollInterval: 30000,
    theme: 'dark',
    ...overrides
  }
}

export interface MockLayoutItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export function createMockLayoutItem(
  repoFullName: string,
  overrides: Partial<MockLayoutItem> = {}
): MockLayoutItem {
  return {
    i: repoFullName,
    x: Math.floor(Math.random() * 800),
    y: Math.floor(Math.random() * 600),
    w: 350,
    h: 400,
    ...overrides
  }
}

export interface MockPanelSettings {
  isOpen: boolean
  width: number
}

export function createMockPanelSettings(
  overrides: Partial<MockPanelSettings> = {}
): MockPanelSettings {
  return {
    isOpen: false,
    width: 400,
    ...overrides
  }
}

export interface MockIDEViewSettings {
  sidebarWidth: number
  expandedRepos: string[]
}

export function createMockIDEViewSettings(
  overrides: Partial<MockIDEViewSettings> = {}
): MockIDEViewSettings {
  return {
    sidebarWidth: 280,
    expandedRepos: [],
    ...overrides
  }
}

// ============================================================================
// AI Chat Factories
// ============================================================================

export interface MockChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  thinking?: string
  timestamp: string
}

export function createMockChatMessage(overrides: Partial<MockChatMessage> = {}): MockChatMessage {
  const id = getNextId()
  return {
    id: `msg-${id}`,
    role: 'user',
    content: `Test message ${id}`,
    timestamp: new Date().toISOString(),
    ...overrides
  }
}

export function createMockAssistantMessage(
  overrides: Partial<MockChatMessage> = {}
): MockChatMessage {
  return createMockChatMessage({
    role: 'assistant',
    content: 'I am Claude, an AI assistant. How can I help you today?',
    ...overrides
  })
}

export function createMockChatHistory(messageCount = 4): MockChatMessage[] {
  const messages: MockChatMessage[] = []
  for (let i = 0; i < messageCount; i++) {
    if (i % 2 === 0) {
      messages.push(createMockChatMessage({ content: `User message ${i + 1}` }))
    } else {
      messages.push(createMockAssistantMessage({ content: `Assistant response ${i + 1}` }))
    }
  }
  return messages
}

export interface MockClaudeModel {
  id: string
  display_name: string
  created_at: string
}

export function createMockClaudeModel(overrides: Partial<MockClaudeModel> = {}): MockClaudeModel {
  const id = getNextId()
  return {
    id: `claude-model-${id}`,
    display_name: `Claude Model ${id}`,
    created_at: new Date().toISOString(),
    ...overrides
  }
}

export interface MockAIPanelSettings {
  isOpen: boolean
  width: number
}

export function createMockAIPanelSettings(
  overrides: Partial<MockAIPanelSettings> = {}
): MockAIPanelSettings {
  return {
    isOpen: false,
    width: 380,
    ...overrides
  }
}
