/**
 * Alert Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Alert, AlertDescription, AlertTitle } from './Alert'

describe('Alert', () => {
  describe('rendering', () => {
    it('should render an alert element', () => {
      render(<Alert>Alert content</Alert>)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should render children', () => {
      render(<Alert>Alert message</Alert>)
      expect(screen.getByText('Alert message')).toBeInTheDocument()
    })

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Alert ref={ref}>Alert</Alert>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('variants', () => {
    it('should apply default variant styles', () => {
      render(<Alert>Default alert</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('bg-background', 'text-foreground')
    })

    it('should apply destructive variant styles', () => {
      render(<Alert variant="destructive">Error alert</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('border-destructive-border', 'text-destructive')
    })
  })

  describe('styling', () => {
    it('should have base styles', () => {
      render(<Alert>Alert</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('relative', 'w-full', 'rounded-lg', 'border', 'p-4')
    })

    it('should merge custom className', () => {
      render(<Alert className="custom-class">Alert</Alert>)
      const alert = screen.getByRole('alert')
      expect(alert).toHaveClass('custom-class')
      expect(alert).toHaveClass('rounded-lg') // Still has default class
    })
  })

  describe('HTML attributes', () => {
    it('should pass through data attributes', () => {
      render(<Alert data-testid="my-alert">Alert</Alert>)
      expect(screen.getByTestId('my-alert')).toBeInTheDocument()
    })

    it('should pass through id attribute', () => {
      render(<Alert id="alert-1">Alert</Alert>)
      expect(screen.getByRole('alert')).toHaveAttribute('id', 'alert-1')
    })
  })
})

describe('AlertTitle', () => {
  describe('rendering', () => {
    it('should render a heading element', () => {
      render(<AlertTitle>Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title).toBeInTheDocument()
      expect(title.tagName).toBe('H5')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLParagraphElement>()
      render(<AlertTitle ref={ref}>Title</AlertTitle>)
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('styling', () => {
    it('should have default styles', () => {
      render(<AlertTitle>Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('mb-1', 'font-medium', 'leading-none', 'tracking-tight')
    })

    it('should merge custom className', () => {
      render(<AlertTitle className="custom-title">Title</AlertTitle>)
      const title = screen.getByText('Title')
      expect(title).toHaveClass('custom-title')
      expect(title).toHaveClass('font-medium')
    })
  })
})

describe('AlertDescription', () => {
  describe('rendering', () => {
    it('should render a div element', () => {
      render(<AlertDescription>Description</AlertDescription>)
      const desc = screen.getByText('Description')
      expect(desc).toBeInTheDocument()
      expect(desc.tagName).toBe('DIV')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLParagraphElement>()
      render(<AlertDescription ref={ref}>Description</AlertDescription>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('styling', () => {
    it('should have default styles', () => {
      render(<AlertDescription>Description</AlertDescription>)
      const desc = screen.getByText('Description')
      expect(desc).toHaveClass('text-sm')
    })

    it('should merge custom className', () => {
      render(<AlertDescription className="custom-desc">Description</AlertDescription>)
      const desc = screen.getByText('Description')
      expect(desc).toHaveClass('custom-desc')
      expect(desc).toHaveClass('text-sm')
    })
  })
})

describe('Alert composition', () => {
  it('should render complete alert with title and description', () => {
    render(
      <Alert>
        <AlertTitle>Warning</AlertTitle>
        <AlertDescription>This is a warning message.</AlertDescription>
      </Alert>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('This is a warning message.')).toBeInTheDocument()
  })

  it('should render destructive alert with icon', () => {
    render(
      <Alert variant="destructive">
        <svg data-testid="error-icon" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('text-destructive')
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })
})
