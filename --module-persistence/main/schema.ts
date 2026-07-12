/**
 * SQLite Database Schema for AI Data
 *
 * Defines tables for conversations, messages, custom prompts, and AI usage tracking.
 * Uses Drizzle ORM for type-safe database operations.
 */

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

// =============================================================================
// Conversations Table
// =============================================================================

/**
 * Stores chat conversations (both PR-specific and general)
 */
export const conversations = sqliteTable('conversations', {
  /** Unique conversation ID (e.g., 'pr-owner-repo-123' or 'general') */
  id: text('id').primaryKey(),

  /** Type of session: 'pr' for PR-specific, 'general' for general chat */
  sessionType: text('session_type').notNull().$type<'pr' | 'general'>(),

  /** Repository full name (owner/repo) - only for PR sessions */
  repoFullName: text('repo_full_name'),

  /** PR number - only for PR sessions */
  prNumber: integer('pr_number'),

  /** PR title - only for PR sessions */
  prTitle: text('pr_title'),

  /** Creation timestamp (Unix epoch ms) */
  createdAt: integer('created_at').notNull(),

  /** Last update timestamp (Unix epoch ms) */
  updatedAt: integer('updated_at').notNull()
})

// =============================================================================
// Messages Table
// =============================================================================

/**
 * Stores individual chat messages within conversations
 */
export const messages = sqliteTable('messages', {
  /** Unique message ID */
  id: text('id').primaryKey(),

  /** Foreign key to conversations table */
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),

  /** Message role: 'user' or 'assistant' */
  role: text('role').notNull().$type<'user' | 'assistant'>(),

  /** Message content */
  content: text('content').notNull(),

  /** Claude's thinking/reasoning (for extended thinking mode) */
  thinking: text('thinking'),

  /** Short display label (for quick actions, shows instead of full content) */
  displayLabel: text('display_label'),

  /**
   * JSON metadata for storing additional data like:
   * - reviewData: Claude-generated PR review (ReviewData)
   * - Any future extensible metadata
   */
  metadata: text('metadata'),

  /** Creation timestamp (Unix epoch ms) */
  createdAt: integer('created_at').notNull()
})

// =============================================================================
// Custom Prompts Table
// =============================================================================

/**
 * Stores user-created custom quick action prompts
 */
export const customPrompts = sqliteTable('custom_prompts', {
  /** Unique prompt ID */
  id: text('id').primaryKey(),

  /** Display label for the prompt button */
  label: text('label').notNull(),

  /** The actual prompt text sent to Claude */
  prompt: text('prompt').notNull(),

  /** Creation timestamp (Unix epoch ms) */
  createdAt: integer('created_at').notNull()
})

// =============================================================================
// AI Usage Table
// =============================================================================

/**
 * Tracks token usage and costs for AI requests
 */
export const aiUsage = sqliteTable('ai_usage', {
  /** Auto-incrementing ID */
  id: integer('id').primaryKey({ autoIncrement: true }),

  /** Model used for the request */
  model: text('model').notNull(),

  /** Number of input tokens */
  inputTokens: integer('input_tokens').notNull(),

  /** Number of output tokens */
  outputTokens: integer('output_tokens').notNull(),

  /** Cost of input tokens in USD */
  inputCostUsd: real('input_cost_usd').notNull(),

  /** Cost of output tokens in USD */
  outputCostUsd: real('output_cost_usd').notNull(),

  /** Timestamp of the request (Unix epoch ms) */
  createdAt: integer('created_at').notNull()
})

// =============================================================================
// Type Exports (for use in main process)
// =============================================================================

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export type CustomPrompt = typeof customPrompts.$inferSelect
export type NewCustomPrompt = typeof customPrompts.$inferInsert

export type AIUsageRecord = typeof aiUsage.$inferSelect
export type NewAIUsageRecord = typeof aiUsage.$inferInsert
