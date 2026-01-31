/**
 * Hook for throttling values using requestAnimationFrame
 * Useful for performance optimization during rapid updates (e.g., streaming)
 *
 * @param value - The value to throttle
 * @param intervalMs - Minimum interval between updates in milliseconds (default: 33ms ~30fps)
 */

import { useEffect, useRef, useState } from 'react'

export function useThrottledValue<T>(value: T, intervalMs = 33): T {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastUpdateRef = useRef(0)
  const pendingRef = useRef(false)

  useEffect(() => {
    const now = performance.now()
    const elapsed = now - lastUpdateRef.current

    // If enough time has passed, update immediately
    if (elapsed >= intervalMs) {
      setThrottledValue(value)
      lastUpdateRef.current = now
      pendingRef.current = false
    } else if (!pendingRef.current) {
      // Schedule update for remaining time
      pendingRef.current = true
      const remaining = intervalMs - elapsed
      const timeoutId = setTimeout(() => {
        setThrottledValue(value)
        lastUpdateRef.current = performance.now()
        pendingRef.current = false
      }, remaining)

      return () => {
        clearTimeout(timeoutId)
        pendingRef.current = false
      }
    }
  }, [value, intervalMs])

  return throttledValue
}
