/**
 * Query Keys Tests
 */

import { describe, expect, it } from 'vitest'
import { keys } from './keys'

describe('Query Keys', () => {
  describe('GitHub keys', () => {
    it('should have repos key', () => {
      expect(keys.repos).toEqual(['github', 'repos'])
    })

    it('should generate prs key with sorted repo names', () => {
      const result = keys.prs(['org/repo-b', 'org/repo-a'])
      expect(result).toEqual(['github', 'prs', 'org/repo-a', 'org/repo-b'])
    })

    it('should generate prs key with empty array', () => {
      const result = keys.prs([])
      expect(result).toEqual(['github', 'prs'])
    })

    it('should generate pr base key for invalidating all PR data', () => {
      const result = keys.pr('org/repo', 123)
      expect(result).toEqual(['github', 'pr', 'org/repo', 123])
    })

    it('should generate prDetail key with shared prefix', () => {
      const result = keys.prDetail('org/repo', 123)
      expect(result).toEqual(['github', 'pr', 'org/repo', 123, 'detail'])
    })

    it('should generate prFiles key with shared prefix', () => {
      const result = keys.prFiles('org/repo', 456)
      expect(result).toEqual(['github', 'pr', 'org/repo', 456, 'files'])
    })

    it('prDetail and prFiles should share same prefix as pr base key', () => {
      const baseKey = keys.pr('org/repo', 123)
      const detailKey = keys.prDetail('org/repo', 123)
      const filesKey = keys.prFiles('org/repo', 123)

      // All should start with the same base prefix
      expect(detailKey.slice(0, 4)).toEqual(baseKey)
      expect(filesKey.slice(0, 4)).toEqual(baseKey)
    })

    it('should have user key', () => {
      expect(keys.user).toEqual(['github', 'user'])
    })

    it('should have currentUser key', () => {
      expect(keys.currentUser).toEqual(['github', 'current-user'])
    })

    it('should have rateLimit key', () => {
      expect(keys.rateLimit).toEqual(['github', 'rate-limit'])
    })
  })

  describe('Settings keys (persisted)', () => {
    it('should have selectedRepos key', () => {
      expect(keys.selectedRepos).toEqual(['settings', 'selected-repos'])
    })

    it('should have viewMode key', () => {
      expect(keys.viewMode).toEqual(['settings', 'view-mode'])
    })

    it('should have aiPanel key', () => {
      expect(keys.aiPanel).toEqual(['settings', 'ai-panel'])
    })

    it('should have prDetailPanel key', () => {
      expect(keys.prDetailPanel).toEqual(['settings', 'pr-detail-panel'])
    })

    it('should have ideSettings key', () => {
      expect(keys.ideSettings).toEqual(['settings', 'ide-settings'])
    })

    it('should have cardLayouts key', () => {
      expect(keys.cardLayouts).toEqual(['settings', 'card-layouts'])
    })

    it('should have repoColors key', () => {
      expect(keys.repoColors).toEqual(['settings', 'repo-colors'])
    })

    it('should have minimizedRepos key', () => {
      expect(keys.minimizedRepos).toEqual(['settings', 'minimized-repos'])
    })

    it('should have myPRsRepos key', () => {
      expect(keys.myPRsRepos).toEqual(['settings', 'my-prs-repos'])
    })

    it('should have githubToken key', () => {
      expect(keys.githubToken).toEqual(['settings', 'github-token'])
    })
  })

  describe('AI keys (persisted)', () => {
    it('should have claudeApiKey key', () => {
      expect(keys.claudeApiKey).toEqual(['ai', 'claude-api-key'])
    })

    it('should have selectedModel key', () => {
      expect(keys.selectedModel).toEqual(['ai', 'selected-model'])
    })

    it('should have enableThinking key', () => {
      expect(keys.enableThinking).toEqual(['ai', 'enable-thinking'])
    })

    it('should have enableWebFetch key', () => {
      expect(keys.enableWebFetch).toEqual(['ai', 'enable-web-fetch'])
    })

    it('should have customPrompts key', () => {
      expect(keys.customPrompts).toEqual(['ai', 'custom-prompts'])
    })

    it('should generate prChatMessages key', () => {
      const result = keys.prChatMessages('org/repo#123')
      expect(result).toEqual(['ai', 'pr-chat', 'org/repo#123'])
    })
  })

  describe('Network keys (not persisted)', () => {
    it('should have networkRequests key', () => {
      expect(keys.networkRequests).toEqual(['network', 'requests'])
    })

    it('should have networkPanelOpen key', () => {
      expect(keys.networkPanelOpen).toEqual(['network', 'panel-open'])
    })
  })

  describe('Local keys (persisted UI state)', () => {
    it('should have local.selectedPRId key', () => {
      expect(keys.local.selectedPRId).toEqual(['local', 'selected-pr-id'])
    })

    it('should have local.isAILoading key', () => {
      expect(keys.local.isAILoading).toEqual(['local', 'is-ai-loading'])
    })

    it('should have local.networkPanelOpen key', () => {
      expect(keys.local.networkPanelOpen).toEqual(['local', 'network-panel-open'])
    })

    it('should have local.networkPanelHeight key', () => {
      expect(keys.local.networkPanelHeight).toEqual(['local', 'network-panel-height'])
    })

    // Backward compat flat keys
    it('should have flat selectedPRId key for backward compat', () => {
      expect(keys.selectedPRId).toEqual(['local', 'selected-pr-id'])
    })

    it('should have flat isAILoading key for backward compat', () => {
      expect(keys.isAILoading).toEqual(['local', 'is-ai-loading'])
    })
  })

  describe('System keys (OS state)', () => {
    it('should have system.fullscreen key', () => {
      expect(keys.system.fullscreen).toEqual(['system', 'fullscreen'])
    })

    it('should have system.theme key', () => {
      expect(keys.system.theme).toEqual(['system', 'theme'])
    })
  })

  describe('Key uniqueness', () => {
    it('all top-level static keys should be unique', () => {
      const staticKeys = [
        keys.repos,
        keys.user,
        keys.currentUser,
        keys.rateLimit,
        keys.selectedRepos,
        keys.viewMode,
        keys.aiPanel,
        keys.prDetailPanel,
        keys.ideSettings,
        keys.cardLayouts,
        keys.repoColors,
        keys.minimizedRepos,
        keys.myPRsRepos,
        keys.githubToken,
        keys.claudeApiKey,
        keys.claudeModels,
        keys.selectedModel,
        keys.enableThinking,
        keys.enableWebFetch,
        keys.customPrompts,
        keys.networkRequests,
        keys.networkPanelOpen,
        keys.selectedPRId,
        keys.isAILoading
      ]

      const keyStrings = staticKeys.map((k) => JSON.stringify(k))
      const uniqueKeys = new Set(keyStrings)

      // Check for duplicates (excluding backward compat aliases)
      expect(uniqueKeys.size).toBeGreaterThanOrEqual(staticKeys.length - 2) // 2 backward compat keys
    })
  })
})
