/**
 * Test Render Utilities
 *
 * Provides wrapper components and utilities for testing React components
 * with all necessary providers (React Query, Tooltip, PRContext, etc.)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RenderOptions, RenderResult, render } from '@testing-library/react'
import { createContext, ReactElement, ReactNode, useContext, useState } from 'react'
import type { PullRequest } from '@/components/types'
import { TooltipProvider } from '@/components/ui/tooltip'

// Create a new QueryClient for each test
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: {
        retry: false
      }
    }
  })
}

// Mirror the PRContext from App.tsx for testing
interface PRContextType {
  selectedPR: PullRequest | null
  setSelectedPR: (pr: PullRequest | null) => void
}

const TestPRContext = createContext<PRContextType>({
  selectedPR: null,
  setSelectedPR: () => {}
})

// Export for tests that need to mock usePRContext
export const usePRContext = () => useContext(TestPRContext)

// Mirror the MyPRsFilterContext from App.tsx for testing
interface MyPRsFilterContextType {
  myPRsRepos: Set<string>
  toggleMyPRsFilter: (repoFullName: string) => void
  isMyPRsFilterEnabled: (repoFullName: string) => boolean
}

const TestMyPRsFilterContext = createContext<MyPRsFilterContextType>({
  myPRsRepos: new Set(),
  toggleMyPRsFilter: () => {},
  isMyPRsFilterEnabled: () => false
})

// Export for tests that need to mock useMyPRsFilter
export const useMyPRsFilter = () => useContext(TestMyPRsFilterContext)

interface WrapperProps {
  children: ReactNode
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
  initialSelectedPR?: PullRequest | null
  onSelectPR?: (pr: PullRequest | null) => void
  initialMyPRsRepos?: string[]
  onToggleMyPRsFilter?: (repoFullName: string) => void
}

/**
 * All Providers Wrapper
 */
function _AllProviders({ children }: WrapperProps): ReactElement {
  const queryClient = createTestQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>{children}</TooltipProvider>
    </QueryClientProvider>
  )
}

/**
 * PRContext Provider for tests
 */
function PRContextProvider({
  children,
  initialSelectedPR = null,
  onSelectPR
}: {
  children: ReactNode
  initialSelectedPR?: PullRequest | null
  onSelectPR?: (pr: PullRequest | null) => void
}): ReactElement {
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(initialSelectedPR)

  const handleSetSelectedPR = (pr: PullRequest | null) => {
    setSelectedPR(pr)
    onSelectPR?.(pr)
  }

  return (
    <TestPRContext.Provider value={{ selectedPR, setSelectedPR: handleSetSelectedPR }}>
      {children}
    </TestPRContext.Provider>
  )
}

/**
 * MyPRsFilter Provider for tests
 */
function MyPRsFilterProvider({
  children,
  initialMyPRsRepos = [],
  onToggle
}: {
  children: ReactNode
  initialMyPRsRepos?: string[]
  onToggle?: (repoFullName: string) => void
}): ReactElement {
  const [myPRsRepos, setMyPRsRepos] = useState<Set<string>>(new Set(initialMyPRsRepos))

  const toggleMyPRsFilter = (repoFullName: string) => {
    setMyPRsRepos((prev) => {
      const next = new Set(prev)
      if (next.has(repoFullName)) {
        next.delete(repoFullName)
      } else {
        next.add(repoFullName)
      }
      return next
    })
    onToggle?.(repoFullName)
  }

  const isMyPRsFilterEnabled = (repoFullName: string) => myPRsRepos.has(repoFullName)

  return (
    <TestMyPRsFilterContext.Provider
      value={{ myPRsRepos, toggleMyPRsFilter, isMyPRsFilterEnabled }}
    >
      {children}
    </TestMyPRsFilterContext.Provider>
  )
}

/**
 * Custom render function that wraps component with all providers
 */
function customRender(ui: ReactElement, options?: CustomRenderOptions): RenderResult {
  const queryClient = options?.queryClient || createTestQueryClient()
  const {
    initialSelectedPR,
    onSelectPR,
    initialMyPRsRepos,
    onToggleMyPRsFilter,
    ...renderOptions
  } = options || {}

  const Wrapper = ({ children }: WrapperProps) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PRContextProvider initialSelectedPR={initialSelectedPR} onSelectPR={onSelectPR}>
          <MyPRsFilterProvider initialMyPRsRepos={initialMyPRsRepos} onToggle={onToggleMyPRsFilter}>
            {children}
          </MyPRsFilterProvider>
        </PRContextProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render, createTestQueryClient }
