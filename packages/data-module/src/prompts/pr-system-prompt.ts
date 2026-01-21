/**
 * PR System Prompt Builder
 *
 * Builds the system context for PR-specific AI chats.
 * This context is invisible to the user but provides the AI
 * with comprehensive PR information.
 */

import type { PullRequest } from '@codelobby/shared-store'

/**
 * Changed file with diff content
 */
export interface ChangedFile {
  path: string
  additions: number
  deletions: number
  changeType: 'ADDED' | 'DELETED' | 'MODIFIED' | 'RENAMED' | 'COPIED'
  patch: string | null
}

/**
 * Build a comprehensive PR context message for AI chat
 *
 * This creates a markdown-formatted context that includes:
 * - PR metadata (number, title, author, branch, status)
 * - Description (truncated if too long)
 * - Labels
 * - CI/CD status summary
 * - Review status
 * - Recent comments (optional)
 * - Changed files with diffs (when provided)
 *
 * @param pr - The Pull Request object
 * @param changedFiles - Optional array of changed files with their diffs
 * @returns A formatted string to use as AI system context
 */
export function buildPRSystemPrompt(pr: PullRequest, changedFiles?: ChangedFile[]): string {
  const lines: string[] = []

  // ===================
  // HEADER
  // ===================
  lines.push(`# PR #${pr.number}: ${pr.title}`)
  lines.push('')
  lines.push('You are an AI assistant helping with this Pull Request.')
  lines.push('Use the context below to answer questions about this PR.')
  lines.push('')

  // ===================
  // BASIC INFO
  // ===================
  lines.push('## Overview')
  lines.push(`- **Repository:** ${pr.base.repo.full_name}`)
  lines.push(`- **Author:** ${pr.user.login}`)
  lines.push(`- **Branch:** \`${pr.head.ref}\` → \`${pr.base.ref}\``)
  lines.push(`- **Created:** ${new Date(pr.created_at).toLocaleDateString()}`)
  lines.push(
    `- **Status:** ${pr.draft ? '📝 Draft' : pr.state === 'open' ? '🟢 Open' : `🔴 ${pr.state}`}`
  )
  lines.push(
    `- **Changes:** +${pr.additions} / -${pr.deletions} across ${pr.changed_files} file(s)`
  )
  lines.push(`- **URL:** ${pr.html_url}`)
  lines.push('')

  // ===================
  // DESCRIPTION
  // ===================
  if (pr.body) {
    lines.push('## Description')
    // Truncate long descriptions
    const maxDescLength = 1500
    lines.push(pr.body.length > maxDescLength ? `${pr.body.slice(0, maxDescLength)}...` : pr.body)
    lines.push('')
  } else {
    lines.push('## Description')
    lines.push('_No description provided._')
    lines.push('')
  }

  // ===================
  // LABELS
  // ===================
  if (pr.labels && pr.labels.length > 0) {
    lines.push('## Labels')
    lines.push(pr.labels.map((l) => `\`${l.name}\``).join(', '))
    lines.push('')
  }

  // ===================
  // CI/CD STATUS
  // ===================
  if (pr.checks?.check_runs && pr.checks.check_runs.length > 0) {
    lines.push('## CI/CD Status')
    const passed = pr.checks.check_runs.filter((c) => c.conclusion === 'success').length
    const failed = pr.checks.check_runs.filter((c) => c.conclusion === 'failure').length
    const pending = pr.checks.check_runs.filter(
      (c) => !c.conclusion || c.status === 'in_progress'
    ).length

    lines.push(`- ✅ Passed: ${passed}`)
    if (failed > 0) lines.push(`- ❌ Failed: ${failed}`)
    if (pending > 0) lines.push(`- ⏳ Pending: ${pending}`)

    // List failed checks with details
    const failedChecks = pr.checks.check_runs.filter((c) => c.conclusion === 'failure')
    if (failedChecks.length > 0) {
      lines.push('')
      lines.push('**Failed checks:**')
      for (const check of failedChecks) {
        lines.push(`- ${check.name}`)
      }
    }
    lines.push('')
  }

  // ===================
  // REVIEWS
  // ===================
  if (pr.reviews && pr.reviews.length > 0) {
    lines.push('## Reviews')
    const approved = pr.reviews.filter((r) => r.state.toLowerCase() === 'approved')
    const changesRequested = pr.reviews.filter((r) => r.state.toLowerCase() === 'changes_requested')
    const commented = pr.reviews.filter((r) => r.state.toLowerCase() === 'commented')

    if (approved.length > 0) {
      lines.push(`- ✅ Approved by: ${approved.map((r) => r.author.login).join(', ')}`)
    }
    if (changesRequested.length > 0) {
      lines.push(
        `- 🔄 Changes requested by: ${changesRequested.map((r) => r.author.login).join(', ')}`
      )
    }
    if (commented.length > 0) {
      lines.push(`- 💬 Reviewed by: ${commented.map((r) => r.author.login).join(', ')}`)
    }
    lines.push('')
  }

  // ===================
  // REVIEW THREADS
  // ===================
  if (pr.reviewThreads && pr.reviewThreads.length > 0) {
    const unresolved = pr.reviewThreads.filter((t) => !t.isResolved)
    const resolved = pr.reviewThreads.filter((t) => t.isResolved)

    lines.push('## Review Threads')
    lines.push(`- Total: ${pr.reviewThreads.length}`)
    lines.push(`- Resolved: ${resolved.length}`)
    lines.push(`- Unresolved: ${unresolved.length}`)

    if (unresolved.length > 0) {
      lines.push('')
      lines.push('**Unresolved threads on:**')
      // List files with unresolved threads (limit to 5)
      const unresolvedPaths = [...new Set(unresolved.map((t) => t.path))].slice(0, 5)
      for (const path of unresolvedPaths) {
        lines.push(`- \`${path}\``)
      }
      if (unresolved.length > 5) {
        lines.push(`- ... and ${unresolved.length - 5} more`)
      }
    }
    lines.push('')
  }

  // ===================
  // ALL COMMENTS
  // ===================
  if (pr.commentsList && pr.commentsList.length > 0) {
    lines.push('## Comments')
    lines.push(`Total: ${pr.commentsList.length} comment(s)`)
    lines.push('')

    for (const comment of pr.commentsList) {
      const date = new Date(comment.created_at).toLocaleDateString()
      lines.push(`### ${comment.author.login} (${date})`)
      lines.push('')
      lines.push(comment.body)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  // ===================
  // CHANGED FILES
  // ===================
  if (changedFiles && changedFiles.length > 0) {
    lines.push('## Changed Files')
    lines.push('')
    lines.push(`This PR modifies ${changedFiles.length} file(s):`)
    lines.push('')

    // Group files by change type
    const added = changedFiles.filter((f) => f.changeType === 'ADDED')
    const modified = changedFiles.filter((f) => f.changeType === 'MODIFIED')
    const deleted = changedFiles.filter((f) => f.changeType === 'DELETED')
    const renamed = changedFiles.filter(
      (f) => f.changeType === 'RENAMED' || f.changeType === 'COPIED'
    )

    if (added.length > 0) {
      lines.push(`- 🆕 **Added:** ${added.length} file(s)`)
    }
    if (modified.length > 0) {
      lines.push(`- 📝 **Modified:** ${modified.length} file(s)`)
    }
    if (deleted.length > 0) {
      lines.push(`- 🗑️ **Deleted:** ${deleted.length} file(s)`)
    }
    if (renamed.length > 0) {
      lines.push(`- 📁 **Renamed/Copied:** ${renamed.length} file(s)`)
    }
    lines.push('')

    // Include actual file diffs (limit total characters to avoid huge prompts)
    const MAX_TOTAL_DIFF_CHARS = 50000 // ~50KB of diff content
    const MAX_SINGLE_FILE_CHARS = 10000 // Max per file
    let totalChars = 0

    for (const file of changedFiles) {
      if (totalChars >= MAX_TOTAL_DIFF_CHARS) {
        lines.push(`\n_Note: Additional file diffs truncated to keep context manageable._`)
        break
      }

      const changeIcon =
        file.changeType === 'ADDED'
          ? '🆕'
          : file.changeType === 'DELETED'
            ? '🗑️'
            : file.changeType === 'MODIFIED'
              ? '📝'
              : '📁'

      lines.push(`### ${changeIcon} \`${file.path}\``)
      lines.push(`_+${file.additions} / -${file.deletions}_`)
      lines.push('')

      if (file.patch) {
        // Truncate individual file diffs if too long
        const patchContent =
          file.patch.length > MAX_SINGLE_FILE_CHARS
            ? `${file.patch.slice(0, MAX_SINGLE_FILE_CHARS)}\n... (diff truncated, ${file.patch.length - MAX_SINGLE_FILE_CHARS} more characters)`
            : file.patch

        lines.push('```diff')
        lines.push(patchContent)
        lines.push('```')
        lines.push('')

        totalChars += patchContent.length
      } else if (file.changeType === 'DELETED') {
        lines.push('_File deleted._')
        lines.push('')
      } else {
        lines.push('_Binary file or diff not available._')
        lines.push('')
      }
    }
  }

  // ===================
  // INSTRUCTIONS FOR AI
  // ===================
  lines.push('---')
  lines.push('')
  lines.push('## How You Can Help')
  lines.push('')
  lines.push('Based on this PR context, you can:')
  lines.push('- Summarize the changes and their purpose')
  lines.push('- Review the code diffs and suggest improvements')
  lines.push('- Identify bugs, security issues, or potential risks')
  lines.push('- Explain why CI checks might be failing')
  lines.push('- Help write review comments')
  lines.push('- Answer questions about the code changes')
  lines.push('- Suggest alternative implementations')
  lines.push('')
  lines.push('Ask me anything about this PR!')

  return lines.join('\n')
}
