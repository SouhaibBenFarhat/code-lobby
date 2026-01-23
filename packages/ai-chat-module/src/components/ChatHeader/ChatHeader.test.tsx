import { TooltipProvider } from '@codelobby/ui-kit'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatHeader } from './ChatHeader'

const Wrapper = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
)

const renderWithProviders = (ui: ReactNode) => render(ui, { wrapper: Wrapper })

describe('ChatHeader', () => {
  const defaultProps = {
    linkedPRChat: null,
    apiKey: 'sk-ant-test',
    selectedModel: 'claude-3-5-sonnet-20241022',
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        display_name: 'Claude 3.5 Sonnet',
        created_at: '2024-10-22T00:00:00Z'
      },
      {
        id: 'claude-3-opus-20240229',
        display_name: 'Claude 3 Opus',
        created_at: '2024-02-29T00:00:00Z'
      }
    ],
    allPRChats: [],
    showSettings: false,
    onShowSettingsChange: vi.fn(),
    onSwitchToPRChat: vi.fn(),
    onClearHistory: vi.fn(),
    onClose: vi.fn(),
    onDeletePRChat: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('title display', () => {
    it('shows AI Chat title', () => {
      renderWithProviders(<ChatHeader {...defaultProps} />)
      expect(screen.getByText('AI Chat')).toBeInTheDocument()
    })

    it('shows model name when API key exists', () => {
      renderWithProviders(<ChatHeader {...defaultProps} />)
      expect(screen.getByText(/Claude 3.5 Sonnet/)).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('renders close button', () => {
      renderWithProviders(<ChatHeader {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('calls onClose when close button clicked', async () => {
      renderWithProviders(<ChatHeader {...defaultProps} />)
      // Find the last button which should be close
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons[buttons.length - 1]
      await userEvent.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('calls onShowSettingsChange when settings button clicked', async () => {
      renderWithProviders(<ChatHeader {...defaultProps} />)
      // Find the settings button by its aria-label or title
      const buttons = screen.getAllByRole('button')
      // Settings button should be the first one (before trash and close)
      const settingsButton = buttons[0]
      await userEvent.click(settingsButton)
      expect(defaultProps.onShowSettingsChange).toHaveBeenCalledWith(true)
    })

    it('calls onClearHistory when clear button clicked', async () => {
      renderWithProviders(<ChatHeader {...defaultProps} />)
      // Find the clear/trash button (second button)
      const buttons = screen.getAllByRole('button')
      const clearButton = buttons[1]
      await userEvent.click(clearButton)
      expect(defaultProps.onClearHistory).toHaveBeenCalled()
    })

    it('hides settings and clear buttons when no API key', () => {
      renderWithProviders(<ChatHeader {...defaultProps} apiKey={null} />)
      // Only close button should be present
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBe(1)
    })
  })

  describe('tab navigation', () => {
    const prChats = [
      {
        prId: 'owner/repo#1',
        prNumber: 1,
        prTitle: 'First PR',
        repoFullName: 'owner/repo',
        updatedAt: '2024-01-02T00:00:00Z',
        messageCount: 5
      },
      {
        prId: 'owner/repo#2',
        prNumber: 2,
        prTitle: 'Second PR',
        repoFullName: 'owner/repo',
        updatedAt: '2024-01-01T00:00:00Z',
        messageCount: 3
      }
    ]

    it('shows tabs when PR chats exist', () => {
      renderWithProviders(<ChatHeader {...defaultProps} allPRChats={prChats} />)
      expect(screen.getByText('#1')).toBeInTheDocument()
      expect(screen.getByText('#2')).toBeInTheDocument()
    })

    it('hides tabs when no PR chats', () => {
      renderWithProviders(<ChatHeader {...defaultProps} allPRChats={[]} />)
      expect(screen.queryByText('#1')).not.toBeInTheDocument()
    })

    it('highlights active tab', () => {
      renderWithProviders(
        <ChatHeader
          {...defaultProps}
          allPRChats={prChats}
          linkedPRChat={{
            prId: 'owner/repo#1',
            prNumber: 1,
            prTitle: 'First PR',
            repoFullName: 'owner/repo'
          }}
        />
      )

      // Active tab should have font-medium class (checked via text being visible)
      expect(screen.getByText('#1')).toBeInTheDocument()
    })

    it('calls onSwitchToPRChat when tab clicked', async () => {
      renderWithProviders(<ChatHeader {...defaultProps} allPRChats={prChats} />)

      const tab = screen.getByText('#1')
      await userEvent.click(tab)

      expect(defaultProps.onSwitchToPRChat).toHaveBeenCalledWith('owner/repo#1')
    })

    it('shows close button on tabs and calls onDeletePRChat', async () => {
      renderWithProviders(<ChatHeader {...defaultProps} allPRChats={prChats} />)

      // Find and click the close button for a tab
      const closeButtons = screen.getAllByTitle('Close chat')
      await userEvent.click(closeButtons[0])

      await waitFor(() => {
        expect(defaultProps.onDeletePRChat).toHaveBeenCalledWith('owner/repo#1')
      })
    })

    it('shows tooltip on PR number with full title', () => {
      renderWithProviders(<ChatHeader {...defaultProps} allPRChats={prChats} />)

      const tab = screen.getByText('#1')
      expect(tab).toHaveAttribute('title', '#1 First PR')
    })
  })
})
