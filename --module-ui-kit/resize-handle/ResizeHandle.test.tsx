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
  })

  describe('direction variants', () => {
    describe('horizontal direction', () => {
      it('should apply horizontal resize styles', () => {
        render(<ResizeHandle direction="horizontal" />)
        const handle = screen.getByRole('button')
        expect(handle).toHaveClass('w-px', 'cursor-col-resize')
      })

      it('should have correct aria-label for horizontal resize', () => {
        render(<ResizeHandle direction="horizontal" />)
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Resize panel width')
      })

      it('should NOT have border for horizontal resize', () => {
        render(<ResizeHandle direction="horizontal" />)
        const handle = screen.getByRole('button')
        expect(handle).not.toHaveClass('border-t')
      })
    })

    describe('vertical direction', () => {
      it('should apply vertical resize styles', () => {
        render(<ResizeHandle direction="vertical" />)
        const handle = screen.getByRole('button')
        expect(handle).toHaveClass('h-px', 'w-full', 'cursor-row-resize')
      })

      it('should have correct aria-label for vertical resize', () => {
        render(<ResizeHandle direction="vertical" />)
        expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Resize panel height')
      })

      it('should have bg-border for vertical resize', () => {
        render(<ResizeHandle direction="vertical" />)
        const handle = screen.getByRole('button')
        expect(handle).toHaveClass('bg-border')
      })
    })
  })

  describe('isResizing state', () => {
    it('should apply active styles when isResizing is true', () => {
      render(<ResizeHandle direction="horizontal" isResizing />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('bg-primary')
    })

    it('should apply hover styles when isResizing is false', () => {
      render(<ResizeHandle direction="horizontal" isResizing={false} />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('hover:bg-primary')
    })

    it('should default isResizing to false', () => {
      render(<ResizeHandle direction="horizontal" />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('hover:bg-primary')
    })
  })

  describe('position prop', () => {
    it('should apply left position styles', () => {
      render(<ResizeHandle direction="horizontal" position="left" />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('absolute', 'top-0', 'bottom-0', 'z-20', 'left-0')
    })

    it('should apply right position styles', () => {
      render(<ResizeHandle direction="horizontal" position="right" />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('absolute', 'top-0', 'bottom-0', 'z-20', 'right-0')
    })

    it('should NOT apply position styles when position is not provided', () => {
      render(<ResizeHandle direction="horizontal" />)
      const handle = screen.getByRole('button')
      expect(handle).not.toHaveClass('absolute')
      expect(handle).not.toHaveClass('left-0')
      expect(handle).not.toHaveClass('right-0')
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
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('border-0', 'p-0', 'flex-shrink-0', 'transition-colors')
    })

    it('should have border background by default', () => {
      render(<ResizeHandle direction="horizontal" />)
      const handle = screen.getByRole('button')
      expect(handle).toHaveClass('bg-border')
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
          position="left"
          isResizing
          className="extra-class"
          onMouseDown={handleMouseDown}
          data-testid="combined-handle"
        />
      )

      const handle = screen.getByRole('button')

      // Direction styles
      expect(handle).toHaveClass('w-px', 'cursor-col-resize')

      // Position styles
      expect(handle).toHaveClass('absolute', 'left-0')

      // isResizing styles
      expect(handle).toHaveClass('bg-primary')

      // Custom class
      expect(handle).toHaveClass('extra-class')

      // Interaction
      fireEvent.mouseDown(handle)
      expect(handleMouseDown).toHaveBeenCalledTimes(1)
    })
  })
})
