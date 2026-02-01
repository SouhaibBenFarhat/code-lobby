/**
 * Claude Code Relay - Using Official Agent SDK
 *
 * Manages Claude Code sessions with:
 * - Configurable model and extended thinking
 * - Comprehensive PR context (always provided internally)
 * - Streaming support
 * - Tool activity tracking
 */

import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { LogCategory, mainLogger as logger } from '@logger/main'
import type { BrowserWindow } from 'electron'
import { getClaudeApiKey } from './store'

// =============================================================================
// Review Detection Types
// =============================================================================

interface ReviewComment {
  file: string
  line: number
  body: string
}

interface ReviewData {
  summary: string
  comments: ReviewComment[]
  verdict: 'approve' | 'request_changes' | 'comment'
}

/**
 * Check if JSON has balanced braces/brackets (complete JSON)
 */
function isJsonComplete(jsonStr: string): boolean {
  let braceCount = 0
  let bracketCount = 0
  let inString = false
  let escaped = false

  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i]
    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (char === '{') braceCount++
    else if (char === '}') braceCount--
    else if (char === '[') bracketCount++
    else if (char === ']') bracketCount--
  }

  return braceCount === 0 && bracketCount === 0 && !inString
}

// Tool tags - Claude "calls" tools by outputting these XML-style blocks
const REVIEW_TOOL_START = '<codelobby_submit_review>'
const REVIEW_TOOL_END = '</codelobby_submit_review>'

/**
 * Streaming tool call filter
 * Accumulates text and strips out <codelobby_submit_review>...</codelobby_submit_review> blocks
 */
class ToolCallFilter {
  private buffer = ''

  /**
   * Process incoming text chunk and return only displayable content
   * Tool call content is stripped out
   */
  processChunk(text: string): string {
    this.buffer += text

    // Check if we have a complete tool call to strip
    const startIdx = this.buffer.indexOf(REVIEW_TOOL_START)
    const endIdx = this.buffer.indexOf(REVIEW_TOOL_END)

    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      // We have a complete tool call - strip it out
      const before = this.buffer.slice(0, startIdx)
      const after = this.buffer.slice(endIdx + REVIEW_TOOL_END.length)
      this.buffer = after
      return before
    }

    if (startIdx !== -1) {
      // Tool call started but not finished - emit everything before it, keep rest buffered
      const before = this.buffer.slice(0, startIdx)
      this.buffer = this.buffer.slice(startIdx)
      return before
    }

    // Check if buffer might end with partial start tag (e.g., "<codelobby_sub")
    // We need to hold back potential partial matches
    const partialMatch = this.getPartialTagMatch()
    if (partialMatch > 0) {
      const safeToEmit = this.buffer.slice(0, -partialMatch)
      this.buffer = this.buffer.slice(-partialMatch)
      return safeToEmit
    }

    // No tool call detected - emit everything
    const result = this.buffer
    this.buffer = ''
    return result
  }

  /**
   * Check if buffer ends with a partial match of the start tag
   * Returns the length of the partial match, or 0 if none
   */
  private getPartialTagMatch(): number {
    // Check increasingly longer suffixes of buffer against tag prefix
    for (let len = Math.min(this.buffer.length, REVIEW_TOOL_START.length - 1); len >= 1; len--) {
      const suffix = this.buffer.slice(-len)
      if (REVIEW_TOOL_START.startsWith(suffix)) {
        return len
      }
    }
    return 0
  }

  /**
   * Get any remaining buffered content (called at end of stream)
   */
  flush(): string {
    // At end of stream, if we're holding a partial tag that never completed,
    // it wasn't actually a tag - emit it
    // But if we're inside an incomplete tool call (has start but no end), discard it
    if (this.buffer.includes(REVIEW_TOOL_START)) {
      // Incomplete tool call - strip from start tag onwards
      const idx = this.buffer.indexOf(REVIEW_TOOL_START)
      const result = this.buffer.slice(0, idx)
      this.buffer = ''
      return result
    }
    const result = this.buffer
    this.buffer = ''
    return result
  }

  /**
   * Reset filter state
   */
  reset(): void {
    this.buffer = ''
  }
}

/**
 * Remove tool call blocks from text (for clean display)
 * Tool calls are extracted separately and not shown to users
 */
