/**
 * AI Pricing Tests
 *
 * Tests for Anthropic model pricing calculations
 */

import { describe, expect, it } from 'vitest'
import { calculateCost, getAllModelPricing, getModelPricing, MODEL_PRICING } from './ai-pricing'

describe('AI Pricing', () => {
  describe('MODEL_PRICING configuration', () => {
    it('should contain Claude 4 models', () => {
      expect(MODEL_PRICING['claude-opus-4']).toBeDefined()
      expect(MODEL_PRICING['claude-sonnet-4']).toBeDefined()
    })

    it('should contain Claude 3.7 models', () => {
      expect(MODEL_PRICING['claude-3-7-sonnet']).toBeDefined()
    })

    it('should contain Claude 3.5 models', () => {
      expect(MODEL_PRICING['claude-3-5-sonnet']).toBeDefined()
      expect(MODEL_PRICING['claude-3-5-haiku']).toBeDefined()
    })

    it('should contain Claude 3 models', () => {
      expect(MODEL_PRICING['claude-3-opus']).toBeDefined()
      expect(MODEL_PRICING['claude-3-sonnet']).toBeDefined()
      expect(MODEL_PRICING['claude-3-haiku']).toBeDefined()
    })

    it('should have valid pricing structure', () => {
      for (const [_key, pricing] of Object.entries(MODEL_PRICING)) {
        expect(pricing.inputPerMillion).toBeGreaterThan(0)
        expect(pricing.outputPerMillion).toBeGreaterThan(0)
        expect(pricing.displayName).toBeDefined()
        expect(typeof pricing.displayName).toBe('string')
        expect(pricing.displayName.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getModelPricing', () => {
    it('should return pricing for exact model match', () => {
      const pricing = getModelPricing('claude-opus-4-20250514')
      expect(pricing).toBeDefined()
      expect(pricing?.displayName).toBe('Claude Opus 4')
    })

    it('should return pricing for model ID containing prefix', () => {
      const pricing = getModelPricing('claude-3-5-sonnet-20241022')
      expect(pricing).toBeDefined()
      expect(pricing?.displayName).toBe('Claude 3.5 Sonnet')
    })

    it('should return default pricing for unknown models', () => {
      const pricing = getModelPricing('unknown-model')
      expect(pricing).toBeDefined()
      expect(pricing.displayName).toBe('Unknown Model')
      // Uses Sonnet pricing as reasonable default
      expect(pricing.inputPerMillion).toBe(3)
      expect(pricing.outputPerMillion).toBe(15)
    })

    it('should match longer prefixes first', () => {
      // claude-3-5-sonnet should match before claude-3-sonnet
      const pricing = getModelPricing('claude-3-5-sonnet-20241022')
      expect(pricing?.displayName).toBe('Claude 3.5 Sonnet')
    })
  })

  describe('calculateCost', () => {
    it('should calculate cost correctly for Claude Opus 4', () => {
      // Opus 4: $15/1M input, $75/1M output
      const cost = calculateCost('claude-opus-4-20250514', 1_000_000, 1_000_000)
      expect(cost).toBeCloseTo(90) // $15 + $75 = $90
    })

    it('should calculate cost correctly for Claude Sonnet 4', () => {
      // Sonnet 4: $3/1M input, $15/1M output
      const cost = calculateCost('claude-sonnet-4-20250514', 1_000_000, 1_000_000)
      expect(cost).toBeCloseTo(18) // $3 + $15 = $18
    })

    it('should calculate cost for partial token counts', () => {
      // Claude 3.5 Sonnet: $3/1M input, $15/1M output
      // 100K input = $0.30, 50K output = $0.75
      const cost = calculateCost('claude-3-5-sonnet-20241022', 100_000, 50_000)
      expect(cost).toBeCloseTo(1.05) // $0.30 + $0.75
    })

    it('should calculate cost for small token counts', () => {
      // Claude 3 Haiku: $0.25/1M input, $1.25/1M output
      // 1000 input = $0.00025, 1000 output = $0.00125
      const cost = calculateCost('claude-3-haiku-20240307', 1000, 1000)
      expect(cost).toBeCloseTo(0.0015)
    })

    it('should use default pricing for unknown models', () => {
      // Unknown models use Sonnet pricing as fallback: $3/1M input, $15/1M output
      const cost = calculateCost('unknown-model', 1_000_000, 1_000_000)
      expect(cost).toBeCloseTo(18) // $3 + $15 = $18
    })

    it('should return 0 for zero tokens', () => {
      const cost = calculateCost('claude-sonnet-4-20250514', 0, 0)
      expect(cost).toBe(0)
    })
  })

  describe('getAllModelPricing', () => {
    it('should return an array of pricing info', () => {
      const allPricing = getAllModelPricing()
      expect(Array.isArray(allPricing)).toBe(true)
      expect(allPricing.length).toBeGreaterThan(0)
    })

    it('should include modelPrefix in each entry', () => {
      const allPricing = getAllModelPricing()
      for (const entry of allPricing) {
        expect(entry.modelPrefix).toBeDefined()
        expect(typeof entry.modelPrefix).toBe('string')
      }
    })

    it('should include all required fields', () => {
      const allPricing = getAllModelPricing()
      for (const entry of allPricing) {
        expect(entry.inputPerMillion).toBeDefined()
        expect(entry.outputPerMillion).toBeDefined()
        expect(entry.displayName).toBeDefined()
      }
    })

    it('should contain all models from MODEL_PRICING', () => {
      const allPricing = getAllModelPricing()
      expect(allPricing.length).toBe(Object.keys(MODEL_PRICING).length)
    })
  })
})
