/**
 * Claude CLI Usage Stats
 *
 * Reads the Claude Code CLI's local stats-cache.json file
 * (~/.claude/stats-cache.json) to get usage activity data.
 * No subprocess spawning needed — just reads a JSON file.
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { LogCategory, mainLogger as logger } from '@logger/main'

// =============================================================================
// Types
// =============================================================================

export interface CliUsageStats {
  /** Today's activity */
  today: {
    messages: number
    sessions: number
    toolCalls: number
  }
  /** Token usage by model (all time) */
  modelUsage: Record<
    string,
    {
      inputTokens: number
      outputTokens: number
      cacheReadInputTokens: number
      cacheCreationInputTokens: number
    }
  >
  /** Total sessions all time */
  totalSessions: number
  /** Total messages all time */
  totalMessages: number
  /** Timestamp when this data was read */
  fetchedAt: string
}

// =============================================================================
// Stats File Reader
// =============================================================================

const STATS_CACHE_PATH = join(homedir(), '.claude', 'stats-cache.json')

/**
 * Read and parse the Claude CLI stats-cache.json file.
 */
export function fetchCliUsageStats(): CliUsageStats | null {
  try {
    const raw = readFileSync(STATS_CACHE_PATH, 'utf-8')
    const data = JSON.parse(raw)

    // Find today's entry in dailyActivity
    const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const todayEntry = data.dailyActivity?.find((d: { date: string }) => d.date === todayStr)

    // Simplify modelUsage to just token counts
    const modelUsage: CliUsageStats['modelUsage'] = {}
    if (data.modelUsage) {
      for (const [model, usage] of Object.entries(data.modelUsage)) {
        const u = usage as Record<string, number>
        modelUsage[model] = {
          inputTokens: u.inputTokens ?? 0,
          outputTokens: u.outputTokens ?? 0,
          cacheReadInputTokens: u.cacheReadInputTokens ?? 0,
          cacheCreationInputTokens: u.cacheCreationInputTokens ?? 0
        }
      }
    }

    const result: CliUsageStats = {
      today: {
        messages: todayEntry?.messageCount ?? 0,
        sessions: todayEntry?.sessionCount ?? 0,
        toolCalls: todayEntry?.toolCallCount ?? 0
      },
      modelUsage,
      totalSessions: data.totalSessions ?? 0,
      totalMessages: data.totalMessages ?? 0,
      fetchedAt: new Date().toISOString()
    }

    logger.debug(LogCategory.AI, 'Read CLI stats-cache.json', {
      todayMessages: result.today.messages,
      totalSessions: result.totalSessions
    })

    return result
  } catch (err) {
    logger.warn(LogCategory.AI, 'Could not read CLI stats-cache.json', {
      error: err instanceof Error ? err.message : String(err),
      path: STATS_CACHE_PATH
    })
    return null
  }
}