function stripToolCallsFromText(content: string): string {
  if (!content) return content

  const startIdx = content.indexOf(REVIEW_TOOL_START)
  const endIdx = content.indexOf(REVIEW_TOOL_END)

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    // Remove the tool call block (inclusive of tags)
    const result = content.slice(0, startIdx) + content.slice(endIdx + REVIEW_TOOL_END.length)
    return result.replace(/\n{3,}/g, '\n\n').trim()
  }

  return content
}

/**
 * Extract review tool call from Claude's response
 * Looks for JSON inside <codelobby_submit_review> tags (tool call pattern)
 */
function extractReviewFromResponse(content: string): ReviewData | null {
  if (!content) return null

  // Look for the review tool call
  const startIdx = content.indexOf(REVIEW_TOOL_START)
  const endIdx = content.indexOf(REVIEW_TOOL_END)

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    return null
  }

  // Extract the JSON from the tool call
  const jsonStr = content.slice(startIdx + REVIEW_TOOL_START.length, endIdx).trim()

  if (!jsonStr || !isJsonComplete(jsonStr)) return null

  try {
    const parsed = JSON.parse(jsonStr)

    // Validate structure
    if (typeof parsed.summary !== 'string') return null
    if (!Array.isArray(parsed.comments)) return null
    if (!['approve', 'request_changes', 'comment'].includes(parsed.verdict)) return null

    // Validate and map comments
    const validComments: ReviewComment[] = []
    for (const c of parsed.comments) {
      if (
        typeof c === 'object' &&
        c !== null &&
        typeof c.file === 'string' &&
        typeof c.line === 'number' &&
        typeof c.body === 'string'
      ) {
        validComments.push({ file: c.file, line: c.line, body: c.body })
      }
    }

    return {
      summary: parsed.summary,
      comments: validComments,
      verdict: parsed.verdict
    }
  } catch {
    return null
  }
}

// Import the SDK dynamically (ESM module)
let queryFn: typeof import('@anthropic-ai/claude-agent-sdk').query | null = null

// =============================================================================
// Types
// =============================================================================

interface PRContext {
  owner: string
  repo: string
  branch: string
  baseBranch?: string
  prNumber?: number
  prTitle?: string
  prDescription?: string
  changedFiles?: number
  labels?: string[]
  comments?: Array<{ author: string; body: string; createdAt: string }>
  reviews?: Array<{ author: string; state: string; body: string | null; createdAt: string }>
  reviewThreads?: Array<{
    path: string
    line: number | null
    isResolved: boolean
    comments: Array<{ author: string; body: string; createdAt: string }>
  }>
  reviewSummary?: string // e.g., "2 approvals, 1 change requested"
  githubToken: string
  username?: string // GitHub username of the current user
}

interface ClaudeConfig {
  model?: string // Model alias: 'sonnet', 'haiku', 'opus' (or full model name)
  enableExtendedThinking?: boolean
  maxThinkingTokens?: number // Default 10000 if thinking enabled
}

interface StartSessionOptions {
  sessionId: string
  prompt: string
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  prContext?: PRContext
  config?: ClaudeConfig
}

// =============================================================================
// Constants
// =============================================================================

const REPOS_DIR = join(homedir(), '.codelobby', 'repos')
// Using model alias for more reliable resolution (SDK maps to latest version)
const DEFAULT_MODEL = 'sonnet'
const DEFAULT_THINKING_TOKENS = 10000

// =============================================================================
// State
// =============================================================================

const activeSessions = new Map<string, AbortController>()

// =============================================================================
// Helpers
// =============================================================================

function ensureReposDir(): void {
  if (!existsSync(REPOS_DIR)) {
    mkdirSync(REPOS_DIR, { recursive: true })
    logger.info(LogCategory.AI, 'Created repos directory', { path: REPOS_DIR })
  }
}

/**
 * Build comprehensive system prompt with all context Claude needs.
 * This is provided INTERNALLY - user doesn't need to specify this.
 */
