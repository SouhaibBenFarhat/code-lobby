/**
 * DiffViewer Component Tests
 *
 * Tests for diff parsing, rendering, and display of code changes.
 */

import { render, screen } from '@test-utils'
import { describe, expect, it } from 'vitest'
import { DiffViewer } from './DiffViewer'

describe('DiffViewer', () => {
  describe('rendering', () => {
    it('should render a diff table', () => {
      const patch = `@@ -1,3 +1,4 @@
 line one
+added line
 line two
 line three`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should display binary file message when patch is null', () => {
      render(<DiffViewer patch={null} fileName="binary.png" />)

      expect(screen.getByText(/Binary file or diff too large to display/i)).toBeInTheDocument()
    })
  })

  describe('line parsing', () => {
    it('should render addition lines with + prefix', () => {
      const patch = `@@ -1,2 +1,3 @@
 context line
+new line added
 another context`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Check for the addition line content (text may be split across spans due to highlighting)
      expect(container.textContent).toContain('new line added')
    })

    it('should render deletion lines with - prefix', () => {
      const patch = `@@ -1,3 +1,2 @@
 context line
-removed line
 another context`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      expect(screen.getByText('removed line')).toBeInTheDocument()
    })

    it('should render context lines', () => {
      const patch = `@@ -1,3 +1,3 @@
 first line
 second line
 third line`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      expect(screen.getByText('first line')).toBeInTheDocument()
      expect(screen.getByText('second line')).toBeInTheDocument()
      expect(screen.getByText('third line')).toBeInTheDocument()
    })

    it('should render hunk header', () => {
      const patch = `@@ -10,5 +10,6 @@
 some content`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      expect(screen.getByText('@@ -10,5 +10,6 @@')).toBeInTheDocument()
    })
  })

  describe('line numbers', () => {
    it('should display old line numbers for deletions', () => {
      const patch = `@@ -5,2 +5,1 @@
-deleted line`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Old line number should be displayed (5)
      const cells = screen.getAllByRole('cell')
      const lineNumCell = cells.find((cell) => cell.textContent === '5')
      expect(lineNumCell).toBeInTheDocument()
    })

    it('should display new line numbers for additions', () => {
      const patch = `@@ -1,1 +1,2 @@
 existing line
+new line`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      // New line number should be displayed (2)
      const cells = screen.getAllByRole('cell')
      const lineNumCell = cells.find((cell) => cell.textContent === '2')
      expect(lineNumCell).toBeInTheDocument()
    })

    it('should display line number for context lines', () => {
      const patch = `@@ -1,1 +1,1 @@
 context line`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Line number should be displayed (single column now)
      const cells = screen.getAllByRole('cell')
      const lineNumCells = cells.filter((cell) => cell.textContent === '1')
      expect(lineNumCells.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('styling', () => {
    it('should apply success styling for additions', () => {
      const patch = `@@ -1,1 +1,2 @@
 line
+added`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Check for success/addition styling
      const successElements = container.querySelectorAll('.text-success')
      expect(successElements.length).toBeGreaterThan(0)
    })

    it('should apply destructive styling for deletions', () => {
      const patch = `@@ -1,2 +1,1 @@
 line
-removed`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Check for destructive/deletion styling
      const destructiveElements = container.querySelectorAll('.text-destructive')
      expect(destructiveElements.length).toBeGreaterThan(0)
    })

    it('should apply primary styling for hunk headers', () => {
      const patch = `@@ -1,1 +1,1 @@
 line`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Check for header styling
      const headerElements = container.querySelectorAll('.text-primary')
      expect(headerElements.length).toBeGreaterThan(0)
    })
  })

  describe('special cases', () => {
    it('should handle "no newline at end of file" info line', () => {
      const patch = `@@ -1,1 +1,1 @@
-old line
\\ No newline at end of file`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      expect(screen.getByText(/No newline at end of file/)).toBeInTheDocument()
    })

    it('should handle empty patch content as no-diff', () => {
      const patch = ''

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Empty string is falsy, so it shows the "Binary file" message
      expect(screen.getByText(/Binary file or diff too large to display/i)).toBeInTheDocument()
    })

    it('should handle multiple hunks', () => {
      const patch = `@@ -1,3 +1,3 @@
 first hunk line 1
-removed in hunk 1
+added in hunk 1
@@ -10,3 +10,3 @@
 second hunk line 1
-removed in hunk 2
+added in hunk 2`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Text may be split across spans due to syntax highlighting
      expect(container.textContent).toContain('added in hunk 1')
      expect(container.textContent).toContain('added in hunk 2')
      expect(container.textContent).toContain('removed in hunk 1')
      expect(container.textContent).toContain('removed in hunk 2')
    })

    it('should handle lines with special characters', () => {
      const patch = `@@ -1,1 +1,2 @@
 const x = "hello";
+const y = \`template \${var}\`;`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // With syntax highlighting, text is split into spans
      // Check that the table contains the expected content
      expect(container.textContent).toContain('hello')
      expect(container.textContent).toContain('template')
    })
  })

  describe('table structure', () => {
    it('should have exactly 3 columns per row (line number, prefix, content)', () => {
      const patch = `@@ -1,2 +1,3 @@
 context line
+added line
-removed line`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      const rows = screen.getAllByRole('row')
      // Each row should have 3 cells (line number, prefix, content)
      for (const row of rows) {
        const cells = row.querySelectorAll('td')
        expect(cells.length).toBe(3)
      }
    })

    it('should not duplicate line numbers in the same row', () => {
      const patch = `@@ -1,3 +1,3 @@
 line one
 line two
 line three`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      const rows = screen.getAllByRole('row')
      for (const row of rows) {
        const cells = row.querySelectorAll('td')
        // First cell is line number, should only appear once per row
        const lineNumCell = cells[0]
        const lineNum = lineNumCell?.textContent
        if (lineNum && lineNum !== '') {
          // Count how many times this line number appears in the row
          const allCellTexts = Array.from(cells).map((c) => c.textContent)
          const count = allCellTexts.filter((t) => t === lineNum).length
          expect(count).toBe(1)
        }
      }
    })

    it('should have consistent row heights without large gaps', () => {
      const patch = `@@ -1,5 +1,5 @@
 line one
 line two
 line three
 line four
 line five`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      const rows = container.querySelectorAll('tr')
      // All content rows should have h-5 class for consistent height
      const contentRows = Array.from(rows).filter((row) => row.classList.contains('h-5'))
      // Should have at least 5 content rows (excluding header)
      expect(contentRows.length).toBeGreaterThanOrEqual(5)
    })

    it('should use border-collapse for tight table layout', () => {
      const patch = `@@ -1,1 +1,1 @@
 line`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      const table = container.querySelector('table')
      expect(table).toHaveClass('border-collapse')
    })
  })

  describe('new file diffs (all additions)', () => {
    it('should display sequential line numbers without gaps for new files', () => {
      const patch = `@@ -0,0 +1,5 @@
+line 1
+line 2
+line 3
+line 4
+line 5`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      const cells = screen.getAllByRole('cell')
      // Check that line numbers 1-5 exist
      for (let i = 1; i <= 5; i++) {
        const lineNumCell = cells.find((cell) => cell.textContent === String(i))
        expect(lineNumCell).toBeInTheDocument()
      }
    })

    it('should not show old line numbers for pure additions', () => {
      const patch = `@@ -0,0 +1,3 @@
+new file line 1
+new file line 2
+new file line 3`

      render(<DiffViewer patch={patch} fileName="test.ts" />)

      // Should not have "0" displayed as a line number (old file line)
      // The hunk header may contain "0" but not as a standalone line number cell
      const cells = screen.getAllByRole('cell')
      const lineNumCells = cells.filter((cell) => {
        // First cell of each row is the line number
        return cell.classList.contains('text-muted-foreground/50')
      })

      // None of the line number cells should contain just "0"
      for (const cell of lineNumCells) {
        if (cell.textContent === '0') {
          // This would indicate the old line number is being shown incorrectly
          expect(cell.textContent).not.toBe('0')
        }
      }
    })
  })

  describe('focusLine and contextLines', () => {
    it('should show only lines around focusLine when specified', () => {
      const patch = `@@ -1,10 +1,10 @@
 line 1
 line 2
 line 3
 line 4
 line 5
 line 6
 line 7
 line 8
 line 9
 line 10`

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" focusLine={5} contextLines={2} />
      )

      // Should show lines 3, 4, 5, 6, 7 (focusLine=5, contextLines=2)
      expect(container.textContent).toContain('line 3')
      expect(container.textContent).toContain('line 4')
      expect(container.textContent).toContain('line 5')
      expect(container.textContent).toContain('line 6')
      expect(container.textContent).toContain('line 7')

      // Should NOT show lines 1, 2, 8, 9, 10
      expect(container.textContent).not.toContain('line 1')
      expect(container.textContent).not.toContain('line 2')
      expect(container.textContent).not.toContain('line 8')
      expect(container.textContent).not.toContain('line 9')
      expect(container.textContent).not.toContain('line 10')
    })

    it('should use default contextLines of 3 when not specified', () => {
      const patch = `@@ -1,10 +1,10 @@
 line 1
 line 2
 line 3
 line 4
 line 5
 line 6
 line 7
 line 8
 line 9
 line 10`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" focusLine={5} />)

      // With default contextLines=3, should show lines 2-8
      expect(container.textContent).toContain('line 2')
      expect(container.textContent).toContain('line 5')
      expect(container.textContent).toContain('line 8')

      // Should NOT show lines outside the range
      expect(container.textContent).not.toContain('line 1')
      expect(container.textContent).not.toContain('line 9')
      expect(container.textContent).not.toContain('line 10')
    })

    it('should show all lines when focusLine is not specified', () => {
      const patch = `@@ -1,5 +1,5 @@
 line 1
 line 2
 line 3
 line 4
 line 5`

      const { container } = render(<DiffViewer patch={patch} fileName="test.ts" />)

      // All lines should be visible
      expect(container.textContent).toContain('line 1')
      expect(container.textContent).toContain('line 2')
      expect(container.textContent).toContain('line 3')
      expect(container.textContent).toContain('line 4')
      expect(container.textContent).toContain('line 5')
    })

    it('should handle focusLine at the beginning of the file', () => {
      const patch = `@@ -1,5 +1,5 @@
 line 1
 line 2
 line 3
 line 4
 line 5`

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" focusLine={1} contextLines={2} />
      )

      // Should show lines 1, 2, 3
      expect(container.textContent).toContain('line 1')
      expect(container.textContent).toContain('line 2')
      expect(container.textContent).toContain('line 3')

      // Should NOT show lines 4, 5
      expect(container.textContent).not.toContain('line 4')
      expect(container.textContent).not.toContain('line 5')
    })

    it('should handle focusLine at the end of the file', () => {
      const patch = `@@ -1,5 +1,5 @@
 line 1
 line 2
 line 3
 line 4
 line 5`

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" focusLine={5} contextLines={2} />
      )

      // Should show lines 3, 4, 5
      expect(container.textContent).toContain('line 3')
      expect(container.textContent).toContain('line 4')
      expect(container.textContent).toContain('line 5')

      // Should NOT show lines 1, 2
      expect(container.textContent).not.toContain('line 1')
      expect(container.textContent).not.toContain('line 2')
    })

    it('should include hunk header when showing filtered lines', () => {
      const patch = `@@ -10,5 +10,5 @@
 line 10
 line 11
 line 12
 line 13
 line 14`

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" focusLine={12} contextLines={1} />
      )

      // Should include the hunk header
      expect(container.textContent).toContain('@@ -10,5 +10,5 @@')

      // Should show lines 11, 12, 13
      expect(container.textContent).toContain('line 11')
      expect(container.textContent).toContain('line 12')
      expect(container.textContent).toContain('line 13')

      // Should NOT show lines 10, 14
      expect(container.textContent).not.toContain('line 10')
      expect(container.textContent).not.toContain('line 14')
    })

    it('should work with additions and deletions around focusLine', () => {
      const patch = `@@ -1,5 +1,6 @@
 context 1
-deleted line
+added line
 context 2
 context 3
 context 4`

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" focusLine={2} contextLines={1} />
      )

      // Should show lines around line 2 (the added/deleted lines)
      expect(container.textContent).toContain('context 1')
      expect(container.textContent).toContain('context 2')
    })

    it('should handle contextLines of 0 showing only the exact line', () => {
      const patch = `@@ -1,5 +1,5 @@
 line 1
 line 2
 line 3
 line 4
 line 5`

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" focusLine={3} contextLines={0} />
      )

      // Should show only line 3
      expect(container.textContent).toContain('line 3')

      // Should NOT show other lines
      expect(container.textContent).not.toContain('line 1')
      expect(container.textContent).not.toContain('line 2')
      expect(container.textContent).not.toContain('line 4')
      expect(container.textContent).not.toContain('line 5')
    })
  })

  describe('inline comments', () => {
    it('should render comments below the specified line', () => {
      const patch = `@@ -1,2 +1,3 @@
 line one
+line two
 line three`

      const comments = [{ id: 'c1', line: 2, content: 'This is a comment on line 2' }]

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" comments={comments} />
      )

      expect(container.textContent).toContain('This is a comment on line 2')
    })

    it('should render multiple comments on the same line', () => {
      const patch = `@@ -1,1 +1,2 @@
 line one
+line two`

      const comments = [
        { id: 'c1', line: 2, content: 'First comment' },
        { id: 'c2', line: 2, content: 'Second comment' }
      ]

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" comments={comments} />
      )

      expect(container.textContent).toContain('First comment')
      expect(container.textContent).toContain('Second comment')
    })

    it('should render comments on different lines', () => {
      const patch = `@@ -1,2 +1,3 @@
 line one
+line two
 line three`

      const comments = [
        { id: 'c1', line: 1, content: 'Comment on line 1' },
        { id: 'c2', line: 3, content: 'Comment on line 3' }
      ]

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" comments={comments} />
      )

      expect(container.textContent).toContain('Comment on line 1')
      expect(container.textContent).toContain('Comment on line 3')
    })

    it('should use custom renderComment function', () => {
      const patch = `@@ -1,1 +1,2 @@
 line one
+line two`

      const comments = [{ id: 'c1', line: 2, content: 'Test comment' }]

      render(
        <DiffViewer
          patch={patch}
          fileName="test.ts"
          comments={comments}
          renderComment={(comment) => (
            <div data-testid="custom-comment">Custom: {String(comment.content)}</div>
          )}
        />
      )

      expect(screen.getByTestId('custom-comment')).toBeInTheDocument()
      expect(screen.getByTestId('custom-comment').textContent).toContain('Custom: Test comment')
    })

    it('should render default comment display when no renderComment provided', () => {
      const patch = `@@ -1,1 +1,2 @@
 line one
+line two`

      const comments = [{ id: 'c1', line: 2, content: 'Default display comment' }]

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" comments={comments} />
      )

      // Default comment should have blue styling
      const commentElement = container.querySelector('.bg-blue-500\\/10')
      expect(commentElement).toBeInTheDocument()
      expect(container.textContent).toContain('Default display comment')
    })

    it('should not render comments for deleted lines', () => {
      const patch = `@@ -1,2 +1,1 @@
 line one
-deleted line`

      // Comment on line 2 which is a deletion (has no newLineNum)
      // This comment should not appear since deletions don't have new line numbers
      const comments = [{ id: 'c1', line: 2, content: 'Should not appear' }]

      const { container } = render(
        <DiffViewer patch={patch} fileName="test.ts" comments={comments} />
      )

      // The comment should not be rendered because deleted lines don't have newLineNum
      expect(container.textContent).not.toContain('Should not appear')
    })

    it('should handle empty comments array', () => {
      const patch = `@@ -1,1 +1,1 @@
 line one`

      render(<DiffViewer patch={patch} fileName="test.ts" comments={[]} />)

      // Should render normally without any comment elements
      expect(screen.getByRole('table')).toBeInTheDocument()
    })

    it('should render ReactNode content in comments', () => {
      const patch = `@@ -1,1 +1,2 @@
 line one
+line two`

      const comments = [
        {
          id: 'c1',
          line: 2,
          content: <span data-testid="react-content">React Node Content</span>
        }
      ]

      render(<DiffViewer patch={patch} fileName="test.ts" comments={comments} />)

      expect(screen.getByTestId('react-content')).toBeInTheDocument()
    })
  })
})
