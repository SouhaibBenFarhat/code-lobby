/**
 * Test Setup
 *
 * Global setup for all tests.
 */

import '@testing-library/jest-dom'
import { resetStore } from '@codelobby/shared-store'
import { resetMockElectron, setupMockElectron } from './mocks/electron'

// Mock ResizeObserver for components that use it (ScrollArea, etc.)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Reset store and mock electron before each test
beforeEach(() => {
  resetStore()
  setupMockElectron()
})

// Clean up after each test
afterEach(() => {
  resetMockElectron()
})
