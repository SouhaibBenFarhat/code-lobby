/**
 * AI System Prompts Index
 *
 * All AI prompts used in CodeLobby are centralized here for easy editing.
 *
 * Prompts:
 * 1. General Chat - Context about CodeLobby for general conversations
 * 2. PR Analysis - "Why Is This PR Still Open?" feature
 * 3. Preview URL - "Open Preview" feature (globe icon)
 * 4. Jira Ticket - "Find Jira Ticket" feature (ticket icon)
 *
 * Note: PR Chat System Prompt is in src/renderer/lib/pr-system-prompt.ts
 * because it needs the PullRequest type from the renderer.
 */

export {
  buildCIFailureAnalysisPrompt,
  CI_FAILURE_ANALYSIS_SYSTEM_PROMPT,
  type CIFailureContext
} from './ci-failure-analysis'
export {
  buildDailySpeechPrompt,
  type DailySpeechContext,
  type DailySpeechEvent
} from './daily-speech'
export { GENERAL_CHAT_SYSTEM_PROMPT } from './general-chat'
export { buildJiraTicketPrompt, type JiraTicketContext } from './jira-ticket'
export {
  buildCISummary,
  buildCommentsSummary,
  buildPRAnalysisPrompt,
  buildReviewsSummary,
  buildThreadsSummary,
  type PRAnalysisContext
} from './pr-analysis'
export { buildPreviewURLPrompt, type PreviewURLContext } from './preview-url'
