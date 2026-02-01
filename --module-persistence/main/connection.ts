/**
 * SQLite Database Connection
 *
 * Initializes and manages the SQLite database connection using better-sqlite3 and Drizzle ORM.
 * The database is stored in the Electron app's user data directory.
 *
 * This module runs in the Electron MAIN process only.
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { LogCategory, mainLogger as logger } from '@logger/main'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import * as schema from './schema'

// =============================================================================
// Database Path
// =============================================================================

/**
 * Get the path to the SQLite database file.
 * Stored in Electron's user data directory:
 * - macOS: ~/Library/Application Support/codelobby/codelobby.db
 * - Windows: %APPDATA%/codelobby/codelobby.db
 * - Linux: ~/.config/codelobby/codelobby.db
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'codelobby.db')
}

// =============================================================================
// Database Instance
// =============================================================================

let sqliteDb: Database.Database | null = null
let db: ReturnType<typeof drizzle<typeof schema>> | null = null

/** Whether database initialization has been attempted */
let initAttempted = false
let initError: Error | null = null

/**
 * Initialize the SQLite database connection.
 * Creates the database file if it doesn't exist.
 * Should be called once during app startup.
 * Returns null if initialization fails (app can continue without SQLite).
 */
export function initDatabase(): ReturnType<typeof drizzle<typeof schema>> | null {
  if (db) {
    return db
  }

  if (initAttempted && initError) {
    // Already failed, don't retry
    return null
  }

  initAttempted = true

  try {
    const dbPath = getDatabasePath()
    const dbDir = join(dbPath, '..')

    // Ensure directory exists
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
      logger.info(LogCategory.AI, 'Created database directory', { path: dbDir })
    }

    logger.info(LogCategory.AI, 'Initializing SQLite database', { path: dbPath })

    // Create SQLite connection
    sqliteDb = new Database(dbPath)

    // Enable WAL mode for better concurrent performance
    sqliteDb.pragma('journal_mode = WAL')

    // Enable foreign keys
    sqliteDb.pragma('foreign_keys = ON')

    // Create Drizzle instance
    db = drizzle(sqliteDb, { schema })

    // Run migrations
    runMigrations()

    logger.info(LogCategory.AI, 'SQLite database initialized successfully')

    return db
  } catch (error) {
    initError = error instanceof Error ? error : new Error(String(error))
    logger.error(LogCategory.AI, 'Failed to initialize SQLite database', {
      error: initError.message,
      stack: initError.stack
    })
    // App can continue without SQLite - will fallback to in-memory/localStorage
    return null
  }
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return db !== null
}

/**
 * Get the database instance.
 * Throws if database hasn't been initialized or failed to initialize.
 */
export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    if (initError) {
      throw new Error(`Database unavailable: ${initError.message}`)
    }
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Close the database connection.
 * Should be called during app shutdown.
 */
export function closeDatabase(): void {
  if (sqliteDb) {
    sqliteDb.close()
    sqliteDb = null
    db = null
    logger.info(LogCategory.AI, 'SQLite database connection closed')
  }
}

// =============================================================================
// Migrations
// =============================================================================

/**
 * Run database migrations.
 * Creates tables if they don't exist.
 *
 * For a production app, you would use Drizzle Kit to generate migration files.
 * For simplicity, we use push-style migrations here (creates tables directly).
 */
function runMigrations(): void {
  if (!sqliteDb) return

  logger.info(LogCategory.AI, 'Running database migrations...')

  // Create conversations table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      session_type TEXT NOT NULL,
      repo_full_name TEXT,
      pr_number INTEGER,
      pr_title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)

  // Create messages table with foreign key
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      thinking TEXT,
      display_label TEXT,
      created_at INTEGER NOT NULL
    )
  `)

  // Create index on conversation_id for faster lookups
  sqliteDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)
  `)

  // Create custom_prompts table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS custom_prompts (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      prompt TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Create ai_usage table
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS ai_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      input_cost_usd REAL NOT NULL,
      output_cost_usd REAL NOT NULL,
      created_at INTEGER NOT NULL
    )
  `)

  // Create index on created_at for usage queries
  sqliteDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_ai_usage_created_at ON ai_usage(created_at)
  `)

  logger.info(LogCategory.AI, 'Database migrations completed')
}

// =============================================================================
// Export Schema
// =============================================================================

export { schema }
