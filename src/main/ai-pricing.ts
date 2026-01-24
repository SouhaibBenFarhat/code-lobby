/**
 * AI Model Pricing Configuration
 *
 * Pricing data for Anthropic Claude models (USD per million tokens)
 * Source: https://www.anthropic.com/pricing
 *
 * Last updated: January 2026
 */

export interface ModelPricing {
  inputPerMillion: number // USD per 1M input tokens
  outputPerMillion: number // USD per 1M output tokens
  displayName: string
}

/**
 * Pricing map keyed by model ID prefix
 * Models are matched by checking if the model ID includes the prefix
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Claude 4 Series (2025)
  'claude-opus-4': {
    inputPerMillion: 15,
    outputPerMillion: 75,
    displayName: 'Claude Opus 4'
  },
  'claude-sonnet-4': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    displayName: 'Claude Sonnet 4'
  },

  // Claude 3.7 Series
  'claude-3-7-sonnet': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    displayName: 'Claude 3.7 Sonnet'
  },

  // Claude 3.5 Series
  'claude-3-5-sonnet': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    displayName: 'Claude 3.5 Sonnet'
  },
  'claude-3-5-haiku': {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    displayName: 'Claude 3.5 Haiku'
  },

  // Claude 3 Series (Legacy)
  'claude-3-opus': {
    inputPerMillion: 15,
    outputPerMillion: 75,
    displayName: 'Claude 3 Opus'
  },
  'claude-3-sonnet': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    displayName: 'Claude 3 Sonnet'
  },
  'claude-3-haiku': {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    displayName: 'Claude 3 Haiku'
  }
}

// Default pricing for unknown models (use Sonnet pricing as reasonable default)
const DEFAULT_PRICING: ModelPricing = {
  inputPerMillion: 3,
  outputPerMillion: 15,
  displayName: 'Unknown Model'
}

/**
 * Get pricing for a model by its ID
 * Matches by checking if the model ID includes any of the pricing keys
 */
export function getModelPricing(modelId: string): ModelPricing {
  // Find matching pricing by checking if model ID includes any prefix
  for (const [prefix, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelId.includes(prefix)) {
      return pricing
    }
  }
  return DEFAULT_PRICING
}

/**
 * Calculate cost for token usage
 * @param modelId - The model ID (e.g., 'claude-sonnet-4-20250514')
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(modelId)
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion
  return inputCost + outputCost
}

/**
 * Convert USD to EUR (approximate rate - update periodically)
 * Using a conservative rate; in production, consider using a live exchange rate API
 */
const USD_TO_EUR_RATE = 0.92

export function usdToEur(usd: number): number {
  return usd * USD_TO_EUR_RATE
}

/**
 * Format cost for display
 * @param costUsd - Cost in USD
 * @param currency - 'USD' or 'EUR'
 * @returns Formatted string (e.g., '€0.0012' or '$0.0013')
 */
export function formatCost(costUsd: number, currency: 'USD' | 'EUR' = 'EUR'): string {
  const value = currency === 'EUR' ? usdToEur(costUsd) : costUsd
  const symbol = currency === 'EUR' ? '€' : '$'

  // For very small amounts, show more decimal places
  if (value < 0.01) {
    return `${symbol}${value.toFixed(4)}`
  }
  if (value < 1) {
    return `${symbol}${value.toFixed(3)}`
  }
  return `${symbol}${value.toFixed(2)}`
}

/**
 * Get all available pricing entries (for UI display)
 */
export function getAllModelPricing(): Array<{ modelPrefix: string } & ModelPricing> {
  return Object.entries(MODEL_PRICING).map(([prefix, pricing]) => ({
    modelPrefix: prefix,
    ...pricing
  }))
}
