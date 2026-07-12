/**
 * ResizeHandle Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ResizeHandle } from './ResizeHandle'

describe('ResizeHandle', () => {
  describe('rendering', () => {
    it('should render a button element', () => {
      render(<ResizeHandle direction="horizontal" />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should forward ref to button element', () => {
      const ref = createRef<HTMLButtonElement>()
      render(<ResizeHandle ref={ref} direction="horizontal" />)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('should have type="button" attribute', () => {
      render(<ResizeHandle direction="horizontal" />)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('should render a grip indicator element', () => {
      render(<ResizeHandle direction="horizontal" />)
      const grip = screen.getByRole('button').querySelector('span')
      expect(grip).toBeInTheDocument()
      expect(grip).toHaveClass('rounded-full')
    })
  })

  describe('direction variants', () => {
    describe('horizontal direction', () => {
      it('should apply horizontal resize styles', () => {
        render(<ResizeHandle direction="horizontal" />)
        expect(screen.getByRole('button')).toHaveClass('w-px', 'cursor-col-resize')
      })

      it('should have correct aria-label for horizontal resize', () => {
        render(<ResizeHandle direction="horizontal" />)
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Resize panel width')
      })
    })

    describe('vertical direction', () => {
      it('should apply vertical resize styles', () => {
        render(<ResizeHandle direction="vertical" />)
        expect(screen.getByRole('button')).toHaveClass('h-px', 'w-full', 'cursor-row-resize')
      })

      it('should have correct aria-label for vertical resize', () => {
        render(<ResizeHandle direction="vertical" />)
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Resize panel height')
      })
    })
  })

  describe('isResizing state', () => {
    it('should show a prominent grip while resizing', () => {
      render(<ResizeHandle direction="horizontal" isResizing />)
      const grip = screen.getByRole('button').querySelector('span')
      expect(grip).toHaveClass('bg-foreground-muted')
    })

    it('should show a prominent grip while resizing (vertical)', () => {
      render(<ResizeHandle direction="vertical" isResizing />)
      const grip = screen.getByRole('button').querySelector('span')
      expect(grip).toHaveClass('bg-foreground-muted', 'w-14')
    })

    it('should hide the grip at rest and reveal it on hover', () => {
      render(<ResizeHandle direction="horizontal" isResizing={false} />)
      const grip = screen.getByRole('button').querySelector('span')
      expect(grip).toHaveClass('opacity-0')
      expect(grip).toHaveClass('group-hover:opacity-100')
    })

    it('should default isResizing to false (grip hidden until hover)', () => {
      render(<ResizeHandle direction="horizontal" />)
      const grip = screen.getByRole('button').querySelector('span')
      expect(grip).toHaveClass('opacity-0')
    })

    it('should never render a solid divider/primary line on the button', () => {
      render(<ResizeHandle direction="horizontal" isResizing />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('bg-transparent')
      expect(handle).not.toHaveClass('bg-primary')
      expect(handle).not.toHaveClass('bg-border')
    })
  })

  describe('interactions', () => {
    it('should call onMouseDown handler when pressed', () => {
      const handleMouseDown = vi.fn()
      render(<ResizeHandle direction="horizontal" onMouseDown={handleMouseDown} />)
      fireEvent.mouseDown(screen.getByRole('button'))
      expect(handleMouseDown).toHaveBeenCalledTimes(1)
    })

    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<ResizeHandle direction="horizontal" onClick={handleClick} />)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('base styles', () => {
    it('should have common base styles', () => {
      render(<ResizeHandle direction="horizontal" />)
      expect(screen.getByRole('button')).toHaveClass('border-0', 'p-0', 'flex-shrink-0', 'group')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with variant classes', () => {
      render(<ResizeHandle direction="horizontal" className="custom-class" />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('custom-class')
      expect(handle).toHaveClass('cursor-col-resize') // Still has direction class
    })
  })

  describe('HTML attributes', () => {
    it('should pass through HTML button attributes', () => {
      render(<ResizeHandle direction="horizontal" data-testid="test-handle" id="resize-handle-1" />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveAttribute('data-testid', 'test-handle')
      expect(handle).toHaveAttribute('id', 'resize-handle-1')
    })
  })

  describe('combined props', () => {
    it('should work with all props combined', () => {
      const handleMouseDown = vi.fn()
      render(
        <ResizeHandle
          direction="horizontal"
          isResizing
          className="extra-class"
          onMouseDown={handleMouseDown}
          data-testid="combined-handle"
        />
      )

      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('w-px', 'cursor-col-resize', 'extra-class')
      expect(handle.querySelector('span')).toHaveClass('bg-foreground-muted')

      fireEvent.mouseDown(handle)
      expect(handleMouseDown).toHaveBeenCalledTimes(1)
    })
  })
})
