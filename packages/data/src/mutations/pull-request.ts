/**
 * Pull Request Mutations
 * All mutations get token from TanStack cache
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { MergeMethod, ReviewEvent } from '../github'
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
export function useSelectPR() {
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
export function useClosePR() {
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
export function useReopenPR() {
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
export function useMarkPRReady() {
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
export function useConvertPRToDraft() {
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
 */
export function useAddPRComment() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ prNodeId, body }: { prNodeId: string; body: string }) => {
      const token = getToken(qc)
      return github.addPRComment(token, prNodeId, body)
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
 * Merge a PR
 */
export function useMergePR() {
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
export function useSubmitPRReview() {
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
