/**
 * Claude API streaming utilities
 * Parses Server-Sent Events (SSE) from Claude's streaming API
 */

export interface ClaudeUsage {
  inputTokens: number
  outputTokens: number
}

export interface ClaudeStreamEvent {
  type: 'message_start' | 'content_block_delta' | 'message_delta' | 'message_stop' | 'unknown'
  messageId?: string
  textDelta?: string
  thinkingDelta?: string
  usage?: ClaudeUsage
}

/**
 * Parse a single SSE line from Claude's streaming response
 * Format: "data: {...json...}" or "data: [DONE]"
 */
export function parseSSELine(line: string): ClaudeStreamEvent | null {
  if (!line.startsWith('data: ')) {
    return null
  }

  const data = line.slice(6) // Remove "data: " prefix

  if (data === '[DONE]') {
    return { type: 'message_stop' }
  }

  try {
    const event = JSON.parse(data)

    if (event.type === 'message_start') {
      return {
        type: 'message_start',
        messageId: event.message?.id
      }
    }

    if (event.type === 'content_block_delta') {
      if (event.delta?.type === 'text_delta' && event.delta.text) {
        return {
          type: 'content_block_delta',
          textDelta: event.delta.text
        }
      }
      if (event.delta?.type === 'thinking_delta' && event.delta.thinking) {
        return {
          type: 'content_block_delta',
          thinkingDelta: event.delta.thinking
        }
      }
    }

    // message_delta contains usage info at the end of the stream
    if (event.type === 'message_delta' && event.usage) {
      return {
        type: 'message_delta',
        usage: {
          inputTokens: event.usage.input_tokens || 0,
          outputTokens: event.usage.output_tokens || 0
        }
      }
    }

    return { type: 'unknown' }
  } catch {
    // Partial JSON or invalid data - ignore
    return null
  }
}

/**
 * Parse multiple SSE lines from a chunk of response text
 * Returns array of parsed events (filters out nulls and unknown types)
 */
export function parseSSEChunk(chunk: string): ClaudeStreamEvent[] {
  const lines = chunk.split('\n')
  const events: ClaudeStreamEvent[] = []

  for (const line of lines) {
    const event = parseSSELine(line)
    if (event && event.type !== 'unknown') {
      events.push(event)
    }
  }

  return events
}

/**
 * Accumulator for streaming content
 * Tracks full content, thinking, and usage as deltas arrive
 */
export interface StreamAccumulator {
  content: string
  thinking: string
  messageId: string
  usage: ClaudeUsage | null
}

export function createStreamAccumulator(): StreamAccumulator {
  return {
    content: '',
    thinking: '',
    messageId: crypto.randomUUID(),
    usage: null
  }
}

/**
 * Apply a stream event to the accumulator
 * Returns new accumulator (immutable)
 */
export function applyStreamEvent(
  accumulator: StreamAccumulator,
  event: ClaudeStreamEvent
): StreamAccumulator {
  switch (event.type) {
    case 'message_start':
      return {
        ...accumulator,
        messageId: event.messageId || accumulator.messageId
      }
    case 'content_block_delta':
      return {
        ...accumulator,
        content: accumulator.content + (event.textDelta || ''),
        thinking: accumulator.thinking + (event.thinkingDelta || '')
      }
    case 'message_delta':
      return {
        ...accumulator,
        usage: event.usage || accumulator.usage
      }
    default:
      return accumulator
  }
}
