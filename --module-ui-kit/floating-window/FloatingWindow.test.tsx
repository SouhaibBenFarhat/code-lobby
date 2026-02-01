/**
 * FloatingWindow Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FloatingWindow } from './FloatingWindow'

// Mock react-rnd
vi.mock('react-rnd', () => ({
  Rnd: ({
    children,
    position,
    size,
    style,
    className
  }: {
    children: React.ReactNode
    position: { x: number; y: number }
    size: { width: number | string; height: number | string }
    style: React.CSSProperties
    className?: string
  }) => (
    <div
      data-testid="rnd-wrapper"
      style={{
        ...style,
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height
      }}
      className={className}
    >
      {children}
    </div>
  )
}))

describe('FloatingWindow', () => {
  const defaultProps = {
    title: 'Test Window',
    onClose: vi.fn(),
    children: <div>Window content</div>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render window with title', () => {
      render(<FloatingWindow {...defaultProps} />)
      expect(screen.getByText('Test Window')).toBeInTheDocument()
    })

    it('should render children content', () => {
      render(<FloatingWindow {...defaultProps} />)
      expect(screen.getByText('Window content')).toBeInTheDocument()
    })

    it('should render with icon', () => {
      render(<FloatingWindow {...defaultProps} icon={<span data-testid="icon">Icon</span>} />)
      expect(screen.getAllByTestId('icon').length).toBeGreaterThan(0)
    })

    it('should apply custom className', () => {
      const { container } = render(<FloatingWindow {...defaultProps} className="custom-class" />)
      expect(container.querySelector('.floating-window')).toHaveClass('custom-class')
    })
  })

  describe('window controls', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn()
      render(<FloatingWindow {...defaultProps} onClose={onClose} />)

      // Find close button (red one)
      const closeButton = screen
        .getAllByRole('button')
        .find((btn) => btn.classList.contains('bg-red-500'))
      expect(closeButton).toBeInTheDocument()

      if (closeButton) fireEvent.click(closeButton)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onMinimize when minimize button is clicked', () => {
      const onMinimize = vi.fn()
      render(<FloatingWindow {...defaultProps} onMinimize={onMinimize} />)

      // Find minimize button (yellow one)
      const minimizeButton = screen
        .getAllByRole('button')
        .find((btn) => btn.classList.contains('bg-yellow-500'))
      expect(minimizeButton).toBeInTheDocument()

      if (minimizeButton) fireEvent.click(minimizeButton)
      expect(onMinimize).toHaveBeenCalledTimes(1)
    })

    it('should call onMaximize when maximize button is clicked', () => {
      const onMaximize = vi.fn()
      render(<FloatingWindow {...defaultProps} onMaximize={onMaximize} />)

      // Find maximize button (green one)
      const maximizeButton = screen
        .getAllByRole('button')
        .find((btn) => btn.classList.contains('bg-green-500'))
      expect(maximizeButton).toBeInTheDocument()

      if (maximizeButton) fireEvent.click(maximizeButton)
      expect(onMaximize).toHaveBeenCalledTimes(1)
    })

    it('should not show minimize button if onMinimize is not provided', () => {
      const { container } = render(<FloatingWindow {...defaultProps} onMinimize={undefined} />)

      const yellowButtons = container.querySelectorAll('button.bg-yellow-500')
      expect(yellowButtons).toHaveLength(0)
    })

    it('should not show maximize button if onMaximize is not provided', () => {
      const { container } = render(<FloatingWindow {...defaultProps} onMaximize={undefined} />)

      const greenButtons = container.querySelectorAll('button.bg-green-500')
      expect(greenButtons).toHaveLength(0)
    })
  })

  describe('minimized state', () => {
    it('should render minimized view when isMinimized is true', () => {
      const { container } = render(
        <FloatingWindow {...defaultProps} isMinimized onMinimize={vi.fn()} />
      )
      expect(container.querySelector('.floating-window-minimized')).toBeInTheDocument()
      expect(container.querySelector('.floating-window')).not.toBeInTheDocument()
    })

    it('should still show title when minimized', () => {
      render(<FloatingWindow {...defaultProps} isMinimized onMinimize={vi.fn()} />)
      expect(screen.getByText('Test Window')).toBeInTheDocument()
    })
  })

  describe('focused state', () => {
    it('should apply focused styles when isFocused is true', () => {
      const { container } = render(<FloatingWindow {...defaultProps} isFocused />)
      expect(container.querySelector('.floating-window')).toHaveClass('ring-1')
    })

    it('should apply unfocused styles when isFocused is false', () => {
      const { container } = render(<FloatingWindow {...defaultProps} isFocused={false} />)
      expect(container.querySelector('.floating-window')).toHaveClass('opacity-95')
    })
  })

  describe('size and position props', () => {
    it('should use default position', () => {
      render(<FloatingWindow {...defaultProps} />)
      const wrapper = screen.getByTestId('rnd-wrapper')
      expect(wrapper).toHaveStyle({ left: '100px', top: '100px' })
    })

    it('should use custom default position', () => {
      render(<FloatingWindow {...defaultProps} defaultPosition={{ x: 200, y: 300 }} />)
      const wrapper = screen.getByTestId('rnd-wrapper')
      expect(wrapper).toHaveStyle({ left: '200px', top: '300px' })
    })

    it('should use default size', () => {
      render(<FloatingWindow {...defaultProps} />)
      const wrapper = screen.getByTestId('rnd-wrapper')
      expect(wrapper).toHaveStyle({ width: '800px', height: '600px' })
    })

    it('should use custom default size', () => {
      render(<FloatingWindow {...defaultProps} defaultSize={{ width: 500, height: 400 }} />)
      const wrapper = screen.getByTestId('rnd-wrapper')
      expect(wrapper).toHaveStyle({ width: '500px', height: '400px' })
    })
  })

  describe('z-index', () => {
    it('should apply default z-index', () => {
      render(<FloatingWindow {...defaultProps} />)
      const wrapper = screen.getByTestId('rnd-wrapper')
      expect(wrapper).toHaveStyle({ zIndex: '50' })
    })

    it('should apply custom z-index', () => {
      render(<FloatingWindow {...defaultProps} zIndex={100} />)
      const wrapper = screen.getByTestId('rnd-wrapper')
      expect(wrapper).toHaveStyle({ zIndex: '100' })
    })
  })
})
