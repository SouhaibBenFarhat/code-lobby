/**
 * ClaudeIcon Component Tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClaudeIcon, ClaudeLogoIcon } from './ClaudeIcon'

describe('ClaudeIcon', () => {
  describe('rendering', () => {
    it('should render an svg element', () => {
      render(<ClaudeIcon />)
      const svg = screen.getByRole('img', { name: 'Claude AI' })
      expect(svg).toBeInTheDocument()
      expect(svg.tagName).toBe('svg')
    })

    it('should have correct viewBox', () => {
      render(<ClaudeIcon />)
      const svg = screen.getByRole('img', { name: 'Claude AI' })
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })

    it('should have fill none', () => {
      render(<ClaudeIcon />)
      const svg = screen.getByRole('img', { name: 'Claude AI' })
      expect(svg).toHaveAttribute('fill', 'none')
    })
  })

  describe('accessibility', () => {
    it('should have role="img"', () => {
      render(<ClaudeIcon />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('should have aria-label', () => {
      render(<ClaudeIcon />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Claude AI')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ClaudeIcon className="w-6 h-6 text-red-500" />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveClass('w-6', 'h-6', 'text-red-500')
    })
  })

  describe('SVG props', () => {
    it('should pass through SVG props', () => {
      render(<ClaudeIcon data-testid="claude-icon" width={32} height={32} />)
      const svg = screen.getByTestId('claude-icon')
      expect(svg).toHaveAttribute('width', '32')
      expect(svg).toHaveAttribute('height', '32')
    })
  })

  describe('icon content', () => {
    it('should contain a path element', () => {
      const { container } = render(<ClaudeIcon />)
      const path = container.querySelector('path')
      expect(path).toBeInTheDocument()
    })

    it('should have Claude coral color', () => {
      const { container } = render(<ClaudeIcon />)
      const path = container.querySelector('path')
      expect(path).toHaveAttribute('fill', '#D97757')
    })
  })
})

describe('ClaudeLogoIcon', () => {
  describe('rendering', () => {
    it('should render an svg element', () => {
      render(<ClaudeLogoIcon />)
      const svg = screen.getByRole('img', { name: 'Claude AI' })
      expect(svg).toBeInTheDocument()
      expect(svg.tagName).toBe('svg')
    })

    it('should have correct viewBox', () => {
      render(<ClaudeLogoIcon />)
      const svg = screen.getByRole('img', { name: 'Claude AI' })
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })
  })

  describe('accessibility', () => {
    it('should have role="img"', () => {
      render(<ClaudeLogoIcon />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('should have aria-label', () => {
      render(<ClaudeLogoIcon />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Claude AI')
    })
  })

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<ClaudeLogoIcon className="w-8 h-8" />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveClass('w-8', 'h-8')
    })
  })

  describe('icon content', () => {
    it('should contain a path element', () => {
      const { container } = render(<ClaudeLogoIcon />)
      const path = container.querySelector('path')
      expect(path).toBeInTheDocument()
    })

    it('should have Claude coral color', () => {
      const { container } = render(<ClaudeLogoIcon />)
      const path = container.querySelector('path')
      expect(path).toHaveAttribute('fill', '#D97757')
    })
  })
})
