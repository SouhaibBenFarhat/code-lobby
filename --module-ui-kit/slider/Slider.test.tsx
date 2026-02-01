import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Slider } from './Slider'

describe('Slider', () => {
  it('renders a slider', () => {
    render(<Slider defaultValue={[50]} min={0} max={100} />)

    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
  })

  it('sets correct aria attributes for value', () => {
    render(<Slider defaultValue={[25]} min={0} max={100} />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')
    expect(slider).toHaveAttribute('aria-valuenow', '25')
  })

  it('applies custom className', () => {
    const { container } = render(<Slider defaultValue={[50]} className="custom-class" />)

    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('has disabled styling when disabled', () => {
    render(<Slider defaultValue={[50]} disabled />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('data-disabled')
  })
})
