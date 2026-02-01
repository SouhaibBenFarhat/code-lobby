import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { ThinkingSection } from './ThinkingSection'

describe('ThinkingSection', () => {
  describe('rendering', () => {
    it('should return null when thinking is empty', () => {
      const { container } = render(<ThinkingSection thinking="" />)
      expect(container.firstChild).toBeNull()
    })

    it('should render when thinking has content', () => {
      render(<ThinkingSection thinking="Analyzing the code..." />)
      expect(screen.getByText('Thinking')).toBeInTheDocument()
    })

    it('should show brain icon', () => {
      render(<ThinkingSection thinking="Some thought" />)
      // Brain icon should be present
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = render(<ThinkingSection thinking="Test" className="custom-class" />)
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('expand/collapse behavior', () => {
    it('should be collapsed by default', () => {
      render(<ThinkingSection thinking="Hidden content" />)
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
    })

    it('should be expanded when defaultExpanded is true', () => {
      render(<ThinkingSection thinking="Visible content" defaultExpanded />)
      expect(screen.getByText('Visible content')).toBeInTheDocument()
    })

    it('should toggle content when clicked', async () => {
      const user = userEvent.setup()
      render(<ThinkingSection thinking="Toggle me" />)

      // Initially collapsed
      expect(screen.queryByText('Toggle me')).not.toBeInTheDocument()

      // Click to expand
      await user.click(screen.getByRole('button'))
      expect(screen.getByText('Toggle me')).toBeInTheDocument()

      // Click to collapse
      await user.click(screen.getByRole('button'))
      expect(screen.queryByText('Toggle me')).not.toBeInTheDocument()
    })
  })

  describe('streaming indicator', () => {
    it('should not show streaming indicator when not streaming', () => {
      render(<ThinkingSection thinking="Content" defaultExpanded />)
      // No pulse animation class
      const content = screen.getByText('Content')
      expect(content.parentElement?.querySelector('.animate-pulse')).toBeNull()
    })

    it('should show streaming indicator in header when streaming', () => {
      render(<ThinkingSection thinking="Content" isStreaming />)
      // Pulse indicator in header
      const button = screen.getByRole('button')
      expect(button.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should show cursor when streaming and expanded', () => {
      const { container } = render(
        <ThinkingSection thinking="Content" isStreaming defaultExpanded />
      )
      // There should be an animated cursor element
      const cursors = container.querySelectorAll('.animate-pulse')
      expect(cursors.length).toBeGreaterThan(0)
    })
  })

  describe('long content', () => {
    it('should handle multiline thinking content', () => {
      const multilineContent = `Line 1
Line 2
Line 3`
      render(<ThinkingSection thinking={multilineContent} defaultExpanded />)
      expect(screen.getByText(/Line 1/)).toBeInTheDocument()
      expect(screen.getByText(/Line 2/)).toBeInTheDocument()
      expect(screen.getByText(/Line 3/)).toBeInTheDocument()
    })

    it('should preserve whitespace formatting', () => {
      render(<ThinkingSection thinking="  indented" defaultExpanded />)
      const element = screen.getByText(/indented/)
      expect(element).toHaveClass('whitespace-pre-wrap')
    })
  })
})
