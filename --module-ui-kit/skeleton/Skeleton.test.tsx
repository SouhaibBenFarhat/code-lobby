import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Skeleton } from './Skeleton'

describe('Skeleton', () => {
  it('renders with default styles', () => {
    const { container } = render(<Skeleton />)
    const skeleton = container.firstChild as HTMLElement

    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass('animate-skeleton')
    expect(skeleton).toHaveClass('rounded-md')
    expect(skeleton).toHaveClass('bg-border-subtle')
  })

  it('accepts custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />)
    const skeleton = container.firstChild as HTMLElement

    expect(skeleton).toHaveClass('h-4')
    expect(skeleton).toHaveClass('w-24')
    expect(skeleton).toHaveClass('animate-skeleton')
  })

  it('passes through additional props', () => {
    const { container } = render(<Skeleton data-testid="test-skeleton" />)
    const skeleton = container.firstChild as HTMLElement

    expect(skeleton).toHaveAttribute('data-testid', 'test-skeleton')
  })
})