function buildSystemPrompt(prContext?: PRContext): string {
  const sections: string[] = []

  // ==========================================================================
  // IDENTITY & ROLE
  // ==========================================================================
  const userGreeting = prContext?.username ? `You are assisting **${prContext.username}**.` : ''

  sections.push(`# CodeLobby AI Assistant

You are an expert code reviewer and AI assistant integrated into CodeLobby, a desktop application for managing GitHub Pull Requests.${userGreeting ? ` ${userGreeting}` : ''} Your role is to help developers:

- **Review PRs**: Analyze code changes, identify bugs, suggest improvements
- **Understand code**: Explain complex logic, trace data flow, find patterns
- **Debug issues**: Investigate CI failures, identify root causes
- **Answer questions**: About the codebase, architecture, best practices

## Your Capabilities

You have FULL ACCESS to powerful tools:
- **Read**: Read any file in the repository
- **Grep**: Search code with regex patterns
- **Glob**: Find files by pattern
- **Bash**: Run shell commands (git, npm, etc.)
- **WebSearch**: Search the internet for documentation, solutions
- **WebFetch**: Fetch content from URLs

**IMPORTANT**: You can and SHOULD use these tools proactively. Don't ask for permission - just do it.

## Communication Style

- **Be precise** - Get straight to the point, no fluff or unnecessary preamble
- **Calibrate length** - Match response length to the question complexity:
  - Simple question → Short, direct answer
  - Complex question → Thorough but focused explanation
  - Code review → Detailed analysis with specific references
- **Be constructive** - Focus on solutions and actionable feedback, not just problems
- **No filler phrases** - Skip "Great question!", "I'd be happy to help", "Let me explain..."
- **Lead with the answer** - State the conclusion/solution first, then explain if needed
- **Be friendly and professional** - Be friendly and professional, don't be too formal or too casual.
- **Build friendship with the user** - Try to guess the user's name and use it in the conversation, and make the conversation more personal and friendly. You will receive the user's name in the prContext as github username and use your intelligence to guess his name.

## Adaptive Communication

- **Escalate with complexity** - As the conversation progresses and topics get deeper, naturally increase detail level
- **Follow user cues** - If the user asks follow-up questions, they want more depth; adjust accordingly
- **User overrides everything** - If the user explicitly asks you to:
  - "Be shorter" / "Too long" → Give more concise responses
  - "Explain more" / "Be detailed" → Provide thorough explanations
  - "Just give me the code" → Skip explanations, output code directly
  - "Walk me through it" → Step-by-step detailed breakdown
- **Remember preferences** - Once a user indicates a preference in the conversation, maintain it unless they say otherwise`)

  // ==========================================================================
  // PR CONTEXT (if available)
  // ==========================================================================
  if (prContext) {
    const {
      owner,
      repo,
      branch,
      baseBranch,
      prNumber,
      prTitle,
      prDescription,
      changedFiles,
      labels,
      comments,
      reviews,
      reviewThreads,
      reviewSummary,
      githubToken
    } = prContext
    const repoPath = join(REPOS_DIR, `${owner}-${repo}`)
    // Use authenticated URL if token available, otherwise public URL (for public repos)
    const cloneUrl = githubToken
      ? `https://${githubToken}@github.com/${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`

    sections.push(`
## Current PR Context

| Field | Value |
|-------|-------|
| Repository | \`${owner}/${repo}\` |
| PR Number | #${prNumber || 'N/A'} |
| Title | ${prTitle || 'N/A'} |
| Branch | \`${branch}\` → \`${baseBranch || 'main'}\` |
| Changed Files | ${changedFiles || 'unknown'} |
| Labels | ${labels && labels.length > 0 ? labels.join(', ') : 'None'} |
| Reviews | ${reviewSummary || 'None'} |
| Local Path | \`${repoPath}\` |

${prDescription ? `### PR Description\n${prDescription}\n` : ''}
${
  reviews && reviews.length > 0
    ? `### PR Reviews (${reviews.length})\n${reviews
        .map((r) => {
          const stateEmoji =
            r.state === 'approved' ? '✅' : r.state === 'changes_requested' ? '🔄' : '💬'
          const bodyText = r.body ? `\n${r.body}` : ''
          return `${stateEmoji} **${r.author}** (${r.createdAt}) - ${r.state}${bodyText}`
        })
        .join('\n\n')}\n`
    : ''
}
${
  reviewThreads && reviewThreads.length > 0
    ? `### Inline Review Comments (${reviewThreads.length} threads)\n${reviewThreads
        .map((t) => {
          const resolvedTag = t.isResolved ? ' [RESOLVED]' : ''
          const location = t.line ? `${t.path}:${t.line}` : t.path
          const threadComments = t.comments
            .map((c) => `  - **${c.author}** (${c.createdAt}): ${c.body}`)
            .join('\n')
          return `📍 **${location}**${resolvedTag}\n${threadComments}`
        })
        .join('\n\n')}\n`
    : ''
}
${
  comments && comments.length > 0
    ? `### PR Comments (${comments.length})\n${comments
        .map((c) => `**${c.author}** (${c.createdAt}):\n${c.body}`)
        .join('\n\n')}\n`
    : ''
}

## How to Access the Code

**Step 1: Clone/Update Repository**
\`\`\`bash
# If repo doesn't exist, clone it
if [ ! -d "${repoPath}" ]; then
  git clone ${cloneUrl} ${repoPath}
fi

# Navigate to repo
cd ${repoPath}

# Fetch latest and checkout PR branch
git fetch origin ${branch}
git checkout ${branch}
git pull origin ${branch}
\`\`\`

**Step 2: View PR Changes**
\`\`\`bash
# See what files changed
git diff --name-only origin/${baseBranch || 'main'}...HEAD

# See the actual diff
git diff origin/${baseBranch || 'main'}...HEAD

# See commit history
git log origin/${baseBranch || 'main'}..HEAD --oneline
\`\`\`

**Step 3: Explore Code**
- Use \`Read\` to view specific files
- Use \`Grep\` to search for patterns
- Use \`Glob\` to find files by name/extension
- Use \`Bash\` to run any git or shell command`)
  } else {
    sections.push(`
## No PR Selected

The user hasn't selected a specific PR. You can still help with general coding questions, but you won't have repository context until they select a PR.`)
  }

  // ==========================================================================
  // RESPONSE GUIDELINES
  // ==========================================================================
  sections.push(`
## Response Guidelines

1. **Be Proactive**: If you need to read files or run commands to answer, DO IT. Don't ask "should I?"
2. **Be Specific**: Reference exact file paths, line numbers, function names
3. **Be Actionable**: Suggest concrete improvements with code examples
4. **Be Concise**: Get to the point quickly, but be thorough when needed
5. **Use Tools**: You have powerful tools - USE THEM to provide accurate answers

## When Reviewing Code

- Check for bugs, security issues, performance problems
- Verify error handling and edge cases
- Look for code style and best practices
- Consider maintainability and readability
- Suggest tests if missing

## Code Review Tool

You have access to a \`codelobby_submit_review\` tool for submitting PR reviews to GitHub.

When asked to "generate a review", "create a review", or "review this PR" or anything in that context of reviewing code:

1. **First**, read claude.md/CLAUDE.md in the project (if it exists) and ensure the code is compliant with its guidelines
2. **Second**, write your analysis as human-readable text explaining your findings
3. Also check readme.md/README.md in the project (if it exists) and ensure the code is compliant with its guidelines.
5. Check the coverage of the code, sometimes can be found in the comments of the PR. if not try to locate untested files and mention in the summary.
6. Check for memory leaks, or security issues, feel free to access websearch if needed, especially if new libraries are used.
7. Ensure there is no excessive logging or console.logs, suggest that some console.logs can be reported to sentry.io if needed.
8. ensure accessibility is respected but don't over obsess about it.
9. add. **Then**, call the review tool by outputting this EXACT format at the END:

<codelobby_submit_review>
{"summary":"Brief summary","comments":[{"file":"path/to/file.ts","line":42,"body":"Your comment"}],"verdict":"approve|request_changes|comment"}
</codelobby_submit_review>

**Tool Parameters:**
- \`summary\` (string): 1-2 sentence review summary
- \`comments\` (array): Each with \`file\` (string), \`line\` (number), \`body\` (string)  
- \`verdict\`: "approve" (good code), "request_changes" (must fix), or "comment" (feedback only)

**CRITICAL Review Guidelines:**
- **NO praise comments** - Do NOT add comments that just say something is good/well done
- **Only actionable feedback** - Comments should identify issues, bugs, improvements, or concerns
- **If code is good** - Use verdict "approve" with a SHORT encouraging summary (e.g., "Clean implementation, good to merge!") and an EMPTY comments array
- **Quality over quantity** - Fewer meaningful comments are better than many trivial ones
- Each comment MUST have exact file path and line number from the changed files

**Important:**
- The tool call block is automatically extracted and NOT shown to users
- Write your human-readable analysis BEFORE calling the tool
- Only call this tool when explicitly asked to generate/create a review`)

  return sections.join('\n')
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
    logger.info(LogCategory.AI, 'Loading Claude Agent SDK...', {
      PATH: process.env.PATH?.split(':').slice(0, 5)
    })
    const sdk = await import('@anthropic-ai/claude-agent-sdk')
    queryFn = sdk.query
    logger.info(LogCategory.AI, 'Claude Agent SDK loaded successfully')
    return queryFn
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : undefined
    logger.error(LogCategory.AI, 'Failed to load Claude Agent SDK', {
      error: errorMessage,
      stack: errorStack,
      PATH: process.env.PATH?.split(':').slice(0, 5)
    })
    throw new Error(`Failed to load Claude Agent SDK: ${errorMessage}`)
  }
}

