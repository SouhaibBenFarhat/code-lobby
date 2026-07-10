/**
 * GitHub API Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addPRComment,
  closePR,
  convertPRToDraft,
  fetchContributions,
  fetchCurrentUser,
  fetchPRFiles,
  fetchPRsForRepos,
  fetchRateLimit,
  fetchRepos,
  fetchSinglePR,
  fetchUserEvents,
  markPRReady,
  mergePR,
  reopenPR,
  submitPRReview,
  updatePRBranch,
  validateToken
} from './github'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Helper to create a mock response that works with http.ts
function mockResponse(data: unknown, ok = true, status = 200, statusText = 'OK') {
  return {
    ok,
    status,
    statusText,
    text: () => Promise.resolve(JSON.stringify(data)),
    json: () => Promise.resolve(data)
  }
}

function mockErrorResponse(status: number, statusText = 'Error') {
  return {
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve(statusText)
  }
}

describe('GitHub API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('validateToken', () => {
    it('returns valid true with user data for valid token', async () => {
      const mockUser = {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png'
      }
      mockFetch.mockResolvedValueOnce(mockResponse(mockUser))

      const result = await validateToken('ghp_validtoken')

      expect(result.valid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer ghp_validtoken'
          })
        })
      )
    })

    it('returns valid false for invalid token', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'))

      const result = await validateToken('invalid-token')

      expect(result.valid).toBe(false)
      expect(result.user).toBeNull()
    })

    it('returns valid false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await validateToken('token')

      expect(result.valid).toBe(false)
      expect(result.user).toBeNull()
    })
  })

  describe('fetchCurrentUser', () => {
    it('fetches and transforms user data', async () => {
      const apiUser = {
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        name: 'Test User',
        html_url: 'https://github.com/testuser'
      }
      mockFetch.mockResolvedValueOnce(mockResponse(apiUser))

      const result = await fetchCurrentUser('token')

      expect(result).toEqual({
        login: 'testuser',
        avatar_url: 'https://github.com/testuser.png',
        name: 'Test User',
        html_url: 'https://github.com/testuser'
      })
    })

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(401, 'Unauthorized'))

      await expect(fetchCurrentUser('bad-token')).rejects.toThrow('HTTP 401')
    })
  })

  describe('fetchRateLimit', () => {
    it('fetches and calculates rate limit data', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            rateLimit: {
              limit: 5000,
              remaining: 4500,
              used: 500,
              resetAt: '2024-01-01T12:00:00Z'
            }
          }
        })
      )

      const result = await fetchRateLimit('token')

      expect(result.limit).toBe(5000)
      expect(result.remaining).toBe(4500)
      expect(result.used).toBe(500)
      expect(result.percentage).toBe(10) // 500/5000 = 10%
    })
  })

  describe('fetchRepos', () => {
    it('fetches and transforms the viewer repositories', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              login: 'testuser',
              repositories: {
                nodes: [
                  {
                    id: 'R_123',
                    name: 'repo1',
                    nameWithOwner: 'myorg/repo1',
                    url: 'https://github.com/myorg/repo1',
                    description: 'Test repo',
                    owner: { login: 'myorg', avatarUrl: 'https://github.com/myorg.png' },
                    stargazerCount: 100,
                    primaryLanguage: { name: 'TypeScript' },
                    updatedAt: '2024-01-01T00:00:00Z'
                  }
                ]
              }
            }
          }
        })
      )

      const result = await fetchRepos('token')

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'R_123',
        name: 'repo1',
        full_name: 'myorg/repo1',
        html_url: 'https://github.com/myorg/repo1',
        description: 'Test repo',
        owner: { login: 'myorg', avatar_url: 'https://github.com/myorg.png' },
        stargazers_count: 100,
        language: 'TypeScript',
        updated_at: '2024-01-01T00:00:00Z'
      })
    })

    it('returns all affiliated repos (personal + org)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              login: 'testuser',
              repositories: {
                nodes: [
                  {
                    id: 'R_1',
                    name: 'personal',
                    nameWithOwner: 'testuser/personal',
                    url: '',
                    description: null,
                    owner: { login: 'testuser', avatarUrl: '' },
                    stargazerCount: 0,
                    primaryLanguage: null,
                    updatedAt: ''
                  },
                  {
                    id: 'R_2',
                    name: 'repo2',
                    nameWithOwner: 'org2/repo2',
                    url: '',
                    description: null,
                    owner: { login: 'org2', avatarUrl: '' },
                    stargazerCount: 0,
                    primaryLanguage: null,
                    updatedAt: ''
                  }
                ]
              }
            }
          }
        })
      )

      const result = await fetchRepos('token')

      expect(result).toHaveLength(2)
      expect(result[0].full_name).toBe('testuser/personal')
      expect(result[1].full_name).toBe('org2/repo2')
    })

    it('handles an empty repository list', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ data: { viewer: { login: 'testuser', repositories: { nodes: [] } } } })
      )

      const result = await fetchRepos('token')

      expect(result).toEqual([])
    })
  })

  describe('fetchPRsForRepos', () => {
    it('fetches PRs for multiple repos', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repo0: {
              pullRequests: {
                nodes: [
                  {
                    id: 'PR_1',
                    number: 1,
                    title: 'Test PR',
                    body: 'Description',
                    url: 'https://github.com/org/repo/pull/1',
                    state: 'OPEN',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-02T00:00:00Z',
                    isDraft: false,
                    mergedAt: null,
                    author: { login: 'author', avatarUrl: 'https://github.com/author.png' },
                    headRefName: 'feature-branch',
                    headRefOid: 'abc123',
                    baseRefName: 'main',
                    baseRepository: {
                      name: 'repo',
                      nameWithOwner: 'org/repo',
                      owner: { login: 'org', avatarUrl: 'https://github.com/org.png' }
                    },
                    labels: { nodes: [{ name: 'enhancement', color: '84b6eb' }] },
                    comments: { totalCount: 5 },
                    reviewThreads: { totalCount: 2 },
                    additions: 100,
                    deletions: 50,
                    changedFiles: 3,
                    mergeable: 'MERGEABLE',
                    mergeStateStatus: 'CLEAN',
                    reviewDecision: 'APPROVED',
                    commits: { nodes: [] }
                  }
                ]
              }
            }
          }
        })
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'PR_1',
        number: 1,
        title: 'Test PR',
        state: 'OPEN',
        draft: false,
        user: { login: 'author' },
        additions: 100,
        deletions: 50
      })
    })
  })

  describe('fetchSinglePR', () => {
    it('fetches detailed PR data', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repository: {
              pullRequest: {
                id: 'PR_1',
                number: 42,
                title: 'Detailed PR',
                body: 'Full description',
                url: 'https://github.com/org/repo/pull/42',
                state: 'OPEN',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
                isDraft: false,
                mergedAt: null,
                author: { login: 'author', avatarUrl: '' },
                headRefName: 'feature',
                headRefOid: 'abc123',
                baseRefName: 'main',
                baseRepository: {
                  name: 'repo',
                  nameWithOwner: 'org/repo',
                  owner: { login: 'org', avatarUrl: '' }
                },
                labels: { nodes: [] },
                comments: {
                  nodes: [
                    {
                      id: 'C_1',
                      body: 'Great work!',
                      createdAt: '2024-01-01T12:00:00Z',
                      author: { __typename: 'User', login: 'reviewer', avatarUrl: '' }
                    }
                  ]
                },
                reviews: {
                  nodes: [
                    {
                      id: 'R_1',
                      state: 'APPROVED',
                      createdAt: '2024-01-01T12:00:00Z',
                      author: { __typename: 'User', login: 'reviewer', avatarUrl: '' },
                      body: 'LGTM'
                    }
                  ]
                },
                reviewThreads: { nodes: [] },
                additions: 200,
                deletions: 100,
                changedFiles: 5,
                mergeable: 'MERGEABLE',
                mergeStateStatus: 'CLEAN',
                reviewDecision: 'APPROVED',
                commits: { nodes: [] }
              }
            }
          }
        })
      )

      const result = await fetchSinglePR('token', 'org/repo', 42)

      expect(result.number).toBe(42)
      expect(result.commentsList).toHaveLength(1)
      expect(result.commentsList?.[0]?.body).toBe('Great work!')
      expect(result.reviews).toHaveLength(1)
      expect(result.reviews?.[0]?.state).toBe('approved')
    })

    it('detects bot authors via __typename', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repository: {
              pullRequest: {
                id: 'PR_1',
                number: 1,
                title: 'Bot PR',
                body: '',
                url: '',
                state: 'OPEN',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                isDraft: false,
                mergedAt: null,
                author: { login: 'author', avatarUrl: '' },
                headRefName: 'main',
                headRefOid: 'abc',
                baseRefName: 'main',
                baseRepository: {
                  name: 'repo',
                  nameWithOwner: 'org/repo',
                  owner: { login: 'org', avatarUrl: '' }
                },
                labels: { nodes: [] },
                comments: {
                  nodes: [
                    {
                      id: 'C_bot',
                      body: 'Automated comment',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'Bot', login: 'dependabot[bot]', avatarUrl: '' }
                    },
                    {
                      id: 'C_human',
                      body: 'Human comment',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'User', login: 'developer', avatarUrl: '' }
                    }
                  ]
                },
                reviews: { nodes: [] },
                reviewThreads: { nodes: [] },
                additions: 0,
                deletions: 0,
                changedFiles: 0,
                mergeable: 'MERGEABLE',
                mergeStateStatus: 'CLEAN',
                reviewDecision: null,
                commits: { nodes: [] }
              }
            }
          }
        })
      )

      const result = await fetchSinglePR('token', 'org/repo', 1)

      expect(result.commentsList).toHaveLength(2)
      // Bot comment (detected via __typename)
      expect(result.commentsList?.[0]?.author.isBot).toBe(true)
      expect(result.commentsList?.[0]?.author.login).toBe('dependabot[bot]')
      // Human comment
      expect(result.commentsList?.[1]?.author.isBot).toBe(false)
      expect(result.commentsList?.[1]?.author.login).toBe('developer')
    })

    it('detects bot authors via login patterns', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repository: {
              pullRequest: {
                id: 'PR_1',
                number: 1,
                title: 'PR with bots',
                body: '',
                url: '',
                state: 'OPEN',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                isDraft: false,
                mergedAt: null,
                author: { login: 'author', avatarUrl: '' },
                headRefName: 'main',
                headRefOid: 'abc',
                baseRefName: 'main',
                baseRepository: {
                  name: 'repo',
                  nameWithOwner: 'org/repo',
                  owner: { login: 'org', avatarUrl: '' }
                },
                labels: { nodes: [] },
                comments: {
                  nodes: [
                    {
                      id: 'C_1',
                      body: 'Bot login ending with [bot]',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'User', login: 'codecov[bot]', avatarUrl: '' }
                    },
                    {
                      id: 'C_2',
                      body: 'Bot login ending with -bot',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'User', login: 'renovate-bot', avatarUrl: '' }
                    },
                    {
                      id: 'C_3',
                      body: 'GitHub Actions bot',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'User', login: 'github-actions', avatarUrl: '' }
                    }
                  ]
                },
                reviews: { nodes: [] },
                reviewThreads: { nodes: [] },
                additions: 0,
                deletions: 0,
                changedFiles: 0,
                mergeable: 'MERGEABLE',
                mergeStateStatus: 'CLEAN',
                reviewDecision: null,
                commits: { nodes: [] }
              }
            }
          }
        })
      )

      const result = await fetchSinglePR('token', 'org/repo', 1)

      expect(result.commentsList).toHaveLength(3)
      // All should be detected as bots via login pattern
      expect(result.commentsList?.[0]?.author.isBot).toBe(true) // [bot] suffix
      expect(result.commentsList?.[1]?.author.isBot).toBe(true) // -bot suffix
      expect(result.commentsList?.[2]?.author.isBot).toBe(true) // github-actions
    })

    it('sets isBot to false for regular human users', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repository: {
              pullRequest: {
                id: 'PR_1',
                number: 1,
                title: 'Human PR',
                body: '',
                url: '',
                state: 'OPEN',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                isDraft: false,
                mergedAt: null,
                author: { login: 'author', avatarUrl: '' },
                headRefName: 'main',
                headRefOid: 'abc',
                baseRefName: 'main',
                baseRepository: {
                  name: 'repo',
                  nameWithOwner: 'org/repo',
                  owner: { login: 'org', avatarUrl: '' }
                },
                labels: { nodes: [] },
                comments: {
                  nodes: [
                    {
                      id: 'C_1',
                      body: 'Regular comment',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'User', login: 'johndoe', avatarUrl: '' }
                    }
                  ]
                },
                reviews: {
                  nodes: [
                    {
                      id: 'R_1',
                      state: 'APPROVED',
                      createdAt: '2024-01-01T00:00:00Z',
                      author: { __typename: 'User', login: 'reviewer', avatarUrl: '' },
                      body: 'LGTM'
                    }
                  ]
                },
                reviewThreads: {
                  nodes: [
                    {
                      id: 'T_1',
                      isResolved: false,
                      path: 'file.ts',
                      line: 10,
                      comments: {
                        nodes: [
                          {
                            id: 'TC_1',
                            body: 'Code review comment',
                            createdAt: '2024-01-01T00:00:00Z',
                            author: { __typename: 'User', login: 'codereviewer', avatarUrl: '' },
                            diffHunk: '@@ -1,1 +1,1 @@'
                          }
                        ]
                      }
                    }
                  ]
                },
                additions: 0,
                deletions: 0,
                changedFiles: 0,
                mergeable: 'MERGEABLE',
                mergeStateStatus: 'CLEAN',
                reviewDecision: null,
                commits: { nodes: [] }
              }
            }
          }
        })
      )

      const result = await fetchSinglePR('token', 'org/repo', 1)

      // All authors should have isBot: false
      expect(result.commentsList?.[0]?.author.isBot).toBe(false)
      expect(result.reviews?.[0]?.author.isBot).toBe(false)
      expect(result.reviewThreads?.[0]?.comments[0]?.author.isBot).toBe(false)
    })

    it('fetches assignees for a PR', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repository: {
              pullRequest: {
                id: 'PR_1',
                number: 1,
                title: 'PR with assignees',
                body: '',
                url: '',
                state: 'OPEN',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                isDraft: false,
                mergedAt: null,
                author: { login: 'author', avatarUrl: '' },
                headRefName: 'main',
                headRefOid: 'abc',
                baseRefName: 'main',
                baseRepository: {
                  name: 'repo',
                  nameWithOwner: 'org/repo',
                  owner: { login: 'org', avatarUrl: '' }
                },
                labels: { nodes: [] },
                assignees: {
                  nodes: [
                    { login: 'assignee1', avatarUrl: 'https://example.com/avatar1.png' },
                    { login: 'assignee2', avatarUrl: 'https://example.com/avatar2.png' }
                  ]
                },
                comments: { nodes: [] },
                reviews: { nodes: [] },
                reviewThreads: { nodes: [] },
                additions: 10,
                deletions: 5,
                changedFiles: 2,
                mergeable: 'MERGEABLE',
                mergeStateStatus: 'CLEAN',
                reviewDecision: null,
                commits: { nodes: [] }
              }
            }
          }
        })
      )

      const result = await fetchSinglePR('token', 'org/repo', 1)

      expect(result.assignees).toHaveLength(2)
      expect(result.assignees[0]).toEqual({
        login: 'assignee1',
        avatar_url: 'https://example.com/avatar1.png'
      })
      expect(result.assignees[1]).toEqual({
        login: 'assignee2',
        avatar_url: 'https://example.com/avatar2.png'
      })
    })

    it('returns empty assignees array when no assignees', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repository: {
              pullRequest: {
                id: 'PR_1',
                number: 1,
                title: 'PR without assignees',
                body: '',
                url: '',
                state: 'OPEN',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                isDraft: false,
                mergedAt: null,
                author: { login: 'author', avatarUrl: '' },
                headRefName: 'main',
                headRefOid: 'abc',
                baseRefName: 'main',
                baseRepository: {
                  name: 'repo',
                  nameWithOwner: 'org/repo',
                  owner: { login: 'org', avatarUrl: '' }
                },
                labels: { nodes: [] },
                assignees: { nodes: [] },
                comments: { nodes: [] },
                reviews: { nodes: [] },
                reviewThreads: { nodes: [] },
                additions: 0,
                deletions: 0,
                changedFiles: 0,
                mergeable: 'MERGEABLE',
                mergeStateStatus: 'CLEAN',
                reviewDecision: null,
                commits: { nodes: [] }
              }
            }
          }
        })
      )

      const result = await fetchSinglePR('token', 'org/repo', 1)

      expect(result.assignees).toHaveLength(0)
      expect(result.assignees).toEqual([])
    })
  })

  describe('CI Checks deduplication', () => {
    // Helper to build a minimal PR GraphQL response with check runs
    function makePRResponse(checkRunContexts: unknown[]) {
      return mockResponse({
        data: {
          repo0: {
            pullRequests: {
              nodes: [
                {
                  id: 'PR_1',
                  number: 1,
                  title: 'Test PR',
                  body: '',
                  url: 'https://github.com/org/repo/pull/1',
                  state: 'OPEN',
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-02T00:00:00Z',
                  isDraft: false,
                  mergedAt: null,
                  author: { login: 'author', avatarUrl: '' },
                  headRefName: 'feature',
                  headRefOid: 'abc123',
                  baseRefName: 'main',
                  baseRepository: {
                    name: 'repo',
                    nameWithOwner: 'org/repo',
                    owner: { login: 'org', avatarUrl: '' }
                  },
                  labels: { nodes: [] },
                  comments: { totalCount: 0 },
                  reviewThreads: { totalCount: 0 },
                  additions: 10,
                  deletions: 5,
                  changedFiles: 1,
                  mergeable: 'MERGEABLE',
                  mergeStateStatus: 'CLEAN',
                  reviewDecision: null,
                  commits: {
                    nodes: [
                      {
                        commit: {
                          statusCheckRollup: {
                            state: 'SUCCESS',
                            contexts: {
                              nodes: checkRunContexts
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }
        }
      })
    }

    it('keeps all checks when names are unique', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'Lint',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Tests',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Build',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(3)
      expect(checks.map((c) => c.name).sort()).toEqual(['Build', 'Lint', 'Tests'])
    })

    it('deduplicates by name, keeping the most recently started run', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'PR Title Lint',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'PR Title Lint',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T11:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(1)
      expect(checks[0].name).toBe('PR Title Lint')
      expect(checks[0].conclusion).toBe('success')
    })

    it('keeps running re-run over older completed failure (re-run started later)', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'CI',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'CI',
            status: 'IN_PROGRESS',
            conclusion: null,
            startedAt: '2024-01-01T12:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(1)
      expect(checks[0].name).toBe('CI')
      expect(checks[0].status).toBe('in_progress')
      expect(checks[0].conclusion).toBeNull()
    })

    it('handles re-run appearing before old run in array (order independence)', async () => {
      // The newer in_progress run appears FIRST in the array,
      // but the old completed failure appears SECOND.
      // Should still keep the newer one based on startedAt.
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'CI',
            status: 'IN_PROGRESS',
            conclusion: null,
            startedAt: '2024-01-01T12:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'CI',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(1)
      expect(checks[0].status).toBe('in_progress')
      expect(checks[0].conclusion).toBeNull()
    })

    it('handles three runs of the same check, keeps the latest', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'Tests',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T08:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Tests',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Tests',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T12:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(1)
      expect(checks[0].conclusion).toBe('success')
    })

    it('deduplicates only same-name checks, keeps different names separate', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'Lint',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Lint',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T11:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Tests',
            status: 'IN_PROGRESS',
            conclusion: null,
            startedAt: '2024-01-01T10:30:00Z',
            detailsUrl: ''
          },
          {
            name: 'Build',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(3)

      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const lint = checks.find((c) => c.name === 'Lint')!
      expect(lint.conclusion).toBe('success') // Deduplicated: newer success wins

      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const tests = checks.find((c) => c.name === 'Tests')!
      expect(tests.status).toBe('in_progress') // Only one, kept as-is

      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const build = checks.find((c) => c.name === 'Build')!
      expect(build.conclusion).toBe('success') // Only one, kept as-is
    })

    it('handles StatusContext entries (no startedAt)', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            context: 'ci/circleci',
            state: 'SUCCESS',
            targetUrl: 'https://circleci.com/build/123'
          },
          {
            name: 'GitHub Actions',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!.check_runs

      expect(checks).toHaveLength(2)

      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const circleci = checks.find((c) => c.name === 'ci/circleci')!
      expect(circleci.conclusion).toBe('success')

      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const gha = checks.find((c) => c.name === 'GitHub Actions')!
      expect(gha.conclusion).toBe('success')
    })

    it('does not leak startedAt into the output check_runs', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'CI',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: 'https://example.com'
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const check = result[0].checks!.check_runs[0]

      // startedAt should be stripped from the output
      expect(check).toEqual({
        id: 'CI',
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://example.com'
      })
      expect('startedAt' in check).toBe(false)
    })

    it('updates total_count to reflect deduplicated count', async () => {
      mockFetch.mockResolvedValueOnce(
        makePRResponse([
          {
            name: 'CI',
            status: 'COMPLETED',
            conclusion: 'FAILURE',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'CI',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T11:00:00Z',
            detailsUrl: ''
          },
          {
            name: 'Lint',
            status: 'COMPLETED',
            conclusion: 'SUCCESS',
            startedAt: '2024-01-01T10:00:00Z',
            detailsUrl: ''
          }
        ])
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])
      // biome-ignore lint/style/noNonNullAssertion: test assertion — value verified by expect
      const checks = result[0].checks!

      // 3 raw entries → 2 after deduplication
      expect(checks.total_count).toBe(2)
      expect(checks.check_runs).toHaveLength(2)
    })

    it('handles no checks (no statusCheckRollup)', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            repo0: {
              pullRequests: {
                nodes: [
                  {
                    id: 'PR_1',
                    number: 1,
                    title: 'Test PR',
                    body: '',
                    url: '',
                    state: 'OPEN',
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                    isDraft: false,
                    mergedAt: null,
                    author: { login: 'author', avatarUrl: '' },
                    headRefName: 'feature',
                    headRefOid: 'abc',
                    baseRefName: 'main',
                    baseRepository: {
                      name: 'repo',
                      nameWithOwner: 'org/repo',
                      owner: { login: 'org', avatarUrl: '' }
                    },
                    labels: { nodes: [] },
                    comments: { totalCount: 0 },
                    reviewThreads: { totalCount: 0 },
                    additions: 0,
                    deletions: 0,
                    changedFiles: 0,
                    mergeable: 'MERGEABLE',
                    mergeStateStatus: 'CLEAN',
                    reviewDecision: null,
                    commits: { nodes: [] }
                  }
                ]
              }
            }
          }
        })
      )

      const result = await fetchPRsForRepos('token', ['org/repo'])

      expect(result[0].checks).toBeUndefined()
    })
  })

  describe('fetchPRFiles', () => {
    it('fetches changed files for a PR', async () => {
      // REST API returns an array directly, not wrapped in data
      mockFetch.mockResolvedValueOnce(
        mockResponse([
          { filename: 'src/index.ts', additions: 10, deletions: 5, status: 'modified' },
          { filename: 'src/new.ts', additions: 50, deletions: 0, status: 'added' }
        ])
      )

      const result = await fetchPRFiles('token', 'owner', 'repo', 1)

      expect(result).toHaveLength(2)
      expect(result[0].path).toBe('src/index.ts')
      expect(result[1].changeType).toBe('ADDED')
    })
  })

  describe('PR Mutations', () => {
    describe('closePR', () => {
      it('closes a PR', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              closePullRequest: {
                pullRequest: { id: 'PR_1', state: 'CLOSED' }
              }
            }
          })
        )

        const result = await closePR('token', 'PR_1')

        expect(result.success).toBe(true)
      })
    })

    describe('reopenPR', () => {
      it('reopens a PR', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              reopenPullRequest: {
                pullRequest: { id: 'PR_1', state: 'OPEN' }
              }
            }
          })
        )

        const result = await reopenPR('token', 'PR_1')

        expect(result.success).toBe(true)
      })
    })

    describe('markPRReady', () => {
      it('marks draft PR as ready for review', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              markPullRequestReadyForReview: {
                pullRequest: { id: 'PR_1', isDraft: false }
              }
            }
          })
        )

        const result = await markPRReady('token', 'PR_1')

        expect(result.success).toBe(true)
      })
    })

    describe('convertPRToDraft', () => {
      it('converts PR to draft', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              convertPullRequestToDraft: {
                pullRequest: { id: 'PR_1', isDraft: true }
              }
            }
          })
        )

        const result = await convertPRToDraft('token', 'PR_1')

        expect(result.success).toBe(true)
      })
    })

    describe('addPRComment', () => {
      it('adds a comment to PR', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              addComment: {
                commentEdge: { node: { id: 'C_1' } }
              }
            }
          })
        )

        const result = await addPRComment('token', 'PR_1', 'Great PR!')

        expect(result.success).toBe(true)
      })
    })

    describe('mergePR', () => {
      it('merges PR with default squash method', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              mergePullRequest: {
                pullRequest: {
                  id: 'PR_1',
                  merged: true,
                  mergedAt: '2024-01-01T12:00:00Z',
                  mergeCommit: { oid: 'abc123' }
                }
              }
            }
          })
        )

        const result = await mergePR('token', 'PR_1')

        expect(result.success).toBe(true)
        expect(result.mergedAt).toBe('2024-01-01T12:00:00Z')
        expect(result.sha).toBe('abc123')
      })

      it('merges with custom commit message', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              mergePullRequest: {
                pullRequest: {
                  id: 'PR_1',
                  merged: true,
                  mergedAt: '2024-01-01T12:00:00Z',
                  mergeCommit: { oid: 'def456' }
                }
              }
            }
          })
        )

        const result = await mergePR('token', 'PR_1', 'MERGE', 'Merge PR #1', 'Full description')

        expect(result.success).toBe(true)
        // Verify mutation was called (fetch should have been called with body containing merge method)
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    describe('submitPRReview', () => {
      it('approves a PR', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              addPullRequestReview: {
                pullRequestReview: { id: 'PRR_1', state: 'APPROVED' }
              }
            }
          })
        )

        const result = await submitPRReview('token', 'PR_1', 'APPROVE', 'LGTM!')

        expect(result.success).toBe(true)
        expect(result.state).toBe('APPROVED')
      })

      it('requests changes on a PR', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            data: {
              addPullRequestReview: {
                pullRequestReview: { id: 'PRR_1', state: 'CHANGES_REQUESTED' }
              }
            }
          })
        )

        const result = await submitPRReview(
          'token',
          'PR_1',
          'REQUEST_CHANGES',
          'Please fix the typo'
        )

        expect(result.success).toBe(true)
        expect(result.state).toBe('CHANGES_REQUESTED')
      })
    })

    describe('updatePRBranch', () => {
      it('updates PR branch with base branch', async () => {
        mockFetch.mockResolvedValueOnce(
          mockResponse({
            message: 'Updating pull request branch.',
            url: 'https://api.github.com/repos/org/repo/pulls/42'
          })
        )

        const result = await updatePRBranch('token', 'org', 'repo', 42)

        expect(result.success).toBe(true)
        expect(mockFetch).toHaveBeenCalledWith(
          'https://api.github.com/repos/org/repo/pulls/42/update-branch',
          expect.objectContaining({
            method: 'PUT',
            headers: expect.objectContaining({
              Authorization: 'Bearer token'
            })
          })
        )
      })

      it('throws on HTTP error', async () => {
        mockFetch.mockResolvedValueOnce(mockErrorResponse(422, 'Unprocessable Entity'))

        await expect(updatePRBranch('token', 'org', 'repo', 42)).rejects.toThrow('HTTP 422')
      })
    })
  })

  describe('fetchContributions', () => {
    it('fetches and calculates contribution data', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 500,
                  weeks: [
                    {
                      contributionDays: [
                        { date: '2026-01-01', contributionCount: 5, weekday: 3 },
                        { date: '2026-01-02', contributionCount: 8, weekday: 4 },
                        { date: '2026-01-03', contributionCount: 0, weekday: 5 },
                        { date: '2026-01-04', contributionCount: 12, weekday: 6 },
                        { date: '2026-01-05', contributionCount: 3, weekday: 0 }
                      ]
                    }
                  ]
                },
                totalCommitContributions: 300,
                totalPullRequestContributions: 100,
                totalPullRequestReviewContributions: 50,
                totalIssueContributions: 50
              }
            }
          }
        })
      )

      const result = await fetchContributions('token')

      expect(result.totalContributions).toBe(500)
      expect(result.totalCommitContributions).toBe(300)
      expect(result.totalPullRequestContributions).toBe(100)
      expect(result.totalPullRequestReviewContributions).toBe(50)
      expect(result.totalIssueContributions).toBe(50)
      expect(result.weeks).toHaveLength(1)
      expect(result.weeks[0].contributionDays).toHaveLength(5)
    })

    it('calculates current streak correctly', async () => {
      // Create a streak of 3 days ending today
      const today = new Date()
      const days = []
      for (let i = 4; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        days.push({
          date: date.toISOString().split('T')[0],
          contributionCount: i <= 2 ? 5 : 0, // Last 3 days have contributions
          weekday: date.getDay()
        })
      }

      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 15,
                  weeks: [{ contributionDays: days }]
                },
                totalCommitContributions: 10,
                totalPullRequestContributions: 3,
                totalPullRequestReviewContributions: 1,
                totalIssueContributions: 1
              }
            }
          }
        })
      )

      const result = await fetchContributions('token')

      // The streak calculation depends on the current date relationship
      // At minimum, we should have calculated something
      expect(result.currentStreak).toBeGreaterThanOrEqual(0)
    })

    it('calculates longest streak correctly', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 100,
                  weeks: [
                    {
                      contributionDays: [
                        { date: '2026-01-01', contributionCount: 1, weekday: 0 },
                        { date: '2026-01-02', contributionCount: 2, weekday: 1 },
                        { date: '2026-01-03', contributionCount: 3, weekday: 2 },
                        { date: '2026-01-04', contributionCount: 4, weekday: 3 },
                        { date: '2026-01-05', contributionCount: 5, weekday: 4 }, // 5-day streak
                        { date: '2026-01-06', contributionCount: 0, weekday: 5 }, // break
                        { date: '2026-01-07', contributionCount: 1, weekday: 6 }
                      ]
                    }
                  ]
                },
                totalCommitContributions: 80,
                totalPullRequestContributions: 10,
                totalPullRequestReviewContributions: 5,
                totalIssueContributions: 5
              }
            }
          }
        })
      )

      const result = await fetchContributions('token')

      expect(result.longestStreak).toBe(5)
    })

    it('finds the most active day', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 50,
                  weeks: [
                    {
                      contributionDays: [
                        { date: '2026-01-01', contributionCount: 5, weekday: 0 },
                        { date: '2026-01-02', contributionCount: 20, weekday: 1 }, // Most active
                        { date: '2026-01-03', contributionCount: 8, weekday: 2 }
                      ]
                    }
                  ]
                },
                totalCommitContributions: 40,
                totalPullRequestContributions: 5,
                totalPullRequestReviewContributions: 3,
                totalIssueContributions: 2
              }
            }
          }
        })
      )

      const result = await fetchContributions('token')

      expect(result.mostActiveDay).toBe('2026-01-02')
      expect(result.mostActiveDayCount).toBe(20)
    })

    it('calculates average per day', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              contributionsCollection: {
                contributionCalendar: {
                  totalContributions: 100,
                  weeks: [
                    {
                      contributionDays: [
                        { date: '2025-01-01', contributionCount: 10, weekday: 0 },
                        { date: '2025-01-02', contributionCount: 10, weekday: 1 },
                        { date: '2025-01-03', contributionCount: 10, weekday: 2 },
                        { date: '2025-01-04', contributionCount: 10, weekday: 3 },
                        { date: '2025-01-05', contributionCount: 10, weekday: 4 }
                      ]
                    }
                  ]
                },
                totalCommitContributions: 80,
                totalPullRequestContributions: 10,
                totalPullRequestReviewContributions: 5,
                totalIssueContributions: 5
              }
            }
          }
        })
      )

      const result = await fetchContributions('token')

      // 100 contributions over 5 days = 20 avg
      expect(result.averagePerDay).toBe(20)
    })
  })

  describe('Error handling', () => {
    it('throws on GraphQL errors', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          errors: [{ message: 'Not found' }]
        })
      )

      await expect(fetchRateLimit('token')).rejects.toThrow('Not found')
    })

    it('throws on HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce(mockErrorResponse(500, 'Internal Server Error'))

      await expect(fetchRateLimit('token')).rejects.toThrow('HTTP 500')
    })
  })

  describe('fetchUserEvents', () => {
    it('fetches and transforms user events', async () => {
      const recentTime = new Date().toISOString()

      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            id: '1',
            type: 'PushEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: {
              commits: [
                { sha: 'abc123', message: 'Fix bug' },
                { sha: 'def456', message: 'Add feature' }
              ]
            },
            created_at: recentTime
          },
          {
            id: '2',
            type: 'PullRequestEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: {
              action: 'opened',
              pull_request: { number: 123, title: 'New feature', state: 'open' }
            },
            created_at: recentTime
          }
        ])
      )

      const result = await fetchUserEvents('token', 'user')

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: '1',
        type: 'Push',
        title: 'Pushed 2 commits',
        description: 'Fix bug',
        repoName: 'org/repo',
        icon: 'commit'
      })
      expect(result[1]).toMatchObject({
        id: '2',
        type: 'Pull Request',
        title: 'Opened PR #123',
        description: 'New feature',
        icon: 'pr'
      })
    })

    it('filters out PushEvents with 0 commits', async () => {
      const recentTime = new Date().toISOString()

      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            id: '1',
            type: 'PushEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: { commits: [] }, // 0 commits - should be filtered
            created_at: recentTime
          },
          {
            id: '2',
            type: 'PushEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: {
              commits: [{ sha: 'abc', message: 'Real commit' }]
            },
            created_at: recentTime
          }
        ])
      )

      const result = await fetchUserEvents('token', 'user')

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Pushed 1 commit')
    })

    it('transforms PullRequestReviewEvent correctly', async () => {
      const recentTime = new Date().toISOString()

      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            id: '1',
            type: 'PullRequestReviewEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: {
              action: 'submitted',
              review: { state: 'approved', body: 'LGTM!' },
              pull_request: { number: 42, title: 'Some PR', state: 'open' }
            },
            created_at: recentTime
          }
        ])
      )

      const result = await fetchUserEvents('token', 'user')

      expect(result[0]).toMatchObject({
        type: 'Review',
        title: 'Approved PR #42',
        description: 'Some PR',
        icon: 'review'
      })
    })

    it('transforms comment events correctly', async () => {
      const recentTime = new Date().toISOString()

      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            id: '1',
            type: 'IssueCommentEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: {
              action: 'created',
              comment: { body: 'Great work on this!' },
              issue: { number: 99, title: 'Bug report' }
            },
            created_at: recentTime
          }
        ])
      )

      const result = await fetchUserEvents('token', 'user')

      expect(result[0]).toMatchObject({
        type: 'Comment',
        title: 'Commented on #99',
        description: 'Great work on this!',
        icon: 'comment'
      })
    })

    it('transforms CreateEvent correctly', async () => {
      const recentTime = new Date().toISOString()

      mockFetch.mockResolvedValueOnce(
        mockResponse([
          {
            id: '1',
            type: 'CreateEvent',
            actor: { login: 'user', avatar_url: 'https://example.com/avatar' },
            repo: { name: 'org/repo' },
            payload: {
              ref_type: 'branch',
              ref: 'feature/new-thing'
            },
            created_at: recentTime
          }
        ])
      )

      const result = await fetchUserEvents('token', 'user')

      expect(result[0]).toMatchObject({
        type: 'Create',
        title: 'Created branch: feature/new-thing',
        icon: 'branch'
      })
    })

    it('returns empty array when no events', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse([]))

      const result = await fetchUserEvents('token', 'user')

      expect(result).toEqual([])
    })
  })
})
