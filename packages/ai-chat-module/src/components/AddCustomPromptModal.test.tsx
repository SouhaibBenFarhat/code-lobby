import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddCustomPromptModal } from './AddCustomPromptModal'

describe('AddCustomPromptModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSave.mockResolvedValue(undefined)
  })

  const renderModal = (isOpen = true) => {
    return render(
      <AddCustomPromptModal isOpen={isOpen} onClose={mockOnClose} onSave={mockOnSave} />
    )
  }

  describe('rendering', () => {
    it('renders modal when open', () => {
      renderModal(true)
      expect(screen.getByText('Create Custom Prompt')).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Check types/)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Write your prompt here/)).toBeInTheDocument()
    })

    it('does not render modal content when closed', () => {
      renderModal(false)
      expect(screen.queryByText('Create Custom Prompt')).not.toBeInTheDocument()
    })

    it('renders cancel and save buttons', () => {
      renderModal()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save prompt/i })).toBeInTheDocument()
    })

    it('shows character counter for label', () => {
      renderModal()
      expect(screen.getByText('0/30 characters')).toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('save button is disabled initially when both fields are empty', () => {
      renderModal()

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      expect(saveButton).toBeDisabled()
    })

    it('updates character counter when typing label', async () => {
      renderModal()
      const labelInput = screen.getByPlaceholderText(/Check types/)
      await userEvent.type(labelInput, 'Test')
      expect(screen.getByText('4/30 characters')).toBeInTheDocument()
    })

    it('enforces max length on label', async () => {
      renderModal()
      const labelInput = screen.getByPlaceholderText(/Check types/)
      const longText = 'a'.repeat(35)
      await userEvent.type(labelInput, longText)
      expect((labelInput as HTMLInputElement).value.length).toBeLessThanOrEqual(30)
    })
  })

  describe('form submission', () => {
    it('calls onSave with trimmed values when form is valid', async () => {
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      await userEvent.type(labelInput, '  My Label  ')
      await userEvent.type(promptTextarea, '  My Prompt  ')

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('My Label', 'My Prompt')
      })
    })

    it('closes modal after successful save', async () => {
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      await userEvent.type(labelInput, 'Label')
      await userEvent.type(promptTextarea, 'Prompt')

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('shows error when save fails', async () => {
      mockOnSave.mockRejectedValueOnce(new Error('Save failed'))
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      await userEvent.type(labelInput, 'Label')
      await userEvent.type(promptTextarea, 'Prompt')

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await userEvent.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to save prompt')).toBeInTheDocument()
      })
    })

    it('shows loading state while saving', async () => {
      mockOnSave.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      await userEvent.type(labelInput, 'Label')
      await userEvent.type(promptTextarea, 'Prompt')

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await userEvent.click(saveButton)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  describe('keyboard shortcuts', () => {
    it('saves on Cmd+Enter', async () => {
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      await userEvent.type(labelInput, 'Label')
      await userEvent.type(promptTextarea, 'Prompt')

      fireEvent.keyDown(promptTextarea, { key: 'Enter', metaKey: true })

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
  })

  describe('cancel behavior', () => {
    it('calls onClose when cancel button is clicked', async () => {
      renderModal()

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await userEvent.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})
