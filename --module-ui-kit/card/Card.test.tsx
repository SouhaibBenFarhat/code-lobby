/**
 * Card Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card'

describe('Card', () => {
  describe('Card (root)', () => {
    it('should render card container', () => {
      render(<Card data-testid="card">Content</Card>)
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    it('should render children', () => {
      render(<Card>Card Content</Card>)
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-xl', 'border', 'bg-card')
    })

    it('should accept custom className', () => {
      render(
        <Card className="custom-card" data-testid="card">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-card')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardHeader', () => {
    it('should render header container', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-4')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<CardHeader ref={ref}>Header</CardHeader>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardTitle', () => {
    it('should render as h3 element', () => {
      render(<CardTitle>Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Title')
    })

    it('should apply default styles', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('text-lg', 'font-semibold')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLParagraphElement>()
      render(<CardTitle ref={ref}>Title</CardTitle>)
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('CardDescription', () => {
    it('should render description text', () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>)
      const desc = screen.getByTestId('desc')
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLParagraphElement>()
      render(<CardDescription ref={ref}>Description</CardDescription>)
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })

  describe('CardContent', () => {
    it('should render content', () => {
      render(<CardContent>Main content</CardContent>)
      expect(screen.getByText('Main content')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('p-4', 'pt-0')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<CardContent ref={ref}>Content</CardContent>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardFooter', () => {
    it('should render footer', () => {
      render(<CardFooter>Footer content</CardFooter>)
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('flex', 'items-center', 'p-4', 'pt-0')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<CardFooter ref={ref}>Footer</CardFooter>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('composition', () => {
    it('should compose all card components correctly', () => {
      render(
        <Card data-testid="card">
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      )

      expect(screen.getByTestId('card')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Card Title')
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Card Content')).toBeInTheDocument()
      expect(screen.getByText('Card Footer')).toBeInTheDocument()
    })
  })
})
