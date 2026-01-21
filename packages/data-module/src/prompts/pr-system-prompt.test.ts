/**
 * Tests for PR System Prompt Builder
 *
 * These tests ensure the system prompt content is stable and contains
 * all expected sections. This prevents accidental changes during refactoring.
 */

import type { PullRequest } from '@codelobby/shared-store'
import { describe, expect, it } from 'vitest'
import { buildPRSystemPrompt, type ChangedFile } from './pr-system-prompt'

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════

function createBasicPR(overrides: Partial<PullRequest> = {}): PullRequest {
  return {
    id: 123456,
    number: 42,
    title: 'Fix: Resolve authentication bug',
    html_url: 'https://github.com/org/repo/pull/42',
    state: 'open',
    body: 'This PR fixes the authentication bug that was causing login failures.',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T14:30:00Z',
    draft: false,
    merged_at: null,
    user: {
      login: 'developer123',
      avatar_url: 'https://github.com/avatars/developer123.png'
    },
    head: {
      ref: 'fix/auth-bug',
      sha: 'abc123def456'
    },
    base: {
      ref: 'main',
      repo: {
        name: 'repo',
        full_name: 'org/repo',
        owner: {
          login: 'org',
          avatar_url: 'https://github.com/avatars/org.png'
        }
      }
    },
    labels: [],
    comments: 2,
    review_comments: 1,
    additions: 50,
    deletions: 10,
    changed_files: 3,
    ...overrides
  } as PullRequest
}

