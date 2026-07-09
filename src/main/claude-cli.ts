/**
 * Claude CLI Backend - Spawns the Claude Code CLI binary
 *
 * The sole AI backend for CodeLobby. The CLI handles its own OAuth auth
 * via the user's Claude Pro/Max subscription.
 *
 * Text content (prompts, system prompts) is NEVER passed as CLI arguments
 * because the claude binary's npm/Volta shim runs through /bin/sh (zsh on
 * macOS), which can interpret special characters like |, ", $, etc.
 * Instead we use: temp files for system prompts, stdin for user prompts.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { LogCategory, mainLogger as logger } from '@logger/main'
import type { BrowserWindow } from 'electron'
import { getClaudeBinaryPath, getEnhancedPath } from './claude-cli-path'
import type { StartSessionOptions } from './system-prompt'
import { buildSystemPrompt } from './system-prompt'

// =============================================================================
// Constants
// =============================================================================

const REPOS_DIR = join(homedir(), '.codelobby', 'repos')
const DEFAULT_MODEL = 'sonnet'

// =============================================================================
// State
// =============================================================================

const activeCliSessions = new Map<string, ChildProcess>()

// =============================================================================
// Review Detection
// =============================================================================

const REVIEW_START_MARKER = '<!-- CODELOBBY_REVIEW -->'
const REVIEW_END_MARKER = '<!-- /CODELOBBY_REVIEW -->'

/**
 * Try to extract review JSON from accumulated text.
 * Returns the review data if found, null otherwise.
 */
function extractReviewFromText(text: string): {
  summary: string
  comments: Array<{ file: string; line: number; body: string }>
  verdict: 'approve' | 'request_changes' | 'comment'
} | null {
  const startIdx = text.indexOf(REVIEW_START_MARKER)
  const endIdx = text.indexOf(REVIEW_END_MARKER)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null

  const jsonStr = text.slice(startIdx + REVIEW_START_MARKER.length, endIdx).trim()
  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed.summary && parsed.verdict) {
      return {
        summary: parsed.summary,
        comments: Array.isArray(parsed.comments) ? parsed.comments : [],
        verdict: parsed.verdict
      }
    }
  } catch {
    logger.warn(LogCategory.AI, 'Failed to parse review JSON from CLI output', {
      jsonStr: jsonStr.slice(0, 200)
    })
  }
  return null
}

// =============================================================================
// Helpers
// =============================================================================

function ensureReposDir(): void {
  if (!existsSync(REPOS_DIR)) {
    mkdirSync(REPOS_DIR, { recursive: true })
  }
}

function getSpawnEnv(githubToken?: string, maxThinkingTokens?: number): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PATH: getEnhancedPath(),
    ...(githubToken ? { GITHUB_TOKEN: githubToken } : {}),
    ...(maxThinkingTokens && maxThinkingTokens > 0
      ? { MAX_THINKING_TOKENS: String(maxThinkingTokens) }
      : {})
  }
}

/**
 * Write content to a temp file. Returns the file path.
 * Caller is responsible for cleanup via cleanupTempFile().
 */
function writeTempFile(content: string, prefix: string): string {
  const filePath = join(
    tmpdir(),
    `codelobby-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.txt`
  )
  writeFileSync(filePath, content, 'utf-8')
  return filePath
}

function cleanupTempFile(filePath: string): void {
  try {
    unlinkSync(filePath)
  } catch {
    // File may already be cleaned up
  }
}

/**
 * Build a shell command that safely passes text content from temp files.
 *
 * Strategy:
 * - System prompt is read from a temp file into a shell variable via $(cat 'path')
 * - The variable is passed as --system-prompt "$VAR" (double-quoted variable
 *   expansion does NOT re-parse content, so |, ", $, etc. are safe)
 * - User prompt is piped through stdin (not in the command at all)
 */
