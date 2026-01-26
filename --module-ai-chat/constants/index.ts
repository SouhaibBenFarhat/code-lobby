/**
 * Constants for the AI Chat module
 */

import { AlertCircle, ClipboardCheck, MessageSquare } from 'lucide-react'
import React from 'react'
import type { PRContext, QuickPrompt } from '../types'

// Context window sizes by model (in tokens)
// NOTE: Anthropic's API does not return context window size, so we must hardcode these.
// All current Claude models use 200K context. This is standard practice (Cursor does the same).
// We only find out the actual limit when we exceed it (error: model_context_window_exceeded).
export const CONTEXT_WINDOWS: Record<string, number> = {
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000
}

export const DEFAULT_CONTEXT_WINDOW = 200000

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prompt that instructs Claude to generate a structured code review
 */
export const GENERATE_REVIEW_PROMPT = `Please generate a comprehensive code review for this PR. Analyze the changes and provide:

1. An overall summary of the changes and their quality
2. Specific inline comments for issues, suggestions, or praise at exact file:line locations
3. A verdict: "approve", "request_changes", or "comment"

You MUST respond with a JSON object in exactly this format:

\`\`\`json:review
{
  "summary": "Your overall review summary here. Be constructive and specific.",
  "comments": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "body": "Your comment about this specific line"
    }
  ],
  "verdict": "approve" | "request_changes" | "comment"
}
\`\`\`

Guidelines:
- Use "approve" if the code is good with minor or no issues
- Use "request_changes" if there are significant problems that must be fixed
- Use "comment" if you just want to leave feedback without approving/rejecting
- Each comment must reference an exact file path and line number from the changed files
- Be constructive, specific, and actionable in your feedback
- Focus on real issues, not style preferences (unless egregious)`

// Get context-aware PR quick prompts
export function getPRQuickPrompts(context: PRContext = {}): QuickPrompt[] {
  const prompts: QuickPrompt[] = [
    // Generate Review is the primary action - always first
    {
      id: 'generate-review',
      label: 'Generate Review',
      icon: React.createElement(ClipboardCheck, { className: 'w-3 h-3' }),
      prompt: GENERATE_REVIEW_PROMPT
    },
    {
      id: 'review-bugs',
      label: 'Find bugs',
      icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
      prompt:
        'Review this PR for bugs, potential issues, and edge cases. Show me the problematic code and how to fix it.'
    },
    {
      id: 'summarize',
      label: 'Summarize',
      icon: React.createElement(MessageSquare, { className: 'w-3 h-3' }),
      prompt: 'Summarize this PR in 2-3 sentences. What does it do and why?'
    }
  ]

  // Only show "Why is CI failing?" when CI is actually failing
  if (context.hasCIFailures) {
    prompts.push({
      id: 'explain-ci',
      label: 'Why is CI failing?',
      icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
      prompt: 'Look at the CI checks and explain why they are failing. What should be fixed?'
    })
  }

  prompts.push(
    {
      id: 'security',
      label: 'Security review',
      icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
      prompt: 'Review this PR for security vulnerabilities, injection risks, or unsafe patterns.'
    },
    {
      id: 'improvements',
      label: 'Suggest improvements',
      icon: React.createElement(MessageSquare, { className: 'w-3 h-3' }),
      prompt:
        'Suggest improvements to the code in this PR. Focus on readability, performance, and best practices.'
    }
  )

  return prompts
}
