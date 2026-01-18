import { describe, expect, it } from 'vitest'
import { CODELOBBY_SYSTEM_PROMPT } from '../../src/main/system-prompt'

describe('System Prompt', () => {
  describe('CODELOBBY_SYSTEM_PROMPT', () => {
    it('should be a non-empty string', () => {
      expect(typeof CODELOBBY_SYSTEM_PROMPT).toBe('string')
      expect(CODELOBBY_SYSTEM_PROMPT.length).toBeGreaterThan(0)
    })

    it('should mention CodeLobby', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('CodeLobby')
    })

    it('should describe itself as an AI Assistant', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('AI Assistant')
    })

    it('should mention Pull Requests', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('Pull Request')
    })

    it('should describe the two view modes', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('Canvas View')
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('IDE View')
    })

    it('should mention AI-powered features', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('Open Preview')
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('Why Is This PR Still Open')
    })

    it('should describe PR-specific chat capability', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('PR-Specific Chat')
    })

    it('should mention technical details', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('Local Storage')
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('GitHub')
    })

    it('should define the AI role', () => {
      expect(CODELOBBY_SYSTEM_PROMPT).toContain('Your Role')
    })

    it('should instruct to be helpful and concise', () => {
      expect(CODELOBBY_SYSTEM_PROMPT.toLowerCase()).toContain('helpful')
      expect(CODELOBBY_SYSTEM_PROMPT.toLowerCase()).toContain('concise')
    })
  })
})
