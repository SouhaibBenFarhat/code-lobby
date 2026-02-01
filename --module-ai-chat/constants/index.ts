/**
 * Constants for the AI Chat module
 */

// Context window sizes by model (in tokens)
// NOTE: Anthropic's API does not return context window size, so we must hardcode these.
// All current Claude models use 200K context. This is standard practice (Cursor does the same).
// We only find out the actual limit when we exceed it (error: model_context_window_exceeded).
export const CONTEXT_WINDOWS: Record<string, number> = {
  'claude-sonnet-4-20250514': 200000,
  'claude-opus-4-20250514': 200000,
  'claude-3-7-sonnet-20250219': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000
}

export const DEFAULT_CONTEXT_WINDOW = 200000
