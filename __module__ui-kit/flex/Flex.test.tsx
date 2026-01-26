/**
 * Flex Component Tests
 *
 * Tests for the flexbox-based layout component used for inline layouts.
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Flex } from './Flex'

describe('Flex', () => {
  describe('rendering', () => {
    it('should render a div element', () => {
      render(<Flex data-testid="flex">Content</Flex>)
      expect(screen.getByTestId('flex')).toBeInTheDocument()
      expect(screen.getByTestId('flex').tagName).toBe('DIV')
    })

    it('should render children correctly', () => {
      render(
        <Flex>
          <span data-testid="child">Child Content</span>
        </Flex>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Flex ref={ref}>Content</Flex>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('default styles', () => {
    it('should apply flex and flex-row by default', () => {
      render(<Flex data-testid="flex">Content</Flex>)
      const flex = screen.getByTestId('flex')
      expect(flex).toHaveClass('flex', 'flex-row')
    })

    it('should apply medium gap by default', () => {
      render(<Flex data-testid="flex">Content</Flex>)
      const flex = screen.getByTestId('flex')
      expect(flex).toHaveClass('gap-4') // md gap
    })

    it('should not wrap by default', () => {
      render(<Flex data-testid="flex">Content</Flex>)
      const flex = screen.getByTestId('flex')
      expect(flex).not.toHaveClass('flex-wrap')
    })
  })

  describe('direction prop', () => {
    it('should apply flex-row for row direction', () => {
      render(
        <Flex direction="row" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('flex-row')
    })

    it('should apply flex-col for col direction', () => {
      render(
        <Flex direction="col" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('flex-col')
    })
  })

  describe('gap prop', () => {
    it('should apply gap-0 for none gap', () => {
      render(
        <Flex gap="none" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('gap-0')
    })

    it('should apply gap-1 for xs gap', () => {
      render(
        <Flex gap="xs" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('gap-1')
    })

    it('should apply gap-2 for sm gap', () => {
      render(
        <Flex gap="sm" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('gap-2')
    })

    it('should apply gap-4 for md gap', () => {
      render(
        <Flex gap="md" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('gap-4')
    })

    it('should apply gap-6 for lg gap', () => {
      render(
        <Flex gap="lg" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('gap-6')
    })

    it('should apply gap-8 for xl gap', () => {
      render(
        <Flex gap="xl" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('gap-8')
    })
  })

  describe('wrap prop', () => {
    it('should not apply flex-wrap when wrap is false', () => {
      render(
        <Flex wrap={false} data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).not.toHaveClass('flex-wrap')
    })

    it('should apply flex-wrap when wrap is true', () => {
      render(
        <Flex wrap data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('flex-wrap')
    })
  })

  describe('inline prop', () => {
    it('should apply flex by default (not inline)', () => {
      render(<Flex data-testid="flex">Content</Flex>)
      expect(screen.getByTestId('flex')).toHaveClass('flex')
      expect(screen.getByTestId('flex')).not.toHaveClass('inline-flex')
    })

    it('should apply inline-flex when inline is true', () => {
      render(
        <Flex inline data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('inline-flex')
      expect(screen.getByTestId('flex')).not.toHaveClass('flex')
    })
  })

  describe('justify prop', () => {
    it('should apply justify-start', () => {
      render(
        <Flex justify="start" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('justify-start')
    })

    it('should apply justify-end', () => {
      render(
        <Flex justify="end" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('justify-end')
    })

    it('should apply justify-center', () => {
      render(
        <Flex justify="center" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('justify-center')
    })

    it('should apply justify-between', () => {
      render(
        <Flex justify="between" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('justify-between')
    })

    it('should apply justify-around', () => {
      render(
        <Flex justify="around" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('justify-around')
    })

    it('should apply justify-evenly', () => {
      render(
        <Flex justify="evenly" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('justify-evenly')
    })
  })

  describe('align prop', () => {
    it('should apply items-start', () => {
      render(
        <Flex align="start" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('items-start')
    })

    it('should apply items-end', () => {
      render(
        <Flex align="end" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('items-end')
    })

    it('should apply items-center', () => {
      render(
        <Flex align="center" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('items-center')
    })

    it('should apply items-baseline', () => {
      render(
        <Flex align="baseline" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('items-baseline')
    })

    it('should apply items-stretch', () => {
      render(
        <Flex align="stretch" data-testid="flex">
          Content
        </Flex>
      )
      expect(screen.getByTestId('flex')).toHaveClass('items-stretch')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with generated classes', () => {
      render(
        <Flex className="custom-flex" data-testid="flex">
          Content
        </Flex>
      )
      const flex = screen.getByTestId('flex')
      expect(flex).toHaveClass('custom-flex')
      expect(flex).toHaveClass('flex')
    })
  })

  describe('combined props', () => {
    it('should handle multiple props together', () => {
      render(
        <Flex direction="col" gap="lg" justify="center" align="center" wrap data-testid="flex">
          Content
        </Flex>
      )

      const flex = screen.getByTestId('flex')
      expect(flex).toHaveClass('flex')
      expect(flex).toHaveClass('flex-col')
      expect(flex).toHaveClass('gap-6')
      expect(flex).toHaveClass('justify-center')
      expect(flex).toHaveClass('items-center')
      expect(flex).toHaveClass('flex-wrap')
    })

    it('should work as a horizontal button group', () => {
      render(
        <Flex gap="sm" align="center" data-testid="button-group">
          <button type="button">Button 1</button>
          <button type="button">Button 2</button>
          <button type="button">Button 3</button>
        </Flex>
      )

      const group = screen.getByTestId('button-group')
      expect(group).toHaveClass('flex', 'flex-row', 'gap-2', 'items-center')
    })

    it('should work as a vertical stack', () => {
      render(
        <Flex direction="col" gap="md" data-testid="stack">
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Flex>
      )

      const stack = screen.getByTestId('stack')
      expect(stack).toHaveClass('flex', 'flex-col', 'gap-4')
    })

    it('should work as a space-between header', () => {
      render(
        <Flex justify="between" align="center" data-testid="header">
          <span>Logo</span>
          <nav>Nav</nav>
        </Flex>
      )

      const header = screen.getByTestId('header')
      expect(header).toHaveClass('flex', 'flex-row', 'justify-between', 'items-center')
    })
  })

  describe('HTML attributes', () => {
    it('should pass through HTML attributes', () => {
      render(
        <Flex data-testid="flex" aria-label="Flex container" role="group">
          Content
        </Flex>
      )

      const flex = screen.getByTestId('flex')
      expect(flex).toHaveAttribute('aria-label', 'Flex container')
      expect(flex).toHaveAttribute('role', 'group')
    })
  })
})
