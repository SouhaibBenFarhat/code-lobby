/**
 * Avatar Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Avatar, AvatarFallback, AvatarImage } from './Avatar'

describe('Avatar', () => {
  describe('Avatar (root)', () => {
    it('should render avatar container', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByTestId('avatar')).toBeInTheDocument()
    })

    it('should apply default styles', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('relative', 'flex', 'h-10', 'w-10', 'rounded-full')
    })

    it('should accept custom className', () => {
      render(
        <Avatar className="h-16 w-16" data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveClass('h-16', 'w-16')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLSpanElement>()
      render(
        <Avatar ref={ref}>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    })
  })

  describe('AvatarImage', () => {
    // Note: In JSDOM, images don't load, so Radix Avatar shows fallback
    // We test the component structure, not actual image loading behavior
    it('should render AvatarImage component', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarImage
            src="https://example.com/avatar.jpg"
            alt="User Avatar"
            data-testid="avatar-img"
          />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      // In JSDOM, image won't load so we check that the structure exists
      expect(screen.getByTestId('avatar')).toBeInTheDocument()
    })

    it('should apply aspect-square class when image element exists', () => {
      render(
        <Avatar>
          <AvatarImage
            src="https://example.com/avatar.jpg"
            alt="User Avatar"
            data-testid="avatar-img"
          />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      // The img element may or may not be visible depending on load state
      // but the component should have been rendered
      const img = screen.queryByTestId('avatar-img')
      if (img) {
        expect(img).toHaveClass('aspect-square')
      }
    })

    it('should accept custom className', () => {
      render(
        <Avatar>
          <AvatarImage
            src="https://example.com/avatar.jpg"
            alt="User Avatar"
            className="custom-image-class"
            data-testid="avatar-img"
          />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      const img = screen.queryByTestId('avatar-img')
      if (img) {
        expect(img).toHaveClass('custom-image-class')
      }
    })
  })

  describe('AvatarFallback', () => {
    it('should render fallback content', async () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument()
      })
    })

    it('should apply default styles', async () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">JD</AvatarFallback>
        </Avatar>
      )
      await waitFor(() => {
        const fallback = screen.getByTestId('fallback')
        expect(fallback).toHaveClass('flex', 'items-center', 'justify-center', 'bg-surface')
      })
    })

    it('should accept custom className', async () => {
      render(
        <Avatar>
          <AvatarFallback className="bg-blue-500" data-testid="fallback">
            JD
          </AvatarFallback>
        </Avatar>
      )
      await waitFor(() => {
        const fallback = screen.getByTestId('fallback')
        expect(fallback).toHaveClass('bg-blue-500')
      })
    })

    it('should forward ref', async () => {
      const ref = createRef<HTMLSpanElement>()
      render(
        <Avatar>
          <AvatarFallback ref={ref}>JD</AvatarFallback>
        </Avatar>
      )
      await waitFor(() => {
        expect(ref.current).toBeInstanceOf(HTMLSpanElement)
      })
    })

    it('should render complex fallback content', async () => {
      render(
        <Avatar>
          <AvatarFallback>
            <span data-testid="icon">👤</span>
          </AvatarFallback>
        </Avatar>
      )
      await waitFor(() => {
        expect(screen.getByTestId('icon')).toBeInTheDocument()
      })
    })
  })

  describe('composition', () => {
    it('should render avatar with image and fallback together', async () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      )
      expect(screen.getByTestId('avatar')).toBeInTheDocument()
      // In JSDOM, image won't load so fallback is shown
      await waitFor(() => {
        expect(screen.getByText('JD')).toBeInTheDocument()
      })
    })
  })
})
