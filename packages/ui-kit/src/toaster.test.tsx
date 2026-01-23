/**
 * Toaster Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  Toaster,
  ToastProvider,
  ToastTitle,
  ToastViewport
} from './toaster'

describe('Toaster', () => {
  describe('Toast', () => {
    it('should render toast element', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast">Toast content</Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(screen.getByTestId('toast')).toBeInTheDocument()
    })

    it('should apply default variant styles', () => {
      render(
        <ToastProvider>
          <Toast data-testid="toast">Default toast</Toast>
          <ToastViewport />
        </ToastProvider>
      )
      const toastEl = screen.getByTestId('toast')
      expect(toastEl).toHaveClass('border', 'bg-background')
    })

    it('should apply destructive variant styles', () => {
      render(
        <ToastProvider>
          <Toast variant="destructive" data-testid="toast">
            Destructive toast
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      const toastEl = screen.getByTestId('toast')
      expect(toastEl).toHaveClass('destructive', 'bg-destructive')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLLIElement>()
      render(
        <ToastProvider>
          <Toast ref={ref}>Toast</Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(ref.current).toBeInstanceOf(HTMLLIElement)
    })
  })

  describe('ToastTitle', () => {
    it('should render title text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle>Toast Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(screen.getByText('Toast Title')).toBeInTheDocument()
    })

    it('should apply title styles', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle data-testid="title">Styled Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('text-sm', 'font-semibold')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <ToastProvider>
          <Toast>
            <ToastTitle ref={ref}>Title</ToastTitle>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('ToastDescription', () => {
    it('should render description text', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription>Toast description text</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(screen.getByText('Toast description text')).toBeInTheDocument()
    })

    it('should apply description styles', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription data-testid="desc">Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      const desc = screen.getByTestId('desc')
      expect(desc).toHaveClass('text-sm', 'opacity-90')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <ToastProvider>
          <Toast>
            <ToastDescription ref={ref}>Description</ToastDescription>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('ToastClose', () => {
    it('should render close button', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose data-testid="close" />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(screen.getByTestId('close')).toBeInTheDocument()
    })

    it('should render X icon', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastClose data-testid="close" />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      const closeBtn = screen.getByTestId('close')
      const svg = closeBtn.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLButtonElement>()
      render(
        <ToastProvider>
          <Toast>
            <ToastClose ref={ref} />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('ToastAction', () => {
    it('should render action button', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Undo action">Undo</ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(screen.getByText('Undo')).toBeInTheDocument()
    })

    it('should apply action styles', () => {
      render(
        <ToastProvider>
          <Toast>
            <ToastAction altText="Action" data-testid="action">
              Action
            </ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      const action = screen.getByTestId('action')
      expect(action).toHaveClass('inline-flex', 'h-8', 'rounded-md')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLButtonElement>()
      render(
        <ToastProvider>
          <Toast>
            <ToastAction ref={ref} altText="Action">
              Action
            </ToastAction>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('ToastViewport', () => {
    it('should render viewport container', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      )
      expect(screen.getByTestId('viewport')).toBeInTheDocument()
    })

    it('should apply viewport styles', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="viewport" />
        </ToastProvider>
      )
      const viewport = screen.getByTestId('viewport')
      expect(viewport).toHaveClass('fixed', 'top-0', 'z-[100]')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLOListElement>()
      render(
        <ToastProvider>
          <ToastViewport ref={ref} />
        </ToastProvider>
      )
      expect(ref.current).toBeInstanceOf(HTMLOListElement)
    })
  })

  describe('Toaster', () => {
    it('should render toaster container', () => {
      render(<Toaster />)
      // Toaster renders ToastProvider and ToastViewport
      expect(document.body).toContainHTML('ol')
    })
  })

  describe('composition', () => {
    it('should compose all toast parts correctly', () => {
      render(
        <ToastProvider>
          <Toast>
            <div className="grid gap-1">
              <ToastTitle>Scheduled: Catch up</ToastTitle>
              <ToastDescription>Friday, February 10, 2023 at 5:57 PM</ToastDescription>
            </div>
            <ToastAction altText="View more">View</ToastAction>
            <ToastClose />
          </Toast>
          <ToastViewport />
        </ToastProvider>
      )

      expect(screen.getByText('Scheduled: Catch up')).toBeInTheDocument()
      expect(screen.getByText('Friday, February 10, 2023 at 5:57 PM')).toBeInTheDocument()
      expect(screen.getByText('View')).toBeInTheDocument()
    })
  })
})
