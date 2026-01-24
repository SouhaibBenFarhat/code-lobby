/**
 * Row Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Row } from './Row'

describe('Row', () => {
  describe('rendering', () => {
    it('should render a div element', () => {
      render(<Row data-testid="row">Content</Row>)
      expect(screen.getByTestId('row')).toBeInTheDocument()
      expect(screen.getByTestId('row').tagName).toBe('DIV')
    })

    it('should render children correctly', () => {
      render(
        <Row>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </Row>
      )
      expect(screen.getByTestId('child1')).toBeInTheDocument()
      expect(screen.getByTestId('child2')).toBeInTheDocument()
    })

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Row ref={ref}>Content</Row>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('default styles', () => {
    it('should apply flex and flex-wrap by default', () => {
      render(<Row data-testid="row">Content</Row>)
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('flex', 'flex-wrap')
    })

    it('should apply md gutter (gap-4) by default', () => {
      render(<Row data-testid="row">Content</Row>)
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-4')
    })
  })

  describe('gutter prop', () => {
    it('should apply no gap when gutter is none', () => {
      render(
        <Row gutter="none" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-0')
    })

    it('should apply xs gutter', () => {
      render(
        <Row gutter="xs" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-1')
    })

    it('should apply sm gutter', () => {
      render(
        <Row gutter="sm" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-2')
    })

    it('should apply lg gutter', () => {
      render(
        <Row gutter="lg" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-6')
    })

    it('should apply xl gutter', () => {
      render(
        <Row gutter="xl" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-8')
    })
  })

  describe('gutterX and gutterY props', () => {
    it('should apply horizontal gutter only', () => {
      render(
        <Row gutterX="lg" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-x-6')
    })

    it('should apply vertical gutter only', () => {
      render(
        <Row gutterY="sm" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-y-2')
    })

    it('should apply both horizontal and vertical gutters', () => {
      render(
        <Row gutterX="lg" gutterY="xs" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-x-6', 'gap-y-1')
    })

    it('should override gutter when gutterX or gutterY is specified', () => {
      render(
        <Row gutter="xl" gutterX="sm" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('gap-x-2')
      expect(row).not.toHaveClass('gap-8')
    })
  })

  describe('justify prop', () => {
    it('should apply justify-start', () => {
      render(
        <Row justify="start" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('justify-start')
    })

    it('should apply justify-end', () => {
      render(
        <Row justify="end" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('justify-end')
    })

    it('should apply justify-center', () => {
      render(
        <Row justify="center" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('justify-center')
    })

    it('should apply justify-between', () => {
      render(
        <Row justify="between" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('justify-between')
    })

    it('should apply justify-around', () => {
      render(
        <Row justify="around" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('justify-around')
    })

    it('should apply justify-evenly', () => {
      render(
        <Row justify="evenly" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('justify-evenly')
    })
  })

  describe('align prop', () => {
    it('should apply items-start', () => {
      render(
        <Row align="start" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('items-start')
    })

    it('should apply items-end', () => {
      render(
        <Row align="end" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('items-end')
    })

    it('should apply items-center', () => {
      render(
        <Row align="center" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('items-center')
    })

    it('should apply items-baseline', () => {
      render(
        <Row align="baseline" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('items-baseline')
    })

    it('should apply items-stretch', () => {
      render(
        <Row align="stretch" data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('items-stretch')
    })
  })

  describe('wrap prop', () => {
    it('should apply flex-wrap by default', () => {
      render(<Row data-testid="row">Content</Row>)
      expect(screen.getByTestId('row')).toHaveClass('flex-wrap')
    })

    it('should apply flex-nowrap when wrap is false', () => {
      render(
        <Row wrap={false} data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('flex-nowrap')
    })
  })

  describe('reverse prop', () => {
    it('should not apply flex-row-reverse by default', () => {
      render(<Row data-testid="row">Content</Row>)
      expect(screen.getByTestId('row')).not.toHaveClass('flex-row-reverse')
    })

    it('should apply flex-row-reverse when reverse is true', () => {
      render(
        <Row reverse data-testid="row">
          Content
        </Row>
      )
      expect(screen.getByTestId('row')).toHaveClass('flex-row-reverse')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default classes', () => {
      render(
        <Row className="custom-row" data-testid="row">
          Content
        </Row>
      )
      const row = screen.getByTestId('row')
      expect(row).toHaveClass('custom-row')
      expect(row).toHaveClass('flex', 'flex-wrap')
    })
  })
})
