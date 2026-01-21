import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChatHeader } from './ChatHeader'

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
    showConversations: false,
    showSettings: false,
    onShowConversationsChange: vi.fn(),
    onShowSettingsChange: vi.fn(),
    onClosePRChat: vi.fn(),
    onSwitchToPRChat: vi.fn(),
    onClearHistory: vi.fn(),
    onClose: vi.fn(),
    onDeletePRChat: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('title display', () => {
    it('shows AI Assistant title when no PR chat', () => {
      render(<ChatHeader {...defaultProps} />)
      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('shows PR Chat title when linkedPRChat exists', () => {
      render(
        <ChatHeader
          {...defaultProps}
          linkedPRChat={{
            prId: 'owner/repo#42',
            prNumber: 42,
            prTitle: 'Test PR',
            repoFullName: 'owner/repo'
          }}
        />
      )
      expect(screen.getByText('PR Chat')).toBeInTheDocument()
      expect(screen.getByText('#42')).toBeInTheDocument()
    })

    it('shows model name when no PR chat and API key exists', () => {
      render(<ChatHeader {...defaultProps} />)
      expect(screen.getByText('(Claude 3.5 Sonnet)')).toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('renders close button', () => {
      render(<ChatHeader {...defaultProps} />)
      const closeButton = screen.getByRole('button', { name: '' })
      expect(closeButton).toBeInTheDocument()
    })

    it('calls onClose when close button clicked', async () => {
      render(<ChatHeader {...defaultProps} />)
      // Find the last button which should be close
      const buttons = screen.getAllByRole('button')
      const closeButton = buttons[buttons.length - 1]
      await userEvent.click(closeButton)
      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('shows settings button when API key exists', () => {
      render(<ChatHeader {...defaultProps} />)
      const settingsButton = screen.getByTitle('Settings')
      expect(settingsButton).toBeInTheDocument()
    })

    it('calls onShowSettingsChange when settings button clicked', async () => {
      render(<ChatHeader {...defaultProps} />)
      const settingsButton = screen.getByTitle('Settings')
      await userEvent.click(settingsButton)
      expect(defaultProps.onShowSettingsChange).toHaveBeenCalledWith(true)
    })

    it('shows clear chat button when API key exists', () => {
      render(<ChatHeader {...defaultProps} />)
      const clearButton = screen.getByTitle('Clear chat')
      expect(clearButton).toBeInTheDocument()
    })

    it('calls onClearHistory when clear button clicked', async () => {
      render(<ChatHeader {...defaultProps} />)
      const clearButton = screen.getByTitle('Clear chat')
      await userEvent.click(clearButton)
      expect(defaultProps.onClearHistory).toHaveBeenCalled()
    })

    it('hides settings and clear buttons when no API key', () => {
      render(<ChatHeader {...defaultProps} apiKey={null} />)
      expect(screen.queryByTitle('Settings')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Clear chat')).not.toBeInTheDocument()
    })
  })

  describe('back to general chat button', () => {
    it('shows back button when linkedPRChat exists', () => {
      render(
        <ChatHeader
          {...defaultProps}
          linkedPRChat={{
            prId: 'owner/repo#42',
            prNumber: 42,
            prTitle: 'Test PR',
            repoFullName: 'owner/repo'
          }}
        />
      )
      expect(screen.getByTitle('Back to general chat')).toBeInTheDocument()
    })

    it('calls onClosePRChat when back button clicked', async () => {
      render(
        <ChatHeader
          {...defaultProps}
          linkedPRChat={{
            prId: 'owner/repo#42',
            prNumber: 42,
            prTitle: 'Test PR',
            repoFullName: 'owner/repo'
          }}
        />
      )
      const backButton = screen.getByTitle('Back to general chat')
      await userEvent.click(backButton)
      expect(defaultProps.onClosePRChat).toHaveBeenCalled()
    })
  })

  describe('conversation navigator', () => {
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

    it('shows conversation button with count when PR chats exist', () => {
      render(<ChatHeader {...defaultProps} allPRChats={prChats} />)
      const navButton = screen.getByTitle('Switch conversation')
      expect(navButton).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('hides conversation button when no PR chats', () => {
      render(<ChatHeader {...defaultProps} allPRChats={[]} />)
      expect(screen.queryByTitle('Switch conversation')).not.toBeInTheDocument()
    })

    it('opens popover when conversation button clicked', async () => {
      render(<ChatHeader {...defaultProps} allPRChats={prChats} showConversations={true} />)

      expect(screen.getByText('Conversations')).toBeInTheDocument()
      expect(screen.getByText('General Chat')).toBeInTheDocument()
    })

    it('shows all PR chats in popover', () => {
      render(<ChatHeader {...defaultProps} allPRChats={prChats} showConversations={true} />)

      expect(screen.getByText('#1 First PR')).toBeInTheDocument()
      expect(screen.getByText('#2 Second PR')).toBeInTheDocument()
    })

    it('highlights active general chat', () => {
      render(
        <ChatHeader
          {...defaultProps}
          allPRChats={prChats}
          showConversations={true}
          linkedPRChat={null}
        />
      )

      expect(screen.getByText('Active')).toBeInTheDocument()
    })

    it('highlights active PR chat', () => {
      render(
        <ChatHeader
          {...defaultProps}
          allPRChats={prChats}
          showConversations={true}
          linkedPRChat={{
            prId: 'owner/repo#1',
            prNumber: 1,
            prTitle: 'First PR',
            repoFullName: 'owner/repo'
          }}
        />
      )

      // Should show "Active" badge on the PR chat
      const activeElements = screen.getAllByText('Active')
      expect(activeElements.length).toBeGreaterThan(0)
    })

    it('calls onSwitchToPRChat when PR chat selected', async () => {
      render(<ChatHeader {...defaultProps} allPRChats={prChats} showConversations={true} />)

      const prChatButton = screen.getByText('#1 First PR')
      await userEvent.click(prChatButton)

      expect(defaultProps.onSwitchToPRChat).toHaveBeenCalledWith('owner/repo#1')
    })

    it('calls onClosePRChat when general chat selected', async () => {
      render(
        <ChatHeader
          {...defaultProps}
          allPRChats={prChats}
          showConversations={true}
          linkedPRChat={{
            prId: 'owner/repo#1',
            prNumber: 1,
            prTitle: 'First PR',
            repoFullName: 'owner/repo'
          }}
        />
      )

      const generalChatButton = screen.getByText('General Chat')
      await userEvent.click(generalChatButton)

      expect(defaultProps.onClosePRChat).toHaveBeenCalled()
    })

    it('shows delete button on hover and calls onDeletePRChat', async () => {
      render(<ChatHeader {...defaultProps} allPRChats={prChats} showConversations={true} />)

      // Find and click the delete button (X icon)
      const deleteButtons = screen.getAllByTitle('Delete conversation')
      await userEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(defaultProps.onDeletePRChat).toHaveBeenCalledWith('owner/repo#1')
      })
    })
  })
})
