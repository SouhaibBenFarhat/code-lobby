/**
 * Claude Code Stream JSON Parser
 *
 * Parses the stream-json output format from Claude Code CLI
 * and converts it to typed events for UI consumption.
 */

import type {
  FormattedActivity,
  StreamEvent,
  StreamEventAssistant,
  StreamEventError,
  StreamEventResult,
  StreamEventSystem,
  StreamEventThinking,
  StreamEventToolResult,
  StreamEventToolUse
} from './types'

// Re-export for convenience
export { TOOL_DISPLAY_NAMES } from './types'

// =============================================================================
// Event Type Guards
// =============================================================================

export function isAssistantEvent(event: StreamEvent): event is StreamEventAssistant {
  return event.type === 'assistant'
}

export function isToolUseEvent(event: StreamEvent): event is StreamEventToolUse {
  return event.type === 'tool_use'
}

export function isToolResultEvent(event: StreamEvent): event is StreamEventToolResult {
  return event.type === 'tool_result'
}

export function isThinkingEvent(event: StreamEvent): event is StreamEventThinking {
  return event.type === 'thinking'
}

export function isResultEvent(event: StreamEvent): event is StreamEventResult {
  return event.type === 'result'
}

export function isErrorEvent(event: StreamEvent): event is StreamEventError {
  return event.type === 'error'
}

export function isSystemEvent(event: StreamEvent): event is StreamEventSystem {
  return event.type === 'system'
}

// =============================================================================
// Parsing Functions
// =============================================================================

/**
 * Parse a raw JSON line from Claude Code stdout
 */
export function parseStreamLine(line: string): StreamEvent | null {
  if (!line.trim()) return null

  try {
    const parsed = JSON.parse(line)

    // Validate that it has a type field
    if (!parsed.type || typeof parsed.type !== 'string') {
      return null
    }

    return parsed as StreamEvent
  } catch {
    // Not valid JSON
    return null
  }
}

/**
 * Extract text content from an assistant event
 */
export function extractTextContent(event: StreamEventAssistant): string {
  return event.message?.content || ''
}

/**
 * Extract tool name and input from a tool_use event
 */
export function extractToolInfo(event: StreamEventToolUse): {
  toolName: string
  input: string
} {
  const toolName = event.tool_name || 'Unknown'
  let input = ''

  if (event.input) {
    // Format the input based on tool type
    if (event.input.path) {
      input = String(event.input.path)
    } else if (event.input.pattern) {
      input = String(event.input.pattern)
    } else if (event.input.command) {
      input = String(event.input.command)
    } else if (event.input.query) {
      input = String(event.input.query)
    } else if (event.input.url) {
      input = String(event.input.url)
    } else {
      // Fallback: stringify first few chars
      input = JSON.stringify(event.input).slice(0, 100)
    }
  }

  return { toolName, input }
}

// =============================================================================
// Display Formatting
// =============================================================================

/**
 * Format tool activity for UI display
 */
export function formatToolActivity(toolName: string, input: string): FormattedActivity {
  const displayNames: Record<string, string> = {
    Read: 'Reading file',
    Write: 'Writing file',
    Edit: 'Editing file',
    Glob: 'Finding files',
    Grep: 'Searching code',
    LS: 'Listing directory',
    Bash: 'Running command',
    WebSearch: 'Searching web',
    WebFetch: 'Fetching URL'
  }

  const icons: Record<string, FormattedActivity['icon']> = {
    Read: 'file',
    Write: 'file',
    Edit: 'file',
    Glob: 'folder',
    Grep: 'search',
    LS: 'folder',
    Bash: 'terminal',
    WebSearch: 'globe',
    WebFetch: 'globe'
  }

  return {
    icon: icons[toolName] || 'loading',
    label: displayNames[toolName] || toolName,
    detail: truncateInput(input, 80)
  }
}

/**
 * Truncate input string for display
 */
function truncateInput(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input
  return `${input.slice(0, maxLength - 3)}...`
}

/**
 * Format tool result for display (truncate long outputs)
 */
export function formatToolResult(output: string, maxLength = 500): string {
  if (output.length <= maxLength) return output

  // Show first and last portions
  const halfLength = Math.floor((maxLength - 20) / 2)
  return `${output.slice(0, halfLength)}\n... (${output.length - maxLength} chars truncated) ...\n${output.slice(-halfLength)}`
}

// =============================================================================
// Session State Updates
// =============================================================================

/**
 * Determine session status from an event
 */
export function getStatusFromEvent(
  event: StreamEvent
): 'streaming' | 'thinking' | 'tool_use' | 'done' | 'error' {
  switch (event.type) {
    case 'assistant':
      return 'streaming'
    case 'thinking':
      return 'thinking'
    case 'tool_use':
      return 'tool_use'
    case 'result':
      return 'done'
    case 'error':
      return 'error'
    default:
      return 'streaming'
  }
}

/**
 * Check if this event represents the end of streaming
 */
export function isTerminalEvent(event: StreamEvent): boolean {
  return event.type === 'result' || event.type === 'error'
}
