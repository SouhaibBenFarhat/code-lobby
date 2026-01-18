import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock ResizeObserver - class-based implementation for jsdom
class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver

// Mock IntersectionObserver - class-based implementation for jsdom
class MockIntersectionObserver {
  callback: IntersectionObserverCallback
  root: Element | null = null
  rootMargin: string = ''
  thresholds: readonly number[] = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.root = (options?.root as Element) || null
    this.rootMargin = options?.rootMargin || ''
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold || 0]
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
  takeRecords = vi.fn().mockReturnValue([])
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock scrollTo and scrollIntoView
Element.prototype.scrollTo = vi.fn()
Element.prototype.scrollIntoView = vi.fn()

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  callback(0)
  return 0
})
global.cancelAnimationFrame = vi.fn()

// Mock performance.now for throttling tests (only if not already defined)
try {
  vi.spyOn(performance, 'now').mockImplementation(() => Date.now())
} catch {
  // performance.now already exists, that's fine
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})

// Note: Removed vi.restoreAllMocks() from beforeEach as it was removing global mocks
