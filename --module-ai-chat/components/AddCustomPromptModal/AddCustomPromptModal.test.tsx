import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddCustomPromptModal } from './AddCustomPromptModal'

describe('AddCustomPromptModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()
  // Radix Dialog locks the body with `pointer-events: none` while open, and userEvent
  // v14 refuses to click elements without pointer events — a race with the dialog's
  // mount/animation that surfaced as CI-only flakiness. `pointerEventsCheck: 0` disables
  // that check so button clicks are deterministic across environments.
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSave.mockResolvedValue(undefined)
    user = userEvent.setup({ pointerEventsCheck: 0 })
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
      await user.type(labelInput, 'Test')
      expect(screen.getByText('4/30 characters')).toBeInTheDocument()
    })

    it('enforces max length on label', async () => {
      renderModal()
      const labelInput = screen.getByPlaceholderText(/Check types/)
      const longText = 'a'.repeat(35)
      await user.type(labelInput, longText)
      expect((labelInput as HTMLInputElement).value.length).toBeLessThanOrEqual(30)
    })
  })

  describe('form submission', () => {
    it('calls onSave with trimmed values when form is valid', async () => {
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      // Set values atomically (fireEvent.change) instead of typing char-by-char: the
      // modal's delayed autofocus (setTimeout(…, 100)) can steal focus mid-type under
      // load and misroute the tail of the prompt into the label field.
      fireEvent.change(labelInput, { target: { value: '  My Label  ' } })
      fireEvent.change(promptTextarea, { target: { value: '  My Prompt  ' } })

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(
        () => {
          expect(mockOnSave).toHaveBeenCalledWith('My Label', 'My Prompt')
        },
        { timeout: 3000 }
      )
    })

    it('closes modal after successful save', async () => {
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      fireEvent.change(labelInput, { target: { value: 'Label' } })
      fireEvent.change(promptTextarea, { target: { value: 'Prompt' } })

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })

    it('shows error when save fails', async () => {
      mockOnSave.mockRejectedValueOnce(new Error('Save failed'))
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      fireEvent.change(labelInput, { target: { value: 'Label' } })
      fireEvent.change(promptTextarea, { target: { value: 'Prompt' } })

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to save prompt')).toBeInTheDocument()
      })
    })

    it('shows loading state while saving', async () => {
      mockOnSave.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 1000)))
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      fireEvent.change(labelInput, { target: { value: 'Label' } })
      fireEvent.change(promptTextarea, { target: { value: 'Prompt' } })

      const saveButton = screen.getByRole('button', { name: /save prompt/i })
      await waitFor(() => expect(saveButton).toBeEnabled())
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument()
      })
    })
  })

  describe('keyboard shortcuts', () => {
    it('saves on Cmd+Enter', async () => {
      renderModal()

      const labelInput = screen.getByPlaceholderText(/Check types/)
      const promptTextarea = screen.getByPlaceholderText(/Write your prompt here/)

      fireEvent.change(labelInput, { target: { value: 'Label' } })
      fireEvent.change(promptTextarea, { target: { value: 'Prompt' } })

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
      await user.click(cancelButton)

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled()
      })
    })
  })
})