function buildShellCommand(
  claudePath: string,
  outputFormat: 'stream-json' | 'text',
  model: string,
  sysPromptFile: string | null,
  extraFlags: string[] = []
): string {
  const parts: string[] = []

  // Read system prompt from temp file into a variable (safe expansion)
  if (sysPromptFile) {
    parts.push(`SYS_PROMPT=$(cat '${sysPromptFile}')`)
  }

  // Build the claude command
  const claudeArgs = [
    `"${claudePath}"`,
    '-p',
    `--output-format ${outputFormat}`,
    `--model "${model}"`,
    ...extraFlags
  ]

  if (sysPromptFile) {
    claudeArgs.push('--system-prompt "$SYS_PROMPT"')
  }

  // Use exec to replace shell with claude process (proper signal forwarding)
  parts.push(`exec ${claudeArgs.join(' ')}`)

  return parts.join(' && ')
}

// =============================================================================
// Stream JSON Parser
// =============================================================================

export type ParsedEvent = {
  type: string
  message?: { content: string }
  tool_name?: string
  input?: Record<string, unknown>
  content?: string
  thinking?: string
  result?: string
  error?: string
  cost_usd?: number
  duration_ms?: number
}

/**
 * Extract text from a content value that can be a string or array of content blocks.
 * The CLI's stream-json format returns content as arrays:
 *   [{ type: "text", text: "Hello" }, { type: "tool_use", name: "Read", ... }]
 */
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((block: Record<string, unknown>) => block.type === 'text')
      .map((block: Record<string, unknown>) => (block.text as string) || '')
      .join('')
  }
  return ''
}

/**
 * Parse a single line of stream-json output from the Claude CLI.
 * Returns an ARRAY of events because a single "assistant" line can contain
 * multiple content block types (text, tool_use, thinking) in its content array.
 * Each block becomes a separate event to match the IPC format the renderer expects.
 *
 * With --include-partial-messages, the CLI sends granular stream_event lines
 * (content_block_delta with thinking_delta / text_delta) BEFORE the full
 * assistant message. We convert those deltas to the same event shapes the
 * renderer already understands so thinking and text stream progressively.
 */
export function parseStreamJsonLine(line: string): ParsedEvent[] {
  if (!line.trim()) return []

  try {
    const event = JSON.parse(line)

    switch (event.type) {
      // ── Streaming deltas (--include-partial-messages) ──────────────
      case 'stream_event': {
        const inner = event.event
        if (!inner) return []

        // content_block_delta carries incremental text / thinking
        if (inner.type === 'content_block_delta') {
          const delta = inner.delta
          if (delta?.type === 'thinking_delta' && delta.thinking) {
            return [{ type: 'thinking', thinking: delta.thinking }]
          }
          if (delta?.type === 'text_delta' && delta.text) {
            return [{ type: 'assistant', message: { content: delta.text } }]
          }
        }

        // Ignore other stream_event subtypes (message_start, content_block_start/stop,
        // message_delta, message_stop, signature_delta) — they carry no displayable content.
        return []
      }

      // ── Full assistant message (sent after all deltas for a turn) ─
      case 'assistant': {
        // When --include-partial-messages is active the full assistant message
        // is a duplicate of what we already streamed via deltas, so skip it
        // to avoid double-rendering. Without that flag the message is the
        // only source of content so we still parse it.
        const rawContent = event.message?.content
        const events: ParsedEvent[] = []

        if (typeof rawContent === 'string') {
          if (rawContent) {
            events.push({ type: 'assistant', message: { content: rawContent } })
          }
        } else if (Array.isArray(rawContent)) {
          for (const block of rawContent) {
            if (block.type === 'text' && block.text) {
              events.push({ type: 'assistant', message: { content: block.text } })
            } else if (block.type === 'tool_use') {
              events.push({
                type: 'tool_use',
                tool_name: block.name || 'unknown',
                input: block.input || {}
              })
            } else if (block.type === 'thinking' && block.thinking) {
              events.push({ type: 'thinking', thinking: block.thinking })
            }
          }
        }

        return events
      }

      case 'tool_use':
        return [
          {
            type: 'tool_use',
            tool_name: event.tool?.name || event.tool_name || 'unknown',
            input: event.tool?.input || event.input || {}
          }
        ]

      case 'tool_result': {
        let resultContent: string
        if (typeof event.content === 'string') {
          resultContent = event.content
        } else if (Array.isArray(event.content)) {
          resultContent = event.content
            .map((block: Record<string, unknown>) =>
              block.type === 'text' ? (block.text as string) || '' : JSON.stringify(block)
            )
            .join('')
        } else {
          resultContent = JSON.stringify(event.content)
        }
        return [{ type: 'tool_result', content: resultContent }]
      }

      case 'thinking':
        return [{ type: 'thinking', thinking: event.thinking || '' }]

      case 'result':
        return [
          {
            type: 'result',
            result: extractTextFromContent(event.result),
            cost_usd: event.cost_usd,
            duration_ms: event.duration_ms
          }
        ]

      case 'error':
        return [{ type: 'error', error: event.error || 'Unknown CLI error' }]

      case 'system':
        return [{ type: 'system', content: event.message || event.content || '' }]

      default:
        logger.debug(LogCategory.AI, 'Unknown CLI stream event type', { type: event.type })
        return []
    }
  } catch {
    // Not valid JSON — could be partial output, ignore
    return []
  }
}

