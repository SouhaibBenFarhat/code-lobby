/**
 * Daily Speech Relay - Claude Code Integration
 *
 * Uses Claude Code Agent SDK to generate rich daily work summaries by:
 * - Analyzing GitHub events from the last 24 hours
 * - Cloning/checking out repos to read actual code changes
 * - Reading PR comments, reviews, and diffs
 * - Generating a personalized standup-style summary
 *
 * Features:
 * - Extended thinking for transparent reasoning
 * - Real-time tool activity streaming
 * - Read-only operations (no write/edit tools)
 * - parcellab org restriction
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

export interface DailySpeechEvent {
  type: string
  description: string
  repoName?: string
  prNumber?: number
  prTitle?: string
  prDescription?: string
  branchName?: string
  prUrl?: string
  commentCount?: number
  reviewState?: string
  timestamp: string
}

export interface EnrichedEvent extends DailySpeechEvent {
  /** Full PR body/description */
  fullDescription?: string
  /** All PR comments */
  comments?: Array<{ author: string; body: string; createdAt: string }>
  /** All PR reviews */
  reviews?: Array<{ author: string; state: string; body: string | null; createdAt: string }>
  /** Changed files list */
  changedFiles?: Array<{ path: string; additions: number; deletions: number }>
}

export interface GenerateDailySpeechOptions {
  sessionId: string
  username: string
  date: string
  events: DailySpeechEvent[]
  enrichedEvents?: EnrichedEvent[]
  githubToken: string
}

// =============================================================================
// Constants
// =============================================================================

const REPOS_DIR = join(homedir(), '.codelobby', 'repos')
const DEFAULT_MODEL = 'sonnet'
const THINKING_TOKENS = 16000

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

function safeStringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

