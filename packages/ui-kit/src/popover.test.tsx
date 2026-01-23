/**
 * Popover Component Tests
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

describe('Popover', () => {
  const renderPopover = (props?: {
    triggerText?: string
    contentText?: string
    contentProps?: Record<string, unknown>
    open?: boolean
    onOpenChange?: (open: boolean) => void
  }) => {
    const {
      triggerText = 'Open Popover',
      contentText = 'Popover content',
      contentProps = {},
      open,
      onOpenChange
    } = props || {}
    return render(
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button type="button">{triggerText}</button>
        </PopoverTrigger>
        <PopoverContent {...contentProps}>{contentText}</PopoverContent>
      </Popover>
    )
  }

  describe('PopoverTrigger', () => {
    it('should render trigger element', () => {
      renderPopover({ triggerText: 'Click me' })
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
    })

    it('should open popover when clicked', async () => {
      renderPopover({ contentText: 'Visible content' })

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Visible content')).toBeInTheDocument()
      })
    })

    it('should toggle popover on subsequent clicks', async () => {
      renderPopover({ contentText: 'Toggle content' })

      const trigger = screen.getByRole('button')

      // Open
      fireEvent.click(trigger)
      await waitFor(() => {
        expect(screen.getByText('Toggle content')).toBeInTheDocument()
      })

      // Close
      fireEvent.click(trigger)
      await waitFor(() => {
        expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
      })
    })

    it('should call onOpenChange when toggled', async () => {
      const onOpenChange = vi.fn()
      renderPopover({ onOpenChange })

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      expect(onOpenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('PopoverContent', () => {
    it('should render content when open', async () => {
      renderPopover({ open: true, contentText: 'Open content' })

      await waitFor(() => {
        expect(screen.getByText('Open content')).toBeInTheDocument()
      })
    })

    it('should not render content when closed', () => {
      renderPopover({ open: false, contentText: 'Hidden content' })
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('should apply default styles', async () => {
      renderPopover({
        open: true,
        contentText: 'Styled content',
        contentProps: { 'data-testid': 'popover-content' }
      })

      await waitFor(() => {
        const content = screen.getByTestId('popover-content')
        expect(content).toHaveClass('z-50', 'w-72', 'rounded-md', 'border', 'bg-popover', 'p-4')
      })
    })

    it('should apply custom className', async () => {
      renderPopover({
        open: true,
        contentText: 'Custom styled',
        contentProps: { className: 'custom-popover', 'data-testid': 'popover-content' }
      })

      await waitFor(() => {
        const content = screen.getByTestId('popover-content')
        expect(content).toHaveClass('custom-popover')
      })
    })

    it('should support different align values', async () => {
      render(
        <Popover open>
          <PopoverTrigger asChild>
            <button type="button">Trigger</button>
          </PopoverTrigger>
          <PopoverContent align="start" data-testid="popover-content">
            Aligned content
          </PopoverContent>
        </Popover>
      )

      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument()
      })
    })

    it('should support custom sideOffset', async () => {
      render(
        <Popover open>
          <PopoverTrigger asChild>
            <button type="button">Trigger</button>
          </PopoverTrigger>
          <PopoverContent sideOffset={10} data-testid="popover-content">
            Offset content
          </PopoverContent>
        </Popover>
      )

      await waitFor(() => {
        expect(screen.getByTestId('popover-content')).toBeInTheDocument()
      })
    })

    it('should forward ref', async () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <Popover open>
          <PopoverTrigger asChild>
            <button type="button">Trigger</button>
          </PopoverTrigger>
          <PopoverContent ref={ref}>Content</PopoverContent>
        </Popover>
      )

      await waitFor(() => {
        expect(ref.current).toBeInstanceOf(HTMLDivElement)
      })
    })
  })

  describe('controlled vs uncontrolled', () => {
    it('should work as controlled popover', async () => {
      const { rerender } = render(
        <Popover open={false}>
          <PopoverTrigger asChild>
            <button type="button">Trigger</button>
          </PopoverTrigger>
          <PopoverContent>Controlled content</PopoverContent>
        </Popover>
      )

      expect(screen.queryByText('Controlled content')).not.toBeInTheDocument()

      rerender(
        <Popover open={true}>
          <PopoverTrigger asChild>
            <button type="button">Trigger</button>
          </PopoverTrigger>
          <PopoverContent>Controlled content</PopoverContent>
        </Popover>
      )

      await waitFor(() => {
        expect(screen.getByText('Controlled content')).toBeInTheDocument()
      })
    })

    it('should work as uncontrolled popover', async () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <button type="button">Trigger</button>
          </PopoverTrigger>
          <PopoverContent>Uncontrolled content</PopoverContent>
        </Popover>
      )

      expect(screen.queryByText('Uncontrolled content')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByText('Uncontrolled content')).toBeInTheDocument()
      })
    })
  })

  describe('composition', () => {
    it('should work with complex content', async () => {
      render(
        <Popover open>
          <PopoverTrigger asChild>
            <button type="button">Open</button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <h4>Title</h4>
              <p>Description</p>
              <button type="button">Action</button>
            </div>
          </PopoverContent>
        </Popover>
      )

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Description')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
      })
    })

    it('should work with form elements inside', async () => {
      render(
        <Popover open>
          <PopoverTrigger asChild>
            <button type="button">Open Form</button>
          </PopoverTrigger>
          <PopoverContent>
            <label>
              Name:
              <input type="text" placeholder="Enter name" />
            </label>
          </PopoverContent>
        </Popover>
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument()
      })
    })
  })
})
