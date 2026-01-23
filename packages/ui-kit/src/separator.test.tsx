/**
 * Separator Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Separator } from './separator'

describe('Separator', () => {
  describe('rendering', () => {
    it('should render separator element', () => {
      render(<Separator data-testid="separator" />)
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })

    it('should have role="none" when decorative (default)', () => {
      render(<Separator data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveAttribute('role', 'none')
    })

    it('should have separator role when not decorative', () => {
      render(<Separator decorative={false} />)
      expect(screen.getByRole('separator')).toBeInTheDocument()
    })
  })

  describe('orientation', () => {
    it('should render horizontal separator by default', () => {
      render(<Separator data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('h-[1px]', 'w-full')
    })

    it('should render horizontal separator when orientation is horizontal', () => {
      render(<Separator orientation="horizontal" data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('h-[1px]', 'w-full')
    })

    it('should render vertical separator when orientation is vertical', () => {
      render(<Separator orientation="vertical" data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('h-full', 'w-[1px]')
    })
  })

  describe('decorative', () => {
    it('should be decorative by default', () => {
      render(<Separator data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveAttribute('data-orientation', 'horizontal')
    })

    it('should set decorative attribute when specified', () => {
      render(<Separator decorative={false} data-testid="separator" />)
      // When decorative is false, it should still render but be accessible
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have shrink-0 class', () => {
      render(<Separator data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('shrink-0')
    })

    it('should have bg-border class', () => {
      render(<Separator data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('bg-border')
    })

    it('should accept custom className', () => {
      render(<Separator className="my-4 bg-red-500" data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('my-4', 'bg-red-500')
    })
  })

  describe('ref forwarding', () => {
    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Separator ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLElement)
    })
  })

  describe('HTML attributes', () => {
    it('should pass through HTML attributes', () => {
      render(<Separator data-testid="separator" aria-label="Divider" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveAttribute('aria-label', 'Divider')
    })
  })
})
