import { describe, expect, it } from 'vitest'
import {
  applyStreamEvent,
  type ClaudeStreamEvent,
  createStreamAccumulator,
  parseSSEChunk,
  parseSSELine
} from './claude-streaming'

describe('parseSSELine', () => {
  it('returns null for non-SSE lines', () => {
    expect(parseSSELine('')).toBeNull()
    expect(parseSSELine('event: message_start')).toBeNull()
    expect(parseSSELine('random text')).toBeNull()
  })

  it('parses [DONE] signal', () => {
    const result = parseSSELine('data: [DONE]')
    expect(result).toEqual({ type: 'message_stop' })
  })

  it('parses message_start event', () => {
    const line = 'data: {"type":"message_start","message":{"id":"msg_123"}}'
    const result = parseSSELine(line)
    expect(result).toEqual({
      type: 'message_start',
      messageId: 'msg_123'
    })
  })

  it('parses text_delta event', () => {
    const line = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}'
    const result = parseSSELine(line)
    expect(result).toEqual({
      type: 'content_block_delta',
      textDelta: 'Hello'
    })
  })

  it('parses thinking_delta event', () => {
    const line =
      'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"Let me think..."}}'
    const result = parseSSELine(line)
    expect(result).toEqual({
      type: 'content_block_delta',
      thinkingDelta: 'Let me think...'
    })
  })

  it('handles unknown event types', () => {
    const line = 'data: {"type":"content_block_start"}'
    const result = parseSSELine(line)
    expect(result).toEqual({ type: 'unknown' })
  })

  it('handles invalid JSON gracefully', () => {
    expect(parseSSELine('data: {invalid json')).toBeNull()
    expect(parseSSELine('data: ')).toBeNull()
  })

  it('handles empty text delta', () => {
    const line = 'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":""}}'
    // Empty text is falsy, so should return unknown
    const result = parseSSELine(line)
    expect(result).toEqual({ type: 'unknown' })
  })
})

describe('parseSSEChunk', () => {
  it('parses multiple lines', () => {
    const chunk = [
      'data: {"type":"message_start","message":{"id":"msg_abc"}}',
      '',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"!"}}',
      ''
    ].join('\n')

    const events = parseSSEChunk(chunk)
    expect(events).toHaveLength(3)
    expect(events[0]).toEqual({ type: 'message_start', messageId: 'msg_abc' })
    expect(events[1]).toEqual({ type: 'content_block_delta', textDelta: 'Hi' })
    expect(events[2]).toEqual({ type: 'content_block_delta', textDelta: '!' })
  })

  it('filters out unknown and null events', () => {
    const chunk = [
      'data: {"type":"message_start","message":{"id":"x"}}',
      'event: ping',
      'data: {"type":"content_block_start"}',
      'data: {invalid',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"ok"}}'
    ].join('\n')

    const events = parseSSEChunk(chunk)
    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('message_start')
    expect(events[1].textDelta).toBe('ok')
  })

  it('handles empty chunk', () => {
    expect(parseSSEChunk('')).toEqual([])
  })
})

describe('createStreamAccumulator', () => {
  it('creates accumulator with empty content', () => {
    const acc = createStreamAccumulator()
    expect(acc.content).toBe('')
    expect(acc.thinking).toBe('')
    expect(acc.messageId).toBeTruthy()
  })
})

describe('applyStreamEvent', () => {
  it('updates messageId on message_start', () => {
    const acc = createStreamAccumulator()
    const event: ClaudeStreamEvent = { type: 'message_start', messageId: 'new_id' }
    const result = applyStreamEvent(acc, event)

    expect(result.messageId).toBe('new_id')
    expect(result.content).toBe('')
    expect(result.thinking).toBe('')
  })

  it('accumulates text deltas', () => {
    let acc = createStreamAccumulator()

    acc = applyStreamEvent(acc, { type: 'content_block_delta', textDelta: 'Hello' })
    expect(acc.content).toBe('Hello')

    acc = applyStreamEvent(acc, { type: 'content_block_delta', textDelta: ' world' })
    expect(acc.content).toBe('Hello world')
  })

  it('accumulates thinking deltas', () => {
    let acc = createStreamAccumulator()

    acc = applyStreamEvent(acc, { type: 'content_block_delta', thinkingDelta: 'Step 1' })
    expect(acc.thinking).toBe('Step 1')

    acc = applyStreamEvent(acc, { type: 'content_block_delta', thinkingDelta: ', Step 2' })
    expect(acc.thinking).toBe('Step 1, Step 2')
  })

  it('handles mixed content and thinking', () => {
    let acc = createStreamAccumulator()

    acc = applyStreamEvent(acc, { type: 'content_block_delta', thinkingDelta: 'thinking...' })
    acc = applyStreamEvent(acc, { type: 'content_block_delta', textDelta: 'response' })

    expect(acc.thinking).toBe('thinking...')
    expect(acc.content).toBe('response')
  })

  it('preserves accumulator on unknown events', () => {
    const acc = { content: 'existing', thinking: 'thoughts', messageId: 'id' }
    const result = applyStreamEvent(acc, { type: 'unknown' })

    expect(result).toEqual(acc)
  })

  it('is immutable - does not modify original', () => {
    const original = createStreamAccumulator()
    const originalId = original.messageId

    applyStreamEvent(original, { type: 'content_block_delta', textDelta: 'text' })

    expect(original.content).toBe('')
    expect(original.messageId).toBe(originalId)
  })
})
