/**
 * Sheet Component Tests
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from './Sheet'

describe('Sheet', () => {
  const renderSheet = (props = {}) =>
    render(
      <Sheet {...props}>
        <SheetTrigger>Open Sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Sheet Title</SheetTitle>
            <SheetDescription>Sheet description text</SheetDescription>
          </SheetHeader>
          <div>Sheet content</div>
          <SheetFooter>
            <SheetClose>Close</SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )

  describe('rendering', () => {
    it('should render trigger button', () => {
      renderSheet()
      expect(screen.getByText('Open Sheet')).toBeInTheDocument()
    })

    it('should not show content initially', () => {
      renderSheet()
      expect(screen.queryByText('Sheet Title')).not.toBeInTheDocument()
    })

    it('should show content when opened', async () => {
      renderSheet()
      fireEvent.click(screen.getByText('Open Sheet'))
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument()
      })
    })
  })

  describe('interactions', () => {
    it('should have close button when opened', async () => {
      renderSheet()

      // Open sheet
      fireEvent.click(screen.getByText('Open Sheet'))
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument()
      })

      // Find close buttons - should be present
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      expect(closeButtons.length).toBeGreaterThan(0)
    })

    it('should render SheetClose within footer', async () => {
      renderSheet()

      // Open sheet
      fireEvent.click(screen.getByText('Open Sheet'))
      await waitFor(() => {
        expect(screen.getByText('Sheet Title')).toBeInTheDocument()
      })

      // SheetClose is rendered - there will be multiple close elements
      const closeElements = screen.getAllByText(/close/i)
      expect(closeElements.length).toBeGreaterThan(0)
    })
  })

  describe('modal prop', () => {
    it('should be modal by default', () => {
      renderSheet()
      fireEvent.click(screen.getByText('Open Sheet'))
      // Modal sheets have an overlay
      expect(document.querySelector('[data-state="open"]')).toBeInTheDocument()
    })
  })
})

describe('SheetContent', () => {
  describe('side variants', () => {
    it('should apply right side by default', async () => {
      render(
        <Sheet open>
          <SheetContent data-testid="sheet-content">Content</SheetContent>
        </Sheet>
      )
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('right-0')
    })

    it('should apply left side', async () => {
      render(
        <Sheet open>
          <SheetContent side="left" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>
      )
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('left-0')
    })

    it('should apply top side', async () => {
      render(
        <Sheet open>
          <SheetContent side="top" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>
      )
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('top-14', 'inset-x-0')
    })

    it('should apply bottom side', async () => {
      render(
        <Sheet open>
          <SheetContent side="bottom" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>
      )
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('bottom-0', 'inset-x-0')
    })
  })

  describe('showOverlay prop', () => {
    it('should show overlay by default', () => {
      render(
        <Sheet open>
          <SheetContent>Content</SheetContent>
        </Sheet>
      )
      // Overlay has fixed positioning and bg-black/50
      const overlay = document.querySelector('.bg-black\\/50')
      expect(overlay).toBeInTheDocument()
    })

    it('should hide overlay when showOverlay is false', () => {
      render(
        <Sheet open>
          <SheetContent showOverlay={false}>Content</SheetContent>
        </Sheet>
      )
      const overlay = document.querySelector('.bg-black\\/50')
      expect(overlay).not.toBeInTheDocument()
    })
  })

  describe('hideCloseButton prop', () => {
    it('should show close button by default', () => {
      render(
        <Sheet open>
          <SheetContent>Content</SheetContent>
        </Sheet>
      )
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
    })

    it('should hide close button when hideCloseButton is true', () => {
      render(
        <Sheet open>
          <SheetContent hideCloseButton>Content</SheetContent>
        </Sheet>
      )
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should merge custom className', () => {
      render(
        <Sheet open>
          <SheetContent className="custom-class" data-testid="sheet-content">
            Content
          </SheetContent>
        </Sheet>
      )
      const content = screen.getByTestId('sheet-content')
      expect(content).toHaveClass('custom-class')
      expect(content).toHaveClass('bg-background') // Default class
    })
  })
})

describe('SheetHeader', () => {
  it('should render children', () => {
    render(<SheetHeader>Header content</SheetHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })

  it('should have default styles', () => {
    render(<SheetHeader data-testid="header">Header</SheetHeader>)
    const header = screen.getByTestId('header')
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-2')
  })

  it('should merge custom className', () => {
    render(
      <SheetHeader className="custom-header" data-testid="header">
        Header
      </SheetHeader>
    )
    const header = screen.getByTestId('header')
    expect(header).toHaveClass('custom-header')
    expect(header).toHaveClass('flex')
  })
})

describe('SheetFooter', () => {
  it('should render children', () => {
    render(<SheetFooter>Footer content</SheetFooter>)
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('should have default styles', () => {
    render(<SheetFooter data-testid="footer">Footer</SheetFooter>)
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveClass('flex', 'flex-col-reverse')
  })

  it('should merge custom className', () => {
    render(
      <SheetFooter className="custom-footer" data-testid="footer">
        Footer
      </SheetFooter>
    )
    const footer = screen.getByTestId('footer')
    expect(footer).toHaveClass('custom-footer')
    expect(footer).toHaveClass('flex')
  })
})

describe('SheetTitle', () => {
  it('should render with correct role', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument()
  })

  it('should forward ref', () => {
    const ref = createRef<HTMLHeadingElement>()
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle ref={ref}>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
  })

  it('should have default styles', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>
    )
    const title = screen.getByRole('heading', { name: 'Title' })
    expect(title).toHaveClass('text-lg', 'font-semibold')
  })
})

describe('SheetDescription', () => {
  it('should render description text', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetDescription>Description text</SheetDescription>
        </SheetContent>
      </Sheet>
    )
    expect(screen.getByText('Description text')).toBeInTheDocument()
  })

  it('should forward ref', () => {
    const ref = createRef<HTMLParagraphElement>()
    render(
      <Sheet open>
        <SheetContent>
          <SheetDescription ref={ref}>Description</SheetDescription>
        </SheetContent>
      </Sheet>
    )
    expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
  })

  it('should have default styles', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetDescription data-testid="desc">Description</SheetDescription>
        </SheetContent>
      </Sheet>
    )
    const desc = screen.getByTestId('desc')
    expect(desc).toHaveClass('text-sm', 'text-muted-foreground')
  })
})
