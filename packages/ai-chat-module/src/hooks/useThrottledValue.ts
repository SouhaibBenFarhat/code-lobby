/**
 * Hook for throttling values using requestAnimationFrame
 * Useful for performance optimization during rapid updates (e.g., streaming)
 */

import { useEffect, useRef, useState } from 'react'

export function useThrottledValue<T>(value: T, fps = 30): T {
  const [throttledValue, setThrottledValue] = useState(value)
  const lastUpdateRef = useRef(0)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const minInterval = 1000 / fps
    const now = performance.now()

    if (now - lastUpdateRef.current >= minInterval) {
      setThrottledValue(value)
      lastUpdateRef.current = now
    } else {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      frameRef.current = requestAnimationFrame(() => {
        setThrottledValue(value)
        lastUpdateRef.current = performance.now()
      })
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [value, fps])

  return throttledValue
}
