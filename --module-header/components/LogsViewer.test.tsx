import { render, screen } from '@test-utils'
import { describe, expect, it } from 'vitest'
import { LogsViewer } from './LogsViewer'

describe('LogsViewer', () => {
  it('should render the disabled logs button', () => {
    render(<LogsViewer />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('should have scroll icon', () => {
    const { container } = render(<LogsViewer />)
    expect(container.querySelector('.lucide-scroll-text')).toBeInTheDocument()
  })
})
