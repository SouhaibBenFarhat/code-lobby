/**
 * Tests for QuickActions and AddCustomPromptModal components
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertCircle, MessageSquare } from 'lucide-react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CustomPrompt, QuickPrompt } from '../../types'
import { AddCustomPromptModal } from '../AddCustomPromptModal'
import { QuickActions } from './QuickActions'

const mockPrompts: QuickPrompt[] = [
  {
    id: 'find-bugs',
    label: 'Find bugs',
    icon: React.createElement(AlertCircle, { className: 'w-3 h-3' }),
    prompt: 'Review this PR for bugs.'
  },
  {
    id: 'summarize',
    label: 'Summarize',
    icon: React.createElement(MessageSquare, { className: 'w-3 h-3' }),
    prompt: 'Summarize this PR.'
  }
]

const mockCustomPrompts: CustomPrompt[] = [
  {
    id: 'custom-1',
    label: 'Check Types',
    prompt: 'Check for TypeScript errors.',
    createdAt: new Date().toISOString()
  }
]

describe('QuickActions', () => {
  const mockOnSelect = vi.fn()
  const mockOnAddCustomPrompt = vi.fn().mockResolvedValue(undefined)
  const mockOnDeleteCustomPrompt = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render built-in prompts', () => {
    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={[]}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    expect(screen.getByText('Find bugs')).toBeInTheDocument()
    expect(screen.getByText('Summarize')).toBeInTheDocument()
  })

  it('should render custom prompts', () => {
    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={mockCustomPrompts}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    expect(screen.getByText('Check Types')).toBeInTheDocument()
  })

  it('should call onSelect when prompt is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={[]}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    await user.click(screen.getByText('Find bugs'))
    expect(mockOnSelect).toHaveBeenCalledWith('Review this PR for bugs.', 'Find bugs')
  })

  it('should call onSelect with custom prompt content', async () => {
    const user = userEvent.setup()

    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={mockCustomPrompts}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    await user.click(screen.getByText('Check Types'))
    expect(mockOnSelect).toHaveBeenCalledWith('Check for TypeScript errors.', 'Check Types')
  })

  it('should disable buttons when disabled prop is true', () => {
    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={[]}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
        disabled={true}
      />
    )

    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })

  it('should open modal when add button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={[]}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    await user.click(screen.getByTitle('Add custom prompt'))

    // Modal should be visible
    expect(screen.getByText('Create Custom Prompt')).toBeInTheDocument()
  })

  it('should call onDeleteCustomPrompt when delete button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={mockCustomPrompts}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    // Find the delete button (it's hidden by default, shown on hover)
    const deleteButton = screen.getByTitle('Delete prompt')
    await user.click(deleteButton)

    expect(mockOnDeleteCustomPrompt).toHaveBeenCalledWith('custom-1')
  })

  it('should render add button at the start', () => {
    render(
      <QuickActions
        prompts={mockPrompts}
        customPrompts={mockCustomPrompts}
        onSelect={mockOnSelect}
        onAddCustomPrompt={mockOnAddCustomPrompt}
        onDeleteCustomPrompt={mockOnDeleteCustomPrompt}
      />
    )

    const buttons = screen.getAllByRole('button')
    // First button should be the add button
    expect(buttons[0]).toHaveAttribute('title', 'Add custom prompt')
  })
})

describe('AddCustomPromptModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render when open', () => {
    render(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    expect(screen.getByText('Create Custom Prompt')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Check types, Find bugs/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Write your prompt here/)).toBeInTheDocument()
  })

  it('should not render when closed', () => {
    render(<AddCustomPromptModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />)

    expect(screen.queryByText('Create Custom Prompt')).not.toBeInTheDocument()
  })

  it('should call onSave with label and prompt', async () => {
    // Reset mock before test
    mockOnSave.mockReset()
    mockOnSave.mockResolvedValue(undefined)

    render(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    // Use fireEvent for more reliable input in modal context
    const labelInput = screen.getByPlaceholderText(/Check types, Find bugs/)
    const promptInput = screen.getByPlaceholderText(/Write your prompt here/)

    // Simulate typing with fireEvent.change
    fireEvent.change(labelInput, { target: { value: 'Test Label' } })
    fireEvent.change(promptInput, { target: { value: 'Test prompt content' } })

    // Verify the values are set
    expect(labelInput).toHaveValue('Test Label')
    expect(promptInput).toHaveValue('Test prompt content')

    // Find and click save button
    const buttons = screen.getAllByRole('button')
    const saveButton = buttons.find((btn) => btn.textContent?.includes('Save Prompt'))
    if (!saveButton) throw new Error('Save button not found')

    // Button should not be disabled now
    expect(saveButton).not.toBeDisabled()

    fireEvent.click(saveButton)

    // Wait for the async save to complete
    await waitFor(
      () => {
        expect(mockOnSave).toHaveBeenCalledWith('Test Label', 'Test prompt content')
      },
      { timeout: 2000 }
    )
  })

  it('should show error when label is empty', () => {
    render(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    // Only fill in prompt, not label
    const promptInput = screen.getByPlaceholderText(/Write your prompt here/)
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } })

    // Save button should be disabled - find by role and check text content
    const buttons = screen.getAllByRole('button')
    const saveButton = buttons.find((btn) => btn.textContent?.includes('Save Prompt'))
    expect(saveButton).toBeDefined()
    expect(saveButton).toBeDisabled()
  })

  it('should show error when prompt is empty', () => {
    render(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    // Only fill in label, not prompt
    const labelInput = screen.getByPlaceholderText(/Check types, Find bugs/)
    fireEvent.change(labelInput, { target: { value: 'Test Label' } })

    // Save button should be disabled - find by role and check text content
    const buttons = screen.getAllByRole('button')
    const saveButton = buttons.find((btn) => btn.textContent?.includes('Save Prompt'))
    expect(saveButton).toBeDefined()
    expect(saveButton).toBeDisabled()
  })

  it('should show character count for label', async () => {
    const user = userEvent.setup()

    render(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    await user.type(screen.getByPlaceholderText(/Check types, Find bugs/), 'Hello')

    expect(screen.getByText('5/30 characters')).toBeInTheDocument()
  })

  it('should call onClose when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should reset form when closed', async () => {
    const user = userEvent.setup()

    const { rerender } = render(
      <AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />
    )

    // Type something
    await user.type(screen.getByPlaceholderText(/Check types, Find bugs/), 'Test')

    // Close and reopen
    rerender(<AddCustomPromptModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />)
    rerender(<AddCustomPromptModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />)

    // Should be empty
    expect(screen.getByPlaceholderText(/Check types, Find bugs/)).toHaveValue('')
  })
})
