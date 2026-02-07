/**
 * Reviewer Suggest Relay - Claude Code Integration
 *
 * Uses Claude Code Agent SDK (haiku model) to analyze git blame data
 * and suggest optimal PR reviewers based on code ownership and recency.
 *
 * Features:
 * - Clones/updates repo at ~/.codelobby/repos/
 * - Runs git blame on each changed file
 * - Aggregates authors with recency-weighted scoring
 * - Excludes the PR author from results
 * - Returns strict JSON format for the UI
 */

import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { LogCategory, mainLogger as logger } from '@logger/main'
import type { BrowserWindow } from 'electron'
import { getClaudeApiKey } from './store'

// =============================================================================
// Types
// =============================================================================

export interface ReviewerSuggestOptions {
  repoFullName: string
  prNumber: number
  branch: string
  baseBranch: string
  changedFiles: string[]
  prAuthor: string
  githubToken: string
}

// =============================================================================
// Constants
// =============================================================================

const REPOS_DIR = join(homedir(), '.codelobby', 'repos')
const MODEL = 'haiku'

// =============================================================================
// State
// =============================================================================

const activeSessions = new Map<string, AbortController>()

// Import the SDK dynamically (ESM module)
let queryFn: typeof import('@anthropic-ai/claude-agent-sdk').query | null = null

// =============================================================================
// Helpers
// =============================================================================

function ensureReposDir(): void {
  if (!existsSync(REPOS_DIR)) {
    mkdirSync(REPOS_DIR, { recursive: true })
    logger.info(LogCategory.AI, 'Created repos directory', { path: REPOS_DIR })
  }
}

async function loadSdk(): Promise<typeof import('@anthropic-ai/claude-agent-sdk').query> {
  if (queryFn) return queryFn

  try {
    logger.info(LogCategory.AI, 'Loading Claude Agent SDK for reviewer suggestion...')
    const sdk = await import('@anthropic-ai/claude-agent-sdk')
    queryFn = sdk.query
    logger.info(LogCategory.AI, 'Claude Agent SDK loaded successfully')
    return queryFn
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    logger.error(LogCategory.AI, 'Failed to load Claude Agent SDK', { error: errorMessage })
    throw new Error(`Failed to load Claude Agent SDK: ${errorMessage}`)
  }
}

function getSessionId(repoFullName: string, prNumber: number): string {
  return `reviewer-suggest:${repoFullName}#${prNumber}`
}

// =============================================================================
// System Prompt
// =============================================================================

function buildSystemPrompt(options: ReviewerSuggestOptions): string {
  const { repoFullName, prNumber, branch, baseBranch, changedFiles, prAuthor, githubToken } =
    options
  const [owner, repo] = repoFullName.split('/')

  return `# PR Reviewer Suggestion Agent

You are analyzing code ownership to suggest the best reviewers for PR #${prNumber} in ${repoFullName}.

## Your Mission

Run \`git blame\` on each changed file to determine who has the most knowledge of the code being modified. Return a ranked list of suggested reviewers.

## Setup

First, ensure the repo is cloned and up to date:

\`\`\`bash
cd ${REPOS_DIR}
if [ ! -d "${owner}-${repo}" ]; then
  git clone https://${githubToken}@github.com/${owner}/${repo}.git ${owner}-${repo}
fi
cd ${owner}-${repo}
git fetch origin ${branch} ${baseBranch}
git checkout ${branch} 2>/dev/null || git checkout -b ${branch} origin/${branch}
git pull origin ${branch} --ff-only 2>/dev/null || true
\`\`\`

## Changed Files to Analyze

${changedFiles.map((f) => `- \`${f}\``).join('\n')}

## Instructions

For EACH changed file listed above:

1. Run \`git blame --line-porcelain <file>\` to get detailed blame info
2. Extract the author name, email, and the commit timestamp for each line
3. Count lines per author and track their most recent commit date

If a file doesn't exist on the branch (e.g. it was deleted), skip it.

## Scoring Rules

After analyzing all files, aggregate the results:

1. **Lines owned**: Total lines each author is responsible for across all changed files
2. **Files owned**: Number of changed files where the author has at least 1 line
3. **Recency score**: Multiplier based on the author's most recent commit:
   - Committed within last 7 days: multiplier = 3
   - Committed within last 30 days: multiplier = 2
   - Older: multiplier = 1
4. **Total score**: \`((linesOwned * 0.3) + (filesOwned * 20)) * recencyScore\`

The recency score is a MULTIPLIER, not an additive bonus. Active contributors should rank significantly higher than inactive ones with the same code ownership.

## CRITICAL Rules

1. **Exclude the PR author**: Remove \`${prAuthor}\` from results (match by name OR email containing their login)
2. **GitHub login mapping**: If the blame email looks like \`username@users.noreply.github.com\` or similar, extract the GitHub login. Otherwise set login to null.
3. **Return ONLY valid JSON** - no markdown, no explanation, no backticks
4. **Limit to top 10 reviewers** sorted by totalScore descending

## Output Format

Return EXACTLY this JSON structure (no markdown wrapping, no other text):

{"reviewers":[{"login":"github-username-or-null","name":"Git Author Name","email":"author@email.com","linesOwned":150,"filesOwned":3,"recencyScore":3,"totalScore":135}],"analyzedFiles":${changedFiles.length}}

Do NOT wrap in \`\`\`json. Do NOT add any explanation. ONLY output the raw JSON object.`
}