// =============================================================================
// Agentic Session
// =============================================================================

/**
 * Start a Claude CLI session with streaming JSON output.
 * Emits claude:chunk, claude:done, claude:error, and claude:review IPC events.
 */
export async function startClaudeCliSession(
  mainWindow: BrowserWindow,
  options: StartSessionOptions
): Promise<void> {
  const { sessionId, prompt, conversationHistory, prContext, config } = options

  // Check if session already running
  if (activeCliSessions.has(sessionId)) {
    mainWindow.webContents.send('claude:error', {
      sessionId,
      error: 'Session already running'
    })
    return
  }

  const modelToUse = config?.model || DEFAULT_MODEL

  logger.info(LogCategory.AI, '[CLI] Starting Claude CLI session', {
    sessionId,
    model: modelToUse,
    hasPRContext: !!prContext,
    hasConversationHistory: !!conversationHistory?.length
  })

  // Build the system prompt
  const systemPrompt = buildSystemPrompt(prContext)

  // Build the full prompt with conversation history
  let fullPrompt = prompt
  if (conversationHistory && conversationHistory.length > 0) {
    const historyText = conversationHistory
      .map((m) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
      .join('\n\n')
    fullPrompt = `Previous conversation:\n${historyText}\n\nHuman: ${prompt}`
  }

  // Add review tool instructions to system prompt for CLI mode
  const cliSystemPrompt = `${systemPrompt}

## Review Output Format (CLI Mode)

When you want to submit a code review, output it in this exact format:

${REVIEW_START_MARKER}
{
  "summary": "Brief review summary",
  "comments": [
    { "file": "path/to/file.ts", "line": 42, "body": "Review comment text" }
  ],
  "verdict": one of "approve", "request_changes", or "comment"
}
${REVIEW_END_MARKER}

This will be detected and shown as a reviewable draft in the UI.`

  // Determine working directory
  let cwd = process.cwd()
  if (prContext) {
    ensureReposDir()
    const repoPath = join(REPOS_DIR, `${prContext.owner}-${prContext.repo}`)
    if (existsSync(repoPath)) {
      cwd = repoPath
    }
  }

  // Write system prompt to temp file (avoids shell interpretation of special chars)
  const sysPromptFile = writeTempFile(cliSystemPrompt, 'sys')

  const claudePath = getClaudeBinaryPath()
  const shellCmd = buildShellCommand(claudePath, 'stream-json', modelToUse, sysPromptFile, [
    '--verbose',
    '--include-partial-messages',
    '--dangerously-skip-permissions',
    '--allowedTools Read,Grep,Glob,Bash,WebSearch,WebFetch'
  ])

  logger.info(LogCategory.AI, '[CLI] Spawning claude process', {
    claudePath,
    cwd,
    model: modelToUse,
    thinkingBudget: config?.maxThinkingTokens ?? 0
  })

  try {
    const child = spawn('/bin/sh', ['-c', shellCmd], {
      cwd,
      env: getSpawnEnv(prContext?.githubToken, config?.maxThinkingTokens),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Pipe prompt through stdin (safe from any shell interpretation)
    child.stdin?.write(fullPrompt)
    child.stdin?.end()

    activeCliSessions.set(sessionId, child)

    let accumulatedText = ''
    let stderrBuffer = ''
    let reviewEmitted = false
    let insideReviewBlock = false
    // With --include-partial-messages, we receive granular stream_event deltas
    // BEFORE the full assistant message. The assistant message is a duplicate.
    // Track whether we've seen deltas so we can skip the duplicate.
    let seenStreamDeltas = false

    // Parse stdout line-by-line
    let lineBuffer = ''

    child.stdout?.on('data', (data: Buffer) => {
      lineBuffer += data.toString()

      // Process complete lines
      const lines = lineBuffer.split('\n')
      // Keep the last incomplete line in buffer
      lineBuffer = lines.pop() || ''

      for (const line of lines) {
        // Track stream_event lines for dedup (before parsing, which is cheaper)
        if (line.includes('"stream_event"')) {
          seenStreamDeltas = true
        }

        const events = parseStreamJsonLine(line)

        for (const event of events) {
          // Accumulate text for review detection (always, even if suppressed)
          if (event.type === 'assistant' && event.message?.content) {
            accumulatedText += event.message.content
          }

          // Skip duplicate assistant messages when we already streamed via deltas.
          // The full assistant message arrives after all deltas for a content block,
          // carrying the same text we already sent chunk-by-chunk.
          if (
            seenStreamDeltas &&
            line.includes('"assistant"') &&
            !line.includes('"stream_event"')
          ) {
            // Still accumulate for review detection (above), but don't send to renderer
            continue
          }

          // Suppress review JSON from the chat display.
          // The review is output as text between markers — filter it here
          // so raw JSON doesn't appear in the chat.
          if (event.type === 'assistant' && event.message?.content) {
            const text = event.message.content

            if (!insideReviewBlock && text.includes(REVIEW_START_MARKER)) {
              // Text contains the review start — send only the part before it
              insideReviewBlock = true
              const before = text.split(REVIEW_START_MARKER)[0]
              if (before.trim()) {
                mainWindow.webContents.send('claude:chunk', {
                  sessionId,
                  event: { type: 'assistant', message: { content: before } },
                  raw: line
                })
              }
              // Check if end marker is also in this same chunk
              if (text.includes(REVIEW_END_MARKER)) {
                insideReviewBlock = false
                const after = text.split(REVIEW_END_MARKER)[1]
                if (after?.trim()) {
                  mainWindow.webContents.send('claude:chunk', {
                    sessionId,
                    event: { type: 'assistant', message: { content: after } },
                    raw: line
                  })
                }
              }
            } else if (insideReviewBlock) {
              // Inside review block — check if this chunk contains the end marker
              if (text.includes(REVIEW_END_MARKER)) {
                insideReviewBlock = false
                const after = text.split(REVIEW_END_MARKER)[1]
                if (after?.trim()) {
                  mainWindow.webContents.send('claude:chunk', {
                    sessionId,
                    event: { type: 'assistant', message: { content: after } },
                    raw: line
                  })
                }
              }
              // Otherwise suppress — don't send review JSON to renderer
            } else {
              // Normal text, not inside review block — send as-is
              mainWindow.webContents.send('claude:chunk', {
                sessionId,
                event,
                raw: line
              })
            }
          } else {
            // Non-text events (tool_use, thinking, etc.) — always send
            mainWindow.webContents.send('claude:chunk', {
              sessionId,
              event,
              raw: line
            })
          }

          // Check for review in accumulated text
          if (!reviewEmitted && accumulatedText.includes(REVIEW_END_MARKER)) {
            const review = extractReviewFromText(accumulatedText)
            if (review) {
              reviewEmitted = true
              mainWindow.webContents.send('claude:review', { sessionId, review })
              logger.info(LogCategory.AI, '[CLI] Review detected and emitted', {
                sessionId,
                verdict: review.verdict,
                commentCount: review.comments.length
              })
            }
          }
        }
      }
    })

    child.stderr?.on('data', (data: Buffer) => {
      stderrBuffer += data.toString()
    })

    child.on('close', (code) => {
      activeCliSessions.delete(sessionId)
      cleanupTempFile(sysPromptFile)

      // Process any remaining data in buffer
      if (lineBuffer.trim()) {
        for (const event of parseStreamJsonLine(lineBuffer)) {
          mainWindow.webContents.send('claude:chunk', { sessionId, event })
        }
      }

      if (code === 0 || code === null) {
        logger.info(LogCategory.AI, '[CLI] Session completed successfully', { sessionId })
        mainWindow.webContents.send('claude:done', {
          sessionId,
          success: true
        })
      } else {
        const errorMsg = stderrBuffer.trim() || `Claude CLI exited with code ${code}`
        logger.error(LogCategory.AI, '[CLI] Session failed', {
          sessionId,
          exitCode: code,
          stderr: errorMsg.slice(0, 500)
        })
        mainWindow.webContents.send('claude:error', {
          sessionId,
          error: errorMsg
        })
      }
    })

    child.on('error', (err) => {
      activeCliSessions.delete(sessionId)
      cleanupTempFile(sysPromptFile)
      logger.error(LogCategory.AI, '[CLI] Process spawn error', {
        sessionId,
        error: err.message
      })
      mainWindow.webContents.send('claude:error', {
        sessionId,
        error: `Failed to start Claude CLI: ${err.message}`
      })
    })
  } catch (error) {
    activeCliSessions.delete(sessionId)
    cleanupTempFile(sysPromptFile)
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.error(LogCategory.AI, '[CLI] Failed to spawn process', {
      sessionId,
      error: errorMsg
    })
    mainWindow.webContents.send('claude:error', {
      sessionId,
      error: errorMsg
    })
  }
}

// =============================================================================
// Session Management
// =============================================================================

export function stopClaudeCliSession(sessionId: string): boolean {
  const child = activeCliSessions.get(sessionId)
  if (child) {
    child.kill('SIGTERM')
    activeCliSessions.delete(sessionId)
    logger.info(LogCategory.AI, '[CLI] Session stopped', { sessionId })
    return true
  }
  return false
}

export function isCliSessionRunning(sessionId: string): boolean {
  return activeCliSessions.has(sessionId)
}

export function stopAllCliSessions(): void {
  for (const [sessionId, child] of activeCliSessions) {
    child.kill('SIGTERM')
    logger.info(LogCategory.AI, '[CLI] Stopping session on shutdown', { sessionId })
  }
  activeCliSessions.clear()
}

// =============================================================================
// One-Shot CLI Call (for simple prompts like preview URL, Jira ticket, etc.)
// =============================================================================

/**
 * Run a one-shot Claude CLI command and return the text response.
 * No streaming, no tool use — just a simple prompt/response.
 */
export async function cliOneShot(
  prompt: string,
  systemPrompt?: string,
  model?: string
): Promise<string> {
  const modelToUse = model || DEFAULT_MODEL
  const claudePath = getClaudeBinaryPath()

  // Write system prompt to temp file if provided
  const sysPromptFile = systemPrompt ? writeTempFile(systemPrompt, 'sys') : null

  const shellCmd = buildShellCommand(claudePath, 'text', modelToUse, sysPromptFile)

  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const child = spawn('/bin/sh', ['-c', shellCmd], {
      env: getSpawnEnv(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Pipe prompt through stdin
    child.stdin?.write(prompt)
    child.stdin?.end()

    child.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    child.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (sysPromptFile) cleanupTempFile(sysPromptFile)

      if (code === 0 || code === null) {
        resolve(stdout.trim())
      } else {
        reject(new Error(stderr.trim() || `Claude CLI exited with code ${code}`))
      }
    })

    child.on('error', (err) => {
      if (sysPromptFile) cleanupTempFile(sysPromptFile)
      reject(new Error(`Failed to start Claude CLI: ${err.message}`))
    })
  })
}

// =============================================================================
// Streaming CLI Call (for streaming chat and analysis features)
// =============================================================================

export type CliStreamCallback = (chunk: {
  type: 'thinking' | 'text' | 'done' | 'error'
  content?: string
  thinking?: string
  error?: string
}) => void

/**
 * Run a Claude CLI command with streaming JSON output.
 * Calls onChunk for each event.
 */
export async function sendCliMessageStreaming(
  prompt: string,
  onChunk: CliStreamCallback,
  model?: string,
  systemPrompt?: string
): Promise<void> {
  const modelToUse = model || DEFAULT_MODEL
  const claudePath = getClaudeBinaryPath()

  // Write system prompt to temp file if provided
  const sysPromptFile = systemPrompt ? writeTempFile(systemPrompt, 'sys') : null

  const shellCmd = buildShellCommand(claudePath, 'stream-json', modelToUse, sysPromptFile, [
    '--include-partial-messages'
  ])

  return new Promise<void>((resolve) => {
    let lineBuffer = ''
    let seenStreamDeltas = false

    const child = spawn('/bin/sh', ['-c', shellCmd], {
      env: getSpawnEnv(),
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Pipe prompt through stdin
    child.stdin?.write(prompt)
    child.stdin?.end()

    child.stdout?.on('data', (data: Buffer) => {
      lineBuffer += data.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() || ''

      for (const line of lines) {
        if (line.includes('"stream_event"')) seenStreamDeltas = true

        for (const event of parseStreamJsonLine(line)) {
          // Skip duplicate assistant messages (already streamed via deltas)
          if (
            seenStreamDeltas &&
            line.includes('"assistant"') &&
            !line.includes('"stream_event"')
          ) {
            continue
          }

          if (event.type === 'assistant' && event.message?.content) {
            onChunk({ type: 'text', content: event.message.content })
          } else if (event.type === 'thinking' && event.thinking) {
            onChunk({ type: 'thinking', thinking: event.thinking })
          } else if (event.type === 'error') {
            onChunk({ type: 'error', error: event.error })
          }
        }
      }
    })

    let stderrBuffer = ''
    child.stderr?.on('data', (data: Buffer) => {
      stderrBuffer += data.toString()
    })

    child.on('close', (code) => {
      if (sysPromptFile) cleanupTempFile(sysPromptFile)

      // Process remaining buffer
      if (lineBuffer.trim()) {
        for (const event of parseStreamJsonLine(lineBuffer)) {
          if (event.type === 'assistant' && event.message?.content) {
            onChunk({ type: 'text', content: event.message.content })
          }
        }
      }

      if (code === 0 || code === null) {
        onChunk({ type: 'done' })
      } else {
        onChunk({ type: 'error', error: stderrBuffer.trim() || `CLI exited with code ${code}` })
      }
      resolve()
    })

    child.on('error', (err) => {
      if (sysPromptFile) cleanupTempFile(sysPromptFile)
      onChunk({ type: 'error', error: `Failed to start Claude CLI: ${err.message}` })
      resolve()
    })
  })
}