async function loadSdk(): Promise<typeof import('@anthropic-ai/claude-agent-sdk').query> {
  if (queryFn) return queryFn

  try {
    logger.info(LogCategory.AI, 'Loading Claude Agent SDK for daily speech...')
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

/**
 * Format events for the prompt
 */
function formatEventsForPrompt(events: DailySpeechEvent[]): string {
  if (events.length === 0) {
    return 'No activity recorded in the last 24 hours.'
  }

  // Group events by repo
  const byRepo = new Map<string, DailySpeechEvent[]>()
  for (const event of events) {
    const repo = event.repoName || 'Unknown'
    if (!byRepo.has(repo)) {
      byRepo.set(repo, [])
    }
    byRepo.get(repo)?.push(event)
  }

  const sections: string[] = []

  for (const [repo, repoEvents] of byRepo) {
    sections.push(`### ${repo}`)
    for (const e of repoEvents) {
      let line = `- **${e.type}**: ${e.description}`
      if (e.prNumber && e.prTitle) {
        line += `\n  - PR #${e.prNumber}: "${e.prTitle}"`
      }
      if (e.branchName) {
        line += `\n  - Branch: \`${e.branchName}\``
      }
      if (e.reviewState) {
        line += `\n  - Review: ${e.reviewState}`
      }
      if (e.commentCount && e.commentCount > 0) {
        line += `\n  - ${e.commentCount} comments`
      }
      sections.push(line)
    }
    sections.push('')
  }

  return sections.join('\n')
}

/**
 * Build the system prompt for daily speech generation
 */
function buildDailySpeechSystemPrompt(options: {
  username: string
  date: string
  events: DailySpeechEvent[]
  githubToken: string
}): string {
  const { username, date, events, githubToken } = options

  // Extract unique repos from events
  const repos = [...new Set(events.map((e) => e.repoName).filter(Boolean))]

  return `# Daily Work Summary Generator

You are generating a personalized daily work summary for **${username}** on **${date}**.

## IMPORTANT: Time Scope

This summary covers **only the last 24 hours** of activity. The events listed below are the ONLY activities to summarize. Do NOT include or analyze work from previous days, even if you see it in git history. Focus exclusively on what's in the events list.

## Your Mission

Create a rich, insightful daily summary by actually reading and understanding the code changes. Don't just repeat PR titles - dig into what was actually accomplished.

## Events to Analyze (${events.length} total from the last 24 hours)

${formatEventsForPrompt(events)}

## How to Analyze Each Event

For each significant event (especially PRs), you should:

1. **Clone/checkout the repository** to access the actual code
2. **Read the diff** to understand what changed
3. **Look at the PR comments and reviews** for context
4. **Understand the impact** - what problem was solved? what feature was added?

### Git Commands to Access Code

Repos are cached at \`${REPOS_DIR}\`. For each repo:

\`\`\`bash
# Setup (if not already cloned)
cd ${REPOS_DIR}
if [ ! -d "REPO_NAME" ]; then
  git clone https://${githubToken}@github.com/parcellab/REPO_NAME.git REPO_NAME
fi

# Access the branch
cd REPO_NAME
git fetch origin BRANCH_NAME
git checkout BRANCH_NAME
git pull origin BRANCH_NAME

# See what changed
git diff origin/main...HEAD --stat
git log origin/main..HEAD --oneline
\`\`\`

## CRITICAL RESTRICTIONS

1. **parcellab organization ONLY** - You may ONLY access repositories under the \`parcellab\` GitHub organization. If an event references a repo outside parcellab org (check the repoName), skip the deep analysis and just summarize from the event metadata.

2. **READ-ONLY** - You may NOT write, edit, or modify any files. Only read and analyze.

3. **No destructive commands** - Do not run any bash commands that modify files or system state.

4. **Moderate depth** - Go deep enough to understand, but don't spend excessive time on any single item. If you've been analyzing for a while, wrap up with what you've gathered.

## Available Repos for Deep Analysis

These are parcellab repos mentioned in the events (safe to clone/analyze):
${repos.length > 0 ? repos.map((r) => `- ${r}`).join('\n') : '- None detected'}

## Output Format

Generate a concise bullet-point summary that the user will READ ALOUD to their colleagues. Write in FIRST PERSON as if you ARE the developer.

**Structure:**

### Yesterday

- **[Brief topic]**: What I did and why
  - Key technical detail if relevant
- **[Another item]**: Concise description
  - Sub-point if needed

### Today

- What I'm planning to work on
- Any blockers or things I need help with (if apparent from context)

**Example output:**

### Yesterday

- **Labels feature for PRs**: I added the ability to manage labels directly from the PR header. Users can now add, remove, and create new labels without leaving the app.
  - Used the GitHub GraphQL API for better performance
- **Fixed CI check display**: The checks section was showing stale data. I added proper cache invalidation after status changes.

### Today

- Finishing up the review comments feature
- Need to sync with the team about the new API rate limits

---

**Rules:**
- First person voice ("I worked on...", "I fixed...", "I'm planning to...")
- Concise bullet points, not paragraphs
- Focus on WHAT was done and WHY, not low-level implementation details
- Keep it to 100-200 words max - this is for a quick standup
- No greetings, no addressing anyone, no sign-offs
- Start directly with "### Yesterday"

**DO NOT**:
- Start with "Good morning" or any greeting
- Address the user or their colleagues
- Mention this is AI-generated
- Just repeat PR titles without insight
- Include work from previous days (only summarize the ${events.length} events listed above)`
}

// =============================================================================
// Main Function
// =============================================================================

export async function startDailySpeechGeneration(
  mainWindow: BrowserWindow,
  options: GenerateDailySpeechOptions
): Promise<void> {
  const { sessionId, username, date, events, githubToken } = options

  // Check if session already running
  if (activeSessions.has(sessionId)) {
    logger.warn(LogCategory.AI, 'Daily speech session already running', { sessionId })
    mainWindow.webContents.send('daily-speech:error', {
      sessionId,
      error: 'Session already running'
    })
    return
  }

  logger.info(LogCategory.AI, 'Starting daily speech generation', {
    sessionId,
    username,
    date,
    eventCount: events.length
  })

  // Get API key
  const apiKey = getClaudeApiKey()
  if (!apiKey) {
    mainWindow.webContents.send('daily-speech:error', {
      sessionId,
      error: 'Claude API key not configured. Please set your API key.'
    })
    return
  }

  process.env.ANTHROPIC_API_KEY = apiKey
  process.env.ANTHROPIC_MODEL = DEFAULT_MODEL

  if (githubToken) {
    process.env.GITHUB_TOKEN = githubToken
  }

  ensureReposDir()

  // Build system prompt
  const systemPrompt = buildDailySpeechSystemPrompt({
    username,
    date,
    events,
    githubToken
  })

  const abortController = new AbortController()
  activeSessions.set(sessionId, abortController)

  // Track generation metrics
  const startTime = Date.now()
  const toolsUsed = new Set<string>()
  const analyzedRepos = new Set<string>()
  const analyzedPRs: string[] = []

  try {
    const query = await loadSdk()

    const sdkOptions: Record<string, unknown> = {
      abortController,
      cwd: REPOS_DIR,
      systemPrompt,
      permissionMode: 'bypassPermissions',
      includePartialMessages: true,
      maxThinkingTokens: THINKING_TOKENS,
      // Restrict to read-only tools
      disallowedTools: ['Write', 'Edit', 'MultiEdit']
    }

    // User prompt - simple instruction since system prompt has all context
    const userPrompt = `Please generate my daily work summary for ${date}. Analyze my GitHub activity and create a personalized standup-style summary.`

    logger.info(LogCategory.AI, 'Starting SDK query for daily speech', {
      sessionId,
      cwd: REPOS_DIR,
      thinkingTokens: THINKING_TOKENS
    })

    const result = query({
      prompt: userPrompt,
      options: sdkOptions as any
    })

    let accumulatedText = ''
    let accumulatedThinking = ''
    let currentToolName: string | null = null
    let currentToolInput = ''
    let messageCount = 0

    for await (const message of result) {
      if (abortController.signal.aborted) {
        logger.info(LogCategory.AI, 'Daily speech session aborted', { sessionId })
        break
      }

      messageCount++

      // Handle different message types
      if (message.type === 'stream_event') {
        const sdkEvent = (message as any).event

        if (sdkEvent?.type === 'content_block_delta') {
          if (sdkEvent.delta?.type === 'text_delta') {
            const text = safeStringify(sdkEvent.delta.text)
            accumulatedText += text
            mainWindow.webContents.send('daily-speech:chunk', {
              sessionId,
              event: { type: 'text', content: text }
            })
          } else if (sdkEvent.delta?.type === 'thinking_delta') {
            const thinking = safeStringify(sdkEvent.delta.thinking)
            accumulatedThinking += thinking
            mainWindow.webContents.send('daily-speech:chunk', {
              sessionId,
              event: { type: 'thinking', thinking }
            })
          } else if (sdkEvent.delta?.type === 'input_json_delta') {
            currentToolInput += sdkEvent.delta.partial_json || ''
          }
        } else if (sdkEvent?.type === 'content_block_start') {
          if (sdkEvent.content_block?.type === 'tool_use') {
            const toolName = sdkEvent.content_block.name || 'Unknown'
            currentToolName = toolName
            currentToolInput = ''
            toolsUsed.add(toolName)

            mainWindow.webContents.send('daily-speech:chunk', {
              sessionId,
              event: {
                type: 'tool_use',
                tool_name: currentToolName,
                input: {}
              }
            })
          } else if (sdkEvent.content_block?.type === 'thinking') {
            mainWindow.webContents.send('daily-speech:chunk', {
              sessionId,
              event: { type: 'thinking', thinking: '' }
            })
          }
        } else if (sdkEvent?.type === 'content_block_stop') {
          if (currentToolName && currentToolInput) {
            try {
              const parsedInput = JSON.parse(currentToolInput)

              // Track analyzed repos from Bash commands
              if (currentToolName === 'Bash' && typeof parsedInput.command === 'string') {
                const cmd = parsedInput.command
                // Extract repo names from git clone or cd commands
                const repoMatch = cmd.match(/parcellab\/([a-zA-Z0-9_-]+)/)
                if (repoMatch) {
                  analyzedRepos.add(repoMatch[1])
                }
              }

              mainWindow.webContents.send('daily-speech:chunk', {
                sessionId,
                event: {
                  type: 'tool_use',
                  tool_name: currentToolName,
                  input: parsedInput
                }
              })
            } catch {
              logger.warn(LogCategory.AI, 'Failed to parse tool input', {
                tool: currentToolName
              })
            }
            currentToolName = null
            currentToolInput = ''
          }
        }
      } else if (message.type === 'result') {
        const rawResult = (message as any).result
        const finalContent = safeStringify(rawResult) || accumulatedText
        const durationMs = Date.now() - startTime

        // Extract PR identifiers from events
        for (const event of events) {
          if (event.prNumber && event.repoName) {
            analyzedPRs.push(`${event.repoName}#${event.prNumber}`)
          }
        }

        mainWindow.webContents.send('daily-speech:chunk', {
          sessionId,
          event: {
            type: 'result',
            result: finalContent,
            cost_usd: (message as any).total_cost_usd || 0,
            duration_ms: durationMs
          }
        })

        // Send completion with metadata
        mainWindow.webContents.send('daily-speech:done', {
          sessionId,
          success: true,
          content: finalContent,
          thinking: accumulatedThinking || null,
          metadata: {
            eventCount: events.length,
            analyzedRepos: [...analyzedRepos],
            analyzedPRs,
            toolsUsed: [...toolsUsed],
            generationDurationMs: durationMs
          }
        })
      } else if (message.type === 'system') {
        const subtype = (message as any).subtype
        if (subtype === 'init') {
          const sdkModel = (message as any).model
          logger.info(LogCategory.AI, 'Daily speech SDK initialized', {
            sessionId,
            model: sdkModel
          })
        }
      }
    }

    activeSessions.delete(sessionId)
    logger.info(LogCategory.AI, 'Daily speech generation completed', {
      sessionId,
      messageCount,
      durationMs: Date.now() - startTime,
      toolsUsed: [...toolsUsed]
    })
  } catch (err) {
    activeSessions.delete(sessionId)
    const errorMessage = err instanceof Error ? err.message : String(err)

    logger.error(LogCategory.AI, 'Daily speech generation error', {
      sessionId,
      error: errorMessage
    })

    mainWindow.webContents.send('daily-speech:error', {
      sessionId,
      error: errorMessage
    })
  }
}

export function stopDailySpeechGeneration(sessionId: string): boolean {
  const controller = activeSessions.get(sessionId)
  if (!controller) {
    return false
  }

  logger.info(LogCategory.AI, 'Stopping daily speech generation', { sessionId })
  controller.abort()
  activeSessions.delete(sessionId)
  return true
}

export function isDailySpeechRunning(sessionId: string): boolean {
  return activeSessions.has(sessionId)
}
