/**
 * Label Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Label } from './Label'

describe('Label', () => {
  describe('rendering', () => {
    it('should render a label element', () => {
      render(<Label>Username</Label>)
      expect(screen.getByText('Username')).toBeInTheDocument()
      expect(screen.getByText('Username').tagName).toBe('LABEL')
    })

    it('should render children correctly', () => {
      render(
        <Label>
          <span data-testid="child">Email</span>
        </Label>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should forward ref to label element', () => {
      const ref = createRef<HTMLLabelElement>()
      render(<Label ref={ref}>Label</Label>)
      expect(ref.current).toBeInstanceOf(HTMLLabelElement)
    })
  })

  describe('styling', () => {
    it('should have default styles', () => {
      render(<Label>Default</Label>)
      const label = screen.getByText('Default')
      expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none')
    })

    it('should merge custom className with default styles', () => {
      render(<Label className="custom-class">Custom</Label>)
      const label = screen.getByText('Custom')
      expect(label).toHaveClass('custom-class')
      expect(label).toHaveClass('text-sm') // Still has default class
    })
  })

  describe('HTML attributes', () => {
    it('should pass through htmlFor attribute', () => {
      render(<Label htmlFor="email-input">Email</Label>)
      expect(screen.getByText('Email')).toHaveAttribute('for', 'email-input')
    })

    it('should pass through other HTML attributes', () => {
      render(
        <Label data-testid="test-label" id="my-label">
          Test
        </Label>
      )
      const label = screen.getByText('Test')
      expect(label).toHaveAttribute('data-testid', 'test-label')
      expect(label).toHaveAttribute('id', 'my-label')
    })
  })

  describe('accessibility', () => {
    it('should work with form inputs', () => {
      render(
        <>
          <Label htmlFor="name">Name</Label>
          <input id="name" type="text" />
        </>
      )
      const label = screen.getByText('Name')
      const input = screen.getByRole('textbox')
      expect(label).toHaveAttribute('for', 'name')
      expect(input).toHaveAttribute('id', 'name')
    })
  })
})
