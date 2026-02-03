import { fireEvent, render, screen } from '@testing-library/react'
import { FileCode, Folder, MessageSquare } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import {
  TreeLeaf,
  TreeNode,
  TreeNodeChildren,
  TreeNodeContent,
  TreeNodeHeader,
  TreeView
} from './TreeView'

describe('TreeView', () => {
  it('renders tree structure', () => {
    render(
      <TreeView>
        <TreeNode defaultExpanded>
          <TreeNodeHeader icon={<Folder />}>Root</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeLeaf icon={<FileCode />}>File 1</TreeLeaf>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    expect(screen.getByText('Root')).toBeInTheDocument()
    expect(screen.getByText('File 1')).toBeInTheDocument()
  })

  it('toggles expand/collapse on header click', () => {
    render(
      <TreeView>
        <TreeNode>
          <TreeNodeHeader>Parent</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeLeaf>Child</TreeLeaf>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    // Initially collapsed
    expect(screen.queryByText('Child')).not.toBeInTheDocument()

    // Click to expand
    fireEvent.click(screen.getByText('Parent'))
    expect(screen.getByText('Child')).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(screen.getByText('Parent'))
    expect(screen.queryByText('Child')).not.toBeInTheDocument()
  })

  it('supports controlled expand state', () => {
    const onExpandedChange = vi.fn()

    render(
      <TreeView>
        <TreeNode isExpanded={false} onExpandedChange={onExpandedChange}>
          <TreeNodeHeader>Controlled Node</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeLeaf>Hidden Child</TreeLeaf>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    fireEvent.click(screen.getByText('Controlled Node'))
    expect(onExpandedChange).toHaveBeenCalledWith(true)
  })

  it('supports defaultExpanded prop', () => {
    render(
      <TreeView>
        <TreeNode defaultExpanded>
          <TreeNodeHeader>Expanded Node</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeLeaf>Visible Child</TreeLeaf>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    expect(screen.getByText('Visible Child')).toBeInTheDocument()
  })

  it('renders TreeNodeContent when expanded', () => {
    render(
      <TreeView>
        <TreeNode defaultExpanded>
          <TreeNodeHeader>Node with Content</TreeNodeHeader>
          <TreeNodeContent>
            <p>Content area</p>
          </TreeNodeContent>
        </TreeNode>
      </TreeView>
    )

    expect(screen.getByText('Content area')).toBeInTheDocument()
  })

  it('hides TreeNodeContent when collapsed', () => {
    render(
      <TreeView>
        <TreeNode defaultExpanded={false}>
          <TreeNodeHeader>Node with Content</TreeNodeHeader>
          <TreeNodeContent>
            <p>Hidden content</p>
          </TreeNodeContent>
        </TreeNode>
      </TreeView>
    )

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('renders nested tree structure', () => {
    render(
      <TreeView>
        <TreeNode defaultExpanded>
          <TreeNodeHeader>Level 1</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeNode defaultExpanded>
              <TreeNodeHeader>Level 2</TreeNodeHeader>
              <TreeNodeChildren>
                <TreeLeaf>Level 3</TreeLeaf>
              </TreeNodeChildren>
            </TreeNode>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    expect(screen.getByText('Level 1')).toBeInTheDocument()
    expect(screen.getByText('Level 2')).toBeInTheDocument()
    expect(screen.getByText('Level 3')).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    render(
      <TreeView>
        <TreeNode variant="success" defaultExpanded>
          <TreeNodeHeader>Success Node</TreeNodeHeader>
        </TreeNode>
        <TreeNode variant="error" defaultExpanded>
          <TreeNodeHeader>Error Node</TreeNodeHeader>
        </TreeNode>
      </TreeView>
    )

    expect(screen.getByText('Success Node')).toBeInTheDocument()
    expect(screen.getByText('Error Node')).toBeInTheDocument()
  })

  it('renders icons in header and leaf', () => {
    render(
      <TreeView>
        <TreeNode defaultExpanded>
          <TreeNodeHeader icon={<Folder data-testid="folder-icon" />}>Folder</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeLeaf icon={<MessageSquare data-testid="message-icon" />}>Comment</TreeLeaf>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    expect(screen.getByTestId('folder-icon')).toBeInTheDocument()
    expect(screen.getByTestId('message-icon')).toBeInTheDocument()
  })

  it('supports keyboard navigation', () => {
    render(
      <TreeView>
        <TreeNode>
          <TreeNodeHeader>Keyboard Node</TreeNodeHeader>
          <TreeNodeChildren>
            <TreeLeaf>Child</TreeLeaf>
          </TreeNodeChildren>
        </TreeNode>
      </TreeView>
    )

    const header = screen.getByText('Keyboard Node')

    // Press Enter to expand
    fireEvent.keyDown(header, { key: 'Enter' })
    expect(screen.getByText('Child')).toBeInTheDocument()

    // Press ArrowLeft to collapse
    fireEvent.keyDown(header, { key: 'ArrowLeft' })
    expect(screen.queryByText('Child')).not.toBeInTheDocument()

    // Press ArrowRight to expand
    fireEvent.keyDown(header, { key: 'ArrowRight' })
    expect(screen.getByText('Child')).toBeInTheDocument()

    // Press Space to collapse
    fireEvent.keyDown(header, { key: ' ' })
    expect(screen.queryByText('Child')).not.toBeInTheDocument()
  })

  it('hides chevron when hasChildren is false', () => {
    render(
      <TreeView>
        <TreeNode>
          <TreeNodeHeader hasChildren={false}>Leaf-like Node</TreeNodeHeader>
        </TreeNode>
      </TreeView>
    )

    // The chevron should not be visible (but a spacer should maintain alignment)
    const header = screen.getByText('Leaf-like Node').closest('button')
    expect(header?.querySelector('svg.lucide-chevron-right')).not.toBeInTheDocument()
  })
})