// =============================================================================
// Main Functions
// =============================================================================

export async function startClaudeSession(
  mainWindow: BrowserWindow,
  options: StartSessionOptions
): Promise<void> {
  const { sessionId, prompt, conversationHistory, prContext, config = {} } = options

  // Check if session already running
  if (activeSessions.has(sessionId)) {
    logger.warn(LogCategory.AI, 'Session already running', { sessionId })
    mainWindow.webContents.send('claude:error', {
      sessionId,
      error: 'Session already running'
    })
    return
  }

  logger.info(LogCategory.AI, 'Starting Claude Code session', {
    sessionId,
    hasPRContext: !!prContext,
    prContextDetails: prContext
      ? {
          owner: prContext.owner,
          repo: prContext.repo,
          branch: prContext.branch,
          prNumber: prContext.prNumber,
          prTitle: prContext.prTitle?.slice(0, 50),
          hasToken: !!prContext.githubToken
        }
      : null,
    model: config.model || DEFAULT_MODEL,
    thinkingEnabled: config.enableExtendedThinking,
    promptLength: prompt.length
  })

  // Get API key
  const apiKey = getClaudeApiKey()
  if (!apiKey) {
    mainWindow.webContents.send('claude:error', {
      sessionId,
      error: 'Claude API key not configured. Please set your API key.'
    })
    return
  }

  process.env.ANTHROPIC_API_KEY = apiKey

  // Set model via environment variable (this is how the SDK reads it)
  const modelToUse = config.model || DEFAULT_MODEL
  process.env.ANTHROPIC_MODEL = modelToUse
  logger.info(LogCategory.AI, 'Setting model', { model: modelToUse })

  if (prContext?.githubToken) {
    process.env.GITHUB_TOKEN = prContext.githubToken
  }

  ensureReposDir()

  // Build system prompt with ALL context
  const systemPrompt = buildSystemPrompt(prContext)

  // Determine working directory
  let cwd: string = process.cwd()
  if (prContext) {
    const repoPath = join(REPOS_DIR, `${prContext.owner}-${prContext.repo}`)
    if (existsSync(repoPath)) {
      cwd = repoPath
      logger.info(LogCategory.AI, 'Using existing repo clone', { repoPath })
    }
  }

  const abortController = new AbortController()
  activeSessions.set(sessionId, abortController)

  try {
    const query = await loadSdk()

    // Build SDK options
    const sdkOptions: Record<string, unknown> = {
      abortController,
      cwd,
      systemPrompt,
      permissionMode: 'bypassPermissions',
      includePartialMessages: true
    }

    // Model configuration
    if (config.model) {
      sdkOptions.model = config.model
    }

    // Extended thinking configuration
    if (config.enableExtendedThinking) {
      sdkOptions.maxThinkingTokens = config.maxThinkingTokens || DEFAULT_THINKING_TOKENS
    }

    // Build full prompt with conversation history for multi-turn context
    let fullPrompt = prompt
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
        .join('\n\n')
      fullPrompt = `Previous conversation:\n${historyText}\n\nHuman: ${prompt}`
      logger.info(LogCategory.AI, 'Including conversation history', {
        sessionId,
        historyLength: conversationHistory.length,
        totalPromptLength: fullPrompt.length
      })
    }

    logger.info(LogCategory.AI, 'Starting SDK query', {
      sessionId,
      cwd,
      requestedModel: config.model || 'default',
      envModel: process.env.ANTHROPIC_MODEL,
      sdkOptionsModel: sdkOptions.model,
      thinkingTokens: config.enableExtendedThinking
        ? config.maxThinkingTokens || DEFAULT_THINKING_TOKENS
        : 0,
      hasHistory: !!conversationHistory?.length
    })

    const result = query({
      prompt: fullPrompt,
      options: sdkOptions as any
    })

    let totalCost = 0
    let messageCount = 0
    let accumulatedText = ''
    // Track current tool being called (for accumulating input from deltas)
    let currentToolName: string | null = null
    let currentToolInput = ''
    // Filter to intercept tool call content during streaming
    const toolCallFilter = new ToolCallFilter()

    for await (const message of result) {
      if (abortController.signal.aborted) {
        logger.info(LogCategory.AI, 'Session aborted', { sessionId })
        break
      }

      messageCount++

      // Log for debugging
      logger.debug(LogCategory.AI, 'SDK message', {
        type: message.type,
        sessionId,
        num: messageCount
      })

      // Handle different message types
      if (message.type === 'assistant') {
        // 'assistant' message contains the FULL content so far (not delta)
        // We track it but DON'T send it - we only send deltas from stream_event
        const content = (message as any).message?.content
        let textContent = ''
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === 'text') {
              textContent += safeStringify(block.text)
            }
          }
        } else {
          textContent = safeStringify(content)
        }
        accumulatedText = textContent
        // Don't send - we get deltas from stream_event
      } else if (message.type === 'stream_event') {
        const sdkEvent = (message as any).event

        if (sdkEvent?.type === 'content_block_delta') {
          if (sdkEvent.delta?.type === 'text_delta') {
            const text = safeStringify(sdkEvent.delta.text)
            accumulatedText += text
            // Filter out tool call content before sending to UI
            const displayText = toolCallFilter.processChunk(text)
            if (displayText) {
              mainWindow.webContents.send('claude:chunk', {
                sessionId,
                event: { type: 'assistant', message: { content: displayText } }
              })
            }
          } else if (sdkEvent.delta?.type === 'thinking_delta') {
            mainWindow.webContents.send('claude:chunk', {
              sessionId,
              event: { type: 'thinking', thinking: safeStringify(sdkEvent.delta.thinking) }
            })
          } else if (sdkEvent.delta?.type === 'input_json_delta') {
            // Accumulate tool input JSON
            currentToolInput += sdkEvent.delta.partial_json || ''
          }
        } else if (sdkEvent?.type === 'content_block_start') {
          if (sdkEvent.content_block?.type === 'tool_use') {
            // Tool started - save name and reset input accumulator
            currentToolName = sdkEvent.content_block.name || 'Unknown'
            currentToolInput = ''
            // Send initial event (input will be updated when complete)
            mainWindow.webContents.send('claude:chunk', {
              sessionId,
              event: {
                type: 'tool_use',
                tool_name: currentToolName,
                input: {} // Will be updated when we get the full input
              }
            })
          } else if (sdkEvent.content_block?.type === 'thinking') {
            mainWindow.webContents.send('claude:chunk', {
              sessionId,
              event: { type: 'thinking', thinking: '' }
            })
          }
        } else if (sdkEvent?.type === 'content_block_stop') {
          // Tool input complete - parse and send the full input
          if (currentToolName && currentToolInput) {
            try {
              const parsedInput = JSON.parse(currentToolInput)
              mainWindow.webContents.send('claude:chunk', {
                sessionId,
                event: {
                  type: 'tool_use',
                  tool_name: currentToolName,
                  input: parsedInput // Send as object, not string!
                }
              })
              logger.debug(LogCategory.AI, 'Tool input complete', {
                tool: currentToolName,
                inputKeys: Object.keys(parsedInput)
              })
            } catch {
              logger.warn(LogCategory.AI, 'Failed to parse tool input', {
                tool: currentToolName,
                raw: currentToolInput.slice(0, 200)
              })
            }
            currentToolName = null
            currentToolInput = ''
          }
        }
      } else if (message.type === 'tool_progress') {
        const toolName = (message as any).tool_name || 'Running'
        const elapsed = (message as any).elapsed_time_seconds || 0
        mainWindow.webContents.send('claude:chunk', {
          sessionId,
          event: {
            type: 'tool_use',
            tool_name: toolName,
            input: `(${elapsed.toFixed(1)}s)`
          }
        })
      } else if (message.type === 'result') {
        totalCost = (message as any).total_cost_usd || 0
        const rawResult = (message as any).result
        let resultText = safeStringify(rawResult) || accumulatedText

        // Flush any remaining buffered content from the filter
        const remainingText = toolCallFilter.flush()
        if (remainingText) {
          mainWindow.webContents.send('claude:chunk', {
            sessionId,
            event: { type: 'assistant', message: { content: remainingText } }
          })
        }

        // Check for review data in the final result (using unfiltered accumulatedText)
        const reviewData = extractReviewFromResponse(accumulatedText)
        if (reviewData) {
          logger.info(LogCategory.AI, 'Review detected in response', {
            sessionId,
            commentsCount: reviewData.comments.length,
            verdict: reviewData.verdict
          })

          // Strip the tool call from the text so users don't see it
          resultText = stripToolCallsFromText(resultText)

          // Emit dedicated review event - this triggers the "Open Review" button
          mainWindow.webContents.send('claude:review', {
            sessionId,
            review: reviewData
          })
        }

        mainWindow.webContents.send('claude:chunk', {
          sessionId,
          event: {
            type: 'result',
            result: resultText,
            cost_usd: totalCost,
            duration_ms: (message as any).duration_ms,
            is_error: (message as any).is_error
          }
        })
      } else if (message.type === 'system') {
        const subtype = (message as any).subtype
        const status = (message as any).status

        // Log the init message which contains the actual model being used
        if (subtype === 'init') {
          const sdkModel = (message as any).model
          logger.info(LogCategory.AI, 'SDK initialized with model', {
            sessionId,
            sdkReportedModel: sdkModel,
            requestedModel: config.model || DEFAULT_MODEL
          })
        } else if (status === 'compacting') {
          mainWindow.webContents.send('claude:chunk', {
            sessionId,
            event: { type: 'tool_use', tool_name: 'System', input: 'Optimizing context...' }
          })
        }
      }
    }

    activeSessions.delete(sessionId)

    logger.info(LogCategory.AI, 'Session completed', {
      sessionId,
      messageCount,
      totalCost
    })

    mainWindow.webContents.send('claude:done', {
      sessionId,
      success: true,
      cost_usd: totalCost
    })
  } catch (err) {
    activeSessions.delete(sessionId)

    // Extract full error details for debugging
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : undefined
    const errorCause =
      err instanceof Error && (err as any).cause ? String((err as any).cause) : undefined

    logger.error(LogCategory.AI, 'Session error', {
      sessionId,
      error: errorMessage,
      stack: errorStack,
      cause: errorCause,
      PATH: process.env.PATH?.split(':').slice(0, 5) // Log first 5 PATH entries for debugging
    })

    // Include more context in error message for debugging
    let userMessage = errorMessage
    if (errorMessage.includes('ENOENT')) {
      userMessage = `${errorMessage}\n\nPATH: ${process.env.PATH?.split(':').slice(0, 3).join(':')}`
    }

    mainWindow.webContents.send('claude:error', {
      sessionId,
      error: userMessage
    })
  }
}

export function stopClaudeSession(sessionId: string): boolean {
  const controller = activeSessions.get(sessionId)
  if (!controller) {
    return false
  }

  logger.info(LogCategory.AI, 'Stopping session', { sessionId })
  controller.abort()
  activeSessions.delete(sessionId)
  return true
}

export function isSessionRunning(sessionId: string): boolean {
  return activeSessions.has(sessionId)
}

export function getActiveSessions(): string[] {
  return Array.from(activeSessions.keys())
}

export function stopAllSessions(): void {
  for (const [_sessionId, controller] of activeSessions) {
    controller.abort()
  }
  activeSessions.clear()
}
