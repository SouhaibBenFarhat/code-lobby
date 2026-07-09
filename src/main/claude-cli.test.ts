/**
 * Claude CLI Stream JSON Parser Tests
 *
 * Tests for parseStreamJsonLine() which normalizes the Claude CLI's
 * stream-json output into IPC events matching what the SDK relay sends.
 *
 * KEY INSIGHT: The CLI's stream-json format embeds ALL content block types
 * (text, tool_use, thinking) inside the "assistant" event's message.content
 * array. The SDK relay sends each block as a separate IPC event. The parser
 * must split the content array into individual events to match.
 */

import { describe, expect, it, vi } from 'vitest'

// Mock the logger before importing
vi.mock('@logger/main', () => ({
  LogCategory: { AI: 'AI' },
  mainLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}))

// Mock dependencies that claude-cli.ts imports
vi.mock('./system-prompt', () => ({
  buildSystemPrompt: vi.fn(() => 'mock system prompt')
}))

vi.mock('./claude-cli-path', () => ({
  getClaudeBinaryPath: vi.fn(() => '/usr/local/bin/claude'),
  getEnhancedPath: vi.fn(() => '/usr/local/bin')
}))

import { parseStreamJsonLine } from './claude-cli'

describe('parseStreamJsonLine', () => {
  // =========================================================================
  // Empty / Invalid Input
  // =========================================================================

  describe('empty and invalid input', () => {
    it('returns empty array for empty string', () => {
      expect(parseStreamJsonLine('')).toEqual([])
    })

    it('returns empty array for whitespace-only string', () => {
      expect(parseStreamJsonLine('   ')).toEqual([])
    })

    it('returns empty array for invalid JSON', () => {
      expect(parseStreamJsonLine('not json')).toEqual([])
    })

    it('returns empty array for partial JSON', () => {
      expect(parseStreamJsonLine('{"type": "assi')).toEqual([])
    })

    it('returns empty array for unknown event type', () => {
      expect(parseStreamJsonLine('{"type": "unknown_event"}')).toEqual([])
    })
  })

  // =========================================================================
  // Assistant Events — Text Content
  // =========================================================================

  describe('assistant events with text content', () => {
    it('handles string content directly', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: { content: 'Hello world' }
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'assistant', message: { content: 'Hello world' } }
      ])
    })

    it('handles content as array of text blocks', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'text', text: 'world' }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toEqual([
        { type: 'assistant', message: { content: 'Hello ' } },
        { type: 'assistant', message: { content: 'world' } }
      ])
    })

    it('returns empty array for empty string content', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: { content: '' }
      })
      expect(parseStreamJsonLine(line)).toEqual([])
    })

    it('returns empty array for empty content array', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: { content: [] }
      })
      expect(parseStreamJsonLine(line)).toEqual([])
    })

    it('skips text blocks with empty text', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: '' },
            { type: 'text', text: 'visible' }
          ]
        }
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'assistant', message: { content: 'visible' } }
      ])
    })
  })

  // =========================================================================
  // Assistant Events — Tool Use in Content Array (CRITICAL)
  // =========================================================================

  describe('assistant events with tool_use content blocks', () => {
    it('extracts tool_use blocks as separate tool_use events', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', id: 'toolu_01', name: 'Read', input: { file_path: 'src/main.ts' } }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toEqual([
        { type: 'tool_use', tool_name: 'Read', input: { file_path: 'src/main.ts' } }
      ])
    })

    it('splits mixed text and tool_use blocks into separate events', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Let me read that file.' },
            { type: 'tool_use', id: 'toolu_01', name: 'Read', input: { file_path: 'src/main.ts' } }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toHaveLength(2)
      expect(events[0]).toEqual({
        type: 'assistant',
        message: { content: 'Let me read that file.' }
      })
      expect(events[1]).toEqual({
        type: 'tool_use',
        tool_name: 'Read',
        input: { file_path: 'src/main.ts' }
      })
    })

    it('handles multiple tool_use blocks in one message', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: "I'll check both files." },
            { type: 'tool_use', id: 'toolu_01', name: 'Read', input: { file_path: 'a.ts' } },
            { type: 'tool_use', id: 'toolu_02', name: 'Grep', input: { pattern: 'TODO' } }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toHaveLength(3)
      expect(events[0].type).toBe('assistant')
      expect(events[1]).toEqual({
        type: 'tool_use',
        tool_name: 'Read',
        input: { file_path: 'a.ts' }
      })
      expect(events[2]).toEqual({
        type: 'tool_use',
        tool_name: 'Grep',
        input: { pattern: 'TODO' }
      })
    })

    it('defaults tool_name to "unknown" when name is missing', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'toolu_01', input: { command: 'ls' } }]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events[0].tool_name).toBe('unknown')
    })

    it('defaults input to empty object when missing', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'tool_use', id: 'toolu_01', name: 'Bash' }]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events[0].input).toEqual({})
    })
  })

  // =========================================================================
  // Assistant Events — Thinking in Content Array
  // =========================================================================

  describe('assistant events with thinking content blocks', () => {
    it('extracts thinking blocks as separate thinking events', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [{ type: 'thinking', thinking: 'Let me analyze this...' }]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toEqual([{ type: 'thinking', thinking: 'Let me analyze this...' }])
    })

    it('splits thinking + text + tool_use into separate events', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: 'I need to read the file first.' },
            { type: 'text', text: 'Let me check that file.' },
            { type: 'tool_use', id: 'toolu_01', name: 'Read', input: { file_path: 'index.ts' } }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toHaveLength(3)
      expect(events[0]).toEqual({ type: 'thinking', thinking: 'I need to read the file first.' })
      expect(events[1]).toEqual({
        type: 'assistant',
        message: { content: 'Let me check that file.' }
      })
      expect(events[2]).toEqual({
        type: 'tool_use',
        tool_name: 'Read',
        input: { file_path: 'index.ts' }
      })
    })

    it('skips thinking blocks with empty thinking text', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: '' },
            { type: 'text', text: 'Hello' }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('assistant')
    })
  })

  // =========================================================================
  // Top-Level Tool Use Events (fallback path)
  // =========================================================================

  describe('top-level tool_use events', () => {
    it('handles event.tool.name format', () => {
      const line = JSON.stringify({
        type: 'tool_use',
        tool: { name: 'Bash', input: { command: 'ls -la' } }
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'tool_use', tool_name: 'Bash', input: { command: 'ls -la' } }
      ])
    })

    it('handles event.tool_name format', () => {
      const line = JSON.stringify({
        type: 'tool_use',
        tool_name: 'Grep',
        input: { pattern: 'TODO' }
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'tool_use', tool_name: 'Grep', input: { pattern: 'TODO' } }
      ])
    })

    it('falls back to "unknown" when no name provided', () => {
      const line = JSON.stringify({ type: 'tool_use', input: {} })
      expect(parseStreamJsonLine(line)[0].tool_name).toBe('unknown')
    })
  })

  // =========================================================================
  // Tool Result Events
  // =========================================================================

  describe('tool_result events', () => {
    it('handles string content', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        content: 'file contents here'
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'tool_result', content: 'file contents here' }
      ])
    })

    it('handles content as array of text blocks', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        content: [
          { type: 'text', text: 'line 1\n' },
          { type: 'text', text: 'line 2\n' }
        ]
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'tool_result', content: 'line 1\nline 2\n' }
      ])
    })

    it('JSON-stringifies non-text content blocks in arrays', () => {
      const imageBlock = { type: 'image', source: { data: 'base64...' } }
      const line = JSON.stringify({
        type: 'tool_result',
        content: [imageBlock]
      })
      const events = parseStreamJsonLine(line)
      expect(events[0].content).toBe(JSON.stringify(imageBlock))
    })

    it('JSON-stringifies object content', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        content: { key: 'value' }
      })
      expect(parseStreamJsonLine(line)[0].content).toBe('{"key":"value"}')
    })
  })

  // =========================================================================
  // Thinking Events (top-level)
  // =========================================================================

  describe('top-level thinking events', () => {
    it('handles thinking event', () => {
      const line = JSON.stringify({
        type: 'thinking',
        thinking: 'Analyzing the problem...'
      })
      expect(parseStreamJsonLine(line)).toEqual([
        { type: 'thinking', thinking: 'Analyzing the problem...' }
      ])
    })

    it('defaults to empty string when thinking is missing', () => {
      const line = JSON.stringify({ type: 'thinking' })
      expect(parseStreamJsonLine(line)[0].thinking).toBe('')
    })
  })

  // =========================================================================
  // Result Events
  // =========================================================================

  describe('result events', () => {
    it('handles string result with cost and duration', () => {
      const line = JSON.stringify({
        type: 'result',
        result: 'Final answer here',
        cost_usd: 0.015,
        duration_ms: 5000
      })
      expect(parseStreamJsonLine(line)).toEqual([
        {
          type: 'result',
          result: 'Final answer here',
          cost_usd: 0.015,
          duration_ms: 5000
        }
      ])
    })

    it('extracts text from result content block array', () => {
      const line = JSON.stringify({
        type: 'result',
        result: [{ type: 'text', text: 'The answer is 42.' }],
        cost_usd: 0.01
      })
      const events = parseStreamJsonLine(line)
      expect(events[0].result).toBe('The answer is 42.')
    })

    it('returns empty string for missing result', () => {
      const line = JSON.stringify({ type: 'result' })
      expect(parseStreamJsonLine(line)[0].result).toBe('')
    })
  })

  // =========================================================================
  // Error Events
  // =========================================================================

  describe('error events', () => {
    it('handles error message', () => {
      const line = JSON.stringify({
        type: 'error',
        error: 'Rate limit exceeded'
      })
      expect(parseStreamJsonLine(line)).toEqual([{ type: 'error', error: 'Rate limit exceeded' }])
    })

    it('defaults to generic message when error is missing', () => {
      const line = JSON.stringify({ type: 'error' })
      expect(parseStreamJsonLine(line)[0].error).toBe('Unknown CLI error')
    })
  })

  // =========================================================================
  // System Events
  // =========================================================================

  describe('system events', () => {
    it('handles system init event', () => {
      const line = JSON.stringify({
        type: 'system',
        message: 'Session initialized',
        content: 'fallback'
      })
      // message takes priority over content
      expect(parseStreamJsonLine(line)[0].content).toBe('Session initialized')
    })

    it('falls back to content when message is missing', () => {
      const line = JSON.stringify({
        type: 'system',
        content: 'System info'
      })
      expect(parseStreamJsonLine(line)[0].content).toBe('System info')
    })
  })

  // =========================================================================
  // Real-World CLI Output Examples
  // =========================================================================

  describe('real-world CLI stream-json examples', () => {
    it('parses a full assistant turn with thinking + text + tool_use', () => {
      // This is the shape the CLI actually sends in stream-json mode
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          id: 'msg_01abc',
          type: 'message',
          role: 'assistant',
          content: [
            {
              type: 'thinking',
              thinking: 'The user wants me to read a file. Let me use the Read tool.'
            },
            { type: 'text', text: "I'll read that file for you." },
            {
              type: 'tool_use',
              id: 'toolu_01xyz',
              name: 'Read',
              input: { file_path: 'src/main/index.ts' }
            }
          ],
          model: 'claude-sonnet-4-20250514',
          stop_reason: 'tool_use'
        }
      })

      const events = parseStreamJsonLine(line)
      expect(events).toHaveLength(3)

      // Thinking comes first
      expect(events[0]).toEqual({
        type: 'thinking',
        thinking: 'The user wants me to read a file. Let me use the Read tool.'
      })

      // Then text
      expect(events[1]).toEqual({
        type: 'assistant',
        message: { content: "I'll read that file for you." }
      })

      // Then tool use
      expect(events[2]).toEqual({
        type: 'tool_use',
        tool_name: 'Read',
        input: { file_path: 'src/main/index.ts' }
      })
    })

    it('handles text with special characters that caused shell errors', () => {
      // These characters previously caused zsh parse errors when passed as CLI args
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'The verdict is "approve" | "request_changes" | "comment"' }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      expect(events[0]).toEqual({
        type: 'assistant',
        message: { content: 'The verdict is "approve" | "request_changes" | "comment"' }
      })
    })

    it('handles tool_result after tool execution', () => {
      const line = JSON.stringify({
        type: 'tool_result',
        content: [
          { type: 'text', text: '     1→import { spawn } from "node:child_process"\n     2→// ...' }
        ],
        is_error: false
      })
      const events = parseStreamJsonLine(line)
      expect(events[0].type).toBe('tool_result')
      expect(events[0].content).toContain('import { spawn }')
    })

    it('handles final result event', () => {
      const line = JSON.stringify({
        type: 'result',
        subtype: 'success',
        result: "I've read the file and it contains the CLI spawn logic.",
        cost_usd: 0.0234,
        duration_ms: 12500,
        session_id: 'session-abc'
      })
      const events = parseStreamJsonLine(line)
      expect(events[0]).toMatchObject({
        type: 'result',
        result: "I've read the file and it contains the CLI spawn logic.",
        cost_usd: 0.0234,
        duration_ms: 12500
      })
    })
  })

  // =========================================================================
  // Regression: [object Object] display bug
  // =========================================================================

  describe('regression: [object Object] display bug', () => {
    it('NEVER passes raw arrays as message.content (the [object Object] bug)', () => {
      // This was the original bug: message.content was an array of content blocks,
      // and the renderer tried to render it as a string → [object Object]
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Hello' },
            { type: 'text', text: ' world' }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      for (const event of events) {
        if (event.message?.content) {
          expect(typeof event.message.content).toBe('string')
        }
      }
    })

    it('NEVER returns tool_use blocks inside assistant message content', () => {
      // Tool use blocks must become separate top-level events, not stay in content
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Reading file...' },
            { type: 'tool_use', id: 'toolu_01', name: 'Read', input: { file_path: 'test.ts' } }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      const assistantEvents = events.filter((e) => e.type === 'assistant')
      const toolEvents = events.filter((e) => e.type === 'tool_use')

      expect(assistantEvents).toHaveLength(1)
      expect(assistantEvents[0].message?.content).toBe('Reading file...')

      expect(toolEvents).toHaveLength(1)
      expect(toolEvents[0].tool_name).toBe('Read')
    })

    it('NEVER returns thinking blocks inside assistant message content', () => {
      const line = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'thinking', thinking: 'Let me think...' },
            { type: 'text', text: 'Here is my answer.' }
          ]
        }
      })
      const events = parseStreamJsonLine(line)
      const thinkingEvents = events.filter((e) => e.type === 'thinking')
      const assistantEvents = events.filter((e) => e.type === 'assistant')

      expect(thinkingEvents).toHaveLength(1)
      expect(thinkingEvents[0].thinking).toBe('Let me think...')

      expect(assistantEvents).toHaveLength(1)
      expect(assistantEvents[0].message?.content).toBe('Here is my answer.')
    })
  })
})
