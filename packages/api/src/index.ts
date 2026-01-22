/**
 * @codelobby/api - Centralized API Client
 *
 * This module wraps ALL electron IPC calls with automatic logging.
 * Every API call is logged with:
 * - Timestamp (millisecond precision)
 * - Method name
 * - Parameters (sanitized)
 * - Duration
 * - Success/failure status
 * - Response data (summarized)
 *
 * USAGE:
 * Instead of: window.electron.fetchPRs()
 * Use:        api.github.fetchPRs()
 *
 * All modules should import from @codelobby/api instead of calling
 * window.electron directly. This ensures consistent logging across
 * the entire application.
 */

/// <reference path="../../../src/preload/electron-api.d.ts" />

export { api } from './client'
export { LogCategory } from './logger'
export { ai } from './namespaces/ai'

// Re-export individual API namespaces for convenience
export { github } from './namespaces/github'
export { logs } from './namespaces/logs'
export { settings } from './namespaces/settings'
export type { ApiCallLog } from './types'
