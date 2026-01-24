import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NetworkSearchInput } from './NetworkSearchInput'

describe('NetworkSearchInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn()
  }

  it('should render the search input', () => {
    render(<NetworkSearchInput {...defaultProps} />)

    expect(screen.getByTestId('network-search-container')).toBeInTheDocument()
    expect(screen.getByTestId('search-input')).toBeInTheDocument()
    expect(screen.getByTestId('search-icon')).toBeInTheDocument()
  })

  it('should display the current value', () => {
    render(<NetworkSearchInput {...defaultProps} value="test query" />)

    expect(screen.getByTestId('search-input')).toHaveValue('test query')
  })

  it('should use default placeholder', () => {
    render(<NetworkSearchInput {...defaultProps} />)

    expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Filter by URL...')
  })

  it('should use custom placeholder when provided', () => {
    render(<NetworkSearchInput {...defaultProps} placeholder="Search..." />)

    expect(screen.getByTestId('search-input')).toHaveAttribute('placeholder', 'Search...')
  })

  it('should call onChange when typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<NetworkSearchInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByTestId('search-input')
    await user.type(input, 'g')

    // onChange is called with the new value
    expect(onChange).toHaveBeenCalledWith('g')
  })

  describe('Clear Button', () => {
    it('should not show clear button when value is empty', () => {
      render(<NetworkSearchInput {...defaultProps} value="" />)

      expect(screen.queryByTestId('clear-search-button')).not.toBeInTheDocument()
    })

    it('should show clear button when value is not empty', () => {
      render(<NetworkSearchInput {...defaultProps} value="test" />)

      expect(screen.getByTestId('clear-search-button')).toBeInTheDocument()
    })

    it('should call onChange with empty string when clear is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<NetworkSearchInput {...defaultProps} value="test" onChange={onChange} />)

      await user.click(screen.getByTestId('clear-search-button'))

      expect(onChange).toHaveBeenCalledWith('')
    })

    it('should have accessible label for clear button', () => {
      render(<NetworkSearchInput {...defaultProps} value="test" />)

      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-label for the input', () => {
      render(<NetworkSearchInput {...defaultProps} />)

      expect(screen.getByTestId('search-input')).toHaveAttribute(
        'aria-label',
        'Search network requests'
      )
    })

    it('should be focusable', async () => {
      const user = userEvent.setup()
      render(<NetworkSearchInput {...defaultProps} />)

      const input = screen.getByTestId('search-input')
      await user.click(input)

      expect(input).toHaveFocus()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()

      render(<NetworkSearchInput {...defaultProps} value="test" onChange={onChange} />)

      // Tab to the clear button
      await user.tab()
      await user.tab()

      const clearButton = screen.getByTestId('clear-search-button')
      expect(clearButton).toHaveFocus()

      // Press enter to clear
      await user.keyboard('{Enter}')
      expect(onChange).toHaveBeenCalledWith('')
    })
  })

  describe('Styling', () => {
    it('should have correct input styling', () => {
      render(<NetworkSearchInput {...defaultProps} />)

      const input = screen.getByTestId('search-input')
      expect(input).toHaveClass('h-8', 'pl-8', 'pr-8', 'text-xs', 'w-full')
    })

    it('should have padding on the container', () => {
      render(<NetworkSearchInput {...defaultProps} />)

      const container = screen.getByTestId('network-search-container')
      expect(container).toHaveClass('px-3', 'py-2')
    })
  })
})
