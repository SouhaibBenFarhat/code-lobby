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
 * Helper to safely get a string value from an object property
 */
function getStringValue(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key]
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Don't convert functions or objects
  return null
}

/**
 * Extract tool name and input from a tool_use event
 * Formats the input nicely for display (like Cursor does)
 */
export function extractToolInfo(event: StreamEventToolUse): {
  toolName: string
  input: string
} {
  const toolName = event.tool_name || 'Unknown'
  let input = ''

  if (event.input && typeof event.input === 'object') {
    const inp = event.input as Record<string, unknown>

    // Shell/Bash commands
    input =
      getStringValue(inp, 'command') ||
      getStringValue(inp, 'cmd') ||
      // File operations
      getStringValue(inp, 'path') ||
      getStringValue(inp, 'file_path') ||
      getStringValue(inp, 'filePath') ||
      getStringValue(inp, 'file') ||
      // Search/grep - pattern is more specific
      getStringValue(inp, 'pattern') ||
      getStringValue(inp, 'regex') ||
      getStringValue(inp, 'search_term') ||
      getStringValue(inp, 'searchTerm') ||
      // Queries
      getStringValue(inp, 'query') ||
      getStringValue(inp, 'prompt') ||
      // URLs
      getStringValue(inp, 'url') ||
      // Task/description
      getStringValue(inp, 'description') ||
      getStringValue(inp, 'title') ||
      getStringValue(inp, 'name') ||
      // Text content (for write/edit)
      ''

    // If still empty, try to build a meaningful summary from the input object
    if (!input) {
      // Try to show key fields that are strings
      const stringFields: string[] = []
      for (const [key, value] of Object.entries(inp)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 200) {
          stringFields.push(`${key}: ${value.length > 50 ? `${value.slice(0, 50)}...` : value}`)
        }
      }
      if (stringFields.length > 0) {
        input = stringFields.slice(0, 3).join(' | ')
      } else {
        // Last resort: try to JSON stringify, filtering out non-serializable values
        try {
          const safeObj: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(inp)) {
            if (typeof value !== 'function' && typeof value !== 'symbol') {
              safeObj[key] = value
            }
          }
          const json = JSON.stringify(safeObj)
          input = json.length > 150 ? `${json.slice(0, 150)}...` : json
        } catch {
          input = `[${Object.keys(inp).join(', ')}]`
        }
      }
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
