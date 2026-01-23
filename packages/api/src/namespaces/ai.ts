/**
 * AI API namespace
 *
 * All AI/Claude-related API calls with automatic logging
 */

/// <reference path="../../../../src/preload/electron-api.d.ts" />

import { call } from '../call'
import { LogCategory } from '../logger'

export const ai = {
  // ═══════════════════════════════════════════════════════════════════════════
  // API KEY & MODEL
  // ═══════════════════════════════════════════════════════════════════════════

  async getClaudeApiKey(): Promise<string | null> {
    return call('ai.getClaudeApiKey', () => window.electron.getClaudeApiKey(), undefined, {
      category: LogCategory.AI_CHAT,
      logResponse: false // Don't log API key
    })
  },

  async setClaudeApiKey(key: string | null): Promise<{ success: boolean; error?: string }> {
    return call(
      'ai.setClaudeApiKey',
      () => window.electron.setClaudeApiKey(key),
      undefined, // Don't log key
      { category: LogCategory.AI_CHAT, logParams: false }
    )
  },

  async fetchClaudeModels(): Promise<{
    success: boolean
    models?: Array<{ id: string; display_name: string; created_at: string }>
    error?: string
  }> {
    return call('ai.fetchClaudeModels', () => window.electron.fetchClaudeModels(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async getSelectedModel(): Promise<string> {
    return call('ai.getSelectedModel', () => window.electron.getSelectedModel(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async setSelectedModel(model: string): Promise<{ success: boolean }> {
    return call(
      'ai.setSelectedModel',
      () => window.electron.setSelectedModel(model),
      { model },
      { category: LogCategory.AI_CHAT }
    )
  },

  async getDefaultModel(): Promise<string> {
    return call('ai.getDefaultModel', () => window.electron.getDefaultModel(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  async getEnableThinking(): Promise<boolean> {
    return call('ai.getEnableThinking', () => window.electron.getEnableThinking(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async setEnableThinking(enabled: boolean): Promise<{ success: boolean }> {
    return call(
      'ai.setEnableThinking',
      () => window.electron.setEnableThinking(enabled),
      { enabled },
      { category: LogCategory.AI_CHAT }
    )
  },

  async getEnableWebFetch(): Promise<boolean> {
    return call('ai.getEnableWebFetch', () => window.electron.getEnableWebFetch(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async setEnableWebFetch(enabled: boolean): Promise<{ success: boolean }> {
    return call(
      'ai.setEnableWebFetch',
      () => window.electron.setEnableWebFetch(enabled),
      { enabled },
      { category: LogCategory.AI_CHAT }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT HISTORY
  // ═══════════════════════════════════════════════════════════════════════════

  async getChatHistory(): Promise<
    Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
  > {
    return call('ai.getChatHistory', () => window.electron.getChatHistory(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async clearChatHistory(): Promise<{ success: boolean }> {
    return call('ai.clearChatHistory', () => window.electron.clearChatHistory(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT MESSAGING
  // ═══════════════════════════════════════════════════════════════════════════

  async sendChatMessage(message: string): Promise<{
    success: boolean
    message?: {
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }
    error?: string
  }> {
    return call(
      'ai.sendChatMessage',
      () => window.electron.sendChatMessage(message),
      { messageLength: message.length },
      { category: LogCategory.AI_CHAT }
    )
  },

  async sendChatMessageStreaming(
    message: string,
    systemContext?: string
  ): Promise<{ success: boolean; streamId?: string; error?: string }> {
    return call(
      'ai.sendChatMessageStreaming',
      () => window.electron.sendChatMessageStreaming(message, systemContext),
      { messageLength: message.length, hasContext: !!systemContext },
      { category: LogCategory.AI_CHAT }
    )
  },

  /**
   * Subscribe to chat stream chunks
   * Note: This returns a cleanup function, not a promise
   */
  onChatStreamChunk(
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      content?: string
      thinking?: string
      error?: string
    }) => void
  ): () => void {
    console.log('[AI] Subscribing to chat stream chunks')
    return window.electron.onChatStreamChunk(callback)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM PROMPTS
  // ═══════════════════════════════════════════════════════════════════════════

  async getCustomPrompts(): Promise<
    Array<{
      id: string
      label: string
      prompt: string
      createdAt: string
    }>
  > {
    return call('ai.getCustomPrompts', () => window.electron.getCustomPrompts(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async addCustomPrompt(
    label: string,
    prompt: string
  ): Promise<{
    success: boolean
    prompt?: {
      id: string
      label: string
      prompt: string
      createdAt: string
    }
    error?: string
  }> {
    return call(
      'ai.addCustomPrompt',
      () => window.electron.addCustomPrompt(label, prompt),
      { label, promptLength: prompt.length },
      { category: LogCategory.AI_CHAT }
    )
  },

  async deleteCustomPrompt(id: string): Promise<{ success: boolean; error?: string }> {
    return call(
      'ai.deleteCustomPrompt',
      () => window.electron.deleteCustomPrompt(id),
      { id },
      { category: LogCategory.AI_CHAT }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PR CHAT
  // ═══════════════════════════════════════════════════════════════════════════

  async getPRChats(): Promise<
    Array<{
      prId: string
      prNumber: number
      prTitle: string
      repoFullName: string
      messages: Array<{
        id: string
        role: 'user' | 'assistant'
        content: string
        thinking?: string
        timestamp: string
      }>
      createdAt: string
      updatedAt: string
      systemContext?: string
    }>
  > {
    return call('ai.getPRChats', () => window.electron.getPRChats(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async getPRChat(prId: string): Promise<{
    prId: string
    prNumber: number
    prTitle: string
    repoFullName: string
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
    createdAt: string
    updatedAt: string
    systemContext?: string
  } | null> {
    return call(
      'ai.getPRChat',
      () => window.electron.getPRChat(prId),
      { prId },
      {
        category: LogCategory.AI_CHAT
      }
    )
  },

  async createPRChat(
    prId: string,
    prNumber: number,
    prTitle: string,
    repoFullName: string,
    systemContext?: string
  ): Promise<{
    prId: string
    prNumber: number
    prTitle: string
    repoFullName: string
    messages: Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
    systemContext?: string
    createdAt: string
    updatedAt: string
  }> {
    return call(
      'ai.createPRChat',
      () => window.electron.createPRChat(prId, prNumber, prTitle, repoFullName, systemContext),
      { prId, prNumber, repo: repoFullName, hasContext: !!systemContext },
      { category: LogCategory.AI_CHAT }
    )
  },

  async addMessageToPRChat(
    prId: string,
    message: {
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }
  ): Promise<{ success: boolean }> {
    return call(
      'ai.addMessageToPRChat',
      () => window.electron.addMessageToPRChat(prId, message),
      { prId, role: message.role, contentLength: message.content.length },
      { category: LogCategory.AI_CHAT }
    )
  },

  async getPRChatMessages(prId: string): Promise<
    Array<{
      id: string
      role: 'user' | 'assistant'
      content: string
      thinking?: string
      timestamp: string
    }>
  > {
    return call(
      'ai.getPRChatMessages',
      () => window.electron.getPRChatMessages(prId),
      { prId },
      { category: LogCategory.AI_CHAT }
    )
  },

  async clearPRChatMessages(prId: string): Promise<{ success: boolean }> {
    return call(
      'ai.clearPRChatMessages',
      () => window.electron.clearPRChatMessages(prId),
      { prId },
      { category: LogCategory.AI_CHAT }
    )
  },

  async deletePRChat(prId: string): Promise<{ success: boolean }> {
    return call(
      'ai.deletePRChat',
      () => window.electron.deletePRChat(prId),
      { prId },
      {
        category: LogCategory.AI_CHAT
      }
    )
  },

  async getActivePRChatId(): Promise<string | null> {
    return call('ai.getActivePRChatId', () => window.electron.getActivePRChatId(), undefined, {
      category: LogCategory.AI_CHAT
    })
  },

  async setActivePRChatId(prId: string | null): Promise<{ success: boolean }> {
    return call(
      'ai.setActivePRChatId',
      () => window.electron.setActivePRChatId(prId),
      { prId },
      { category: LogCategory.AI_CHAT }
    )
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI-POWERED ACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  async extractPreviewUrl(context: {
    title: string
    body: string | null
    comments: Array<{ author: string; body: string }>
  }): Promise<{ success: boolean; url?: string; message?: string }> {
    return call(
      'ai.extractPreviewUrl',
      () => window.electron.extractPreviewUrl(context),
      { title: context.title, commentsCount: context.comments.length },
      { category: LogCategory.AI_ACTION }
    )
  },

  async extractJiraTicket(context: {
    title: string
    body: string | null
    branchName: string
    comments: Array<{ author: string; body: string }>
  }): Promise<{
    success: boolean
    ticketKey?: string
    ticketUrl?: string
    message?: string
  }> {
    return call(
      'ai.extractJiraTicket',
      () => window.electron.extractJiraTicket(context),
      { title: context.title, branchName: context.branchName },
      { category: LogCategory.AI_ACTION }
    )
  },

  async analyzeCIFailure(params: {
    owner: string
    repo: string
    checkRunId: string
    checkName: string
  }): Promise<{
    success: boolean
    summary?: string
    failureReason?: string
    suggestedFix?: string
    thinking?: string
    error?: string
  }> {
    return call(
      'ai.analyzeCIFailure',
      () => window.electron.analyzeCIFailure(params),
      { checkName: params.checkName, owner: params.owner, repo: params.repo },
      { category: LogCategory.AI_ACTION }
    )
  },

  // Streaming CI failure analysis with real-time thinking
  async streamCIFailureAnalysis(params: {
    owner: string
    repo: string
    checkRunId: string
    checkName: string
  }): Promise<{ success: boolean; streamId?: string; error?: string }> {
    return call(
      'ai.streamCIFailureAnalysis',
      () => window.electron.streamCIFailureAnalysis(params),
      { checkName: params.checkName, owner: params.owner, repo: params.repo },
      { category: LogCategory.AI_ACTION }
    )
  },

  // Subscribe to CI analysis stream chunks
  onCIAnalysisStreamChunk(
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      thinking?: string
      content?: string
      error?: string
      fullResponse?: {
        summary: string
        failureReason?: string
        suggestedFix?: string
        thinking?: string
      }
    }) => void
  ): () => void {
    return window.electron.onCIAnalysisStreamChunk(callback)
  },

  async analyzePRStatus(context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }): Promise<{ success: boolean; analysis?: string; message?: string }> {
    return call(
      'ai.analyzePRStatus',
      () => window.electron.analyzePRStatus(context),
      {
        prId: context.prId,
        checksCount: context.checks.length,
        reviewsCount: context.reviews.length
      },
      { category: LogCategory.AI_ACTION }
    )
  },

  async analyzePRStatusStreaming(context: {
    prId: string
    number: number
    title: string
    body: string | null
    draft: boolean
    createdAt: string
    author: string
    baseBranch: string
    headBranch: string
    additions: number
    deletions: number
    changedFiles: number
    checks: Array<{
      name: string
      status: string
      conclusion: string | null
    }>
    reviews: Array<{
      author: string
      state: string
      body: string | null
    }>
    comments: Array<{ author: string; body: string }>
    reviewThreads: Array<{
      isResolved: boolean
      path: string
      commentsCount: number
    }>
  }): Promise<{ success: boolean; streamId?: string; error?: string }> {
    return call(
      'ai.analyzePRStatusStreaming',
      () => window.electron.analyzePRStatusStreaming(context),
      {
        prId: context.prId,
        checksCount: context.checks.length,
        reviewsCount: context.reviews.length
      },
      { category: LogCategory.AI_ACTION }
    )
  },

  /**
   * Subscribe to PR analysis stream chunks
   * Note: This returns a cleanup function, not a promise
   */
  onPRAnalysisStreamChunk(
    callback: (chunk: {
      streamId: string
      type: 'thinking' | 'text' | 'done' | 'error'
      thinking?: string
      content?: string
      error?: string
      fullResponse?: {
        analysis: string
        thinking?: string
      }
    }) => void
  ): () => void {
    console.log('[AI] Subscribing to PR analysis stream chunks')
    return window.electron.onPRAnalysisStreamChunk(callback)
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PR ANALYSIS PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getPRAnalysis(prId: string): Promise<{
    prId: string
    analysis: string
    generatedAt: number
  } | null> {
    return call(
      'ai.getPRAnalysis',
      () => window.electron.getPRAnalysis(prId),
      { prId },
      {
        category: LogCategory.AI_ACTION
      }
    )
  },

  async deletePRAnalysis(prId: string): Promise<{ success: boolean }> {
    return call(
      'ai.deletePRAnalysis',
      () => window.electron.deletePRAnalysis(prId),
      { prId },
      {
        category: LogCategory.AI_ACTION
      }
    )
  },

  async getPRAnalysisPanelOpen(prId: string): Promise<boolean> {
    return call(
      'ai.getPRAnalysisPanelOpen',
      () => window.electron.getPRAnalysisPanelOpen(prId),
      { prId },
      { category: LogCategory.AI_ACTION }
    )
  },

  async setPRAnalysisPanelOpen(prId: string, isOpen: boolean): Promise<{ success: boolean }> {
    return call(
      'ai.setPRAnalysisPanelOpen',
      () => window.electron.setPRAnalysisPanelOpen(prId, isOpen),
      { prId, isOpen },
      { category: LogCategory.AI_ACTION }
    )
  }
}
