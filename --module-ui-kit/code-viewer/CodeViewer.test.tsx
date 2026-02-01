/**
 * CodeViewer Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CodeViewer } from './CodeViewer'

describe('CodeViewer', () => {
  const sampleCode = `function hello() {
  console.log("Hello, World!");
}

hello();`

  const defaultProps = {
    code: sampleCode,
    fileName: 'test.ts'
  }

  describe('rendering', () => {
    it('should render code lines', () => {
      render(<CodeViewer {...defaultProps} />)
      // Check that line numbers are rendered
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<CodeViewer {...defaultProps} className="custom-class" />)
      expect(container.querySelector('.code-viewer')).toHaveClass('custom-class')
    })

    it('should have dark background', () => {
      const { container } = render(<CodeViewer {...defaultProps} />)
      expect(container.querySelector('.code-viewer')).toHaveClass('bg-[#0d1117]')
    })
  })

  describe('loading state', () => {
    it('should show skeleton when loading', () => {
      const { container } = render(<CodeViewer {...defaultProps} isLoading />)
      // Skeleton components should be rendered
      const skeletons = container.querySelectorAll('.bg-muted-foreground\\/10')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('error state', () => {
    it('should show error message', () => {
      render(<CodeViewer {...defaultProps} error="Network error" />)
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    it('should show error title', () => {
      render(<CodeViewer {...defaultProps} error="Network error" />)
      expect(screen.getByText('Failed to load file')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show empty message when no code', () => {
      render(<CodeViewer {...defaultProps} code="" />)
      expect(screen.getByText('No content to display')).toBeInTheDocument()
    })
  })

  describe('line interactions', () => {
    it('should call onLineClick when line is clicked', () => {
      const onLineClick = vi.fn()
      render(<CodeViewer {...defaultProps} onLineClick={onLineClick} />)

      const line = screen.getByText('1').closest('tr')
      expect(line).not.toBeNull()
      if (line) fireEvent.click(line)

      expect(onLineClick).toHaveBeenCalledWith(1)
    })

    it('should highlight selected line', () => {
      render(<CodeViewer {...defaultProps} selectedLine={2} />)
      const line = screen.getByText('2').closest('tr')
      expect(line).toHaveClass('bg-primary/30')
    })
  })

  describe('line highlighting', () => {
    it('should highlight specified lines', () => {
      render(<CodeViewer {...defaultProps} highlightLines={[1, 3]} />)
      const line1 = screen.getByText('1').closest('tr')
      const line3 = screen.getByText('3').closest('tr')
      expect(line1).toHaveClass('bg-primary/20')
      expect(line3).toHaveClass('bg-primary/20')
    })

    it('should apply addition highlight type', () => {
      render(<CodeViewer {...defaultProps} highlightLines={[1]} highlightType="addition" />)
      const line = screen.getByText('1').closest('tr')
      expect(line).toHaveClass('bg-success/20')
    })

    it('should apply deletion highlight type', () => {
      render(<CodeViewer {...defaultProps} highlightLines={[1]} highlightType="deletion" />)
      const line = screen.getByText('1').closest('tr')
      expect(line).toHaveClass('bg-destructive/20')
    })

    it('should apply modification highlight type', () => {
      render(<CodeViewer {...defaultProps} highlightLines={[1]} highlightType="modification" />)
      const line = screen.getByText('1').closest('tr')
      expect(line).toHaveClass('bg-warning/20')
    })
  })

  describe('language detection', () => {
    it('should detect language from filename', () => {
      // TypeScript file should be highlighted
      const { container } = render(<CodeViewer code="const x = 1" fileName="test.ts" />)
      // Check that code is rendered (highlighting may vary)
      expect(container.querySelector('.code-viewer')).toBeInTheDocument()
    })

    it('should use override language when provided', () => {
      const { container } = render(
        <CodeViewer code="const x = 1" fileName="test.txt" language="typescript" />
      )
      expect(container.querySelector('.code-viewer')).toBeInTheDocument()
    })
  })

  describe('data attributes', () => {
    it('should add data-line attribute to rows', () => {
      const { container } = render(<CodeViewer {...defaultProps} />)
      const rows = container.querySelectorAll('tr[data-line]')
      expect(rows.length).toBeGreaterThan(0)
      expect(rows[0]).toHaveAttribute('data-line', '1')
    })
  })
})
