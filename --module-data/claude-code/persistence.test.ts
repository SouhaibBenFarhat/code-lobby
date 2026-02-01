import {
  addMessageToSession,
  clearAllSessions,
  clearSessionMessages,
  deleteSession,
  getGeneralSessionId,
  getPRSessionId,
  getRecentSessions,
  getSessionMessages,
  listSessionIds,
  loadAllSessions,
  loadSession,
  parsePRSessionId,
  saveSession,
  sessionExists,
  setSessionRepoContext,
  updateLastMessage
} from './persistence'

describe('persistence', () => {
  describe('Session ID Helpers', () => {
    describe('getPRSessionId', () => {
      it('should generate PR session ID with correct format', () => {
        expect(getPRSessionId('owner', 'repo', 123)).toBe('pr-owner-repo-123')
      })

      it('should handle different owners and repos', () => {
        expect(getPRSessionId('facebook', 'react', 1)).toBe('pr-facebook-react-1')
        expect(getPRSessionId('vercel', 'next.js', 9999)).toBe('pr-vercel-next.js-9999')
      })
    })

    describe('getGeneralSessionId', () => {
      it('should return general session ID', () => {
        expect(getGeneralSessionId()).toBe('general')
      })
    })

    describe('parsePRSessionId', () => {
      it('should parse valid PR session ID', () => {
        const result = parsePRSessionId('pr-owner-repo-123')
        expect(result).toEqual({
          owner: 'owner',
          repo: 'repo',
          prNumber: 123
        })
      })

      it('should return null for invalid format', () => {
        expect(parsePRSessionId('invalid')).toBeNull()
        expect(parsePRSessionId('pr-owner-repo')).toBeNull()
        expect(parsePRSessionId('general')).toBeNull()
      })

      it('should handle repos with dots', () => {
        const result = parsePRSessionId('pr-vercel-next.js-42')
        expect(result).toEqual({
          owner: 'vercel',
          repo: 'next.js',
          prNumber: 42
        })
      })
    })
  })

  describe('Synchronous Cache Operations', () => {
    beforeEach(() => {
      // Clear all sessions before each test
      clearAllSessions()
    })

    describe('loadAllSessions', () => {
      it('should return empty object when no sessions', () => {
        expect(loadAllSessions()).toEqual({})
      })

      it('should return sessions from cache', () => {
        // Add a session first
        addMessageToSession('test-session', {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now()
        })

        const sessions = loadAllSessions()
        expect(sessions['test-session']).toBeDefined()
      })
    })

    describe('loadSession', () => {
      it('should return null for non-existent session', () => {
        expect(loadSession('non-existent')).toBeNull()
      })

      it('should return session from cache', () => {
        addMessageToSession('test-session', {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })

        const session = loadSession('test-session')
        expect(session).not.toBeNull()
        expect(session?.id).toBe('test-session')
      })
    })

    describe('addMessageToSession', () => {
      it('should create new session if not exists', () => {
        const session = addMessageToSession('new-session', {
          id: 'msg-1',
          role: 'user',
          content: 'First message',
          timestamp: Date.now()
        })

        expect(session.id).toBe('new-session')
        expect(session.messages).toHaveLength(1)
      })

      it('should add message to existing session', () => {
        addMessageToSession('session', {
          id: 'msg-1',
          role: 'user',
          content: 'First',
          timestamp: Date.now()
        })

        const session = addMessageToSession('session', {
          id: 'msg-2',
          role: 'assistant',
          content: 'Second',
          timestamp: Date.now()
        })

        expect(session.messages).toHaveLength(2)
      })

      it('should update timestamp when adding message', () => {
        const session1 = addMessageToSession('session', {
          id: 'msg-1',
          role: 'user',
          content: 'First',
          timestamp: Date.now()
        })

        const originalTimestamp = session1.updatedAt

        // Wait a bit to ensure different timestamp
        const session2 = addMessageToSession('session', {
          id: 'msg-2',
          role: 'assistant',
          content: 'Second',
          timestamp: Date.now()
        })

        expect(originalTimestamp).toBeDefined()
        expect(session2.updatedAt).toBeGreaterThanOrEqual(originalTimestamp ?? 0)
      })
    })

    describe('deleteSession', () => {
      it('should remove session from cache', () => {
        addMessageToSession('to-delete', {
          id: 'msg-1',
          role: 'user',
          content: 'Delete me',
          timestamp: Date.now()
        })

        expect(sessionExists('to-delete')).toBe(true)

        deleteSession('to-delete')

        expect(sessionExists('to-delete')).toBe(false)
      })

      it('should not throw for non-existent session', () => {
        expect(() => deleteSession('non-existent')).not.toThrow()
      })
    })

    describe('clearSessionMessages', () => {
      it('should clear messages but keep session', () => {
        addMessageToSession('session', {
          id: 'msg-1',
          role: 'user',
          content: 'Message',
          timestamp: Date.now()
        })

        clearSessionMessages('session')

        expect(sessionExists('session')).toBe(true)
        expect(getSessionMessages('session')).toHaveLength(0)
      })

      it('should not throw for non-existent session', () => {
        expect(() => clearSessionMessages('non-existent')).not.toThrow()
      })
    })

    describe('listSessionIds', () => {
      it('should return empty array when no sessions', () => {
        expect(listSessionIds()).toEqual([])
      })

      it('should return all session IDs', () => {
        addMessageToSession('session-1', {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })
        addMessageToSession('session-2', {
          id: 'msg-2',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })

        const ids = listSessionIds()
        expect(ids).toContain('session-1')
        expect(ids).toContain('session-2')
      })
    })

    describe('getSessionMessages', () => {
      it('should return empty array for non-existent session', () => {
        expect(getSessionMessages('non-existent')).toEqual([])
      })

      it('should return messages for session', () => {
        addMessageToSession('session', {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now()
        })

        const messages = getSessionMessages('session')
        expect(messages).toHaveLength(1)
        expect(messages[0].content).toBe('Hello')
      })
    })

    describe('getRecentSessions', () => {
      it('should return empty array when no sessions', () => {
        expect(getRecentSessions()).toEqual([])
      })

      it('should return sessions sorted by updatedAt (most recent first)', () => {
        // Create sessions with explicit different timestamps by modifying directly
        saveSession({
          id: 'old',
          messages: [{ id: 'msg-1', role: 'user', content: 'Old', timestamp: Date.now() }],
          createdAt: Date.now() - 2000,
          updatedAt: Date.now() - 2000
        })

        saveSession({
          id: 'new',
          messages: [{ id: 'msg-2', role: 'user', content: 'New', timestamp: Date.now() }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        })

        const recent = getRecentSessions()
        expect(recent[0].id).toBe('new')
        expect(recent[1].id).toBe('old')
      })

      it('should respect limit parameter', () => {
        for (let i = 0; i < 15; i++) {
          addMessageToSession(`session-${i}`, {
            id: `msg-${i}`,
            role: 'user',
            content: `Message ${i}`,
            timestamp: Date.now()
          })
        }

        expect(getRecentSessions(5)).toHaveLength(5)
        expect(getRecentSessions()).toHaveLength(10) // Default limit
      })
    })

    describe('sessionExists', () => {
      it('should return false for non-existent session', () => {
        expect(sessionExists('non-existent')).toBe(false)
      })

      it('should return true for existing session', () => {
        addMessageToSession('exists', {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })

        expect(sessionExists('exists')).toBe(true)
      })
    })

    describe('updateLastMessage', () => {
      it('should return null for non-existent session', () => {
        expect(updateLastMessage('non-existent', { content: 'Updated' })).toBeNull()
      })

      it('should return null for session with no messages', () => {
        // Create empty session via saveSession
        saveSession({
          id: 'empty',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        })

        expect(updateLastMessage('empty', { content: 'Updated' })).toBeNull()
      })

      it('should update last message content', () => {
        addMessageToSession('session', {
          id: 'msg-1',
          role: 'assistant',
          content: 'Original',
          timestamp: Date.now()
        })

        const updated = updateLastMessage('session', { content: 'Updated' })

        expect(updated?.messages[0].content).toBe('Updated')
      })

      it('should preserve other message properties', () => {
        addMessageToSession('session', {
          id: 'msg-1',
          role: 'assistant',
          content: 'Original',
          thinking: 'Thinking...',
          timestamp: Date.now()
        })

        const updated = updateLastMessage('session', { content: 'Updated' })

        expect(updated?.messages[0].thinking).toBe('Thinking...')
        expect(updated?.messages[0].role).toBe('assistant')
      })
    })

    describe('setSessionRepoContext', () => {
      it('should create session with context if not exists', () => {
        setSessionRepoContext('new-session', {
          owner: 'test',
          repo: 'repo',
          branch: 'main',
          prNumber: 1
        })

        const session = loadSession('new-session')
        expect(session?.repoContext).toEqual({
          owner: 'test',
          repo: 'repo',
          branch: 'main',
          prNumber: 1
        })
      })

      it('should update existing session context', () => {
        addMessageToSession('session', {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })

        setSessionRepoContext('session', {
          owner: 'owner',
          repo: 'repo',
          branch: 'feature',
          prNumber: 42
        })

        const session = loadSession('session')
        expect(session?.repoContext?.prNumber).toBe(42)
      })
    })

    describe('saveSession', () => {
      it('should save session to cache', () => {
        saveSession({
          id: 'saved',
          messages: [{ id: 'msg-1', role: 'user', content: 'Test', timestamp: Date.now() }],
          createdAt: Date.now(),
          updatedAt: Date.now()
        })

        expect(sessionExists('saved')).toBe(true)
      })
    })

    describe('clearAllSessions', () => {
      it('should remove all sessions', () => {
        addMessageToSession('session-1', {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })
        addMessageToSession('session-2', {
          id: 'msg-2',
          role: 'user',
          content: 'Test',
          timestamp: Date.now()
        })

        clearAllSessions()

        expect(listSessionIds()).toHaveLength(0)
      })
    })
  })
})
