/**
 * ThinkingSection Tests
 */

import { fireEvent, render, screen } from '@test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ThinkingSection } from './ThinkingSection'

describe('ThinkingSection', () => {
  describe('rendering', () => {
    it('renders nothing when thinking is empty and no current tool', () => {
      const { container } = render(<ThinkingSection thinking="" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders when thinking text is provided', () => {
      render(<ThinkingSection thinking="Processing your request..." />)
      expect(screen.getByText('Thinking')).toBeInTheDocument()
    })

    it('renders when only current tool is provided', () => {
      render(<ThinkingSection thinking="" currentTool={{ name: 'Read', input: 'file.ts' }} />)
      expect(screen.getByText('Thinking')).toBeInTheDocument()
    })

    it('renders custom label', () => {
      render(<ThinkingSection thinking="test" label="Reasoning" />)
      expect(screen.getByText('Reasoning')).toBeInTheDocument()
    })

    it('shows Brain icon', () => {
      render(<ThinkingSection thinking="test" />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('uncontrolled mode', () => {
    it('is collapsed by default', () => {
      render(<ThinkingSection thinking="Hidden content" />)
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('can be expanded by default', () => {
      render(<ThinkingSection thinking="Visible content" defaultExpanded />)
      expect(screen.getByText('Visible content')).toBeInTheDocument()
    })

    it('toggles expanded state on click', () => {
      render(<ThinkingSection thinking="Toggle content" />)

      // Initially collapsed
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()

      // Click to expand
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText('Toggle content')).toBeInTheDocument()

      // Click to collapse
      fireEvent.click(screen.getByRole('button'))
      expect(screen.queryByText('Toggle content')).not.toBeInTheDocument()
    })
  })

  describe('controlled mode', () => {
    it('respects isExpanded prop', () => {
      const { rerender } = render(
        <ThinkingSection thinking="Controlled content" isExpanded={false} />
      )
      expect(screen.queryByText('Controlled content')).not.toBeInTheDocument()

      rerender(<ThinkingSection thinking="Controlled content" isExpanded />)
      expect(screen.getByText('Controlled content')).toBeInTheDocument()
    })

    it('calls onExpandedChange when toggled', () => {
      const onExpandedChange = vi.fn()
      render(
        <ThinkingSection thinking="test" isExpanded={false} onExpandedChange={onExpandedChange} />
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onExpandedChange).toHaveBeenCalledWith(true)
    })
  })

  describe('streaming indicator', () => {
    it('shows streaming indicator when isStreaming is true', () => {
      render(<ThinkingSection thinking="Streaming..." isStreaming />)
      const container = screen.getByRole('button')
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('does not show streaming indicator when isStreaming is false', () => {
      render(<ThinkingSection thinking="Not streaming" isStreaming={false} />)
      const container = screen.getByRole('button')
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })
  })

  describe('tool activity', () => {
    it('displays tool count badge', () => {
      render(<ThinkingSection thinking="test" toolCount={5} />)
      expect(screen.getByText('• 5 tools used')).toBeInTheDocument()
    })

    it('does not display tool count when 0', () => {
      render(<ThinkingSection thinking="test" toolCount={0} />)
      expect(screen.queryByText(/tools used/)).not.toBeInTheDocument()
    })

    it('displays current tool when expanded', () => {
      render(
        <ThinkingSection
          thinking="test"
          currentTool={{ name: 'Read', input: 'src/index.ts' }}
          defaultExpanded
        />
      )
      expect(screen.getByText('Read')).toBeInTheDocument()
      expect(screen.getByText('src/index.ts')).toBeInTheDocument()
    })
  })

  describe('hint text', () => {
    it('shows hint when showHint is true', () => {
      render(<ThinkingSection thinking="test" showHint />)
      expect(screen.getByText('Click to show')).toBeInTheDocument()
    })

    it('shows correct hint text when expanded', () => {
      render(<ThinkingSection thinking="test" showHint defaultExpanded />)
      expect(screen.getByText('Click to hide')).toBeInTheDocument()
    })

    it('does not show hint by default', () => {
      render(<ThinkingSection thinking="test" />)
      expect(screen.queryByText(/Click to/)).not.toBeInTheDocument()
    })
  })

  describe('fallback text', () => {
    it('shows "Starting..." when thinking is empty but expanded', () => {
      render(<ThinkingSection thinking="" currentTool={{ name: 'Read' }} defaultExpanded />)
      expect(screen.getByText('Starting...')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('applies primary background when expanded', () => {
      const { container } = render(<ThinkingSection thinking="test" defaultExpanded />)
      expect(container.firstChild).toHaveClass('bg-primary/5')
    })

    it('applies custom className', () => {
      const { container } = render(<ThinkingSection thinking="test" className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