// =============================================================================
// Main Function
// =============================================================================

export async function startReviewerSuggestion(
  mainWindow: BrowserWindow,
  options: ReviewerSuggestOptions
): Promise<void> {
  const sessionId = getSessionId(options.repoFullName, options.prNumber)

  // Check if session already running
  if (activeSessions.has(sessionId)) {
    logger.warn(LogCategory.AI, 'Reviewer suggestion session already running', { sessionId })
    mainWindow.webContents.send('reviewer-suggest:error', {
      error: 'Analysis already in progress for this PR'
    })
    return
  }

  logger.info(LogCategory.AI, 'Starting reviewer suggestion', {
    sessionId,
    repo: options.repoFullName,
    prNumber: options.prNumber,
    fileCount: options.changedFiles.length
  })

  // Get API key
  const apiKey = getClaudeApiKey()
  if (!apiKey) {
    mainWindow.webContents.send('reviewer-suggest:error', {
      error: 'Claude API key not configured. Please set your API key in settings.'
    })
    return
  }

  process.env.ANTHROPIC_API_KEY = apiKey
  process.env.ANTHROPIC_MODEL = MODEL

  if (options.githubToken) {
    process.env.GITHUB_TOKEN = options.githubToken
  }

  ensureReposDir()

  const systemPrompt = buildSystemPrompt(options)
  const abortController = new AbortController()
  activeSessions.set(sessionId, abortController)

  const startTime = Date.now()

  try {
    const query = await loadSdk()

    const sdkOptions: Record<string, unknown> = {
      abortController,
      cwd: REPOS_DIR,
      systemPrompt,
      permissionMode: 'bypassPermissions',
      // No extended thinking needed for this structured task
      maxThinkingTokens: 0
    }

    const userPrompt = `Analyze the ${options.changedFiles.length} changed files in PR #${options.prNumber} and return the JSON reviewer suggestions. Remember: output ONLY raw JSON, nothing else.`

    logger.info(LogCategory.AI, 'Starting SDK query for reviewer suggestion', {
      sessionId,
      model: MODEL,
      fileCount: options.changedFiles.length
    })

    const result = query({
      prompt: userPrompt,
      options: sdkOptions as any
    })

    let accumulatedText = ''

    for await (const message of result) {
      if (abortController.signal.aborted) {
        logger.info(LogCategory.AI, 'Reviewer suggestion session aborted', { sessionId })
        break
      }

      if (message.type === 'stream_event') {
        const sdkEvent = (message as any).event
        if (sdkEvent?.type === 'content_block_delta' && sdkEvent.delta?.type === 'text_delta') {
          accumulatedText += sdkEvent.delta.text || ''
        }
      } else if (message.type === 'result') {
        const rawResult = (message as any).result
        const finalText = typeof rawResult === 'string' ? rawResult : accumulatedText
        const durationMs = Date.now() - startTime

        logger.info(LogCategory.AI, 'Reviewer suggestion completed', {
          sessionId,
          durationMs,
          outputLength: finalText.length
        })

        // Parse the JSON output from Claude
        try {
          // Try to extract JSON from the response (Claude might wrap it in text)
          const jsonMatch = finalText.match(/\{[\s\S]*"reviewers"[\s\S]*\}/)
          if (!jsonMatch) {
            throw new Error('No valid JSON found in Claude response')
          }

          const parsed = JSON.parse(jsonMatch[0])

          if (!parsed.reviewers || !Array.isArray(parsed.reviewers)) {
            throw new Error('Invalid response structure: missing reviewers array')
          }

          mainWindow.webContents.send('reviewer-suggest:done', {
            reviewers: parsed.reviewers,
            analyzedFiles: parsed.analyzedFiles || options.changedFiles.length,
            timestamp: new Date().toISOString()
          })
        } catch (parseErr) {
          const parseError = parseErr instanceof Error ? parseErr.message : String(parseErr)
          logger.error(LogCategory.AI, 'Failed to parse reviewer suggestion output', {
            sessionId,
            error: parseError,
            rawOutput: finalText.substring(0, 500)
          })
          mainWindow.webContents.send('reviewer-suggest:error', {
            error: `Failed to parse analysis results: ${parseError}`
          })
        }
      }
    }

    activeSessions.delete(sessionId)
  } catch (err) {
    activeSessions.delete(sessionId)
    const errorMessage = err instanceof Error ? err.message : String(err)

    logger.error(LogCategory.AI, 'Reviewer suggestion error', {
      sessionId,
      error: errorMessage
    })

    mainWindow.webContents.send('reviewer-suggest:error', {
      error: errorMessage
    })
  }
}

export function stopReviewerSuggestion(repoFullName: string, prNumber: number): boolean {
  const sessionId = getSessionId(repoFullName, prNumber)
  const controller = activeSessions.get(sessionId)
  if (!controller) {
    return false
  }

  logger.info(LogCategory.AI, 'Stopping reviewer suggestion', { sessionId })
  controller.abort()
  activeSessions.delete(sessionId)
  return true
}

export function isReviewerSuggestionRunning(repoFullName: string, prNumber: number): boolean {
  return activeSessions.has(getSessionId(repoFullName, prNumber))
}
