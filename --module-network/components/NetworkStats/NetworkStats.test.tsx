import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NetworkStats } from './NetworkStats'

describe('NetworkStats', () => {
  const defaultProps = {
    total: 0,
    pendingCount: 0,
    errorCount: 0
  }

  it('should render the stats container', () => {
    render(<NetworkStats {...defaultProps} />)

    expect(screen.getByTestId('network-stats')).toBeInTheDocument()
  })

  describe('Request Count', () => {
    it('should display singular "request" for 1 request', () => {
      render(<NetworkStats {...defaultProps} total={1} />)

      expect(screen.getByTestId('request-count')).toHaveTextContent('1 request')
    })

    it('should display plural "requests" for 0 requests', () => {
      render(<NetworkStats {...defaultProps} total={0} />)

      expect(screen.getByTestId('request-count')).toHaveTextContent('0 requests')
    })

    it('should display plural "requests" for multiple requests', () => {
      render(<NetworkStats {...defaultProps} total={5} />)

      expect(screen.getByTestId('request-count')).toHaveTextContent('5 requests')
    })

    it('should show filtered count when isFiltered is true', () => {
      render(<NetworkStats {...defaultProps} total={3} totalUnfiltered={10} isFiltered={true} />)

      expect(screen.getByTestId('request-count')).toHaveTextContent('3 of 10 requests')
    })

    it('should not show filtered count when isFiltered is false', () => {
      render(<NetworkStats {...defaultProps} total={3} totalUnfiltered={10} isFiltered={false} />)

      expect(screen.getByTestId('request-count')).toHaveTextContent('3 requests')
      expect(screen.getByTestId('request-count')).not.toHaveTextContent('of 10')
    })
  })

  describe('Pending Count', () => {
    it('should not display pending count when 0', () => {
      render(<NetworkStats {...defaultProps} pendingCount={0} />)

      expect(screen.queryByTestId('pending-count')).not.toBeInTheDocument()
    })

    it('should display pending count when > 0', () => {
      render(<NetworkStats {...defaultProps} pendingCount={3} />)

      expect(screen.getByTestId('pending-count')).toBeInTheDocument()
      expect(screen.getByTestId('pending-count')).toHaveTextContent('3')
    })

    it('should have loading spinner icon', () => {
      render(<NetworkStats {...defaultProps} pendingCount={2} />)

      const pendingElement = screen.getByTestId('pending-count')
      // Should contain the Loader2 icon (which has animate-spin class)
      expect(pendingElement.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should have blue text color', () => {
      render(<NetworkStats {...defaultProps} pendingCount={1} />)

      expect(screen.getByTestId('pending-count')).toHaveClass('text-blue-400/70')
    })
  })

  describe('Error Count', () => {
    it('should not display error count when 0', () => {
      render(<NetworkStats {...defaultProps} errorCount={0} />)

      expect(screen.queryByTestId('error-count')).not.toBeInTheDocument()
    })

    it('should display error count when > 0', () => {
      render(<NetworkStats {...defaultProps} errorCount={2} />)

      expect(screen.getByTestId('error-count')).toBeInTheDocument()
      expect(screen.getByTestId('error-count')).toHaveTextContent('2 failed')
    })

    it('should have destructive text color', () => {
      render(<NetworkStats {...defaultProps} errorCount={1} />)

      expect(screen.getByTestId('error-count')).toHaveClass('text-red-400/80')
    })
  })

  describe('Combined Stats', () => {
    it('should display all stats when applicable', () => {
      render(<NetworkStats total={10} pendingCount={2} errorCount={3} />)

      expect(screen.getByTestId('request-count')).toHaveTextContent('10 requests')
      expect(screen.getByTestId('pending-count')).toHaveTextContent('2')
      expect(screen.getByTestId('error-count')).toHaveTextContent('3 failed')
    })

    it('should display only request count when no pending or errors', () => {
      render(<NetworkStats total={5} pendingCount={0} errorCount={0} />)

      expect(screen.getByTestId('request-count')).toBeInTheDocument()
      expect(screen.queryByTestId('pending-count')).not.toBeInTheDocument()
      expect(screen.queryByTestId('error-count')).not.toBeInTheDocument()
    })
  })

  describe('Styling', () => {
    it('should have correct container classes', () => {
      render(<NetworkStats {...defaultProps} />)

      const container = screen.getByTestId('network-stats')
      expect(container).toHaveClass('px-3', 'py-1', 'border-b', 'bg-background')
    })

    it('should have flex layout', () => {
      render(<NetworkStats {...defaultProps} />)

      const innerContainer = screen.getByTestId('network-stats').firstChild
      expect(innerContainer).toHaveClass('flex', 'items-center', 'gap-2')
    })
  })
})
