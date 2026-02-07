import { render, screen } from '@testing-library/react'
import { Home } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'
import { ViewHeader, ViewHeaderActions, ViewHeaderDivider } from './view-header'

describe('ViewHeader', () => {
  describe('rendering', () => {
    it('should render with title', () => {
      render(<ViewHeader title="Test Header" />)
      expect(screen.getByText('Test Header')).toBeInTheDocument()
    })

    it('should render with title and subtitle', () => {
      render(<ViewHeader title="Main Title" subtitle="Sub Title" />)
      expect(screen.getByText('Main Title')).toBeInTheDocument()
      expect(screen.getByText('Sub Title')).toBeInTheDocument()
    })

    it('should render with icon', () => {
      render(<ViewHeader icon={<Home data-testid="icon" />} title="With Icon" />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('should render left content', () => {
      render(<ViewHeader leftContent={<span>Custom Left</span>} />)
      expect(screen.getByText('Custom Left')).toBeInTheDocument()
    })

    it('should render center content', () => {
      render(<ViewHeader centerContent={<span>Center Content</span>} />)
      expect(screen.getByText('Center Content')).toBeInTheDocument()
    })

    it('should render right content', () => {
      render(<ViewHeader rightContent={<span>Right Content</span>} />)
      expect(screen.getByText('Right Content')).toBeInTheDocument()
    })

    it('should render bottom content', () => {
      render(<ViewHeader title="Header" bottomContent={<span>Bottom Content</span>} />)
      expect(screen.getByText('Bottom Content')).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('should apply sm size class', () => {
      const { container } = render(<ViewHeader size="sm" title="Small" />)
      expect(container.querySelector('.h-10')).toBeInTheDocument()
    })

    it('should apply md size class (default)', () => {
      const { container } = render(<ViewHeader title="Medium" />)
      expect(container.querySelector('.h-12')).toBeInTheDocument()
    })

    it('should apply lg size class', () => {
      const { container } = render(<ViewHeader size="lg" title="Large" />)
      expect(container.querySelector('.h-14')).toBeInTheDocument()
    })
  })

  describe('elevation', () => {
    it('should have section-header class by default', () => {
      const { container } = render(<ViewHeader title="Elevated" />)
      const header = container.firstChild as HTMLElement
      expect(header.className).toContain('section-header')
    })

    it('should not have section-header when elevated=false', () => {
      const { container } = render(<ViewHeader title="Not Elevated" elevated={false} />)
      const header = container.firstChild as HTMLElement
      expect(header.className).not.toContain('section-header')
    })
  })

  describe('sticky', () => {
    it('should have sticky class when sticky=true', () => {
      const { container } = render(<ViewHeader title="Sticky" sticky />)
      const header = container.firstChild as HTMLElement
      expect(header.className).toContain('sticky')
    })
  })

  describe('z-index', () => {
    it('should apply custom z-index', () => {
      const { container } = render(<ViewHeader title="Z-Index" zIndex={50} />)
      const header = container.firstChild as HTMLElement
      expect(header.style.zIndex).toBe('50')
    })
  })

  describe('draggable', () => {
    it('should have drag-region class when draggable=true', () => {
      const { container } = render(<ViewHeader title="Draggable" draggable />)
      const header = container.firstChild as HTMLElement
      expect(header.className).toContain('drag-region')
    })
  })
})

describe('ViewHeaderActions', () => {
  it('should render children', () => {
    render(
      <ViewHeaderActions>
        <Button>Action 1</Button>
        <Button>Action 2</Button>
      </ViewHeaderActions>
    )
    expect(screen.getByText('Action 1')).toBeInTheDocument()
    expect(screen.getByText('Action 2')).toBeInTheDocument()
  })

  it('should apply gap classes', () => {
    const { container } = render(
      <ViewHeaderActions gap="md">
        <Button>Action</Button>
      </ViewHeaderActions>
    )
    expect(container.firstChild).toHaveClass('gap-2')
  })
})

describe('ViewHeaderDivider', () => {
  it('should render', () => {
    const { container } = render(<ViewHeaderDivider />)
    expect(container.firstChild).toHaveClass('w-px')
    expect(container.firstChild).toHaveClass('bg-border')
  })

  it('should apply size classes', () => {
    const { container } = render(<ViewHeaderDivider size="lg" />)
    expect(container.firstChild).toHaveClass('h-6')
  })
})
