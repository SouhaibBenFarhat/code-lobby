/**
 * FileTreeNode Component Tests
 *
 * Tests for file tree rendering, expansion, and file icons.
 */

import { fireEvent, render, screen } from '@codelobby/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { FileTreeNode as FileTreeNodeType } from '../types'
import { FileTreeNode } from './FileTreeNode'

describe('FileTreeNode', () => {
  const baseProps = {
    isLast: false,
    prefix: '',
    expandedDirs: new Set<string>(),
    expandedFiles: new Set<string>(),
    toggleDir: vi.fn(),
    toggleFile: vi.fn(),
    searchQuery: ''
  }

  const createFileNode = (overrides: Partial<FileTreeNodeType> = {}): FileTreeNodeType => ({
    name: 'test.ts',
    path: 'src/test.ts',
    isFile: true,
    file: {
      path: 'src/test.ts',
      changeType: 'MODIFIED',
      additions: 10,
      deletions: 5,
      patch: '@@ -1,1 +1,1 @@\n-old\n+new'
    },
    children: new Map(),
    ...overrides
  })

  const createDirNode = (overrides: Partial<FileTreeNodeType> = {}): FileTreeNodeType => ({
    name: 'src',
    path: 'src',
    isFile: false,
    children: new Map(),
    ...overrides
  })

  describe('file node rendering', () => {
    it('should render file name', () => {
      const node = createFileNode({ name: 'Button.tsx' })
      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.getByText('Button.tsx')).toBeInTheDocument()
    })

    it('should render file additions count', () => {
      const node = createFileNode({
        file: {
          path: 'test.ts',
          changeType: 'MODIFIED',
          additions: 25,
          deletions: 0,
          patch: undefined
        }
      })
      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.getByText('+25')).toBeInTheDocument()
    })

    it('should render file deletions count', () => {
      const node = createFileNode({
        file: {
          path: 'test.ts',
          changeType: 'MODIFIED',
          additions: 0,
          deletions: 15,
          patch: undefined
        }
      })
      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.getByText('−15')).toBeInTheDocument()
    })

    it('should render file extension badge', () => {
      const node = createFileNode({
        name: 'Component.tsx',
        path: 'src/Component.tsx',
        file: {
          path: 'src/Component.tsx',
          changeType: 'MODIFIED',
          additions: 1,
          deletions: 0,
          patch: '@@ -1 +1 @@\n- old\n+ new'
        }
      })
      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.getByText('tsx')).toBeInTheDocument()
    })
  })

  describe('file icons by change type', () => {
    it('should show FilePlus icon for added files', () => {
      const node = createFileNode({
        file: {
          path: 'new.ts',
          changeType: 'ADDED',
          additions: 10,
          deletions: 0,
          patch: undefined
        }
      })
      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const addIcon = container.querySelector('.lucide-file-plus')
      expect(addIcon).toBeInTheDocument()
    })

    it('should show FileMinus icon for deleted files', () => {
      const node = createFileNode({
        file: {
          path: 'old.ts',
          changeType: 'DELETED',
          additions: 0,
          deletions: 10,
          patch: undefined
        }
      })
      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const deleteIcon = container.querySelector('.lucide-file-minus')
      expect(deleteIcon).toBeInTheDocument()
    })

    it('should show FileEdit icon for renamed files', () => {
      const node = createFileNode({
        file: {
          path: 'renamed.ts',
          changeType: 'RENAMED',
          additions: 0,
          deletions: 0,
          patch: undefined
        }
      })
      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const renameIcon = container.querySelector('.lucide-file-edit')
      expect(renameIcon).toBeInTheDocument()
    })

    it('should show FileDiff icon for modified files', () => {
      const node = createFileNode({
        file: {
          path: 'modified.ts',
          changeType: 'MODIFIED',
          additions: 5,
          deletions: 3,
          patch: '@@ -1 +1 @@'
        }
      })
      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const diffIcon = container.querySelector('.lucide-file-diff')
      expect(diffIcon).toBeInTheDocument()
    })
  })

  describe('directory node rendering', () => {
    it('should render directory name with trailing slash', () => {
      const node = createDirNode({ name: 'components' })
      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.getByText('components/')).toBeInTheDocument()
    })

    it('should show folder icon', () => {
      const node = createDirNode()
      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const folderIcon = container.querySelector('.lucide-folder-open')
      expect(folderIcon).toBeInTheDocument()
    })

    it('should show children count badge', () => {
      const childNode = createFileNode({ name: 'child.ts', path: 'src/child.ts' })
      const children = new Map([['child.ts', childNode]])
      const node = createDirNode({ children })

      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  describe('expansion behavior', () => {
    it('should call toggleFile when file with patch is clicked', () => {
      const node = createFileNode()
      const toggleFile = vi.fn()

      render(<FileTreeNode node={node} {...baseProps} toggleFile={toggleFile} />)

      const button = screen.getByText('test.ts').closest('button')
      if (button) {
        fireEvent.click(button)
      }

      expect(toggleFile).toHaveBeenCalledWith('src/test.ts')
    })

    it('should call toggleDir when directory is clicked', () => {
      const node = createDirNode()
      const toggleDir = vi.fn()

      render(<FileTreeNode node={node} {...baseProps} toggleDir={toggleDir} />)

      const button = screen.getByText('src/').closest('button')
      if (button) {
        fireEvent.click(button)
      }

      expect(toggleDir).toHaveBeenCalledWith('src')
    })

    it('should show chevron down when file is expanded', () => {
      const node = createFileNode()
      const expandedFiles = new Set(['src/test.ts'])

      const { container } = render(
        <FileTreeNode node={node} {...baseProps} expandedFiles={expandedFiles} />
      )

      const chevronDown = container.querySelector('.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })

    it('should show chevron right when file is collapsed', () => {
      const node = createFileNode()

      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const chevronRight = container.querySelector('.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })

    it('should show chevron down when directory is expanded', () => {
      const node = createDirNode()
      const expandedDirs = new Set(['src'])

      const { container } = render(
        <FileTreeNode node={node} {...baseProps} expandedDirs={expandedDirs} />
      )

      const chevronDown = container.querySelector('.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })

    it('should show chevron right when directory is collapsed', () => {
      const node = createDirNode()

      const { container } = render(<FileTreeNode node={node} {...baseProps} />)

      const chevronRight = container.querySelector('.lucide-chevron-right')
      expect(chevronRight).toBeInTheDocument()
    })
  })

  describe('diff viewer', () => {
    it('should show DiffViewer when file is expanded', () => {
      const node = createFileNode()
      const expandedFiles = new Set(['src/test.ts'])

      render(<FileTreeNode node={node} {...baseProps} expandedFiles={expandedFiles} />)

      // DiffViewer renders a table
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should not show DiffViewer when file is collapsed', () => {
      const node = createFileNode()

      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('should not show DiffViewer when file has no patch', () => {
      const node = createFileNode({
        file: {
          path: 'binary.png',
          changeType: 'ADDED',
          additions: 0,
          deletions: 0,
          patch: undefined
        }
      })
      const expandedFiles = new Set(['src/test.ts'])

      render(<FileTreeNode node={node} {...baseProps} expandedFiles={expandedFiles} />)

      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('nested children', () => {
    it('should render child nodes when directory is expanded', () => {
      const childNode = createFileNode({
        name: 'Button.tsx',
        path: 'src/Button.tsx',
        file: {
          path: 'src/Button.tsx',
          changeType: 'MODIFIED',
          additions: 5,
          deletions: 2,
          patch: '@@ -1 +1 @@'
        }
      })
      const children = new Map([['Button.tsx', childNode]])
      const node = createDirNode({ children })
      const expandedDirs = new Set(['src'])

      render(<FileTreeNode node={node} {...baseProps} expandedDirs={expandedDirs} />)

      expect(screen.getByText('Button.tsx')).toBeInTheDocument()
    })

    it('should not render child nodes when directory is collapsed', () => {
      const childNode = createFileNode({
        name: 'Button.tsx',
        path: 'src/Button.tsx'
      })
      const children = new Map([['Button.tsx', childNode]])
      const node = createDirNode({ children })

      render(<FileTreeNode node={node} {...baseProps} />)

      expect(screen.queryByText('Button.tsx')).not.toBeInTheDocument()
    })
  })

  describe('search auto-expansion', () => {
    it('should auto-expand directories when searching', () => {
      const childNode = createFileNode({
        name: 'Button.tsx',
        path: 'src/Button.tsx'
      })
      const children = new Map([['Button.tsx', childNode]])
      const node = createDirNode({ children })

      render(<FileTreeNode node={node} {...baseProps} searchQuery="Button" />)

      // Children should be visible even without expandedDirs
      expect(screen.getByText('Button.tsx')).toBeInTheDocument()
    })

    it('should not auto-expand when search query is empty', () => {
      const childNode = createFileNode({
        name: 'Button.tsx',
        path: 'src/Button.tsx'
      })
      const children = new Map([['Button.tsx', childNode]])
      const node = createDirNode({ children })

      render(<FileTreeNode node={node} {...baseProps} searchQuery="" />)

      expect(screen.queryByText('Button.tsx')).not.toBeInTheDocument()
    })
  })

  describe('tree connectors', () => {
    it('should show └── connector for last item', () => {
      const node = createFileNode()
      render(<FileTreeNode node={node} {...baseProps} isLast={true} />)

      expect(screen.getByText(/└──/)).toBeInTheDocument()
    })

    it('should show ├── connector for non-last item', () => {
      const node = createFileNode()
      render(<FileTreeNode node={node} {...baseProps} isLast={false} />)

      expect(screen.getByText(/├──/)).toBeInTheDocument()
    })

    it('should include prefix in connector', () => {
      const node = createFileNode()
      render(<FileTreeNode node={node} {...baseProps} prefix="│   " />)

      expect(screen.getByText(/│/)).toBeInTheDocument()
    })
  })
})
