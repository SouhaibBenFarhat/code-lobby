/**
 * Icon Components Tests
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClaudeIcon, ClaudeLogoIcon } from './claude-icon'
import { CodeLobbyIcon, CodeLobbyLogo, CodeLobbyLogoAnimated } from './codelobby-logo'

describe('Claude Icons', () => {
  describe('ClaudeIcon', () => {
    it('should render an svg element', () => {
      render(<ClaudeIcon data-testid="claude-icon" />)
      const svg = screen.getByTestId('claude-icon')
      expect(svg.tagName).toBe('svg')
    })

    it('should have role="img" for accessibility', () => {
      render(<ClaudeIcon />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('should have aria-label', () => {
      render(<ClaudeIcon />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Claude AI')
    })

    it('should apply custom className', () => {
      render(<ClaudeIcon className="w-8 h-8" data-testid="claude-icon" />)
      const svg = screen.getByTestId('claude-icon')
      expect(svg).toHaveClass('w-8', 'h-8')
    })

    it('should pass through SVG props', () => {
      render(<ClaudeIcon width={48} height={48} data-testid="claude-icon" />)
      const svg = screen.getByTestId('claude-icon')
      expect(svg).toHaveAttribute('width', '48')
      expect(svg).toHaveAttribute('height', '48')
    })

    it('should contain a path element with fill color', () => {
      render(<ClaudeIcon data-testid="claude-icon" />)
      const svg = screen.getByTestId('claude-icon')
      const path = svg.querySelector('path')
      expect(path).toBeInTheDocument()
      expect(path).toHaveAttribute('fill', '#D97757')
    })
  })

  describe('ClaudeLogoIcon', () => {
    it('should render an svg element', () => {
      render(<ClaudeLogoIcon data-testid="claude-logo" />)
      const svg = screen.getByTestId('claude-logo')
      expect(svg.tagName).toBe('svg')
    })

    it('should have role="img" for accessibility', () => {
      render(<ClaudeLogoIcon />)
      expect(screen.getByRole('img')).toBeInTheDocument()
    })

    it('should have aria-label', () => {
      render(<ClaudeLogoIcon />)
      const svg = screen.getByRole('img')
      expect(svg).toHaveAttribute('aria-label', 'Claude AI')
    })

    it('should apply custom className', () => {
      render(<ClaudeLogoIcon className="custom-class" data-testid="claude-logo" />)
      const svg = screen.getByTestId('claude-logo')
      expect(svg).toHaveClass('custom-class')
    })
  })
})

describe('CodeLobby Icons', () => {
  describe('CodeLobbyLogo', () => {
    it('should render an svg element', () => {
      render(<CodeLobbyLogo />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo/i })
      expect(svg.tagName).toBe('svg')
    })

    it('should have aria-label for accessibility', () => {
      render(<CodeLobbyLogo />)
      expect(screen.getByRole('img', { name: 'CodeLobby Logo' })).toBeInTheDocument()
    })

    it('should use default size of 32', () => {
      render(<CodeLobbyLogo />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo/i })
      expect(svg).toHaveAttribute('width', '32')
      expect(svg).toHaveAttribute('height', '32')
    })

    it('should accept custom size prop', () => {
      render(<CodeLobbyLogo size={64} />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo/i })
      expect(svg).toHaveAttribute('width', '64')
      expect(svg).toHaveAttribute('height', '64')
    })

    it('should apply custom className', () => {
      render(<CodeLobbyLogo className="custom-logo" />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo/i })
      expect(svg).toHaveClass('custom-logo')
    })

    it('should have correct viewBox', () => {
      render(<CodeLobbyLogo />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo/i })
      expect(svg).toHaveAttribute('viewBox', '0 0 64 64')
    })
  })

  describe('CodeLobbyIcon', () => {
    it('should render an svg element', () => {
      render(<CodeLobbyIcon />)
      const svg = screen.getByRole('img', { name: /CodeLobby Icon/i })
      expect(svg.tagName).toBe('svg')
    })

    it('should use default size of 20', () => {
      render(<CodeLobbyIcon />)
      const svg = screen.getByRole('img', { name: /CodeLobby Icon/i })
      expect(svg).toHaveAttribute('width', '20')
      expect(svg).toHaveAttribute('height', '20')
    })

    it('should accept custom size prop', () => {
      render(<CodeLobbyIcon size={24} />)
      const svg = screen.getByRole('img', { name: /CodeLobby Icon/i })
      expect(svg).toHaveAttribute('width', '24')
      expect(svg).toHaveAttribute('height', '24')
    })

    it('should have correct viewBox', () => {
      render(<CodeLobbyIcon />)
      const svg = screen.getByRole('img', { name: /CodeLobby Icon/i })
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
    })
  })

  describe('CodeLobbyLogoAnimated', () => {
    it('should render an svg element', () => {
      render(<CodeLobbyLogoAnimated />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo Loading/i })
      expect(svg.tagName).toBe('svg')
    })

    it('should have animate-pulse class', () => {
      render(<CodeLobbyLogoAnimated />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo Loading/i })
      expect(svg).toHaveClass('animate-pulse')
    })

    it('should use default size of 32', () => {
      render(<CodeLobbyLogoAnimated />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo Loading/i })
      expect(svg).toHaveAttribute('width', '32')
      expect(svg).toHaveAttribute('height', '32')
    })

    it('should accept custom size prop', () => {
      render(<CodeLobbyLogoAnimated size={48} />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo Loading/i })
      expect(svg).toHaveAttribute('width', '48')
      expect(svg).toHaveAttribute('height', '48')
    })

    it('should merge animate-pulse with custom className', () => {
      render(<CodeLobbyLogoAnimated className="custom-animation" />)
      const svg = screen.getByRole('img', { name: /CodeLobby Logo Loading/i })
      expect(svg).toHaveClass('animate-pulse', 'custom-animation')
    })
  })
})
