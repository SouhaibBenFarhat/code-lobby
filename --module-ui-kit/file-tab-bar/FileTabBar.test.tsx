/**
 * FileTabBar Component Tests
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '../tooltip'
import { type FileTab, FileTabBar } from './FileTabBar'

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = vi.fn()

// Wrapper with tooltip provider
const renderWithProvider = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('FileTabBar', () => {
  const mockTabs: FileTab[] = [
    { id: 'tab1', path: '/src/App.tsx', fileName: 'App.tsx' },
    { id: 'tab2', path: '/src/index.ts', fileName: 'index.ts' },
    { id: 'tab3', path: '/package.json', fileName: 'package.json' }
  ]

  const defaultProps = {
    tabs: mockTabs,
    activeTabId: 'tab1',
    onTabSelect: vi.fn(),
    onTabClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  describe('rendering', () => {
    it('should render all tabs', () => {
      renderWithProvider(<FileTabBar {...defaultProps} />)
      expect(screen.getByText('App.tsx')).toBeInTheDocument()
      expect(screen.getByText('index.ts')).toBeInTheDocument()
      expect(screen.getByText('package.json')).toBeInTheDocument()
    })

    it('should show empty state when no tabs', () => {
      renderWithProvider(<FileTabBar {...defaultProps} tabs={[]} />)
      expect(screen.getByText('No files open')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      const { container } = renderWithProvider(
        <FileTabBar {...defaultProps} className="custom-class" />
      )
      expect(container.querySelector('.file-tab-bar')).toHaveClass('custom-class')
    })
  })

  describe('active tab', () => {
    it('should highlight active tab', () => {
      renderWithProvider(<FileTabBar {...defaultProps} activeTabId="tab1" />)
      const activeTab = screen.getByText('App.tsx').closest('button')
      expect(activeTab).toHaveClass('bg-background')
    })

    it('should not highlight inactive tabs', () => {
      renderWithProvider(<FileTabBar {...defaultProps} activeTabId="tab1" />)
      const inactiveTab = screen.getByText('index.ts').closest('button')
      expect(inactiveTab).toHaveClass('text-muted-foreground')
      expect(inactiveTab).not.toHaveClass('bg-background')
    })
  })

  describe('interactions', () => {
    it('should call onTabSelect when tab is clicked', () => {
      const onTabSelect = vi.fn()
      renderWithProvider(<FileTabBar {...defaultProps} onTabSelect={onTabSelect} />)

      fireEvent.click(screen.getByText('index.ts'))
      expect(onTabSelect).toHaveBeenCalledWith('tab2')
    })

    it('should call onTabClose when close button is clicked', () => {
      const onTabClose = vi.fn()
      const { container } = renderWithProvider(
        <FileTabBar {...defaultProps} onTabClose={onTabClose} />
      )

      // Get close buttons - they're the small buttons inside the tab buttons
      const closeButtons = container.querySelectorAll('.file-tab button.w-4')

      // Click the first close button (for App.tsx)
      fireEvent.click(closeButtons[0])
      expect(onTabClose).toHaveBeenCalledWith('tab1')
    })

    it('should not trigger tab select when close button is clicked', () => {
      const onTabSelect = vi.fn()
      const onTabClose = vi.fn()
      const { container } = renderWithProvider(
        <FileTabBar {...defaultProps} onTabSelect={onTabSelect} onTabClose={onTabClose} />
      )

      const closeButtons = container.querySelectorAll('.file-tab button.w-4')

      fireEvent.click(closeButtons[0])
      expect(onTabClose).toHaveBeenCalled()
      expect(onTabSelect).not.toHaveBeenCalled()
    })
  })

  describe('file icons', () => {
    it('should show TypeScript icon for .tsx files', () => {
      renderWithProvider(<FileTabBar {...defaultProps} />)
      // App.tsx should have a blue icon (FileCode)
      const appTab = screen.getByText('App.tsx').closest('button')
      const icon = appTab?.querySelector('svg')
      expect(icon).toHaveClass('text-blue-400')
    })

    it('should show JSON icon for .json files', () => {
      renderWithProvider(<FileTabBar {...defaultProps} />)
      const jsonTab = screen.getByText('package.json').closest('button')
      const icon = jsonTab?.querySelector('svg')
      expect(icon).toHaveClass('text-yellow-400')
    })
  })

  describe('modified indicator', () => {
    it('should show modified indicator for modified files', () => {
      const modifiedTabs: FileTab[] = [
        { id: 'tab1', path: '/src/App.tsx', fileName: 'App.tsx', isModified: true }
      ]
      const { container } = renderWithProvider(<FileTabBar {...defaultProps} tabs={modifiedTabs} />)

      // Modified indicator is a small circle
      const indicator = container.querySelector('.bg-primary.rounded-full')
      expect(indicator).toBeInTheDocument()
    })

    it('should not show modified indicator for unmodified files', () => {
      const unmodifiedTabs: FileTab[] = [
        { id: 'tab1', path: '/src/App.tsx', fileName: 'App.tsx', isModified: false }
      ]
      const { container } = renderWithProvider(
        <FileTabBar {...defaultProps} tabs={unmodifiedTabs} />
      )

      const indicator = container.querySelector('.bg-primary.rounded-full')
      expect(indicator).not.toBeInTheDocument()
    })
  })

  describe('file extension icons', () => {
    const testIconColor = (fileName: string, expectedColor: string) => {
      const tabs: FileTab[] = [{ id: 'test', path: `/test/${fileName}`, fileName }]
      renderWithProvider(<FileTabBar {...defaultProps} tabs={tabs} activeTabId="test" />)
      const tab = screen.getByText(fileName).closest('button')
      const icon = tab?.querySelector('svg')
      expect(icon).toHaveClass(expectedColor)
    }

    it('should show correct icon for JavaScript files', () => {
      testIconColor('app.js', 'text-blue-400')
    })

    it('should show correct icon for CSS files', () => {
      testIconColor('styles.css', 'text-purple-400')
    })

    it('should show correct icon for Markdown files', () => {
      testIconColor('README.md', 'text-foreground-ghost')
    })

    it('should show correct icon for HTML files', () => {
      testIconColor('index.html', 'text-orange-400')
    })

    it('should show correct icon for Python files', () => {
      testIconColor('main.py', 'text-green-400')
    })

    it('should show correct icon for Go files', () => {
      testIconColor('main.go', 'text-cyan-400')
    })

    it('should show correct icon for Rust files', () => {
      testIconColor('lib.rs', 'text-orange-500')
    })

    it('should show correct icon for YAML files', () => {
      testIconColor('config.yaml', 'text-pink-400')
    })

    it('should show default icon for unknown extensions', () => {
      testIconColor('file.unknown', 'text-muted-foreground')
    })
  })
})
