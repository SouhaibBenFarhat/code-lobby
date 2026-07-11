import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountMenu } from './AccountMenu'

const switchMutate = vi.fn()
const removeMutate = vi.fn()

const alice = {
  id: 'alice',
  user: { login: 'alice', avatar_url: '', name: 'Alice', html_url: '' },
  token: 't-a',
  addedAt: 1
}
const bob = {
  id: 'bob',
  user: { login: 'bob', avatar_url: '', name: 'Bob', html_url: '' },
  token: 't-b',
  addedAt: 2
}

let accountsData: Array<typeof alice>
let activeAccountValue: typeof alice | null
let currentUserData: (typeof alice)['user'] | null

vi.mock('@data', () => ({
  useAccounts: () => ({ data: accountsData }),
  useActiveAccount: () => activeAccountValue,
  useCurrentUser: () => ({ data: currentUserData }),
  useSwitchAccount: () => ({ mutate: switchMutate }),
  useRemoveAccount: () => ({ mutate: removeMutate })
}))

// Child dialogs pull their own hooks; stub them so this suite stays focused.
vi.mock('../AddAccountModal', () => ({ AddAccountModal: () => null }))
vi.mock('../ContributionsModal', () => ({ ContributionsModal: () => null }))

describe('AccountMenu', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    user = userEvent.setup({ pointerEventsCheck: 0 })
    accountsData = [alice, bob]
    activeAccountValue = alice
    currentUserData = alice.user
  })

  it('renders nothing when there is no user', () => {
    accountsData = []
    activeAccountValue = null
    currentUserData = null
    const { container } = render(<AccountMenu />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the active account in the trigger', () => {
    render(<AccountMenu />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('lists all accounts and actions when opened', async () => {
    render(<AccountMenu />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('bob')).toBeInTheDocument()
    expect(screen.getByText('Add account')).toBeInTheDocument()
    expect(screen.getByText('View contributions')).toBeInTheDocument()
    expect(screen.getByText('Sign out alice')).toBeInTheDocument()
  })

  it('switches account when a non-active account is clicked', async () => {
    render(<AccountMenu />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('bob'))
    expect(switchMutate).toHaveBeenCalledWith('bob')
  })

  it('signs out the active account from the menu', async () => {
    render(<AccountMenu />)
    await user.click(screen.getByRole('button'))
    await user.click(screen.getByText('Sign out alice'))
    expect(removeMutate).toHaveBeenCalledWith('alice')
  })

  it('shows a profile toggle instead of contributions in IDE mode', async () => {
    const onToggle = vi.fn()
    render(<AccountMenu onToggleProfilePanel={onToggle} profilePanelOpen={false} />)
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Show profile')).toBeInTheDocument()
    expect(screen.queryByText('View contributions')).not.toBeInTheDocument()
    await user.click(screen.getByText('Show profile'))
    expect(onToggle).toHaveBeenCalled()
  })
})
