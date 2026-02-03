/**
 * SQLite Database Connection
 *
 * Initializes and manages the SQLite database connection using better-sqlite3 and Drizzle ORM.
 * The database is stored in the Electron app's user data directory.
 *
 * Migrations:
 * - Migration files are generated with `pnpm db:generate` during development
 * - They are stored in the `drizzle/` folder and bundled with the app
 * - On app startup, `migrate()` automatically applies any pending migrations
 * - Applied migrations are tracked in `__drizzle_migrations` table
 *
 * This module runs in the Electron MAIN process only.
 */

import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { LogCategory, mainLogger as logger } from '@logger/main'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
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
 * Get the raw better-sqlite3 database instance for raw SQL queries.
 * Use this for queries that need direct SQL access (like querying sqlite_master).
 */
export function getRawDatabase(): Database.Database {
  if (!sqliteDb) {
    if (initError) {
      throw new Error(`Database unavailable: ${initError.message}`)
    }
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return sqliteDb
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
 * Get the path to the migrations folder.
 * - Development: ./drizzle (relative to project root)
 * - Production: bundled with the app in resources
 */
function getMigrationsPath(): string {
  if (app.isPackaged) {
    // Production: migrations are bundled in the app's resources
    return join(process.resourcesPath, 'drizzle')
  }
  // Development: migrations are in the project root
  return join(app.getAppPath(), 'drizzle')
}

/**
 * Run database migrations using Drizzle's migrate function.
 *
 * How it works:
 * 1. Reads SQL migration files from the `drizzle/` folder
 * 2. Tracks applied migrations in `__drizzle_migrations` table
 * 3. Only applies migrations that haven't been run yet
 * 4. Runs migrations in order based on timestamp in filename
 *
 * Migration files are generated during development with `pnpm db:generate`
 * and bundled with the app for production.
 */
function runMigrations(): void {
  if (!db) return

  const migrationsPath = getMigrationsPath()
  logger.info(LogCategory.AI, 'Running database migrations...', { path: migrationsPath })

  try {
    migrate(db, { migrationsFolder: migrationsPath })
    logger.info(LogCategory.AI, 'Database migrations completed successfully')
  } catch (error) {
    // Log but don't throw - app can continue with existing schema
    logger.error(LogCategory.AI, 'Migration error', {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// =============================================================================
// Export Schema
// =============================================================================

export { schema }
