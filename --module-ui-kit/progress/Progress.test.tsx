/**
 * Progress Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Progress } from './Progress'

describe('Progress', () => {
  describe('rendering', () => {
    it('should render a progressbar element', () => {
      render(<Progress />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Progress ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('value prop', () => {
    it('should display 0% by default', () => {
      render(<Progress />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should display specified value', () => {
      render(<Progress value={50} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '50')
    })

    it('should clamp value to 0 minimum', () => {
      render(<Progress value={-10} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '0')
    })

    it('should clamp value to 100 maximum', () => {
      render(<Progress value={150} />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    })
  })

  describe('indeterminate prop', () => {
    it('should not have aria-valuenow when indeterminate', () => {
      render(<Progress indeterminate />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).not.toHaveAttribute('aria-valuenow')
    })

    it('should have animation class when indeterminate', () => {
      const { container } = render(<Progress indeterminate />)
      const innerBar = container.querySelector('.animate-progress-indeterminate')
      expect(innerBar).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('should apply sm size class', () => {
      render(<Progress size="sm" />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveClass('h-px')
    })

    it('should apply md size class by default', () => {
      render(<Progress />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveClass('h-2')
    })

    it('should apply lg size class', () => {
      render(<Progress size="lg" />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveClass('h-3')
    })
  })

  describe('variant colors', () => {
    it('should apply default variant', () => {
      const { container } = render(<Progress value={50} />)
      const innerBar = container.querySelector('.bg-primary')
      expect(innerBar).toBeInTheDocument()
    })

    it('should apply success variant', () => {
      const { container } = render(<Progress value={50} variant="success" />)
      const innerBar = container.querySelector('.bg-success')
      expect(innerBar).toBeInTheDocument()
    })

    it('should apply warning variant', () => {
      const { container } = render(<Progress value={50} variant="warning" />)
      const innerBar = container.querySelector('.bg-warning')
      expect(innerBar).toBeInTheDocument()
    })

    it('should apply destructive variant', () => {
      const { container } = render(<Progress value={50} variant="destructive" />)
      const innerBar = container.querySelector('.bg-destructive')
      expect(innerBar).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have aria-valuemin attribute', () => {
      render(<Progress />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0')
    })

    it('should have aria-valuemax attribute', () => {
      render(<Progress />)
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100')
    })
  })

  describe('styling', () => {
    it('should merge custom className', () => {
      render(<Progress className="custom-class" />)
      const progressbar = screen.getByRole('progressbar')
      expect(progressbar).toHaveClass('custom-class')
      expect(progressbar).toHaveClass('rounded-full') // Still has default class
    })
  })

  describe('HTML attributes', () => {
    it('should pass through data attributes', () => {
      render(<Progress data-testid="my-progress" />)
      expect(screen.getByTestId('my-progress')).toBeInTheDocument()
    })
  })
})
