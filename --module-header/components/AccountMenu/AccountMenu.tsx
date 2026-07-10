/**
 * AccountMenu
 *
 * The header profile control, upgraded into a multi-account menu. The avatar
 * opens a popover listing every signed-in account (click to switch, hover to
 * remove a non-active one), plus "Add account", contributions, and sign out.
 *
 * In IDE mode the avatar historically toggled the profile side-panel; pass
 * `onToggleProfilePanel` and the menu surfaces a "Show/Hide profile" item
 * instead of the contributions modal so that affordance is preserved.
 */

import {
  useAccounts,
  useActiveAccount,
  useCurrentUser,
  useRemoveAccount,
  useSwitchAccount
} from '@data'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  ListMenu,
  ListMenuContent,
  ListMenuItem,
  ListMenuSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@ui-kit'
import { BarChart3, Check, ChevronDown, LogOut, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { AddAccountModal } from '../AddAccountModal'
import { ContributionsModal } from '../ContributionsModal'

interface AccountMenuProps {
  /** IDE mode: show a "Show/Hide profile" item instead of "View contributions". */
  onToggleProfilePanel?: () => void
  profilePanelOpen?: boolean
}

export function AccountMenu({
  onToggleProfilePanel,
  profilePanelOpen = false
}: AccountMenuProps): React.JSX.Element | null {
  const { data: accounts = [] } = useAccounts()
  const activeAccount = useActiveAccount()
  const { data: currentUser } = useCurrentUser()
  const switchAccount = useSwitchAccount()
  const removeAccount = useRemoveAccount()

  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [contribOpen, setContribOpen] = useState(false)

  // Fall back to the live user when accounts aren't populated yet (e.g. an
  // offline first launch where migration hasn't run).
  const displayUser = activeAccount?.user ?? currentUser ?? null
  if (!displayUser) return null

  const activeId = activeAccount?.id ?? null

  const handleSwitch = (id: string): void => {
    if (id !== activeId) switchAccount.mutate(id)
    setMenuOpen(false)
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity rounded-md px-1.5 py-0.5"
          >
            <Avatar className="h-6 w-6 ring-2 ring-transparent hover:ring-primary/50 transition-all">
              <AvatarImage src={displayUser.avatar_url} alt={displayUser.login} />
              <AvatarFallback>{displayUser.login.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{displayUser.login}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <ListMenu>
            {accounts.length > 0 && (
              <ListMenuContent maxHeight="240px">
                {accounts.map((acc) => {
                  const isActive = acc.id === activeId
                  return (
                    <ListMenuItem
                      key={acc.id}
                      active={isActive}
                      onClick={() => handleSwitch(acc.id)}
                      icon={
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={acc.user.avatar_url} alt={acc.user.login} />
                          <AvatarFallback>
                            {acc.user.login.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      }
                      title={acc.user.login}
                      description={acc.user.name ?? undefined}
                      trailing={isActive ? <Check className="w-4 h-4 text-primary" /> : undefined}
                      actionButton={
                        !isActive ? <Trash2 className="w-3.5 h-3.5 text-destructive" /> : undefined
                      }
                      onAction={!isActive ? () => removeAccount.mutate(acc.id) : undefined}
                      actionTitle={!isActive ? `Remove ${acc.user.login}` : undefined}
                    />
                  )
                })}
              </ListMenuContent>
            )}

            <ListMenuSeparator />

            <ListMenuItem
              icon={<Plus className="w-4 h-4" />}
              title="Add account"
              onClick={() => {
                setMenuOpen(false)
                setAddOpen(true)
              }}
            />

            {onToggleProfilePanel ? (
              <ListMenuItem
                icon={<BarChart3 className="w-4 h-4" />}
                title={profilePanelOpen ? 'Hide profile' : 'Show profile'}
                onClick={() => {
                  setMenuOpen(false)
                  onToggleProfilePanel()
                }}
              />
            ) : (
              <ListMenuItem
                icon={<BarChart3 className="w-4 h-4" />}
                title="View contributions"
                onClick={() => {
                  setMenuOpen(false)
                  setContribOpen(true)
                }}
              />
            )}

            {activeAccount && (
              <ListMenuItem
                icon={<LogOut className="w-4 h-4" />}
                title={`Sign out ${activeAccount.user.login}`}
                onClick={() => {
                  setMenuOpen(false)
                  removeAccount.mutate(activeAccount.id)
                }}
              />
            )}
          </ListMenu>
        </PopoverContent>
      </Popover>

      <ContributionsModal
        user={displayUser}
        open={contribOpen}
        onOpenChange={setContribOpen}
        hideTrigger
      />
      <AddAccountModal open={addOpen} onOpenChange={setAddOpen} />
    </>
  )
}
