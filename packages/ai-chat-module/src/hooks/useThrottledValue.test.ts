/**
 * Tests for useThrottledValue hook
 */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useThrottledValue } from './useThrottledValue'

describe('useThrottledValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useThrottledValue('initial'))
    expect(result.current).toBe('initial')
  })

  it('should update value after throttle interval', () => {
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 30), {
      initialProps: { value: 'first' }
    })

    expect(result.current).toBe('first')

    // Update the value
    rerender({ value: 'second' })

    // Should still be first (throttled)
    expect(result.current).toBe('first')

    // Advance time and trigger RAF
    act(() => {
      vi.advanceTimersByTime(50) // More than 1000/30 = ~33ms
      vi.runAllTimers()
    })

    // Now should be updated
    expect(result.current).toBe('second')
  })

  it('should handle different fps values', () => {
    // 60fps = ~16.7ms interval
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 60), {
      initialProps: { value: 1 }
    })

    expect(result.current).toBe(1)

    rerender({ value: 2 })

    act(() => {
      vi.advanceTimersByTime(20) // ~20ms > 16.7ms
      vi.runAllTimers()
    })

    expect(result.current).toBe(2)
  })

  it('should use default fps of 30', () => {
    const { result } = renderHook(() => useThrottledValue('test'))
    expect(result.current).toBe('test')
    // Default is 30fps, so interval is ~33ms
  })

  it('should work with object values', () => {
    const obj1 = { count: 1 }
    const obj2 = { count: 2 }

    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value), {
      initialProps: { value: obj1 }
    })

    expect(result.current).toBe(obj1)

    rerender({ value: obj2 })

    act(() => {
      vi.advanceTimersByTime(50)
      vi.runAllTimers()
    })

    expect(result.current).toBe(obj2)
  })

  it('should cancel animation frame on unmount', () => {
    const cancelAnimationFrameSpy = vi.spyOn(global, 'cancelAnimationFrame')

    const { unmount, rerender } = renderHook(({ value }) => useThrottledValue(value), {
      initialProps: { value: 'initial' }
    })

    rerender({ value: 'updated' })
    unmount()

    // Should have called cancelAnimationFrame during cleanup
    expect(cancelAnimationFrameSpy).toHaveBeenCalled()
  })
})
