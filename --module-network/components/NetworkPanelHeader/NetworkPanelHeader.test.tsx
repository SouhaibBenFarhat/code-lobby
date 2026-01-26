import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NetworkPanelHeader } from './NetworkPanelHeader'

describe('NetworkPanelHeader', () => {
  const defaultProps = {
    totalCost: 0,
    showClearButton: false,
    onClear: vi.fn(),
    onClose: vi.fn()
  }

  it('should render the header with title', () => {
    render(<NetworkPanelHeader {...defaultProps} />)

    expect(screen.getByTestId('network-panel-header')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByTestId('network-icon')).toBeInTheDocument()
  })

  describe('Total Cost Display', () => {
    it('should not display cost when totalCost is 0', () => {
      render(<NetworkPanelHeader {...defaultProps} totalCost={0} />)

      expect(screen.queryByTestId('total-cost')).not.toBeInTheDocument()
    })

    it('should display cost when totalCost > 0', () => {
      render(<NetworkPanelHeader {...defaultProps} totalCost={25} />)

      const costElement = screen.getByTestId('total-cost')
      expect(costElement).toBeInTheDocument()
      expect(costElement).toHaveTextContent('25 pts')
    })

    it('should display large cost values correctly', () => {
      render(<NetworkPanelHeader {...defaultProps} totalCost={1234} />)

      expect(screen.getByTestId('total-cost')).toHaveTextContent('1234 pts')
    })
  })

  describe('Clear Button', () => {
    it('should not render clear button when showClearButton is false', () => {
      render(<NetworkPanelHeader {...defaultProps} showClearButton={false} />)

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument()
    })

    it('should render clear button when showClearButton is true', () => {
      render(<NetworkPanelHeader {...defaultProps} showClearButton={true} />)

      expect(screen.getByTestId('clear-button')).toBeInTheDocument()
    })

    it('should call onClear when clear button is clicked', async () => {
      const user = userEvent.setup()
      const onClear = vi.fn()

      render(<NetworkPanelHeader {...defaultProps} showClearButton={true} onClear={onClear} />)

      await user.click(screen.getByTestId('clear-button'))
      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it('should have accessible label for clear button', () => {
      render(<NetworkPanelHeader {...defaultProps} showClearButton={true} />)

      expect(screen.getByRole('button', { name: /clear all requests/i })).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('should always render close button', () => {
      render(<NetworkPanelHeader {...defaultProps} />)

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(<NetworkPanelHeader {...defaultProps} onClose={onClose} />)

      await user.click(screen.getByTestId('close-button'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should have accessible label for close button', () => {
      render(<NetworkPanelHeader {...defaultProps} />)

      expect(screen.getByRole('button', { name: /close network panel/i })).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct border, background, and elevation classes', () => {
      render(<NetworkPanelHeader {...defaultProps} />)

      const header = screen.getByTestId('network-panel-header')
      expect(header).toHaveClass('border-b', 'border-border', 'bg-card/80', 'backdrop-blur-sm')
    })

    it('should have flex layout', () => {
      render(<NetworkPanelHeader {...defaultProps} />)

      const header = screen.getByTestId('network-panel-header')
      expect(header).toHaveClass('flex', 'items-center', 'justify-between')
    })
  })
})
