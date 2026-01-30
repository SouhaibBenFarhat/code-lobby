/**
 * Pull Request Mutations
 * All mutations get token from TanStack cache
 */

import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MergeMethod, MergeResult, MutationResult, ReviewEvent, ReviewResult } from '../github'
import * as github from '../github'
import { keys } from '../keys'
import type { PRIdentifier } from '../types'

export type { MergeMethod, ReviewEvent }

// Helper to get token from cache (throws if not present)
function getToken(qc: ReturnType<typeof useQueryClient>): string {
  const token = qc.getQueryData<string>(keys.githubToken)
  if (!token) throw new Error('Not authenticated')
  return token
}

/**
 * Select a PR (sets local state)
 */
export function useSelectPR(): UseMutationResult<PRIdentifier | null, Error, PRIdentifier | null> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (prId: PRIdentifier | null) => prId,
    onSuccess: (prId) => {
      qc.setQueryData(keys.selectedPRId, prId)
    }
  })
}

/**
 * Close a PR
 */
export function useClosePR(): UseMutationResult<
  MutationResult,
  Error,
  { prNodeId: string; comment?: string }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ prNodeId, comment }: { prNodeId: string; comment?: string }) => {
      const token = getToken(qc)
      if (comment) {
        await github.addPRComment(token, prNodeId, comment)
      }
      return github.closePR(token, prNodeId)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'prs' })
      }
    }
  })
}

/**
 * Reopen a PR
 */
export function useReopenPR(): UseMutationResult<MutationResult, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (prNodeId: string) => {
      const token = getToken(qc)
      return github.reopenPR(token, prNodeId)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'prs' })
      }
    }
  })
}

/**
 * Mark PR as ready for review
 */
export function useMarkPRReady(): UseMutationResult<MutationResult, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (prNodeId: string) => {
      const token = getToken(qc)
      return github.markPRReady(token, prNodeId)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
      }
    }
  })
}

/**
 * Convert PR to draft
 */
export function useConvertPRToDraft(): UseMutationResult<MutationResult, Error, string> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (prNodeId: string) => {
      const token = getToken(qc)
      return github.convertPRToDraft(token, prNodeId)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
      }
    }
  })
}

/**
 * Add comment to PR
 * Invalidates all PR-related queries (detail, files, etc.) on success
 */
export function useAddPRComment(): UseMutationResult<
  MutationResult,
  Error,
  { prNodeId: string; body: string; repoFullName: string; prNumber: number }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      prNodeId,
      body
    }: {
      prNodeId: string
      body: string
      repoFullName: string
      prNumber: number
    }) => {
      const token = getToken(qc)
      return github.addPRComment(token, prNodeId, body)
    },
    onSuccess: (_, { repoFullName, prNumber }) => {
      // Invalidate ALL PR-related queries using shared prefix
      qc.invalidateQueries({
        queryKey: keys.pr(repoFullName, prNumber)
      })
    }
  })
}

/**
 * Merge a PR
 */
export function useMergePR(): UseMutationResult<
  MergeResult,
  Error,
  { prNodeId: string; mergeMethod?: MergeMethod; commitHeadline?: string; commitBody?: string }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      prNodeId,
      mergeMethod,
      commitHeadline,
      commitBody
    }: {
      prNodeId: string
      mergeMethod?: MergeMethod
      commitHeadline?: string
      commitBody?: string
    }) => {
      const token = getToken(qc)
      return github.mergePR(token, prNodeId, mergeMethod, commitHeadline, commitBody)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'prs' })
      }
    }
  })
}

/**
 * Submit PR review (approve, request changes, or comment)
 */
export function useSubmitPRReview(): UseMutationResult<
  ReviewResult,
  Error,
  { prNodeId: string; event: ReviewEvent; body?: string }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      prNodeId,
      event,
      body
    }: {
      prNodeId: string
      event: ReviewEvent
      body?: string
    }) => {
      const token = getToken(qc)
      return github.submitPRReview(token, prNodeId, event, body)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
      }
    }
  })
}

/**
 * Review comment for inline feedback
 */
export interface ReviewCommentInput {
  path: string
  line: number
  body: string
}

/**
 * Submit PR review with inline comments
 */
export function useSubmitPRReviewWithComments(): UseMutationResult<
  ReviewResult,
  Error,
  {
    owner: string
    repo: string
    prNumber: number
    event: ReviewEvent
    body: string
    comments: ReviewCommentInput[]
  }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      owner,
      repo,
      prNumber,
      event,
      body,
      comments
    }: {
      owner: string
      repo: string
      prNumber: number
      event: ReviewEvent
      body: string
      comments: ReviewCommentInput[]
    }) => {
      const token = getToken(qc)
      return github.submitPRReviewWithComments(token, owner, repo, prNumber, event, body, comments)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        qc.invalidateQueries({
          queryKey: keys.pr(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
      }
    }
  })
}

/**
 * Update PR body/description
 */
export function useUpdatePRBody(): UseMutationResult<
  MutationResult,
  Error,
  { prNodeId: string; body: string; repoFullName: string; prNumber: number }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      prNodeId,
      body
    }: {
      prNodeId: string
      body: string
      repoFullName: string
      prNumber: number
    }) => {
      const token = getToken(qc)
      return github.updatePRBody(token, prNodeId, body)
    },
    onSuccess: (_, { repoFullName, prNumber }) => {
      // Invalidate PR detail to refresh the body
      qc.invalidateQueries({
        queryKey: keys.prDetail(repoFullName, prNumber)
      })
    }
  })
}

/**
 * Update PR title
 */
export function useUpdatePRTitle(): UseMutationResult<
  MutationResult,
  Error,
  { prNodeId: string; title: string; repoFullName: string; prNumber: number }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({
      prNodeId,
      title
    }: {
      prNodeId: string
      title: string
      repoFullName: string
      prNumber: number
    }) => {
      const token = getToken(qc)
      return github.updatePRTitle(token, prNodeId, title)
    },
    onSuccess: (_, { repoFullName, prNumber }) => {
      // Invalidate PR detail to refresh the title
      qc.invalidateQueries({
        queryKey: keys.prDetail(repoFullName, prNumber)
      })
      // Invalidate PR lists to update title there too
      qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'prs' })
    }
  })
}

/**
 * Update PR branch with base branch (sync with main)
 * Like GitHub's "Update branch" button
 */
export function useUpdatePRBranch(): UseMutationResult<
  MutationResult,
  Error,
  { owner: string; repo: string; prNumber: number }
> {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      owner,
      repo,
      prNumber
    }: {
      owner: string
      repo: string
      prNumber: number
    }) => {
      const token = getToken(qc)
      return github.updatePRBranch(token, owner, repo, prNumber)
    },
    onSuccess: () => {
      const selectedPRId = qc.getQueryData<PRIdentifier>(keys.selectedPRId)
      if (selectedPRId) {
        // Invalidate PR detail to refresh mergeStateStatus
        qc.invalidateQueries({
          queryKey: keys.prDetail(selectedPRId.repoFullName, selectedPRId.prNumber)
        })
        // Invalidate PR list
        qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'prs' })
      }
    }
  })
}
