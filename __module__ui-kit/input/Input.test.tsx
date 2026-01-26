/**
 * Input Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  describe('rendering', () => {
    it('should render an input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(<Input data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveClass('flex', 'h-9', 'w-full', 'rounded-[8px]')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLInputElement>()
      render(<Input ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLInputElement)
    })
  })

  describe('types', () => {
    it('should render text input when type is text', () => {
      render(<Input type="text" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render password input', () => {
      render(<Input type="password" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should render email input', () => {
      render(<Input type="email" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render number input', () => {
      render(<Input type="number" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'number')
    })

    it('should render search input', () => {
      render(<Input type="search" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('type', 'search')
    })
  })

  describe('interactions', () => {
    it('should accept and display value', () => {
      render(<Input defaultValue="test value" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveValue('test value')
    })

    it('should call onChange handler when typing', () => {
      const handleChange = vi.fn()
      render(<Input onChange={handleChange} data-testid="input" />)
      const input = screen.getByTestId('input')
      fireEvent.change(input, { target: { value: 'new value' } })
      expect(handleChange).toHaveBeenCalled()
    })

    it('should call onFocus handler when focused', () => {
      const handleFocus = vi.fn()
      render(<Input onFocus={handleFocus} data-testid="input" />)
      const input = screen.getByTestId('input')
      fireEvent.focus(input)
      expect(handleFocus).toHaveBeenCalled()
    })

    it('should call onBlur handler when blurred', () => {
      const handleBlur = vi.fn()
      render(<Input onBlur={handleBlur} data-testid="input" />)
      const input = screen.getByTestId('input')
      fireEvent.blur(input)
      expect(handleBlur).toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toBeDisabled()
    })

    it('should apply disabled styles', () => {
      render(<Input disabled data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-40')
    })
  })

  describe('placeholder', () => {
    it('should display placeholder text', () => {
      render(<Input placeholder="Enter text..." data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('placeholder', 'Enter text...')
    })
  })

  describe('custom className', () => {
    it('should merge custom className with default styles', () => {
      render(<Input className="custom-class" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveClass('custom-class')
      expect(input).toHaveClass('flex', 'h-9') // Still has default classes
    })
  })

  describe('HTML attributes', () => {
    it('should pass through HTML input attributes', () => {
      render(
        <Input name="email" autoComplete="email" required maxLength={100} data-testid="input" />
      )
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('name', 'email')
      expect(input).toHaveAttribute('autocomplete', 'email')
      expect(input).toBeRequired()
      expect(input).toHaveAttribute('maxlength', '100')
    })

    it('should pass through aria attributes', () => {
      render(<Input aria-label="Search" aria-describedby="search-help" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveAttribute('aria-label', 'Search')
      expect(input).toHaveAttribute('aria-describedby', 'search-help')
    })
  })

  describe('controlled vs uncontrolled', () => {
    it('should work as controlled input', () => {
      const { rerender } = render(
        <Input value="controlled" onChange={() => {}} data-testid="input" />
      )
      const input = screen.getByTestId('input')
      expect(input).toHaveValue('controlled')

      rerender(<Input value="updated" onChange={() => {}} data-testid="input" />)
      expect(input).toHaveValue('updated')
    })

    it('should work as uncontrolled input', () => {
      render(<Input defaultValue="uncontrolled" data-testid="input" />)
      const input = screen.getByTestId('input')
      expect(input).toHaveValue('uncontrolled')

      fireEvent.change(input, { target: { value: 'new value' } })
      expect(input).toHaveValue('new value')
    })
  })
})
