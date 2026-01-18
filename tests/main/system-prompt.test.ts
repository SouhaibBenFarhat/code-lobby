import { describe, expect, it } from 'vitest'
import { GENERAL_CHAT_SYSTEM_PROMPT } from '../../src/main/prompts'

describe('System Prompt', () => {
  describe('GENERAL_CHAT_SYSTEM_PROMPT', () => {
    it('should be a non-empty string', () => {
      expect(typeof GENERAL_CHAT_SYSTEM_PROMPT).toBe('string')
      expect(GENERAL_CHAT_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('should mention CodeLobby', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('CodeLobby')
    })

    it('should describe itself as an AI Assistant', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('AI Assistant')
    })

    it('should mention Pull Requests', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('Pull Request')
    })

    it('should describe the two view modes', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('Canvas View')
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('IDE View')
    })

    it('should mention AI-powered features', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('Open Preview')
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('Why Is This PR Still Open')
    })

    it('should describe PR-specific chat capability', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('PR-Specific Chat')
    })

    it('should mention technical details', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('Local Storage')
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('GitHub')
    })

    it('should define the AI role', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT).toContain('Your Role')
    })

    it('should instruct to be helpful and concise', () => {
      expect(GENERAL_CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('helpful')
      expect(GENERAL_CHAT_SYSTEM_PROMPT.toLowerCase()).toContain('concise')
    })
  })
})
