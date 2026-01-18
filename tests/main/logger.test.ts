/**
 * Logger Tests
 *
 * Tests for the main process logging utility
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  console.log = vi.fn()
  console.warn = vi.fn()
  console.error = vi.fn()
})

// Reset console after all tests
afterAll(() => {
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

// Import logger (will be mocked)
import { LogCategory, logger } from '@main/logger'

describe('Logger', () => {
  beforeEach(() => {
    logger.clearLogs()
  })

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      logger.debug(LogCategory.APP, 'Debug message')
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('debug')
      expect(logs[0].message).toBe('Debug message')
    })

    it('should log info messages', () => {
      logger.info(LogCategory.APP, 'Info message')
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
      expect(logs[0].message).toBe('Info message')
    })

    it('should log warning messages', () => {
      logger.warn(LogCategory.APP, 'Warning message')
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
      expect(logs[0].message).toBe('Warning message')
    })

    it('should log error messages', () => {
      logger.error(LogCategory.APP, 'Error message')
      const logs = logger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('error')
      expect(logs[0].message).toBe('Error message')
    })
  })

  describe('Log Categories', () => {
    it('should log with APP category', () => {
      logger.info(LogCategory.APP, 'App message')
      const logs = logger.getLogs()
      expect(logs[0].category).toBe('App')
    })

    it('should log with API category', () => {
      logger.info(LogCategory.API, 'API message')
      const logs = logger.getLogs()
      expect(logs[0].category).toBe('API')
    })

    it('should log with GraphQL category', () => {
      logger.info(LogCategory.GRAPHQL, 'GraphQL message')
      const logs = logger.getLogs()
      expect(logs[0].category).toBe('GraphQL')
    })

    it('should log with Auth category', () => {
      logger.info(LogCategory.AUTH, 'Auth message')
      const logs = logger.getLogs()
      expect(logs[0].category).toBe('Auth')
    })

    it('should log with RateLimit category', () => {
      logger.info(LogCategory.RATE_LIMIT, 'Rate limit message')
      const logs = logger.getLogs()
      expect(logs[0].category).toBe('RateLimit')
    })
  })

  describe('Log Details', () => {
    it('should include details object', () => {
      logger.info(LogCategory.APP, 'Message with details', { foo: 'bar', count: 42 })
      const logs = logger.getLogs()
      expect(logs[0].details).toEqual({ foo: 'bar', count: 42 })
    })

    it('should handle undefined details', () => {
      logger.info(LogCategory.APP, 'Message without details')
      const logs = logger.getLogs()
      expect(logs[0].details).toBeUndefined()
    })
  })

  describe('Log Management', () => {
    it('should get all logs', () => {
      logger.info(LogCategory.APP, 'Message 1')
      logger.info(LogCategory.APP, 'Message 2')
      logger.info(LogCategory.APP, 'Message 3')

      const logs = logger.getLogs()
      expect(logs).toHaveLength(3)
    })

    it('should clear logs', () => {
      logger.info(LogCategory.APP, 'Message 1')
      logger.info(LogCategory.APP, 'Message 2')

      logger.clearLogs()

      const logs = logger.getLogs()
      expect(logs).toHaveLength(0)
    })

    it('should export logs as JSON', () => {
      logger.info(LogCategory.APP, 'Test message')

      const exported = logger.exportLogs()
      const parsed = JSON.parse(exported)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].message).toBe('Test message')
    })

    it('should provide log summary', () => {
      logger.info(LogCategory.APP, 'Info 1')
      logger.info(LogCategory.API, 'Info 2')
      logger.warn(LogCategory.APP, 'Warning')
      logger.error(LogCategory.APP, 'Error')

      const summary = logger.getLogsSummary()

      expect(summary.total).toBe(4)
      expect(summary.byLevel.info).toBe(2)
      expect(summary.byLevel.warn).toBe(1)
      expect(summary.byLevel.error).toBe(1)
      expect(summary.byCategory.App).toBe(3)
      expect(summary.byCategory.API).toBe(1)
    })
  })

  describe('Log Entry Structure', () => {
    it('should include id, timestamp, level, category, message', () => {
      logger.info(LogCategory.APP, 'Test message')
      const log = logger.getLogs()[0]

      expect(log).toHaveProperty('id')
      expect(log).toHaveProperty('timestamp')
      expect(log).toHaveProperty('level')
      expect(log).toHaveProperty('category')
      expect(log).toHaveProperty('message')
    })

    it('should generate unique ids', () => {
      logger.info(LogCategory.APP, 'Message 1')
      logger.info(LogCategory.APP, 'Message 2')

      const logs = logger.getLogs()
      expect(logs[0].id).not.toBe(logs[1].id)
    })

    it('should include valid ISO timestamp', () => {
      logger.info(LogCategory.APP, 'Test message')
      const log = logger.getLogs()[0]

      const date = new Date(log.timestamp)
      expect(date.toString()).not.toBe('Invalid Date')
    })
  })

  describe('Log Limits', () => {
    it('should limit stored logs to prevent memory issues', () => {
      // Add more logs than the limit
      for (let i = 0; i < 1500; i++) {
        logger.info(LogCategory.APP, `Message ${i}`)
      }

      const logs = logger.getLogs()
      // Should be capped at 1000 (the default limit)
      expect(logs.length).toBeLessThanOrEqual(1000)
    })
  })
})
