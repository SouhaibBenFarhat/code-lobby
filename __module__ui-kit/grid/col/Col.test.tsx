/**
 * Col Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Col } from './Col'

describe('Col', () => {
  describe('rendering', () => {
    it('should render a div element', () => {
      render(<Col data-testid="col">Content</Col>)
      expect(screen.getByTestId('col')).toBeInTheDocument()
      expect(screen.getByTestId('col').tagName).toBe('DIV')
    })

    it('should render children correctly', () => {
      render(
        <Col>
          <span data-testid="child">Child Content</span>
        </Col>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Col ref={ref}>Content</Col>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('default styles', () => {
    it('should apply flex-grow and min-w-0 when no span specified', () => {
      render(<Col data-testid="col">Content</Col>)
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('flex-1', 'min-w-0')
    })
  })

  describe('span prop - single values', () => {
    it('should apply span 1 (8.333%)', () => {
      render(
        <Col span={1} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-[8.333333%]')
    })

    it('should apply span 2 (16.667%)', () => {
      render(
        <Col span={2} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-[16.666667%]')
    })

    it('should apply span 3 (1/4)', () => {
      render(
        <Col span={3} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-1/4')
    })

    it('should apply span 4 (1/3)', () => {
      render(
        <Col span={4} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-1/3')
    })

    it('should apply span 6 (1/2)', () => {
      render(
        <Col span={6} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-1/2')
    })

    it('should apply span 8 (2/3)', () => {
      render(
        <Col span={8} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-2/3')
    })

    it('should apply span 9 (3/4)', () => {
      render(
        <Col span={9} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-3/4')
    })

    it('should apply span 12 (full)', () => {
      render(
        <Col span={12} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-full')
    })

    it('should apply span auto', () => {
      render(
        <Col span="auto" data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('flex-none', 'w-auto')
    })

    it('should apply span full', () => {
      render(
        <Col span="full" data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('w-full')
    })
  })

  describe('span prop - responsive values', () => {
    it('should apply responsive spans', () => {
      render(
        <Col span={{ default: 12, sm: 6, md: 4, lg: 3 }} data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('w-full') // default: 12
      expect(col).toHaveClass('sm:w-1/2') // sm: 6
      expect(col).toHaveClass('md:w-1/3') // md: 4
      expect(col).toHaveClass('lg:w-1/4') // lg: 3
    })

    it('should handle partial responsive spans', () => {
      render(
        <Col span={{ md: 6, xl: 4 }} data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('md:w-1/2')
      expect(col).toHaveClass('xl:w-1/3')
      // Should not have default span
      expect(col).not.toHaveClass('w-full')
    })

    it('should handle responsive auto span', () => {
      render(
        <Col span={{ default: 12, lg: 'auto' }} data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('w-full')
      expect(col).toHaveClass('lg:flex-none', 'lg:w-auto')
    })
  })

  describe('offset prop', () => {
    it('should apply offset 0 (no margin)', () => {
      render(
        <Col offset={0} span={6} data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      // Offset 0 should not add any margin classes
      expect(col.className).not.toContain('ml-')
    })

    it('should apply offset 1', () => {
      render(
        <Col offset={1} span={6} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('ml-[8.333333%]')
    })

    it('should apply offset 3 (1/4)', () => {
      render(
        <Col offset={3} span={6} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('ml-1/4')
    })

    it('should apply offset 6 (1/2)', () => {
      render(
        <Col offset={6} span={6} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('ml-1/2')
    })

    it('should apply responsive offsets', () => {
      render(
        <Col offset={{ default: 0, md: 3, lg: 2 }} span={6} data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('md:ml-1/4')
      expect(col).toHaveClass('lg:ml-[16.666667%]')
    })
  })

  describe('order prop', () => {
    it('should apply numeric order', () => {
      render(
        <Col order={2} data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('order-2')
    })

    it('should apply order first', () => {
      render(
        <Col order="first" data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('order-first')
    })

    it('should apply order last', () => {
      render(
        <Col order="last" data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('order-last')
    })

    it('should apply order none', () => {
      render(
        <Col order="none" data-testid="col">
          Content
        </Col>
      )
      expect(screen.getByTestId('col')).toHaveClass('order-none')
    })

    it('should apply responsive order', () => {
      render(
        <Col order={{ default: 2, md: 1, lg: 'first' }} data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('order-2')
      expect(col).toHaveClass('md:order-1')
      expect(col).toHaveClass('lg:order-first')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with generated classes', () => {
      render(
        <Col span={6} className="custom-col" data-testid="col">
          Content
        </Col>
      )
      const col = screen.getByTestId('col')
      expect(col).toHaveClass('custom-col')
      expect(col).toHaveClass('w-1/2')
    })
  })

  describe('all 12 span values', () => {
    const spanValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

    for (const span of spanValues) {
      it(`should render span ${span} correctly`, () => {
        render(
          <Col span={span} data-testid={`col-${span}`}>
            Span {span}
          </Col>
        )
        // Verify it has a width class (either w-* or w-[*])
        const col = screen.getByTestId(`col-${span}`)
        expect(col.className).toMatch(/w-/)
      })
    }
  })

  describe('all offset values', () => {
    const offsetValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

    for (const offset of offsetValues) {
      it(`should render offset ${offset} correctly`, () => {
        render(
          <Col offset={offset} span={1} data-testid={`col-offset-${offset}`}>
            Offset {offset}
          </Col>
        )
        const col = screen.getByTestId(`col-offset-${offset}`)
        expect(col.className).toMatch(/ml-/)
      })
    }
  })

  describe('all breakpoints', () => {
    it('should handle all breakpoints in responsive span', () => {
      render(
        <Col span={{ default: 12, sm: 10, md: 8, lg: 6, xl: 4, '2xl': 3 }} data-testid="col">
          All breakpoints
        </Col>
      )

      const col = screen.getByTestId('col')
      expect(col).toHaveClass('w-full') // default
      expect(col).toHaveClass('sm:w-[83.333333%]') // sm: 10
      expect(col).toHaveClass('md:w-2/3') // md: 8
      expect(col).toHaveClass('lg:w-1/2') // lg: 6
      expect(col).toHaveClass('xl:w-1/3') // xl: 4
      expect(col).toHaveClass('2xl:w-1/4') // 2xl: 3
    })
  })
})
