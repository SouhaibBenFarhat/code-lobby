/**
 * Badge Component Tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge, badgeVariants } from './Badge'

describe('Badge', () => {
  describe('rendering', () => {
    it('should render a badge element', () => {
      render(<Badge>New</Badge>)
      expect(screen.getByText('New')).toBeInTheDocument()
    })

    it('should render children correctly', () => {
      render(
        <Badge>
          <span data-testid="child">Content</span>
        </Badge>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Badge>Default</Badge>)
      const badge = screen.getByText('Default')
      expect(badge).toHaveClass('bg-primary')
    })

    it('should apply secondary variant styles', () => {
      render(<Badge variant="secondary">Secondary</Badge>)
      const badge = screen.getByText('Secondary')
      expect(badge).toHaveClass('bg-secondary')
    })

    it('should apply destructive variant styles', () => {
      render(<Badge variant="destructive">Destructive</Badge>)
      const badge = screen.getByText('Destructive')
      expect(badge).toHaveClass('bg-destructive')
    })

    it('should apply success variant styles', () => {
      render(<Badge variant="success">Success</Badge>)
      const badge = screen.getByText('Success')
      expect(badge).toHaveClass('bg-success')
    })

    it('should apply warning variant styles', () => {
      render(<Badge variant="warning">Warning</Badge>)
      const badge = screen.getByText('Warning')
      expect(badge).toHaveClass('bg-warning')
    })

    it('should apply outline variant styles', () => {
      render(<Badge variant="outline">Outline</Badge>)
      const badge = screen.getByText('Outline')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with variant classes', () => {
      render(<Badge className="custom-class">Custom</Badge>)
      const badge = screen.getByText('Custom')
      expect(badge).toHaveClass('custom-class')
      expect(badge).toHaveClass('bg-primary') // Still has default variant class
    })
  })

  describe('HTML attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Badge data-testid="test-badge" role="status">
          Status
        </Badge>
      )
      const badge = screen.getByTestId('test-badge')
      expect(badge).toHaveAttribute('role', 'status')
    })
  })

  describe('badgeVariants function', () => {
    it('should return class string for default variant', () => {
      const classes = badgeVariants()
      expect(classes).toContain('bg-primary')
    })

    it('should return class string for specified variant', () => {
      const classes = badgeVariants({ variant: 'destructive' })
      expect(classes).toContain('bg-destructive')
    })
  })

  describe('base styles', () => {
    it('should have rounded-full class', () => {
      render(<Badge>Rounded</Badge>)
      const badge = screen.getByText('Rounded')
      expect(badge).toHaveClass('rounded-full')
    })

    it('should have proper font styling', () => {
      render(<Badge>Styled</Badge>)
      const badge = screen.getByText('Styled')
      expect(badge).toHaveClass('text-xs', 'font-semibold')
    })
  })
})
