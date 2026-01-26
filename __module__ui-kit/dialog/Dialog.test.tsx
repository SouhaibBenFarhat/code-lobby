/**
 * Dialog Component Tests
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './Dialog'

describe('Dialog', () => {
  describe('Dialog (root)', () => {
    it('should render dialog when open', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Dialog')).toBeInTheDocument()
      })
    })

    it('should not render dialog content when closed', () => {
      render(
        <Dialog open={false}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Hidden Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      expect(screen.queryByText('Hidden Dialog')).not.toBeInTheDocument()
    })
  })

  describe('DialogTrigger', () => {
    it('should open dialog when clicked', async () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button type="button">Open Dialog</button>
          </DialogTrigger>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Opened Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      const trigger = screen.getByRole('button', { name: /open dialog/i })
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Opened Dialog')).toBeInTheDocument()
      })
    })
  })

  describe('DialogContent', () => {
    it('should render children', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Test Title</DialogTitle>
            <p>Dialog body content</p>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText('Dialog body content')).toBeInTheDocument()
      })
    })

    it('should apply custom className', async () => {
      render(
        <Dialog open>
          <DialogContent
            className="custom-dialog"
            data-testid="dialog-content"
            aria-describedby={undefined}
          >
            <DialogTitle>Styled Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        const content = screen.getByTestId('dialog-content')
        expect(content).toHaveClass('custom-dialog')
      })
    })

    it('should have close button', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog with Close</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
      })
    })

    it('should close when close button is clicked', async () => {
      const onOpenChange = vi.fn()
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Closable Dialog</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText('Closable Dialog')).toBeInTheDocument()
      })

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('DialogHeader', () => {
    it('should render header content', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Header Title</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByTestId('dialog-header')).toBeInTheDocument()
      })
    })

    it('should apply default flex column styles', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader data-testid="dialog-header">
              <DialogTitle>Header</DialogTitle>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        const header = screen.getByTestId('dialog-header')
        expect(header).toHaveClass('flex', 'flex-col')
      })
    })
  })

  describe('DialogFooter', () => {
    it('should render footer content', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog</DialogTitle>
            <DialogFooter data-testid="dialog-footer">
              <button type="button">Cancel</button>
              <button type="button">Confirm</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
      })
    })

    it('should apply flex row justify-end styles on sm', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog</DialogTitle>
            <DialogFooter data-testid="dialog-footer">
              <button type="button">Button</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        const footer = screen.getByTestId('dialog-footer')
        expect(footer).toHaveClass('sm:flex-row', 'sm:justify-end')
      })
    })
  })

  describe('DialogTitle', () => {
    it('should render as heading', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog Heading</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        // DialogTitle from Radix uses an h2 by default
        expect(screen.getByText('Dialog Heading')).toBeInTheDocument()
      })
    })

    it('should apply default styles', async () => {
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle data-testid="dialog-title">Styled Title</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        const title = screen.getByTestId('dialog-title')
        expect(title).toHaveClass('text-lg', 'font-semibold')
      })
    })

    it('should forward ref', async () => {
      const ref = createRef<HTMLHeadingElement>()
      render(
        <Dialog open>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle ref={ref}>Ref Title</DialogTitle>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
      })
    })
  })

  describe('DialogDescription', () => {
    it('should render description text', async () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>This is a dialog description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText('This is a dialog description')).toBeInTheDocument()
      })
    })

    it('should apply muted foreground style', async () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription data-testid="dialog-desc">Description</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        const desc = screen.getByTestId('dialog-desc')
        expect(desc).toHaveClass('text-sm', 'text-muted-foreground')
      })
    })
  })

  describe('DialogClose', () => {
    it('should close dialog when clicked', async () => {
      const onOpenChange = vi.fn()
      render(
        <Dialog open onOpenChange={onOpenChange}>
          <DialogContent aria-describedby={undefined}>
            <DialogTitle>Dialog with Custom Close</DialogTitle>
            <DialogClose asChild>
              <button type="button">Custom Close</button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText('Custom Close')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Custom Close'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('composition', () => {
    it('should compose all dialog components correctly', async () => {
      render(
        <Dialog open>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Dialog</DialogTitle>
              <DialogDescription>A fully composed dialog example</DialogDescription>
            </DialogHeader>
            <div>Main content area</div>
            <DialogFooter>
              <DialogClose asChild>
                <button type="button">Cancel</button>
              </DialogClose>
              <button type="button">Save</button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )

      await waitFor(() => {
        expect(screen.getByText('Complete Dialog')).toBeInTheDocument()
        expect(screen.getByText('A fully composed dialog example')).toBeInTheDocument()
        expect(screen.getByText('Main content area')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      })
    })
  })
})
