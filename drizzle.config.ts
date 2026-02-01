import { homedir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from 'drizzle-kit'

// Path to the SQLite database in the Electron app's user data directory
const dbPath = join(homedir(), 'Library/Application Support/codelobby/codelobby.db')

export default defineConfig({
  schema: './--module-persistence/main/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: dbPath
  }
})
