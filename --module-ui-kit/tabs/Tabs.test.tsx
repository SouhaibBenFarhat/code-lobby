/**
 * Tabs Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs'

describe('Tabs', () => {
  const renderTabs = () =>
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

  describe('rendering', () => {
    it('should render tabs with triggers', () => {
      renderTabs()
      expect(screen.getByText('Tab 1')).toBeInTheDocument()
      expect(screen.getByText('Tab 2')).toBeInTheDocument()
    })

    it('should render default tab content', () => {
      renderTabs()
      expect(screen.getByText('Content 1')).toBeInTheDocument()
    })

    it('should have tablist role', () => {
      renderTabs()
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should have tab role for triggers', () => {
      renderTabs()
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(2)
    })

    it('should have tabpanel role for content', () => {
      renderTabs()
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('should have clickable tab triggers', () => {
      renderTabs()

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(2)
      expect(tabs[0]).not.toBeDisabled()
      expect(tabs[1]).not.toBeDisabled()
    })

    it('should have data-state attribute on tabs', () => {
      renderTabs()

      const tab1 = screen.getByText('Tab 1')
      const tab2 = screen.getByText('Tab 2')

      // Both tabs should have data-state attribute
      expect(tab1).toHaveAttribute('data-state')
      expect(tab2).toHaveAttribute('data-state')
    })
  })

  describe('accessibility', () => {
    it('should have tabindex on all tabs', () => {
      renderTabs()

      const tabs = screen.getAllByRole('tab')
      // All tabs should have tabindex attribute
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('tabindex')
      })
    })
  })
})

describe('TabsList', () => {
  it('should forward ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Tabs defaultValue="tab1">
        <TabsList ref={ref}>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should have default styles', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const list = screen.getByTestId('tabs-list')
    expect(list).toHaveClass('inline-flex', 'items-center', 'rounded-lg')
  })

  it('should merge custom className', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList className="custom-list">
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const list = screen.getByRole('tablist')
    expect(list).toHaveClass('custom-list')
    expect(list).toHaveClass('inline-flex')
  })
})

describe('TabsTrigger', () => {
  it('should forward ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger ref={ref} value="tab1">
            Tab 1
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })

  it('should have default styles', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const trigger = screen.getByRole('tab')
    expect(trigger).toHaveClass('inline-flex', 'items-center', 'rounded-md', 'text-sm')
  })

  it('should merge custom className', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1" className="custom-trigger">
            Tab 1
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const trigger = screen.getByRole('tab')
    expect(trigger).toHaveClass('custom-trigger')
    expect(trigger).toHaveClass('inline-flex')
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2" disabled>
            Tab 2
          </TabsTrigger>
        </TabsList>
      </Tabs>
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs[1]).toBeDisabled()
  })
})

describe('TabsContent', () => {
  it('should forward ref', () => {
    const ref = createRef<HTMLDivElement>()
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent ref={ref} value="tab1">
          Content
        </TabsContent>
      </Tabs>
    )
    expect(ref.current).toBeInstanceOf(HTMLDivElement)
  })

  it('should have default styles', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" data-testid="content">
          Content
        </TabsContent>
      </Tabs>
    )
    const content = screen.getByTestId('content')
    expect(content).toHaveClass('mt-2')
  })

  it('should merge custom className', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="custom-content">
          Content
        </TabsContent>
      </Tabs>
    )
    const content = screen.getByRole('tabpanel')
    expect(content).toHaveClass('custom-content')
    expect(content).toHaveClass('mt-2')
  })
})
