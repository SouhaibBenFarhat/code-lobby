/**
 * Textarea Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  describe('rendering', () => {
    it('should render a textarea element', () => {
      render(<Textarea />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should forward ref to textarea element', () => {
      const ref = createRef<HTMLTextAreaElement>()
      render(<Textarea ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
    })
  })

  describe('styling', () => {
    it('should have default styles', () => {
      render(<Textarea />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('min-h-[80px]', 'w-full', 'rounded')
    })

    it('should merge custom className with default styles', () => {
      render(<Textarea className="custom-class" />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('custom-class')
      expect(textarea).toHaveClass('min-h-[80px]') // Still has default class
    })
  })

  describe('interactions', () => {
    it('should handle value changes', () => {
      const handleChange = vi.fn()
      render(<Textarea onChange={handleChange} />)
      const textarea = screen.getByRole('textbox')
      fireEvent.change(textarea, { target: { value: 'Hello World' } })
      expect(handleChange).toHaveBeenCalledTimes(1)
    })

    it('should display controlled value', () => {
      render(<Textarea value="Controlled value" onChange={() => {}} />)
      expect(screen.getByRole('textbox')).toHaveValue('Controlled value')
    })

    it('should display placeholder', () => {
      render(<Textarea placeholder="Enter description..." />)
      expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Textarea disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('should have disabled styles', () => {
      render(<Textarea disabled />)
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-40')
    })
  })

  describe('HTML attributes', () => {
    it('should pass through name attribute', () => {
      render(<Textarea name="description" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'description')
    })

    it('should pass through rows attribute', () => {
      render(<Textarea rows={5} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5')
    })

    it('should pass through required attribute', () => {
      render(<Textarea required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })

    it('should pass through data attributes', () => {
      render(<Textarea data-testid="my-textarea" />)
      expect(screen.getByTestId('my-textarea')).toBeInTheDocument()
    })
  })
})
