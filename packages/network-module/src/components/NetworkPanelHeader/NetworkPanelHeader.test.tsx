import { TooltipProvider } from '@codelobby/ui-kit'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NetworkPanelHeader } from './NetworkPanelHeader'

// Wrapper component to provide TooltipProvider context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>
}

describe('NetworkPanelHeader', () => {
  const defaultProps = {
    totalCost: 0,
    showClearButton: false,
    onClear: vi.fn(),
    onClose: vi.fn()
  }

  it('should render the header with title', () => {
    render(
      <TestWrapper>
        <NetworkPanelHeader {...defaultProps} />
      </TestWrapper>
    )

    expect(screen.getByTestId('network-panel-header')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.getByTestId('network-icon')).toBeInTheDocument()
  })

  describe('Total Cost Display', () => {
    it('should not display cost when totalCost is 0', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} totalCost={0} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('total-cost')).not.toBeInTheDocument()
    })

    it('should display cost when totalCost > 0', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} totalCost={25} />
        </TestWrapper>
      )

      const costElement = screen.getByTestId('total-cost')
      expect(costElement).toBeInTheDocument()
      expect(costElement).toHaveTextContent('25 pts')
    })

    it('should display large cost values correctly', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} totalCost={1234} />
        </TestWrapper>
      )

      expect(screen.getByTestId('total-cost')).toHaveTextContent('1234 pts')
    })
  })

  describe('Clear Button', () => {
    it('should not render clear button when showClearButton is false', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} showClearButton={false} />
        </TestWrapper>
      )

      expect(screen.queryByTestId('clear-button')).not.toBeInTheDocument()
    })

    it('should render clear button when showClearButton is true', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} showClearButton={true} />
        </TestWrapper>
      )

      expect(screen.getByTestId('clear-button')).toBeInTheDocument()
    })

    it('should call onClear when clear button is clicked', async () => {
      const user = userEvent.setup()
      const onClear = vi.fn()

      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} showClearButton={true} onClear={onClear} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('clear-button'))
      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it('should have accessible label for clear button', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} showClearButton={true} />
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: /clear all requests/i })).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    it('should always render close button', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('close-button')).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} onClose={onClose} />
        </TestWrapper>
      )

      await user.click(screen.getByTestId('close-button'))
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should have accessible label for close button', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: /close network panel/i })).toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct border, background, and elevation classes', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} />
        </TestWrapper>
      )

      const header = screen.getByTestId('network-panel-header')
      expect(header).toHaveClass('border-b', 'border-border', 'bg-card/80', 'backdrop-blur-sm')
    })

    it('should have flex layout', () => {
      render(
        <TestWrapper>
          <NetworkPanelHeader {...defaultProps} />
        </TestWrapper>
      )

      const header = screen.getByTestId('network-panel-header')
      expect(header).toHaveClass('flex', 'items-center', 'justify-between')
    })
  })
})
