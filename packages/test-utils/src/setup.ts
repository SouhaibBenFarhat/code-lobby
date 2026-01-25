/**
 * Test Setup
 *
 * Global setup for all tests.
 */

import '@testing-library/jest-dom'
import { QueryClient } from '@tanstack/react-query'
import { resetMockElectron, setupMockElectron } from './mocks/electron'

// Mock ResizeObserver for components that use it (ScrollArea, etc.)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Create a fresh QueryClient for each test
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })
}

// Reset state and mock electron before each test
beforeEach(() => {
  // Clear localStorage
  localStorage.clear()
  setupMockElectron()
})

// Clean up after each test
afterEach(() => {
  resetMockElectron()
})
