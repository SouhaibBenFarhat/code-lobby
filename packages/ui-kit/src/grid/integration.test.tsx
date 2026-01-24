/**
 * Grid System Integration Tests
 *
 * Tests that verify Container, Row, and Col work together correctly.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Col } from './col'
import { Container } from './container'
import { Row } from './row'

describe('Grid System Integration', () => {
  describe('basic 12-column layout', () => {
    it('should render 12 equal columns', () => {
      const columns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
      render(
        <Container data-testid="container">
          <Row data-testid="row">
            {columns.map((id, idx) => (
              <Col key={id} span={1} data-testid={`col-${id}`}>
                {idx + 1}
              </Col>
            ))}
          </Row>
        </Container>
      )

      expect(screen.getByTestId('container')).toBeInTheDocument()
      expect(screen.getByTestId('row')).toBeInTheDocument()

      for (const id of columns) {
        expect(screen.getByTestId(`col-${id}`)).toHaveClass('w-[8.333333%]')
      }
    })

    it('should render 2 half-width columns', () => {
      render(
        <Row data-testid="row">
          <Col span={6} data-testid="col-1">
            Left
          </Col>
          <Col span={6} data-testid="col-2">
            Right
          </Col>
        </Row>
      )

      expect(screen.getByTestId('col-1')).toHaveClass('w-1/2')
      expect(screen.getByTestId('col-2')).toHaveClass('w-1/2')
    })

    it('should render 3 one-third columns', () => {
      render(
        <Row data-testid="row">
          <Col span={4} data-testid="col-1">
            First
          </Col>
          <Col span={4} data-testid="col-2">
            Second
          </Col>
          <Col span={4} data-testid="col-3">
            Third
          </Col>
        </Row>
      )

      expect(screen.getByTestId('col-1')).toHaveClass('w-1/3')
      expect(screen.getByTestId('col-2')).toHaveClass('w-1/3')
      expect(screen.getByTestId('col-3')).toHaveClass('w-1/3')
    })

    it('should render 4 one-quarter columns', () => {
      render(
        <Row data-testid="row">
          <Col span={3} data-testid="col-1">
            1
          </Col>
          <Col span={3} data-testid="col-2">
            2
          </Col>
          <Col span={3} data-testid="col-3">
            3
          </Col>
          <Col span={3} data-testid="col-4">
            4
          </Col>
        </Row>
      )

      for (let i = 1; i <= 4; i++) {
        expect(screen.getByTestId(`col-${i}`)).toHaveClass('w-1/4')
      }
    })
  })

  describe('responsive layouts', () => {
    it('should render responsive card grid (mobile: 1, tablet: 2, desktop: 4)', () => {
      render(
        <Container data-testid="container">
          <Row data-testid="row">
            {[1, 2, 3, 4].map((i) => (
              <Col key={i} span={{ default: 12, sm: 6, lg: 3 }} data-testid={`card-${i}`}>
                Card {i}
              </Col>
            ))}
          </Row>
        </Container>
      )

      for (let i = 1; i <= 4; i++) {
        const col = screen.getByTestId(`card-${i}`)
        expect(col).toHaveClass('w-full') // default: 12
        expect(col).toHaveClass('sm:w-1/2') // sm: 6
        expect(col).toHaveClass('lg:w-1/4') // lg: 3
      }
    })

    it('should render sidebar layout', () => {
      render(
        <Container data-testid="container">
          <Row data-testid="row">
            <Col span={{ default: 12, md: 3 }} data-testid="sidebar">
              Sidebar
            </Col>
            <Col span={{ default: 12, md: 9 }} data-testid="main">
              Main Content
            </Col>
          </Row>
        </Container>
      )

      const sidebar = screen.getByTestId('sidebar')
      const main = screen.getByTestId('main')

      // Mobile: full width
      expect(sidebar).toHaveClass('w-full')
      expect(main).toHaveClass('w-full')

      // Desktop: sidebar 1/4, main 3/4
      expect(sidebar).toHaveClass('md:w-1/4')
      expect(main).toHaveClass('md:w-3/4')
    })
  })

  describe('offset and ordering', () => {
    it('should render centered column using offset', () => {
      render(
        <Row data-testid="row">
          <Col span={6} offset={3} data-testid="col">
            Centered
          </Col>
        </Row>
      )

      const col = screen.getByTestId('col')
      expect(col).toHaveClass('w-1/2', 'ml-1/4')
    })

    it('should reorder columns on larger screens', () => {
      render(
        <Row data-testid="row">
          <Col span={6} order={{ default: 2, md: 1 }} data-testid="first-on-desktop">
            Second on mobile, First on desktop
          </Col>
          <Col span={6} order={{ default: 1, md: 2 }} data-testid="second-on-desktop">
            First on mobile, Second on desktop
          </Col>
        </Row>
      )

      const firstOnDesktop = screen.getByTestId('first-on-desktop')
      const secondOnDesktop = screen.getByTestId('second-on-desktop')

      expect(firstOnDesktop).toHaveClass('order-2', 'md:order-1')
      expect(secondOnDesktop).toHaveClass('order-1', 'md:order-2')
    })
  })

  describe('nested grids', () => {
    it('should support nested rows and columns', () => {
      render(
        <Container data-testid="container">
          <Row data-testid="outer-row">
            <Col span={6} data-testid="outer-col">
              <Row data-testid="inner-row">
                <Col span={6} data-testid="inner-col-1">
                  Nested 1
                </Col>
                <Col span={6} data-testid="inner-col-2">
                  Nested 2
                </Col>
              </Row>
            </Col>
            <Col span={6}>Other half</Col>
          </Row>
        </Container>
      )

      expect(screen.getByTestId('outer-row')).toHaveClass('flex')
      expect(screen.getByTestId('inner-row')).toHaveClass('flex')
      expect(screen.getByTestId('inner-col-1')).toHaveClass('w-1/2')
      expect(screen.getByTestId('inner-col-2')).toHaveClass('w-1/2')
    })
  })

  describe('auto columns', () => {
    it('should mix fixed and auto columns', () => {
      render(
        <Row data-testid="row">
          <Col span="auto" data-testid="auto-col">
            Fixed width based on content
          </Col>
          <Col data-testid="flex-col">Fills remaining space</Col>
          <Col span={3} data-testid="fixed-col">
            3 cols
          </Col>
        </Row>
      )

      expect(screen.getByTestId('auto-col')).toHaveClass('flex-none', 'w-auto')
      expect(screen.getByTestId('flex-col')).toHaveClass('flex-1', 'min-w-0')
      expect(screen.getByTestId('fixed-col')).toHaveClass('w-1/4')
    })
  })

  describe('alignment combinations', () => {
    it('should center content both horizontally and vertically', () => {
      render(
        <Row justify="center" align="center" data-testid="row">
          <Col span={6}>Centered</Col>
        </Row>
      )

      const row = screen.getByTestId('row')
      expect(row).toHaveClass('justify-center', 'items-center')
    })

    it('should space items with flex alignment', () => {
      render(
        <Row justify="between" align="end" data-testid="row">
          <Col span="auto">Left</Col>
          <Col span="auto">Right</Col>
        </Row>
      )

      const row = screen.getByTestId('row')
      expect(row).toHaveClass('justify-between', 'items-end')
    })
  })
})