function createChangedFile(overrides: Partial<ChangedFile> = {}): ChangedFile {
  return {
    path: 'src/auth/login.ts',
    additions: 25,
    deletions: 5,
    changeType: 'MODIFIED',
    patch: `@@ -10,6 +10,8 @@
 import { validateToken } from './token';
 
+import { Logger } from '../utils/logger';
+
 export async function login(email: string, password: string) {
-  const result = authenticate(email, password);
+  Logger.info('Login attempt', { email });
+  const result = await authenticate(email, password);
   return result;
 }`,
    ...overrides
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS: BASIC STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════

describe('buildPRSystemPrompt', () => {
  describe('Header Section', () => {
    it('should include PR number and title in header', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('# PR #42: Fix: Resolve authentication bug')
    })

    it('should include assistant introduction', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('You are an AI assistant helping with this Pull Request.')
      expect(prompt).toContain('Use the context below to answer questions about this PR.')
    })
  })

  describe('Overview Section', () => {
    it('should include repository name', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Overview')
      expect(prompt).toContain('**Repository:** org/repo')
    })

    it('should include author', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Author:** developer123')
    })

    it('should include branch information', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Branch:** `fix/auth-bug` → `main`')
    })

    it('should include change statistics', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Changes:** +50 / -10 across 3 file(s)')
    })

    it('should include PR URL', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**URL:** https://github.com/org/repo/pull/42')
    })

    it('should show Open status for open PRs', () => {
      const pr = createBasicPR({ state: 'open', draft: false })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Status:** 🟢 Open')
    })

    it('should show Draft status for draft PRs', () => {
      const pr = createBasicPR({ draft: true })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Status:** 📝 Draft')
    })

    it('should show closed status', () => {
      const pr = createBasicPR({ state: 'closed', draft: false })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Status:** 🔴 closed')
    })
  })

  describe('Description Section', () => {
    it('should include PR description when present', () => {
      const pr = createBasicPR({
        body: 'This PR implements the new authentication flow.'
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Description')
      expect(prompt).toContain('This PR implements the new authentication flow.')
    })

    it('should show placeholder when no description', () => {
      const pr = createBasicPR({ body: null })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Description')
      expect(prompt).toContain('_No description provided._')
    })

    it('should truncate very long descriptions', () => {
      const longDescription = 'A'.repeat(2000)
      const pr = createBasicPR({ body: longDescription })
      const prompt = buildPRSystemPrompt(pr)

      // Should be truncated (max 1500 chars)
      expect(prompt).not.toContain('A'.repeat(2000))
      expect(prompt).toContain('...')
    })
  })

  describe('Labels Section', () => {
    it('should include labels when present', () => {
      const pr = createBasicPR({
        labels: [
          { name: 'bug', color: 'ff0000' },
          { name: 'high-priority', color: '00ff00' }
        ]
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Labels')
      expect(prompt).toContain('`bug`')
      expect(prompt).toContain('`high-priority`')
    })

    it('should not include Labels section when no labels', () => {
      const pr = createBasicPR({ labels: [] })
      const prompt = buildPRSystemPrompt(pr)

      // Check that Labels header doesn't appear or appears only once
      const labelMatches = prompt.match(/## Labels/g)
      expect(labelMatches).toBeNull()
    })
  })

  describe('CI/CD Status Section', () => {
    it('should include CI status summary when checks present', () => {
      const pr = createBasicPR({
        checks: {
          state: 'failure',
          total_count: 3,
          check_runs: [
            { id: '1', name: 'tests', status: 'completed', conclusion: 'success', html_url: '' },
            { id: '2', name: 'lint', status: 'completed', conclusion: 'success', html_url: '' },
            { id: '3', name: 'build', status: 'completed', conclusion: 'failure', html_url: '' }
          ]
        }
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## CI/CD Status')
      expect(prompt).toContain('✅ Passed: 2')
      expect(prompt).toContain('❌ Failed: 1')
    })

    it('should list failed check names', () => {
      const pr = createBasicPR({
        checks: {
          state: 'failure',
          total_count: 2,
          check_runs: [
            {
              id: '1',
              name: 'unit-tests',
              status: 'completed',
              conclusion: 'failure',
              html_url: ''
            },
            { id: '2', name: 'e2e-tests', status: 'completed', conclusion: 'failure', html_url: '' }
          ]
        }
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Failed checks:**')
      expect(prompt).toContain('- unit-tests')
      expect(prompt).toContain('- e2e-tests')
    })

    it('should show pending checks', () => {
      const pr = createBasicPR({
        checks: {
          state: 'pending',
          total_count: 1,
          check_runs: [
            { id: '1', name: 'deploy', status: 'in_progress', conclusion: null, html_url: '' }
          ]
        }
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('⏳ Pending: 1')
    })
  })

  describe('Reviews Section', () => {
    it('should include review summary when reviews present', () => {
      const pr = createBasicPR({
        reviews: [
          {
            id: '1',
            author: { login: 'reviewer1', avatar_url: '' },
            state: 'APPROVED',
            body: '',
            created_at: '2024-01-15T10:00:00Z'
          },
          {
            id: '2',
            author: { login: 'reviewer2', avatar_url: '' },
            state: 'CHANGES_REQUESTED',
            body: '',
            created_at: '2024-01-15T11:00:00Z'
          }
        ]
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Reviews')
      expect(prompt).toContain('✅ Approved by: reviewer1')
      expect(prompt).toContain('🔄 Changes requested by: reviewer2')
    })
  })

  describe('Review Threads Section', () => {
    it('should include review threads summary', () => {
      const pr = createBasicPR({
        reviewThreads: [
          { id: '1', isResolved: true, path: 'src/file1.ts', line: 10, comments: [] },
          { id: '2', isResolved: false, path: 'src/file2.ts', line: 20, comments: [] },
          { id: '3', isResolved: false, path: 'src/file3.ts', line: 30, comments: [] }
        ]
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Review Threads')
      expect(prompt).toContain('Total: 3')
      expect(prompt).toContain('Resolved: 1')
      expect(prompt).toContain('Unresolved: 2')
    })

    it('should list files with unresolved threads', () => {
      const pr = createBasicPR({
        reviewThreads: [
          { id: '1', isResolved: false, path: 'src/auth/login.ts', line: 10, comments: [] },
          { id: '2', isResolved: false, path: 'src/utils/helper.ts', line: 20, comments: [] }
        ]
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('**Unresolved threads on:**')
      expect(prompt).toContain('`src/auth/login.ts`')
      expect(prompt).toContain('`src/utils/helper.ts`')
    })
  })

  describe('Comments Section', () => {
    it('should include comments when present', () => {
      const pr = createBasicPR({
        commentsList: [
          {
            id: '1',
            author: { login: 'commenter1', avatar_url: '' },
            body: 'Great work on this feature!',
            created_at: '2024-01-15T12:00:00Z'
          }
        ]
      })
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Comments')
      expect(prompt).toContain('commenter1')
      expect(prompt).toContain('Great work on this feature!')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS: CHANGED FILES SECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Changed Files Section', () => {
    it('should include changed files header when files provided', () => {
      const pr = createBasicPR()
      const files: ChangedFile[] = [createChangedFile()]
      const prompt = buildPRSystemPrompt(pr, files)

      expect(prompt).toContain('## Changed Files')
      expect(prompt).toContain('This PR modifies 1 file(s):')
    })

    it('should not include changed files section when no files', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).not.toContain('## Changed Files')
    })

    it('should not include changed files section when empty array', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr, [])

      expect(prompt).not.toContain('## Changed Files')
    })

    it('should group files by change type', () => {
      const pr = createBasicPR()
      const files: ChangedFile[] = [
        createChangedFile({ path: 'new-file.ts', changeType: 'ADDED' }),
        createChangedFile({ path: 'modified.ts', changeType: 'MODIFIED' }),
        createChangedFile({ path: 'deleted.ts', changeType: 'DELETED' }),
        createChangedFile({ path: 'renamed.ts', changeType: 'RENAMED' })
      ]
      const prompt = buildPRSystemPrompt(pr, files)

      expect(prompt).toContain('🆕 **Added:** 1 file(s)')
      expect(prompt).toContain('📝 **Modified:** 1 file(s)')
      expect(prompt).toContain('🗑️ **Deleted:** 1 file(s)')
      expect(prompt).toContain('📁 **Renamed/Copied:** 1 file(s)')
    })

    it('should include file path and change stats', () => {
      const pr = createBasicPR()
      const files: ChangedFile[] = [
        createChangedFile({
          path: 'src/components/Button.tsx',
          additions: 42,
          deletions: 15
        })
      ]
      const prompt = buildPRSystemPrompt(pr, files)

      expect(prompt).toContain('`src/components/Button.tsx`')
      expect(prompt).toContain('+42 / -15')
    })

    it('should include file diff in code block', () => {
      const pr = createBasicPR()
      const files: ChangedFile[] = [
        createChangedFile({
          patch: '@@ -1,3 +1,4 @@\n+import React from "react";\n import { useState }'
        })
      ]
      const prompt = buildPRSystemPrompt(pr, files)

      expect(prompt).toContain('```diff')
      expect(prompt).toContain('@@ -1,3 +1,4 @@')
      expect(prompt).toContain('+import React from "react"')
    })

    it('should show message for deleted files without patch', () => {
      const pr = createBasicPR()
      const files: ChangedFile[] = [
        createChangedFile({
          path: 'old-file.ts',
          changeType: 'DELETED',
          patch: null
        })
      ]
      const prompt = buildPRSystemPrompt(pr, files)

      expect(prompt).toContain('_File deleted._')
    })

    it('should show message for binary files', () => {
      const pr = createBasicPR()
      const files: ChangedFile[] = [
        createChangedFile({
          path: 'image.png',
          changeType: 'ADDED',
          patch: null
        })
      ]
      const prompt = buildPRSystemPrompt(pr, files)

      expect(prompt).toContain('_Binary file or diff not available._')
    })

    it('should include complete diffs without truncation', () => {
      const pr = createBasicPR()
      const longPatch = 'x'.repeat(15000) // Large diff
      const files: ChangedFile[] = [
        createChangedFile({
          patch: longPatch
        })
      ]
      const prompt = buildPRSystemPrompt(pr, files)

      // Should include the full diff without truncation
      expect(prompt).toContain('x'.repeat(15000))
      expect(prompt).not.toContain('truncated')
    })

    it('should include correct icon for each change type', () => {
      const pr = createBasicPR()

      const addedFile: ChangedFile[] = [createChangedFile({ changeType: 'ADDED' })]
      expect(buildPRSystemPrompt(pr, addedFile)).toContain('### 🆕')

      const modifiedFile: ChangedFile[] = [createChangedFile({ changeType: 'MODIFIED' })]
      expect(buildPRSystemPrompt(pr, modifiedFile)).toContain('### 📝')

      const deletedFile: ChangedFile[] = [createChangedFile({ changeType: 'DELETED' })]
      expect(buildPRSystemPrompt(pr, deletedFile)).toContain('### 🗑️')

      const renamedFile: ChangedFile[] = [createChangedFile({ changeType: 'RENAMED' })]
      expect(buildPRSystemPrompt(pr, renamedFile)).toContain('### 📁')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS: HOW YOU CAN HELP SECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('How You Can Help Section', () => {
    it('should include AI capabilities section', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## How You Can Help')
    })

    it('should list key AI capabilities', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      // These are the expected capabilities that should not change
      expect(prompt).toContain('Summarize the changes and their purpose')
      expect(prompt).toContain('Review the code diffs and suggest improvements')
      expect(prompt).toContain('Identify bugs, security issues, or potential risks')
      expect(prompt).toContain('Explain why CI checks might be failing')
      expect(prompt).toContain('Help write review comments')
      expect(prompt).toContain('Answer questions about the code changes')
      expect(prompt).toContain('Suggest alternative implementations')
    })

    it('should end with call to action', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('Ask me anything about this PR!')
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS: SNAPSHOT PROTECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Prompt Structure Stability', () => {
    it('should maintain consistent section order', () => {
      const pr = createBasicPR({
        labels: [{ name: 'bug', color: 'red' }],
        checks: {
          state: 'success',
          total_count: 1,
          check_runs: [
            { id: '1', name: 'tests', status: 'completed', conclusion: 'success', html_url: '' }
          ]
        },
        reviews: [
          {
            id: '1',
            author: { login: 'rev', avatar_url: '' },
            state: 'APPROVED',
            body: '',
            created_at: '2024-01-15T10:00:00Z'
          }
        ]
      })
      const files: ChangedFile[] = [createChangedFile()]
      const prompt = buildPRSystemPrompt(pr, files)

      // Check section order
      const overviewIndex = prompt.indexOf('## Overview')
      const descIndex = prompt.indexOf('## Description')
      const labelsIndex = prompt.indexOf('## Labels')
      const ciIndex = prompt.indexOf('## CI/CD Status')
      const reviewsIndex = prompt.indexOf('## Reviews')
      const filesIndex = prompt.indexOf('## Changed Files')
      const helpIndex = prompt.indexOf('## How You Can Help')

      expect(overviewIndex).toBeLessThan(descIndex)
      expect(descIndex).toBeLessThan(labelsIndex)
      expect(labelsIndex).toBeLessThan(ciIndex)
      expect(ciIndex).toBeLessThan(reviewsIndex)
      expect(reviewsIndex).toBeLessThan(filesIndex)
      expect(filesIndex).toBeLessThan(helpIndex)
    })

    it('should always include Overview section', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Overview')
    })

    it('should always include Description section', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Description')
    })

    it('should always include How You Can Help section', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## How You Can Help')
    })

    it('should always start with PR header', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt.startsWith('# PR #')).toBe(true)
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // TESTS: POSTABLE COMMENTS INSTRUCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Postable Comments Instructions', () => {
    it('should include postable comments section', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('## Posting Code Review Comments')
    })

    it('should include the POSTABLE metadata format', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('<!--POSTABLE:{"file":"path/to/file.ts","line":42}-->')
    })

    it('should include severity levels', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('🔴 **Critical**')
      expect(prompt).toContain('🟠 **Warning**')
      expect(prompt).toContain('🟡 **Suggestion**')
      expect(prompt).toContain('🔵 **Info**')
    })

    it('should explain structured format for findings', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('### Required Format for Postable Findings')
      expect(prompt).toContain('**File:**')
      expect(prompt).toContain('**Line:**')
      expect(prompt).toContain('**Current code:**')
      expect(prompt).toContain('**Problem:**')
      expect(prompt).toContain('**Fix:**')
      expect(prompt).toContain('> **PR Comment:**')
    })

    it('should include example with code snippets and PR comment', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('### Example')
      expect(prompt).toContain('Null Pointer Exception')
      expect(prompt).toContain('**Current code:**')
      expect(prompt).toContain('**Fix:**')
      expect(prompt).toContain('> **PR Comment:**')
    })

    it('should explain when NOT to use postable comments', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('### When NOT to Use POSTABLE')
      expect(prompt).toContain('General explanations or summaries')
    })

    it('should explain what gets posted to PR', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('### What Gets Posted to PR')
      expect(prompt).toContain('Only the text in the `> **PR Comment:**` blockquote gets posted')
    })

    it('should explain rules for placement', () => {
      const pr = createBasicPR()
      const prompt = buildPRSystemPrompt(pr)

      expect(prompt).toContain('### Rules')
      expect(prompt).toContain('Always show **Current code** and **Fix** code snippets')
      expect(prompt).toContain('Use `---` horizontal rules to separate findings')
    })
  })
})
