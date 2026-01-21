/**
 * useScrollManagement - Manages scroll state and behavior for chat
 *
 * IMPORTANT: Returns a memoized object to prevent infinite render loops.
 * If returning a new object every render, any component using this hook
 * in a useCallback dependency would be recreated every render.
 */

import { useCallback, useMemo, useRef, useState } from 'react'

export interface UseScrollManagementReturn {
  // State
  isUserScrolledUp: boolean
  isConversationReady: boolean
  setIsConversationReady: (ready: boolean) => void
  // Refs
  scrollContainerRef: React.RefObject<HTMLDivElement>
  virtualizerScrollToEndRef: React.MutableRefObject<(() => void) | null>
  initialScrollDoneRef: React.MutableRefObject<boolean>
  // Callbacks
  handleVirtualizerReady: (scrollToEnd: () => void) => void
  scrollToBottom: (force?: boolean) => void
  handleScroll: () => void
  resetScroll: () => void
}

export function useScrollManagement(
  isLoading: boolean,
  messagesLength: number
): UseScrollManagementReturn {
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false)
  const [isConversationReady, setIsConversationReady] = useState(false)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastScrollTopRef = useRef(0)
  const scrollFrameRef = useRef<number | null>(null)
  const virtualizerScrollToEndRef = useRef<(() => void) | null>(null)
  const initialScrollDoneRef = useRef(false)

  const isNearBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true
    return container.scrollHeight - container.scrollTop - container.clientHeight < 100
  }, [])

  const scrollToBottom = useCallback(
    (force = false) => {
      if (scrollFrameRef.current) {
        cancelAnimationFrame(scrollFrameRef.current)
      }
      scrollFrameRef.current = requestAnimationFrame(() => {
        if (!force && isUserScrolledUp) return
        if (virtualizerScrollToEndRef.current) {
          virtualizerScrollToEndRef.current()
        } else {
          const container = scrollContainerRef.current
          if (container) {
            container.scrollTop = container.scrollHeight
          }
        }
        setIsUserScrolledUp(false)
      })
    },
    [isUserScrolledUp]
  )

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const currentScrollTop = container.scrollTop
    const wasScrollingUp = currentScrollTop < lastScrollTopRef.current
    lastScrollTopRef.current = currentScrollTop
    if (wasScrollingUp && !isNearBottom()) {
      setIsUserScrolledUp(true)
    } else if (isNearBottom()) {
      setIsUserScrolledUp(false)
    }
  }, [isNearBottom])

  const handleVirtualizerReady = useCallback(
    (scrollToEnd: () => void) => {
      virtualizerScrollToEndRef.current = scrollToEnd
      if (!initialScrollDoneRef.current && !isLoading && messagesLength > 0) {
        initialScrollDoneRef.current = true
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToEnd()
            setIsConversationReady(true)
          })
        })
      }
    },
    [isLoading, messagesLength]
  )

  const resetScroll = useCallback(() => {
    initialScrollDoneRef.current = false
    setIsConversationReady(false)
    setIsUserScrolledUp(false)
  }, [])

  // Memoize the return object to prevent infinite render loops
  // Without this, every render creates a new object, causing any
  // useCallback that depends on this hook to be recreated
  return useMemo(
    () => ({
      isUserScrolledUp,
      isConversationReady,
      setIsConversationReady,
      scrollContainerRef,
      virtualizerScrollToEndRef,
      initialScrollDoneRef,
      handleVirtualizerReady,
      scrollToBottom,
      handleScroll,
      resetScroll
    }),
    [
      isUserScrolledUp,
      isConversationReady,
      handleVirtualizerReady,
      scrollToBottom,
      handleScroll,
      resetScroll
    ]
  )
}
