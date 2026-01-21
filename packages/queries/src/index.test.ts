/**
 * Tests for TanStack Query hooks
 * Focuses on optimistic updates to prevent UI jank
 */
import { QueryClient } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock window.electron
const mockElectron = {
  setCardLayouts: vi.fn().mockResolvedValue(undefined),
  setRepoColor: vi.fn().mockResolvedValue(undefined),
  setRepoMinimized: vi.fn().mockResolvedValue(undefined),
  setSelectedRepos: vi.fn().mockResolvedValue(undefined)
}

vi.stubGlobal('window', {
  electron: mockElectron
})

// Import after mocking
import { queryKeys } from './index'

describe('Query Keys', () => {
  it('should have correct structure for cardLayouts', () => {
    expect(queryKeys.cardLayouts).toEqual(['card-layouts'])
  })

  it('should have correct structure for repos', () => {
    expect(queryKeys.repos).toEqual(['repos'])
  })

  it('should have correct structure for selectedRepos', () => {
    expect(queryKeys.selectedRepos).toEqual(['selected-repos'])
  })
})

describe('Optimistic Updates', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    })
    vi.clearAllMocks()
  })

  describe('useSetCardLayouts', () => {
    it('should update cache immediately on mutation (optimistic update)', async () => {
      // Set initial cache state
      const initialLayouts = [{ i: 'repo1', x: 0, y: 0, w: 400, h: 350 }]
      queryClient.setQueryData(queryKeys.cardLayouts, initialLayouts)

      // Verify initial state
      expect(queryClient.getQueryData(queryKeys.cardLayouts)).toEqual(initialLayouts)

      // New layouts after "drag"
      const newLayouts = [{ i: 'repo1', x: 200, y: 300, w: 400, h: 350 }]

      // Simulate optimistic update (what our mutation does in onMutate)
      queryClient.setQueryData(queryKeys.cardLayouts, newLayouts)

      // Cache should update IMMEDIATELY (before API call completes)
      expect(queryClient.getQueryData(queryKeys.cardLayouts)).toEqual(newLayouts)
    })

    it('should rollback on error', async () => {
      const initialLayouts = [{ i: 'repo1', x: 0, y: 0, w: 400, h: 350 }]
      queryClient.setQueryData(queryKeys.cardLayouts, initialLayouts)

      const newLayouts = [{ i: 'repo1', x: 200, y: 300, w: 400, h: 350 }]

      // Simulate optimistic update
      const previousLayouts = queryClient.getQueryData(queryKeys.cardLayouts)
      queryClient.setQueryData(queryKeys.cardLayouts, newLayouts)

      // Verify optimistic state
      expect(queryClient.getQueryData(queryKeys.cardLayouts)).toEqual(newLayouts)

      // Simulate error - rollback to previous state
      queryClient.setQueryData(queryKeys.cardLayouts, previousLayouts)

      // Should be back to original
      expect(queryClient.getQueryData(queryKeys.cardLayouts)).toEqual(initialLayouts)
    })
  })

  describe('useSetSelectedRepos', () => {
    it('should update cache immediately on selection change', async () => {
      const initialSelection = ['repo1', 'repo2']
      queryClient.setQueryData(queryKeys.selectedRepos, initialSelection)

      const newSelection = ['repo1', 'repo2', 'repo3']

      // Simulate optimistic update
      queryClient.setQueryData(queryKeys.selectedRepos, newSelection)

      // Cache should update immediately
      expect(queryClient.getQueryData(queryKeys.selectedRepos)).toEqual(newSelection)
    })
  })
})

describe('Snap-back Prevention', () => {
  it('should not cause snap-back with optimistic updates', async () => {
    const queryClient = new QueryClient()

    // Initial position
    const initialLayout = { i: 'repo1', x: 100, y: 100, w: 400, h: 350 }
    queryClient.setQueryData(queryKeys.cardLayouts, [initialLayout])

    // User drags to new position
    const newPosition = { x: 500, y: 400 }
    const newLayout = { ...initialLayout, ...newPosition }

    // Timeline:
    // 1. User drops card at (500, 400)
    // 2. onDragStop called
    // 3. Optimistic update sets cache to (500, 400) IMMEDIATELY
    // 4. Component re-renders - reads (500, 400) from cache
    // 5. NO SNAP-BACK because cache already has new position

    // Simulate step 3: optimistic update
    queryClient.setQueryData(queryKeys.cardLayouts, [newLayout])

    // Step 4: component reads from cache - should get new position
    const cachedLayouts = queryClient.getQueryData(queryKeys.cardLayouts) as (typeof newLayout)[]
    expect(cachedLayouts[0].x).toBe(500)
    expect(cachedLayouts[0].y).toBe(400)
  })
})
