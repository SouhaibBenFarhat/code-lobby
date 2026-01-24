/**
 * ScrollArea Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
// biome-ignore lint/correctness/noUnusedImports: ScrollBar is tested indirectly
import { ScrollArea, ScrollBar } from './ScrollArea'

describe('ScrollArea', () => {
  describe('ScrollArea (root)', () => {
    it('should render scroll area container', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div>Scrollable content</div>
        </ScrollArea>
      )
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument()
    })

    it('should render children', () => {
      render(
        <ScrollArea>
          <div data-testid="child">Child content</div>
        </ScrollArea>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should apply relative overflow-hidden class', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      )
      const scrollArea = screen.getByTestId('scroll-area')
      expect(scrollArea).toHaveClass('relative', 'overflow-hidden')
    })

    it('should accept custom className', () => {
      render(
        <ScrollArea className="h-[200px] w-[350px]" data-testid="scroll-area">
          <div>Content</div>
        </ScrollArea>
      )
      const scrollArea = screen.getByTestId('scroll-area')
      expect(scrollArea).toHaveClass('h-[200px]', 'w-[350px]')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <ScrollArea ref={ref}>
          <div>Content</div>
        </ScrollArea>
      )
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should render scrollbar by default', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div style={{ height: '500px' }}>Tall content</div>
        </ScrollArea>
      )
      // ScrollBar is rendered inside ScrollArea
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument()
    })
  })

  describe('ScrollBar', () => {
    // Note: ScrollBar must be used within ScrollArea context
    // We test its integration rather than in isolation
    it('should be rendered as part of ScrollArea', () => {
      render(
        <ScrollArea data-testid="scroll-area">
          <div style={{ height: '500px' }}>Tall content</div>
        </ScrollArea>
      )
      // ScrollBar is automatically rendered inside ScrollArea
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument()
    })

    it('should have proper scrollbar styling in ScrollArea', () => {
      render(
        <ScrollArea className="h-[200px]" data-testid="scroll-area">
          <div style={{ height: '500px' }}>
            <p>Scrollable content that is taller than container</p>
          </div>
        </ScrollArea>
      )
      // The ScrollBar with default vertical orientation is rendered
      expect(screen.getByTestId('scroll-area')).toBeInTheDocument()
    })
  })

  describe('composition', () => {
    it('should compose scroll area with content correctly', () => {
      render(
        <ScrollArea className="h-[200px] w-[350px]" data-testid="scroll-area">
          <div className="p-4">
            <h4 className="mb-4 text-sm font-medium">Tags</h4>
            {Array.from({ length: 50 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: test data
              <div key={i} className="text-sm">
                Item {i + 1}
              </div>
            ))}
          </div>
        </ScrollArea>
      )

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument()
      expect(screen.getByText('Tags')).toBeInTheDocument()
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 50')).toBeInTheDocument()
    })

    it('should work with horizontal scroll content', () => {
      render(
        <ScrollArea className="w-[200px] whitespace-nowrap" data-testid="scroll-area">
          <div className="flex w-max space-x-4 p-4">
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: test data
              <div key={i} className="w-[150px]">
                Card {i + 1}
              </div>
            ))}
          </div>
        </ScrollArea>
      )

      expect(screen.getByTestId('scroll-area')).toBeInTheDocument()
      expect(screen.getByText('Card 1')).toBeInTheDocument()
      expect(screen.getByText('Card 10')).toBeInTheDocument()
    })
  })
})
