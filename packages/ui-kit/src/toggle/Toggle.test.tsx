import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Toggle } from './Toggle'

describe('Toggle', () => {
  it('renders unchecked by default', () => {
    render(<Toggle />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('renders checked when checked prop is true', () => {
    render(<Toggle checked />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('calls onCheckedChange when clicked', () => {
    const handleChange = vi.fn()
    render(<Toggle onCheckedChange={handleChange} />)
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)
    expect(handleChange).toHaveBeenCalledWith(true)
  })

  it('toggles from checked to unchecked', () => {
    const handleChange = vi.fn()
    render(<Toggle checked onCheckedChange={handleChange} />)
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Toggle disabled />)
    const toggle = screen.getByRole('switch')
    expect(toggle).toBeDisabled()
  })

  it('renders different sizes', () => {
    const { rerender } = render(<Toggle size="default" />)
    expect(screen.getByRole('switch')).toHaveClass('h-6', 'w-11')

    rerender(<Toggle size="sm" />)
    expect(screen.getByRole('switch')).toHaveClass('h-5', 'w-9')

    rerender(<Toggle size="xs" />)
    expect(screen.getByRole('switch')).toHaveClass('h-4', 'w-7')
  })

  it('applies custom className', () => {
    render(<Toggle className="custom-class" />)
    expect(screen.getByRole('switch')).toHaveClass('custom-class')
  })
})
