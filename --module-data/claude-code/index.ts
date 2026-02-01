/**
 * Claude Code Integration Module
 *
 * Provides React hooks and utilities for integrating Claude Code CLI
 * into the CodeLobby application.
 */

// Hooks
export {
  type ClaudeReviewData,
  claudeKeys,
  useClaudeReviewListener,
  useClaudeSession,
  useClaudeStreamListener,
  useClearSession,
  useDeleteSession,
  useIsStreaming,
  useSendMessage,
  useSessionMessages,
  useStopClaude,
  useThinking,
  useToolActivity
} from './hooks'
// Parser
export {
  extractTextContent,
  extractToolInfo,
  formatToolActivity,
  formatToolResult,
  getStatusFromEvent,
  isAssistantEvent,
  isErrorEvent,
  isResultEvent,
  isSystemEvent,
  isTerminalEvent,
  isThinkingEvent,
  isToolResultEvent,
  isToolUseEvent,
  parseStreamLine
} from './parser'
// Persistence
export {
  addMessageToSession,
  clearAllSessions,
  clearSessionMessages,
  deleteSession,
  getGeneralSessionId,
  getPRSessionId,
  getRecentSessions,
  getSessionMessages,
  initSessionCache,
  listSessionIds,
  loadAllSessions,
  loadSession,
  parsePRSessionId,
  saveSession,
  sessionExists,
  setSessionRepoContext,
  updateLastMessage
} from './persistence'
// Types
export type {
  ClaudeMessage,
  ClaudeSession,
  ClaudeSessionComplete,
  ClaudeStartRequest,
  ClaudeStreamChunk,
  FormattedActivity,
  RepoContext,
  SessionStatus,
  StoredSession,
  StoredSessions,
  StreamEvent,
  StreamEventAssistant,
  StreamEventError,
  StreamEventResult,
  StreamEventSystem,
  StreamEventThinking,
  StreamEventToolResult,
  StreamEventToolUse,
  ToolActivity,
  ToolHistoryEntry,
  ToolResult
} from './types'
export { TOOL_DISPLAY_NAMES } from './types'
