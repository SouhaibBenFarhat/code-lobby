/**
 * Log Categories
 *
 * Standardized categories for consistent log organization
 */

export const LogCategory = {
  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN PROCESS CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Authentication related logs */
  AUTH: 'Auth',
  /** External API calls (HTTP) */
  API: 'API',
  /** GraphQL specific operations */
  GRAPHQL: 'GraphQL',
  /** Cache operations */
  CACHE: 'Cache',
  /** IPC communication between processes */
  IPC: 'IPC',
  /** General application events */
  APP: 'App',
  /** Local store operations */
  STORE: 'Store',
  /** Rate limiting events */
  RATE_LIMIT: 'RateLimit',

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERER PROCESS CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  /** UI rendering and updates */
  UI: 'UI',
  /** User actions (clicks, inputs) */
  USER_ACTION: 'UserAction',
  /** Route/view navigation */
  NAVIGATION: 'Navigation',
  /** Component lifecycle */
  COMPONENT: 'Component',
  /** AI chat operations */
  AI_CHAT: 'AIChat',
  /** AI-triggered actions */
  AI_ACTION: 'AIAction',
  /** Pull Request operations */
  PR: 'PR',
  /** Settings changes */
  SETTINGS: 'Settings'
} as const

export type LogCategoryType = (typeof LogCategory)[keyof typeof LogCategory]
