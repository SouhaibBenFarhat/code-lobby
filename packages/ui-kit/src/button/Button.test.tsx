/**
 * Button Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button, buttonVariants } from './Button'

describe('Button', () => {
  describe('rendering', () => {
    it('should render a button element', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('should render children correctly', () => {
      render(
        <Button>
          <span data-testid="child">Child Element</span>
        </Button>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should forward ref to button element', () => {
      const ref = createRef<HTMLButtonElement>()
      render(<Button ref={ref}>Button</Button>)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('should render as a different element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )
      expect(screen.getByRole('link')).toBeInTheDocument()
      expect(screen.getByText('Link Button')).toHaveAttribute('href', '/test')
    })
  })

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Button>Default</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-primary')
    })

    it('should apply destructive variant styles', () => {
      render(<Button variant="destructive">Destructive</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-destructive')
    })

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border')
    })

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-secondary')
    })

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('hover:bg-accent/80')
    })

    it('should apply link variant styles', () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('text-primary')
      expect(button).toHaveClass('underline-offset-4')
    })

    it('should apply unstyled variant styles', () => {
      render(<Button variant="unstyled">Unstyled</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('justify-start')
    })
  })

  describe('sizes', () => {
    it('should apply default size', () => {
      render(<Button>Default Size</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9', 'px-4')
    })

    it('should apply small size', () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-8', 'px-3')
    })

    it('should apply large size', () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-11', 'px-6')
    })

    it('should apply icon size', () => {
      render(<Button size="icon">🔍</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-9', 'w-9')
    })

    it('should apply none size', () => {
      render(
        <Button variant="unstyled" size="none">
          No Size
        </Button>
      )
      const button = screen.getByRole('button')
      // none size should not have h-* or px-* classes from size variants
      expect(button.className).not.toMatch(/\bh-\d+\b/)
    })
  })

  describe('interactions', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('disabled:opacity-40')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with variant classes', () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('bg-primary') // Still has variant class
    })
  })

  describe('HTML attributes', () => {
    it('should pass through HTML button attributes', () => {
      render(
        <Button type="submit" name="submit-btn" data-testid="test-button">
          Submit
        </Button>
      )
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('name', 'submit-btn')
      expect(button).toHaveAttribute('data-testid', 'test-button')
    })
  })

  describe('buttonVariants function', () => {
    it('should return class string for default variant and size', () => {
      const classes = buttonVariants()
      expect(classes).toContain('bg-primary')
      expect(classes).toContain('h-9')
    })

    it('should return class string for specified variant', () => {
      const classes = buttonVariants({ variant: 'destructive' })
      expect(classes).toContain('bg-destructive')
    })

    it('should return class string for specified size', () => {
      const classes = buttonVariants({ size: 'lg' })
      expect(classes).toContain('h-11')
    })
  })
})
