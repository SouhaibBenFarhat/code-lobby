/**
 * GitHub API Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addPRComment,
  closePR,
  convertPRToDraft,
  fetchCurrentUser,
  fetchPRFiles,
  fetchPRsForRepos,
  fetchRateLimit,
  fetchRepos,
  fetchSinglePR,
  markPRReady,
  mergePR,
  reopenPR,
  submitPRReview,
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
    it('fetches and transforms organization repos', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              login: 'testuser',
              organizations: {
                nodes: [
                  {
                    login: 'myorg',
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

    it('flattens repos from multiple orgs', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            viewer: {
              login: 'testuser',
              organizations: {
                nodes: [
                  {
                    login: 'org1',
                    repositories: {
                      nodes: [
                        {
                          id: 'R_1',
                          name: 'repo1',
                          nameWithOwner: 'org1/repo1',
                          url: '',
                          description: null,
                          owner: { login: 'org1', avatarUrl: '' },
                          stargazerCount: 0,
                          primaryLanguage: null,
                          updatedAt: ''
                        }
                      ]
                    }
                  },
                  {
                    login: 'org2',
                    repositories: {
                      nodes: [
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
                ]
              }
            }
          }
        })
      )

      const result = await fetchRepos('token')

      expect(result).toHaveLength(2)
      expect(result[0].full_name).toBe('org1/repo1')
      expect(result[1].full_name).toBe('org2/repo2')
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
                      author: { login: 'reviewer', avatarUrl: '' }
                    }
                  ]
                },
                reviews: {
                  nodes: [
                    {
                      id: 'R_1',
                      state: 'APPROVED',
                      createdAt: '2024-01-01T12:00:00Z',
                      author: { login: 'reviewer', avatarUrl: '' },
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
})
