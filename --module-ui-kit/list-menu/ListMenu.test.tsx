/**
 * ListMenu Component Tests
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  ListMenu,
  ListMenuContent,
  ListMenuGroup,
  ListMenuHeader,
  ListMenuItem,
  ListMenuSeparator
} from './ListMenu'

describe('ListMenu', () => {
  describe('ListMenu (root)', () => {
    it('should render with menu role', () => {
      render(<ListMenu data-testid="menu">Content</ListMenu>)
      const menu = screen.getByTestId('menu')
      expect(menu).toHaveAttribute('role', 'menu')
    })

    it('should apply overflow-hidden class', () => {
      render(<ListMenu data-testid="menu">Content</ListMenu>)
      const menu = screen.getByTestId('menu')
      expect(menu).toHaveClass('overflow-hidden')
    })

    it('should accept custom className', () => {
      render(
        <ListMenu className="w-80" data-testid="menu">
          Content
        </ListMenu>
      )
      const menu = screen.getByTestId('menu')
      expect(menu).toHaveClass('w-80')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<ListMenu ref={ref}>Content</ListMenu>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should render children', () => {
      render(
        <ListMenu>
          <div data-testid="child">Child content</div>
        </ListMenu>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('ListMenuHeader', () => {
    it('should render header content', () => {
      render(<ListMenuHeader>Header Title</ListMenuHeader>)
      expect(screen.getByText('Header Title')).toBeInTheDocument()
    })

    it('should apply border styles', () => {
      render(<ListMenuHeader data-testid="header">Header</ListMenuHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('border-b', 'border-border')
    })

    it('should apply padding', () => {
      render(<ListMenuHeader data-testid="header">Header</ListMenuHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('px-3', 'py-2')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<ListMenuHeader ref={ref}>Header</ListMenuHeader>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('should accept custom className', () => {
      render(
        <ListMenuHeader className="bg-muted" data-testid="header">
          Header
        </ListMenuHeader>
      )
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('bg-muted')
    })
  })

  describe('ListMenuContent', () => {
    it('should render scrollable content', () => {
      render(<ListMenuContent data-testid="content">Scrollable content</ListMenuContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('overflow-y-auto', 'overflow-x-hidden')
    })

    it('should apply default maxHeight', () => {
      render(<ListMenuContent data-testid="content">Content</ListMenuContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveStyle({ maxHeight: '300px' })
    })

    it('should accept custom maxHeight', () => {
      render(
        <ListMenuContent maxHeight="500px" data-testid="content">
          Content
        </ListMenuContent>
      )
      const content = screen.getByTestId('content')
      expect(content).toHaveStyle({ maxHeight: '500px' })
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<ListMenuContent ref={ref}>Content</ListMenuContent>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('ListMenuGroup', () => {
    it('should render group container', () => {
      render(<ListMenuGroup data-testid="group">Group content</ListMenuGroup>)
      const group = screen.getByTestId('group')
      expect(group).toBeInTheDocument()
    })

    it('should render label when provided', () => {
      render(<ListMenuGroup label="Group Label">Content</ListMenuGroup>)
      expect(screen.getByText('Group Label')).toBeInTheDocument()
    })

    it('should not render label element when not provided', () => {
      render(<ListMenuGroup data-testid="group">Content</ListMenuGroup>)
      const group = screen.getByTestId('group')
      expect(group.querySelector('.bg-muted\\/30')).not.toBeInTheDocument()
    })

    it('should render children', () => {
      render(
        <ListMenuGroup label="Test">
          <div data-testid="child">Child</div>
        </ListMenuGroup>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<ListMenuGroup ref={ref}>Content</ListMenuGroup>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('ListMenuItem', () => {
    it('should render as a button', () => {
      render(<ListMenuItem title="Item Title" />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should render title', () => {
      render(<ListMenuItem title="Test Item" />)
      expect(screen.getByText('Test Item')).toBeInTheDocument()
    })

    it('should render description when provided', () => {
      render(<ListMenuItem title="Title" description="Description text" />)
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('should not render description when not provided', () => {
      render(<ListMenuItem title="Title" data-testid="item" />)
      const button = screen.getByRole('button')
      expect(button.querySelector('.text-muted-foreground')).not.toBeInTheDocument()
    })

    it('should render icon when provided', () => {
      render(<ListMenuItem title="Title" icon={<span data-testid="icon">🔍</span>} />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('should render trailing content when provided', () => {
      render(<ListMenuItem title="Title" trailing={<span data-testid="badge">Active</span>} />)
      expect(screen.getByTestId('badge')).toBeInTheDocument()
    })

    it('should apply active styles when active', () => {
      render(<ListMenuItem title="Active Item" active data-testid="item" />)
      const button = screen.getByRole('button')
      // The wrapper div has the active class
      expect(button.parentElement).toHaveClass('bg-info-subtle')
    })

    it('should not apply active styles when not active', () => {
      render(<ListMenuItem title="Inactive Item" active={false} data-testid="item" />)
      const button = screen.getByRole('button')
      expect(button.parentElement).not.toHaveClass('bg-info-subtle')
    })

    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<ListMenuItem title="Clickable" onClick={handleClick} />)
      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should render action button when provided', () => {
      render(
        <ListMenuItem title="With Action" actionButton={<span data-testid="action">X</span>} />
      )
      expect(screen.getByTestId('action')).toBeInTheDocument()
    })

    it('should call onAction when action button is clicked', () => {
      const handleAction = vi.fn()
      render(
        <ListMenuItem title="With Action" actionButton={<span>X</span>} onAction={handleAction} />
      )
      // Find the action button (second button in the component)
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[1])
      expect(handleAction).toHaveBeenCalledTimes(1)
    })

    it('should stop propagation when action button is clicked', () => {
      const handleClick = vi.fn()
      const handleAction = vi.fn()
      render(
        <ListMenuItem
          title="With Action"
          onClick={handleClick}
          actionButton={<span>X</span>}
          onAction={handleAction}
        />
      )
      const buttons = screen.getAllByRole('button')
      fireEvent.click(buttons[1])
      expect(handleAction).toHaveBeenCalledTimes(1)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should apply actionTitle to action button', () => {
      render(
        <ListMenuItem title="With Action" actionButton={<span>X</span>} actionTitle="Delete item" />
      )
      expect(screen.getByTitle('Delete item')).toBeInTheDocument()
    })

    it('should forward ref to button', () => {
      const ref = createRef<HTMLButtonElement>()
      render(<ListMenuItem ref={ref} title="Title" />)
      expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    })

    it('should have proper text wrapping styles', () => {
      render(<ListMenuItem title="Very long title that should wrap properly" />)
      const title = screen.getByText('Very long title that should wrap properly')
      expect(title).toHaveClass('whitespace-normal', 'break-words')
    })

    it('should have proper overflow handling', () => {
      render(<ListMenuItem title="Title" data-testid="item" />)
      const button = screen.getByRole('button')
      const contentDiv = button.querySelector('.overflow-hidden')
      expect(contentDiv).toBeInTheDocument()
    })
  })

  describe('ListMenuSeparator', () => {
    it('should render as hr element with separator role', () => {
      render(<ListMenuSeparator />)
      expect(screen.getByRole('separator')).toBeInTheDocument()
    })

    it('should apply separator styles', () => {
      render(<ListMenuSeparator data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('h-px', 'bg-border', 'my-1', 'border-0')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLHRElement>()
      render(<ListMenuSeparator ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLHRElement)
    })

    it('should accept custom className', () => {
      render(<ListMenuSeparator className="my-4" data-testid="separator" />)
      const separator = screen.getByTestId('separator')
      expect(separator).toHaveClass('my-4')
    })
  })

  describe('composition', () => {
    it('should compose all components correctly', () => {
      render(
        <ListMenu data-testid="menu">
          <ListMenuHeader>
            <h4>Conversations</h4>
          </ListMenuHeader>
          <ListMenuContent>
            <ListMenuItem title="General Chat" description="Main AI conversation" active />
            <ListMenuGroup label="PR Conversations (2)">
              <ListMenuItem
                title="#123 Fix bug"
                description="repo/name • 5 msgs"
                icon={<span>🔀</span>}
                trailing={<span>Active</span>}
              />
              <ListMenuItem
                title="#456 Add feature"
                description="repo/name • 3 msgs"
                icon={<span>🔀</span>}
                actionButton={<span>X</span>}
              />
            </ListMenuGroup>
          </ListMenuContent>
        </ListMenu>
      )

      expect(screen.getByTestId('menu')).toBeInTheDocument()
      expect(screen.getByText('Conversations')).toBeInTheDocument()
      expect(screen.getByText('General Chat')).toBeInTheDocument()
      expect(screen.getByText('PR Conversations (2)')).toBeInTheDocument()
      expect(screen.getByText('#123 Fix bug')).toBeInTheDocument()
      expect(screen.getByText('#456 Add feature')).toBeInTheDocument()
    })

    it('should handle long titles without overflow', () => {
      const longTitle = 'feat: add Media Library page for image management REQ-4079'
      render(
        <ListMenu className="w-80" data-testid="menu">
          <ListMenuContent>
            <ListMenuItem title={longTitle} />
          </ListMenuContent>
        </ListMenu>
      )

      const menu = screen.getByTestId('menu')
      expect(menu).toHaveClass('overflow-hidden')
      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })
  })
})
