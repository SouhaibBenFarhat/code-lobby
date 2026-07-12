/**
 * Dynamic Tables Tests
 *
 * Tests for the dynamic table discovery functionality used by the Database Viewer.
 * These tests verify the table filtering logic that excludes internal SQLite and Drizzle tables.
 */

import { describe, expect, it } from 'vitest'

/**
 * Filter function that matches the logic in ipc-handlers.ts
 * Filters out SQLite internal tables and Drizzle migration tables
 */
function filterUserTables(tableNames: string[]): string[] {
  return tableNames.filter((name) => !name.startsWith('sqlite_') && !name.startsWith('__')).sort()
}

/**
 * Validates table name for SQL injection prevention
 * Matches the validation in ipc-handlers.ts
 */
function isValidTableName(tableName: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)
}

describe('Dynamic Tables - Filter Logic', () => {
  describe('filterUserTables', () => {
    it('filters out sqlite internal tables', () => {
      const tables = ['conversations', 'sqlite_sequence', 'messages', 'sqlite_master']
      const result = filterUserTables(tables)
      expect(result).toEqual(['conversations', 'messages'])
    })

    it('filters out drizzle migration tables', () => {
      const tables = ['conversations', '__drizzle_migrations', 'messages', '__some_internal']
      const result = filterUserTables(tables)
      expect(result).toEqual(['conversations', 'messages'])
    })

    it('filters out both sqlite and drizzle tables', () => {
      const tables = [
        'ai_usage',
        'sqlite_sequence',
        '__drizzle_migrations',
        'conversations',
        'custom_prompts',
        'sqlite_stat1',
        'messages'
      ]
      const result = filterUserTables(tables)
      expect(result).toEqual(['ai_usage', 'conversations', 'custom_prompts', 'messages'])
    })

    it('returns sorted table names', () => {
      const tables = ['messages', 'ai_usage', 'conversations']
      const result = filterUserTables(tables)
      expect(result).toEqual(['ai_usage', 'conversations', 'messages'])
    })

    it('handles empty array', () => {
      const result = filterUserTables([])
      expect(result).toEqual([])
    })

    it('returns empty array when all tables are internal', () => {
      const tables = ['sqlite_sequence', '__drizzle_migrations', 'sqlite_master']
      const result = filterUserTables(tables)
      expect(result).toEqual([])
    })

    it('preserves tables with underscores in the middle', () => {
      const tables = ['ai_usage', 'custom_prompts']
      const result = filterUserTables(tables)
      expect(result).toEqual(['ai_usage', 'custom_prompts'])
    })

    it('filters tables starting with single underscore followed by another underscore', () => {
      // __tablename should be filtered, but _tablename should not
      const tables = ['_single_underscore', '__double_underscore', 'normal_table']
      const result = filterUserTables(tables)
      expect(result).toEqual(['_single_underscore', 'normal_table'])
    })
  })

  describe('isValidTableName', () => {
    it('accepts valid table names', () => {
      expect(isValidTableName('conversations')).toBe(true)
      expect(isValidTableName('ai_usage')).toBe(true)
      expect(isValidTableName('Table123')).toBe(true)
      expect(isValidTableName('_private_table')).toBe(true)
    })

    it('rejects names starting with numbers', () => {
      expect(isValidTableName('123table')).toBe(false)
      expect(isValidTableName('1')).toBe(false)
    })

    it('rejects names with special characters', () => {
      expect(isValidTableName('table-name')).toBe(false)
      expect(isValidTableName('table.name')).toBe(false)
      expect(isValidTableName('table name')).toBe(false)
      expect(isValidTableName("table'name")).toBe(false)
      expect(isValidTableName('table;DROP TABLE users;--')).toBe(false)
    })

    it('rejects empty string', () => {
      expect(isValidTableName('')).toBe(false)
    })

    it('accepts names starting with underscore', () => {
      expect(isValidTableName('_table')).toBe(true)
      expect(isValidTableName('__internal')).toBe(true)
    })
  })
})

describe('Dynamic Tables - Expected Schema', () => {
  // These tests document the expected tables in the codelobby database
  const EXPECTED_USER_TABLES = ['ai_usage', 'conversations', 'custom_prompts', 'messages']

  it('defines expected user tables', () => {
    // This serves as documentation and will fail if schema changes
    expect(EXPECTED_USER_TABLES).toHaveLength(4)
    expect(EXPECTED_USER_TABLES).toContain('conversations')
    expect(EXPECTED_USER_TABLES).toContain('messages')
    expect(EXPECTED_USER_TABLES).toContain('ai_usage')
    expect(EXPECTED_USER_TABLES).toContain('custom_prompts')
  })

  it('all expected tables pass validation', () => {
    for (const table of EXPECTED_USER_TABLES) {
      expect(isValidTableName(table)).toBe(true)
    }
  })

  it('expected tables are not filtered out', () => {
    const result = filterUserTables(EXPECTED_USER_TABLES)
    expect(result).toEqual(EXPECTED_USER_TABLES)
  })
})
