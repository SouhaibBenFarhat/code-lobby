/**
 * Container Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Container } from './Container'

describe('Container', () => {
  describe('rendering', () => {
    it('should render a div element', () => {
      render(<Container data-testid="container">Content</Container>)
      expect(screen.getByTestId('container')).toBeInTheDocument()
      expect(screen.getByTestId('container').tagName).toBe('DIV')
    })

    it('should render children correctly', () => {
      render(
        <Container>
          <span data-testid="child">Child Content</span>
        </Container>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Container ref={ref}>Content</Container>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should pass through HTML attributes', () => {
      render(
        <Container data-testid="container" id="my-container" aria-label="Main container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveAttribute('id', 'my-container')
      expect(container).toHaveAttribute('aria-label', 'Main container')
    })
  })

  describe('default styles', () => {
    it('should apply base container classes', () => {
      render(<Container data-testid="container">Content</Container>)
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('w-full', 'mx-auto', 'px-4')
    })

    it('should apply responsive max-width classes by default', () => {
      render(<Container data-testid="container">Content</Container>)
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('sm:max-w-[640px]')
      expect(container).toHaveClass('md:max-w-[768px]')
      expect(container).toHaveClass('lg:max-w-[1024px]')
      expect(container).toHaveClass('xl:max-w-[1280px]')
      expect(container).toHaveClass('2xl:max-w-[1536px]')
    })
  })

  describe('fluid prop', () => {
    it('should not apply max-width constraints when fluid is true', () => {
      render(
        <Container fluid data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).not.toHaveClass('sm:max-w-[640px]')
      expect(container).not.toHaveClass('md:max-w-[768px]')
      expect(container).not.toHaveClass('lg:max-w-[1024px]')
    })

    it('should still apply base classes when fluid', () => {
      render(
        <Container fluid data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('w-full', 'mx-auto', 'px-4')
    })
  })

  describe('maxWidth prop', () => {
    it('should apply sm max-width constraint', () => {
      render(
        <Container maxWidth="sm" data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('max-w-[640px]')
    })

    it('should apply md max-width constraint', () => {
      render(
        <Container maxWidth="md" data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('max-w-[768px]')
    })

    it('should apply lg max-width constraint', () => {
      render(
        <Container maxWidth="lg" data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('max-w-[1024px]')
    })

    it('should apply xl max-width constraint', () => {
      render(
        <Container maxWidth="xl" data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('max-w-[1280px]')
    })

    it('should apply 2xl max-width constraint', () => {
      render(
        <Container maxWidth="2xl" data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('max-w-[1536px]')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(
        <Container className="custom-class" data-testid="container">
          Content
        </Container>
      )
      const container = screen.getByTestId('container')
      expect(container).toHaveClass('custom-class')
      expect(container).toHaveClass('w-full', 'mx-auto')
    })
  })
})
