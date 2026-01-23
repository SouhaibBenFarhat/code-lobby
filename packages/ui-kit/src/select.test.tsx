/**
 * Select Component Tests
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'

// Mock scrollIntoView for JSDOM (Radix Select uses it)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from './select'

describe('Select', () => {
  describe('SelectTrigger', () => {
    it('should render trigger button', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      expect(screen.getByTestId('trigger')).toBeInTheDocument()
    })

    it('should show placeholder when no value selected', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      expect(screen.getByText('Select an option')).toBeInTheDocument()
    })

    it('should have combobox role', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      expect(screen.getByTestId('trigger')).toHaveClass('custom-trigger')
    })

    it('should be disabled when disabled prop is true', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )
      expect(screen.getByTestId('trigger')).toBeDisabled()
    })
  })

  describe('SelectContent', () => {
    it('should open when trigger is clicked', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('should show options when open', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('Option 1')).toBeInTheDocument()
        expect(screen.getByText('Option 2')).toBeInTheDocument()
      })
    })
  })

  describe('SelectItem', () => {
    it('should render option items', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="test">Test Option</SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /test option/i })).toBeInTheDocument()
      })
    })

    it('should select item when clicked', async () => {
      const onValueChange = vi.fn()
      render(
        <Select onValueChange={onValueChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="selected">Selected Option</SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('Selected Option')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('option', { name: /selected option/i }))

      expect(onValueChange).toHaveBeenCalledWith('selected')
    })

    it('should show selected value in trigger', async () => {
      render(
        <Select defaultValue="1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByText('Option 1')).toBeInTheDocument()
    })

    it('should be disabled when disabled prop is true', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2" disabled>
              Disabled Option
            </SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const disabledOption = screen.getByRole('option', { name: /disabled option/i })
        expect(disabledOption).toHaveAttribute('data-disabled', '')
      })
    })
  })

  describe('SelectGroup', () => {
    it('should render grouped options', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Group 1</SelectLabel>
              <SelectItem value="1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('Group 1')).toBeInTheDocument()
        expect(screen.getByText('Option 1')).toBeInTheDocument()
      })
    })
  })

  describe('SelectLabel', () => {
    it('should render group label', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Category Label</SelectLabel>
              <SelectItem value="1">Option 1</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('Category Label')).toBeInTheDocument()
      })
    })
  })

  describe('SelectSeparator', () => {
    it('should render separator between groups', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectSeparator data-testid="separator" />
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByTestId('separator')).toBeInTheDocument()
      })
    })

    it('should apply separator styles', async () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectSeparator data-testid="separator" />
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        const separator = screen.getByTestId('separator')
        expect(separator).toHaveClass('h-px', 'bg-muted')
      })
    })
  })

  describe('controlled vs uncontrolled', () => {
    it('should work as controlled select', () => {
      const { rerender } = render(
        <Select value="1">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByText('Option 1')).toBeInTheDocument()

      rerender(
        <Select value="2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })

    it('should work as uncontrolled select with defaultValue', () => {
      render(
        <Select defaultValue="2">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )

      expect(screen.getByText('Option 2')).toBeInTheDocument()
    })
  })
})
