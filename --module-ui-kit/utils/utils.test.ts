/**
 * Utils Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cn, formatRelativeTime, groupBy, truncate } from './index'

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz')
  })

  it('should merge Tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return "just now" for times less than 60 seconds ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2024-01-15T11:59:30Z')).toBe('just now')
  })

  it('should return minutes ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2024-01-15T11:55:00Z')).toBe('5m ago')
    expect(formatRelativeTime('2024-01-15T11:30:00Z')).toBe('30m ago')
  })

  it('should return hours ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2024-01-15T10:00:00Z')).toBe('2h ago')
    expect(formatRelativeTime('2024-01-15T00:00:00Z')).toBe('12h ago')
  })

  it('should return days ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2024-01-14T12:00:00Z')).toBe('1d ago')
    expect(formatRelativeTime('2024-01-10T12:00:00Z')).toBe('5d ago')
  })

  it('should return weeks ago', () => {
    const now = new Date('2024-01-28T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2024-01-21T12:00:00Z')).toBe('1w ago')
    expect(formatRelativeTime('2024-01-07T12:00:00Z')).toBe('3w ago')
  })

  it('should return months ago', () => {
    const now = new Date('2024-06-15T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2024-05-15T12:00:00Z')).toBe('1mo ago')
    expect(formatRelativeTime('2024-01-15T12:00:00Z')).toBe('5mo ago')
  })

  it('should return years ago', () => {
    const now = new Date('2024-06-15T12:00:00Z')
    vi.setSystemTime(now)
    expect(formatRelativeTime('2023-06-15T12:00:00Z')).toBe('1y ago')
    expect(formatRelativeTime('2021-06-15T12:00:00Z')).toBe('3y ago')
  })
})

describe('groupBy', () => {
  it('should group items by key', () => {
    const items = [
      { type: 'fruit', name: 'apple' },
      { type: 'fruit', name: 'banana' },
      { type: 'vegetable', name: 'carrot' }
    ]
    const result = groupBy(items, (item) => item.type)
    expect(result).toEqual({
      fruit: [
        { type: 'fruit', name: 'apple' },
        { type: 'fruit', name: 'banana' }
      ],
      vegetable: [{ type: 'vegetable', name: 'carrot' }]
    })
  })

  it('should handle empty array', () => {
    const result = groupBy([], (item: { type: string }) => item.type)
    expect(result).toEqual({})
  })

  it('should handle array with single item', () => {
    const items = [{ type: 'fruit', name: 'apple' }]
    const result = groupBy(items, (item) => item.type)
    expect(result).toEqual({
      fruit: [{ type: 'fruit', name: 'apple' }]
    })
  })

  it('should handle different key extractors', () => {
    const items = [
      { id: 1, status: 'active' },
      { id: 2, status: 'inactive' },
      { id: 3, status: 'active' }
    ]
    const result = groupBy(items, (item) => item.status)
    expect(result.active).toHaveLength(2)
    expect(result.inactive).toHaveLength(1)
  })
})

describe('truncate', () => {
  it('should not truncate strings shorter than maxLength', () => {
    expect(truncate('hello', 10)).toBe('hello')
    expect(truncate('hello', 5)).toBe('hello')
  })

  it('should truncate strings longer than maxLength', () => {
    expect(truncate('hello world', 8)).toBe('hello...')
    expect(truncate('a very long string that needs truncation', 20)).toBe('a very long strin...')
  })

  it('should use default maxLength of 100', () => {
    const longString = 'a'.repeat(150)
    const result = truncate(longString)
    expect(result).toHaveLength(100)
    expect(result.endsWith('...')).toBe(true)
  })

  it('should handle empty strings', () => {
    expect(truncate('', 10)).toBe('')
  })

  it('should handle exact length strings', () => {
    expect(truncate('hello', 5)).toBe('hello')
  })
})
