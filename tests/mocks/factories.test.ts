/**
 * Factory Tests
 * 
 * Validates that our mock factories produce correct data structures
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockUser,
  createMockBot,
  createMockRepository,
  createMockPullRequest,
  createMockDraftPR,
  createMockComment,
  createMockBotComment,
  createMockReview,
  createMockApproval,
  createMockChangesRequested,
  createMockReviewThread,
  createMockReviewComment,
  createMockCheckRun,
  createMockCheckStatus,
  createMockFailingChecks,
  createMockPendingChecks,
  createMockRateLimit,
  createMockPRWithComments,
  createMockPRWithReviews,
  createMockPRWithMixedComments,
  createMockPRWithChecks,
  createMockPRWithCodeReviews,
  createMockRepoWithPRs,
  createMockDashboardData,
  createMockSettings,
  createMockLayoutItem,
  createMockPanelSettings,
  createMockIDEViewSettings,
  resetIdCounter
} from './factories'

describe('Mock Factories', () => {
  beforeEach(() => {
    resetIdCounter()
  })

  describe('createMockUser', () => {
    it('should create user with all required fields', () => {
      const user = createMockUser()
      
      expect(user.id).toBeDefined()
      expect(user.login).toBeDefined()
      expect(user.avatar_url).toBeDefined()
      expect(user.html_url).toBeDefined()
      expect(user.type).toBe('User')
    })

    it('should allow overriding fields', () => {
      const user = createMockUser({ login: 'custom-user', name: 'Custom Name' })
      
      expect(user.login).toBe('custom-user')
      expect(user.name).toBe('Custom Name')
    })

    it('should generate unique IDs', () => {
      const user1 = createMockUser()
      const user2 = createMockUser()
      
      expect(user1.id).not.toBe(user2.id)
    })
  })

  describe('createMockBot', () => {
    it('should create bot user', () => {
      const bot = createMockBot()
      
      expect(bot.type).toBe('Bot')
      expect(bot.login).toContain('[bot]')
    })
  })

  describe('createMockRepository', () => {
    it('should create repository with all required fields', () => {
      const repo = createMockRepository()
      
      expect(repo.id).toBeDefined()
      expect(repo.name).toBeDefined()
      expect(repo.full_name).toBeDefined()
      expect(repo.owner).toBeDefined()
      expect(repo.html_url).toBeDefined()
    })

    it('should construct full_name from owner and name', () => {
      const repo = createMockRepository({ 
        name: 'my-repo', 
        owner: { login: 'my-org', avatar_url: '' } 
      })
      
      expect(repo.full_name).toBe('my-org/my-repo')
    })
  })

  describe('createMockPullRequest', () => {
    it('should create PR with all required fields', () => {
      const pr = createMockPullRequest()
      
      expect(pr.id).toBeDefined()
      expect(pr.number).toBeDefined()
      expect(pr.title).toBeDefined()
      expect(pr.state).toBe('open')
      expect(pr.draft).toBe(false)
      expect(pr.user).toBeDefined()
      expect(pr.base).toBeDefined()
      expect(pr.head).toBeDefined()
      expect(pr.created_at).toBeDefined()
    })

    it('should have empty arrays for comments and reviews by default', () => {
      const pr = createMockPullRequest()
      
      expect(pr.comments).toEqual([])
      expect(pr.reviews).toEqual([])
      expect(pr.reviewThreads).toEqual([])
    })
  })

  describe('createMockDraftPR', () => {
    it('should create draft PR', () => {
      const pr = createMockDraftPR()
      
      expect(pr.draft).toBe(true)
    })
  })

  describe('createMockComment', () => {
    it('should create comment with all required fields', () => {
      const comment = createMockComment()
      
      expect(comment.id).toBeDefined()
      expect(comment.body).toBeDefined()
      expect(comment.user).toBeDefined()
      expect(comment.created_at).toBeDefined()
      expect(comment.isBot).toBe(false)
    })
  })

  describe('createMockBotComment', () => {
    it('should create bot comment', () => {
      const comment = createMockBotComment()
      
      expect(comment.isBot).toBe(true)
      expect(comment.user.type).toBe('Bot')
    })
  })

  describe('createMockReview', () => {
    it('should create review with all required fields', () => {
      const review = createMockReview()
      
      expect(review.id).toBeDefined()
      expect(review.user).toBeDefined()
      expect(review.state).toBeDefined()
      expect(review.submitted_at).toBeDefined()
    })
  })

  describe('createMockApproval', () => {
    it('should create approval review', () => {
      const review = createMockApproval()
      
      expect(review.state).toBe('APPROVED')
    })
  })

  describe('createMockChangesRequested', () => {
    it('should create changes requested review', () => {
      const review = createMockChangesRequested()
      
      expect(review.state).toBe('CHANGES_REQUESTED')
    })
  })

  describe('createMockCheckStatus', () => {
    it('should create check status with runs', () => {
      const status = createMockCheckStatus()
      
      expect(status.state).toBeDefined()
      expect(status.total_count).toBeDefined()
      expect(status.check_runs).toBeDefined()
      expect(status.check_runs.length).toBeGreaterThan(0)
    })
  })

  describe('createMockFailingChecks', () => {
    it('should create failing check status', () => {
      const status = createMockFailingChecks()
      
      expect(status.state).toBe('failure')
      expect(status.check_runs.some(cr => cr.conclusion === 'failure')).toBe(true)
    })
  })

  describe('createMockPendingChecks', () => {
    it('should create pending check status', () => {
      const status = createMockPendingChecks()
      
      expect(status.state).toBe('pending')
      expect(status.check_runs.some(cr => cr.status !== 'completed')).toBe(true)
    })
  })

  describe('createMockRateLimit', () => {
    it('should create rate limit info', () => {
      const rateLimit = createMockRateLimit()
      
      expect(rateLimit.limit).toBeDefined()
      expect(rateLimit.remaining).toBeDefined()
      expect(rateLimit.used).toBeDefined()
      expect(rateLimit.percentage).toBeDefined()
      expect(rateLimit.resetAt).toBeDefined()
    })

    it('should calculate remaining correctly', () => {
      const rateLimit = createMockRateLimit({ used: 1000 })
      
      expect(rateLimit.remaining).toBe(4000)
    })
  })

  describe('Composite Factories', () => {
    describe('createMockPRWithComments', () => {
      it('should create PR with specified number of comments', () => {
        const pr = createMockPRWithComments(5)
        
        expect(pr.comments.length).toBe(5)
      })
    })

    describe('createMockPRWithReviews', () => {
      it('should create PR with specified number of reviews', () => {
        const pr = createMockPRWithReviews(3)
        
        expect(pr.reviews.length).toBe(3)
      })
    })

    describe('createMockPRWithMixedComments', () => {
      it('should create PR with both human and bot comments', () => {
        const pr = createMockPRWithMixedComments()
        
        const humanComments = pr.comments.filter(c => !c.isBot)
        const botComments = pr.comments.filter(c => c.isBot)
        
        expect(humanComments.length).toBeGreaterThan(0)
        expect(botComments.length).toBeGreaterThan(0)
      })
    })

    describe('createMockPRWithChecks', () => {
      it('should create PR with success checks by default', () => {
        const pr = createMockPRWithChecks()
        
        expect(pr.checks?.state).toBe('success')
      })

      it('should create PR with specified check status', () => {
        const pr = createMockPRWithChecks('failure')
        
        expect(pr.checks?.state).toBe('failure')
      })
    })

    describe('createMockPRWithCodeReviews', () => {
      it('should create PR with reviews and review threads', () => {
        const pr = createMockPRWithCodeReviews()
        
        expect(pr.reviews.length).toBeGreaterThan(0)
        expect(pr.reviewThreads.length).toBeGreaterThan(0)
      })
    })

    describe('createMockRepoWithPRs', () => {
      it('should create repo with specified number of PRs', () => {
        const { repo, prs } = createMockRepoWithPRs(5)
        
        expect(repo).toBeDefined()
        expect(prs.length).toBe(5)
        expect(prs[0].base.repo).toEqual(repo)
      })
    })

    describe('createMockDashboardData', () => {
      it('should create complete dashboard data', () => {
        const { repos, prs, rateLimit } = createMockDashboardData(3, 2)
        
        expect(repos.length).toBe(3)
        expect(prs.length).toBe(6) // 3 repos * 2 PRs
        expect(rateLimit).toBeDefined()
      })
    })
  })

  describe('Settings Factories', () => {
    describe('createMockSettings', () => {
      it('should create default settings', () => {
        const settings = createMockSettings()
        
        expect(settings.notifications).toBe(true)
        expect(settings.pollInterval).toBe(30000)
        expect(settings.theme).toBe('dark')
      })
    })

    describe('createMockLayoutItem', () => {
      it('should create layout item for repo', () => {
        const layout = createMockLayoutItem('org/repo')
        
        expect(layout.i).toBe('org/repo')
        expect(layout.x).toBeDefined()
        expect(layout.y).toBeDefined()
        expect(layout.w).toBeDefined()
        expect(layout.h).toBeDefined()
      })
    })

    describe('createMockPanelSettings', () => {
      it('should create default panel settings', () => {
        const settings = createMockPanelSettings()
        
        expect(settings.isOpen).toBe(false)
        expect(settings.width).toBe(400)
      })
    })

    describe('createMockIDEViewSettings', () => {
      it('should create default IDE settings', () => {
        const settings = createMockIDEViewSettings()
        
        expect(settings.sidebarWidth).toBe(280)
        expect(settings.expandedRepos).toEqual([])
      })
    })
  })
})
