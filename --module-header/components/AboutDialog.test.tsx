/**
 * AboutDialog Tests
 */

import { fireEvent, render, screen, waitFor } from '@test-utils'
import { describe, expect, it, vi } from 'vitest'
import { AboutDialog } from './AboutDialog'

describe('AboutDialog', () => {
  it('renders the features book content when controlled open is true', () => {
    render(<AboutDialog open onOpenChange={vi.fn()} />)

    expect(screen.getByText(/What is CodeLobby\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Built with/i)).toBeInTheDocument()
  })

  it('renders nothing when closed (no trigger button in controlled mode)', () => {
    render(<AboutDialog open={false} onOpenChange={vi.fn()} />)

    expect(screen.queryByText(/Built with/i)).not.toBeInTheDocument()
    // Controlled mode must not render the standalone Book trigger button
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('runs the factory reset flow and closes on success', async () => {
    const onOpenChange = vi.fn()
    const onFactoryReset = vi.fn()

    render(<AboutDialog open onOpenChange={onOpenChange} onFactoryReset={onFactoryReset} />)

    fireEvent.click(screen.getByRole('button', { name: /Factory Reset/i }))
    expect(screen.getByText(/erase ALL data/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Yes, Erase Everything/i }))

    await waitFor(() => expect(onFactoryReset).toHaveBeenCalled())
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('can cancel the factory reset confirmation', () => {
    render(<AboutDialog open onOpenChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Factory Reset/i }))
    expect(screen.getByText(/erase ALL data/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(screen.queryByText(/erase ALL data/i)).not.toBeInTheDocument()
  })

  describe('uncontrolled (standalone) mode', () => {
    it('renders its own Book trigger button, closed by default', () => {
      render(<AboutDialog />)

      // The default trigger button is shown when no `open` prop is provided
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.queryByText(/Built with/i)).not.toBeInTheDocument()
    })

    it('opens the modal from its own trigger', () => {
      render(<AboutDialog />)

      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText(/What is CodeLobby\?/i)).toBeInTheDocument()
    })

    it('renders a custom trigger when provided', () => {
      render(<AboutDialog trigger={<button type="button">Open about</button>} />)

      expect(screen.getByRole('button', { name: 'Open about' })).toBeInTheDocument()
    })
  })
})
