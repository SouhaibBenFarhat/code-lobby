/**
 * Test Setup
 *
 * Global setup for all tests.
 */

import '@testing-library/jest-dom'
import { resetStore } from '@codelobby/shared-store'
import { resetMockElectron, setupMockElectron } from './mocks/electron'

// Reset store and mock electron before each test
beforeEach(() => {
  resetStore()
  setupMockElectron()
})

// Clean up after each test
afterEach(() => {
  resetMockElectron()
})
