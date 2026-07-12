/**
 * user-profile slot registration + wrapper tests
 *
 * The wrapper is intentionally NOT gated on the panel's `isOpen` flag — App.tsx
 * owns the open/close slide lifecycle (same contract as ai-chat / network), so
 * the wrapper only gates on view mode + auth. These tests cover that contract
 * and the close callback.
 */

import { getModulesForSlot } from '@slot-system'
import { render, screen } from '@test-utils'
import { fireEvent } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

let mockViewMode: 'ide' | 'canvas' = 'ide'
let mockAuthed = true
const mockMutate = vi.fn()

vi.mock('@data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@data')>()
  return {
    ...actual,
    useViewMode: () => ({ data: mockViewMode }),
    useIsAuthenticated: () => ({ isAuthenticated: mockAuthed }),
    useSetUserProfilePanel: () => ({ mutate: mockMutate }),
    // UserProfilePanel's own data deps (rendered by the wrapper):
    useContributions: () => ({ data: null, isLoading: false, isFetching: false, error: null }),
    useCurrentUser: () => ({ data: { login: 'octocat', avatar_url: '' } }),
    useRefreshContributions: () => vi.fn()
  }
})

// Importing the module runs registerToSlot(), registering the wrapper.
import './index'

function getWrapper(): ComponentType {
  const entry = getModulesForSlot('user-profile').find((m) => m.id === 'user-profile')
  if (!entry) throw new Error('user-profile module not registered')
  return entry.component
}

beforeEach(() => {
  vi.clearAllMocks()
  mockViewMode = 'ide'
  mockAuthed = true
})

describe('user-profile module', () => {
  it('registers a component to the user-profile slot', () => {
    expect(getModulesForSlot('user-profile').some((m) => m.id === 'user-profile')).toBe(true)
  })

  it('renders the profile panel in IDE mode when authenticated', () => {
    const Wrapper = getWrapper()
    render(<Wrapper />)
    expect(screen.getByRole('button', { name: 'Close profile panel' })).toBeInTheDocument()
  })

  it('closes the panel through the header close button', () => {
    const Wrapper = getWrapper()
    render(<Wrapper />)
    fireEvent.click(screen.getByRole('button', { name: 'Close profile panel' }))
    expect(mockMutate).toHaveBeenCalledWith({ isOpen: false })
  })

  it('renders nothing when not authenticated', () => {
    mockAuthed = false
    const Wrapper = getWrapper()
    const { container } = render(<Wrapper />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing outside IDE mode', () => {
    mockViewMode = 'canvas'
    const Wrapper = getWrapper()
    const { container } = render(<Wrapper />)
    expect(container.firstChild).toBeNull()
  })
})
