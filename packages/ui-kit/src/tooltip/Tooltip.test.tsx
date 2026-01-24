/**
 * Tooltip Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './Tooltip'

describe('Tooltip', () => {
  // Use defaultOpen for tests to avoid hover/timing issues in JSDOM
  const renderTooltip = (props?: {
    triggerText?: string
    tooltipText?: string
    contentProps?: Record<string, unknown>
    defaultOpen?: boolean
  }) => {
    const {
      triggerText = 'Hover me',
      tooltipText = 'Tooltip content',
      contentProps = {},
      defaultOpen = true
    } = props || {}
    return render(
      <TooltipProvider delayDuration={0}>
        <Tooltip defaultOpen={defaultOpen}>
          <TooltipTrigger asChild>
            <button type="button">{triggerText}</button>
          </TooltipTrigger>
          <TooltipContent {...contentProps}>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  describe('TooltipProvider', () => {
    it('should render children', () => {
      render(
        <TooltipProvider>
          <div data-testid="child">Child content</div>
        </TooltipProvider>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('TooltipTrigger', () => {
    it('should render trigger element', () => {
      renderTooltip({ triggerText: 'Trigger Button', defaultOpen: false })
      expect(screen.getByRole('button', { name: /trigger button/i })).toBeInTheDocument()
    })

    it('should show tooltip when open', () => {
      renderTooltip({ tooltipText: 'Visible tooltip', contentProps: { 'data-testid': 'tooltip' } })

      expect(screen.getByTestId('tooltip')).toBeInTheDocument()
      expect(screen.getByTestId('tooltip')).toHaveTextContent('Visible tooltip')
    })
  })

  describe('TooltipContent', () => {
    it('should render tooltip content when open', () => {
      renderTooltip({ tooltipText: 'Custom content', contentProps: { 'data-testid': 'tooltip' } })

      expect(screen.getByTestId('tooltip')).toHaveTextContent('Custom content')
    })

    it('should apply custom className', () => {
      renderTooltip({
        tooltipText: 'Styled tooltip',
        contentProps: { className: 'custom-tooltip', 'data-testid': 'tooltip-content' }
      })

      const content = screen.getByTestId('tooltip-content')
      expect(content).toHaveClass('custom-tooltip')
    })

    it('should apply default styling', () => {
      renderTooltip({
        tooltipText: 'Default styled',
        contentProps: { 'data-testid': 'tooltip-content' }
      })

      const content = screen.getByTestId('tooltip-content')
      expect(content).toHaveClass('rounded-md', 'border', 'bg-popover', 'px-3', 'py-1.5')
    })

    it('should support side offset', () => {
      render(
        <TooltipProvider delayDuration={0}>
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <button type="button">Trigger</button>
            </TooltipTrigger>
            <TooltipContent sideOffset={10} data-testid="tooltip-content">
              Offset tooltip
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      expect(screen.getByTestId('tooltip-content')).toBeInTheDocument()
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(
        <TooltipProvider delayDuration={0}>
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <button type="button">Trigger</button>
            </TooltipTrigger>
            <TooltipContent ref={ref}>Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('composition', () => {
    it('should work with complex trigger content', () => {
      render(
        <TooltipProvider delayDuration={0}>
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <button type="button">
                <span>Icon</span>
                <span>Label</span>
              </button>
            </TooltipTrigger>
            <TooltipContent data-testid="tooltip">Complex trigger tooltip</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const trigger = screen.getByRole('button')
      expect(trigger).toHaveTextContent('Icon')
      expect(trigger).toHaveTextContent('Label')
      expect(screen.getByTestId('tooltip')).toHaveTextContent('Complex trigger tooltip')
    })

    it('should work with complex tooltip content', () => {
      render(
        <TooltipProvider delayDuration={0}>
          <Tooltip defaultOpen>
            <TooltipTrigger asChild>
              <button type="button">Hover</button>
            </TooltipTrigger>
            <TooltipContent data-testid="tooltip">
              <div>
                <strong>Title</strong>
                <p>Description text</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toHaveTextContent('Title')
      expect(tooltip).toHaveTextContent('Description text')
    })
  })
})
