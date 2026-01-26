import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListFooter } from './ListFooter'

describe('ListFooter', () => {
  it('should render the footer', () => {
    render(<ListFooter count={5} />)

    expect(screen.getByTestId('list-footer')).toBeInTheDocument()
  })

  it('should display singular "request" for count of 1', () => {
    render(<ListFooter count={1} />)

    const footer = screen.getByTestId('list-footer')
    expect(footer).toHaveTextContent('1 request')
    expect(footer).not.toHaveTextContent('1 requests')
  })

  it('should display plural "requests" for count of 0', () => {
    render(<ListFooter count={0} />)

    expect(screen.getByTestId('list-footer')).toHaveTextContent('0 requests')
  })

  it('should display plural "requests" for count > 1', () => {
    render(<ListFooter count={5} />)

    expect(screen.getByTestId('list-footer')).toHaveTextContent('5 requests')
  })

  it('should display correct format with "End of list"', () => {
    render(<ListFooter count={10} />)

    expect(screen.getByTestId('list-footer')).toHaveTextContent('— End of list (10 requests) —')
  })

  it('should have correct styling classes', () => {
    render(<ListFooter count={5} />)

    const footer = screen.getByTestId('list-footer')
    expect(footer).toHaveClass('flex', 'items-center', 'justify-center', 'py-4', 'border-t')
  })

  it('should handle large counts', () => {
    render(<ListFooter count={1000} />)

    expect(screen.getByTestId('list-footer')).toHaveTextContent('1000 requests')
  })
})
