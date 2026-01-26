/**
 * Main Logger Tests
 *
 * Tests for the main process logging utility
 */

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
import { LogCategory, mainLogger } from './main'

describe('Main Logger', () => {
  beforeEach(() => {
    mainLogger.clearLogs()
  })

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      mainLogger.debug(LogCategory.APP, 'Debug message')
      const logs = mainLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('debug')
      expect(logs[0].message).toBe('Debug message')
    })

    it('should log info messages', () => {
      mainLogger.info(LogCategory.APP, 'Info message')
      const logs = mainLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
      expect(logs[0].message).toBe('Info message')
    })

    it('should log warning messages', () => {
      mainLogger.warn(LogCategory.APP, 'Warning message')
      const logs = mainLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
      expect(logs[0].message).toBe('Warning message')
    })

    it('should log error messages', () => {
      mainLogger.error(LogCategory.APP, 'Error message')
      const logs = mainLogger.getLogs()
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('error')
      expect(logs[0].message).toBe('Error message')
    })
  })

  describe('Log Categories', () => {
    it('should log with APP category', () => {
      mainLogger.info(LogCategory.APP, 'App message')
      const logs = mainLogger.getLogs()
      expect(logs[0].category).toBe('App')
    })

    it('should log with API category', () => {
      mainLogger.info(LogCategory.API, 'API message')
      const logs = mainLogger.getLogs()
      expect(logs[0].category).toBe('API')
    })

    it('should log with GraphQL category', () => {
      mainLogger.info(LogCategory.GRAPHQL, 'GraphQL message')
      const logs = mainLogger.getLogs()
      expect(logs[0].category).toBe('GraphQL')
    })

    it('should log with Auth category', () => {
      mainLogger.info(LogCategory.AUTH, 'Auth message')
      const logs = mainLogger.getLogs()
      expect(logs[0].category).toBe('Auth')
    })

    it('should log with RateLimit category', () => {
      mainLogger.info(LogCategory.RATE_LIMIT, 'Rate limit message')
      const logs = mainLogger.getLogs()
      expect(logs[0].category).toBe('RateLimit')
    })

    it('should log with Store category', () => {
      mainLogger.info(LogCategory.STORE, 'Store message')
      const logs = mainLogger.getLogs()
      expect(logs[0].category).toBe('Store')
    })
  })

  describe('Log Details', () => {
    it('should include details object', () => {
      mainLogger.info(LogCategory.APP, 'Message with details', { foo: 'bar', count: 42 })
      const logs = mainLogger.getLogs()
      expect(logs[0].details).toEqual({ foo: 'bar', count: 42 })
    })

    it('should handle undefined details', () => {
      mainLogger.info(LogCategory.APP, 'Message without details')
      const logs = mainLogger.getLogs()
      expect(logs[0].details).toBeUndefined()
    })
  })

  describe('Log Management', () => {
    it('should get all logs', () => {
      mainLogger.info(LogCategory.APP, 'Message 1')
      mainLogger.info(LogCategory.APP, 'Message 2')
      mainLogger.info(LogCategory.APP, 'Message 3')

      const logs = mainLogger.getLogs()
      expect(logs).toHaveLength(3)
    })

    it('should clear logs', () => {
      mainLogger.info(LogCategory.APP, 'Message 1')
      mainLogger.info(LogCategory.APP, 'Message 2')

      mainLogger.clearLogs()

      const logs = mainLogger.getLogs()
      expect(logs).toHaveLength(0)
    })

    it('should export logs as JSON', () => {
      mainLogger.info(LogCategory.APP, 'Test message')

      const exported = mainLogger.exportLogs()
      const parsed = JSON.parse(exported)

      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].message).toBe('Test message')
    })

    it('should provide log summary', () => {
      mainLogger.info(LogCategory.APP, 'Info 1')
      mainLogger.info(LogCategory.API, 'Info 2')
      mainLogger.warn(LogCategory.APP, 'Warning')
      mainLogger.error(LogCategory.APP, 'Error')

      const summary = mainLogger.getLogsSummary()

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
      mainLogger.info(LogCategory.APP, 'Test message')
      const log = mainLogger.getLogs()[0]

      expect(log).toHaveProperty('id')
      expect(log).toHaveProperty('timestamp')
      expect(log).toHaveProperty('level')
      expect(log).toHaveProperty('category')
      expect(log).toHaveProperty('message')
    })

    it('should generate unique ids', () => {
      mainLogger.info(LogCategory.APP, 'Message 1')
      mainLogger.info(LogCategory.APP, 'Message 2')

      const logs = mainLogger.getLogs()
      expect(logs[0].id).not.toBe(logs[1].id)
    })

    it('should include valid ISO timestamp', () => {
      mainLogger.info(LogCategory.APP, 'Test message')
      const log = mainLogger.getLogs()[0]

      const date = new Date(log.timestamp)
      expect(date.toString()).not.toBe('Invalid Date')
    })
  })

  describe('Log Limits', () => {
    it('should limit stored logs to prevent memory issues', () => {
      // Add more logs than the limit
      for (let i = 0; i < 1500; i++) {
        mainLogger.info(LogCategory.APP, `Message ${i}`)
      }

      const logs = mainLogger.getLogs()
      // Should be capped at 1000 (the default limit)
      expect(logs.length).toBeLessThanOrEqual(1000)
    })
  })
})
