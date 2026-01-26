/**
 * Utility Functions Tests
 */

import { describe, expect, it } from 'vitest'
import { cn, formatRelativeTime, truncate } from './index'

describe('Utils', () => {
  describe('cn (classnames merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base', isActive && 'active')
      expect(result).toBe('base active')
    })

    it('should filter out falsy values', () => {
      const result = cn('base', false, null, undefined, 'end')
      expect(result).toBe('base end')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      // tailwind-merge should keep the last px value
      expect(result).toBe('py-1 px-4')
    })

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'])
      expect(result).toBe('class1 class2')
    })

    it('should handle objects', () => {
      const result = cn({ active: true, disabled: false })
      expect(result).toBe('active')
    })
  })

  describe('formatRelativeTime', () => {
    it('should format seconds ago', () => {
      const date = new Date(Date.now() - 30 * 1000).toISOString()
      const result = formatRelativeTime(date)
      expect(result).toMatch(/just now|seconds?|30s/i)
    })

    it('should format minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const result = formatRelativeTime(date)
      expect(result).toMatch(/5\s*m|5\s*min/i)
    })

    it('should format hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      const result = formatRelativeTime(date)
      expect(result).toMatch(/3\s*h|3\s*hour/i)
    })

    it('should format days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      const result = formatRelativeTime(date)
      expect(result).toMatch(/2\s*d|2\s*day/i)
    })

    it('should format weeks ago', () => {
      const date = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const result = formatRelativeTime(date)
      expect(result).toMatch(/2\s*w|2\s*week|14\s*d/i)
    })

    it('should handle Date objects', () => {
      const date = new Date(Date.now() - 60 * 1000)
      const result = formatRelativeTime(date.toISOString())
      expect(result).toMatch(/1\s*m|1\s*min|minute/i)
    })

    it('should handle future dates', () => {
      const date = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const result = formatRelativeTime(date)
      // Should still return something meaningful
      expect(result).toBeTruthy()
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const longString = 'This is a very long string that should be truncated'
      const result = truncate(longString, 20)
      expect(result.length).toBeLessThanOrEqual(23) // 20 + '...'
      expect(result).toContain('...')
    })

    it('should not truncate short strings', () => {
      const shortString = 'Short'
      const result = truncate(shortString, 20)
      expect(result).toBe('Short')
      expect(result).not.toContain('...')
    })

    it('should handle exact length', () => {
      const exactString = 'Exactly twenty char'
      const result = truncate(exactString, 19)
      expect(result.length).toBeLessThanOrEqual(22)
    })

    it('should handle empty string', () => {
      const result = truncate('', 10)
      expect(result).toBe('')
    })

    it('should handle very small max length', () => {
      const result = truncate('Hello World', 3)
      // maxLength 3 means slice(0, 0) + '...' = '...'
      expect(result).toBe('...')
    })

    it('should use default max length when not provided', () => {
      const longString = 'A'.repeat(200)
      const result = truncate(longString)
      expect(result.length).toBeLessThan(200)
    })
  })
})
