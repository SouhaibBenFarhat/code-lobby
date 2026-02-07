import type { ToolActivity, ToolHistoryEntry } from '@data'
import { render, screen } from '@test-utils'
import userEvent from '@testing-library/user-event'
import { ToolActivityIndicator } from './ToolActivityIndicator'

describe('ToolActivityIndicator', () => {
  describe('empty state', () => {
    it('should return null when no activity, no lastResult, and no history', () => {
      const { container } = render(
        <ToolActivityIndicator activity={null} lastResult={null} toolHistory={[]} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should return null with undefined toolHistory', () => {
      const { container } = render(<ToolActivityIndicator activity={null} lastResult={null} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('current activity', () => {
    const baseActivity: ToolActivity = {
      toolName: 'Read',
      input: '/path/to/file.ts',
      startedAt: Date.now()
    }

    it('should display current activity', () => {
      render(<ToolActivityIndicator activity={baseActivity} lastResult={null} />)
      expect(screen.getByText('Reading file')).toBeInTheDocument()
    })

    it('should display the input path', () => {
      render(<ToolActivityIndicator activity={baseActivity} lastResult={null} />)
      expect(screen.getByText('/path/to/file.ts')).toBeInTheDocument()
    })

    it('should show spinner for running activity', () => {
      const { container } = render(
        <ToolActivityIndicator activity={baseActivity} lastResult={null} />
      )
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it.each([
      ['Read', 'Reading file'],
      ['Write', 'Writing file'],
      ['Grep', 'Searching code'],
      ['Glob', 'Finding files'],
      ['Bash', 'Running command'],
      ['Shell', 'Running command'],
      ['WebSearch', 'Searching web'],
      ['WebFetch', 'Fetching URL'],
      ['LS', 'Listing directory'],
      ['Task', 'Running task'],
      ['TodoWrite', 'Updating todos']
    ])('should display correct label for %s tool', (toolName, expectedLabel) => {
      const activity: ToolActivity = { ...baseActivity, toolName }
      render(<ToolActivityIndicator activity={activity} lastResult={null} />)
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })

    it('should display tool name for unknown tools', () => {
      const activity: ToolActivity = { ...baseActivity, toolName: 'CustomTool' }
      render(<ToolActivityIndicator activity={activity} lastResult={null} />)
      expect(screen.getByText('CustomTool')).toBeInTheDocument()
    })

    it('should handle activity without input', () => {
      const activity: ToolActivity = {
        toolName: 'Bash',
        input: '',
        startedAt: Date.now()
      }
      render(<ToolActivityIndicator activity={activity} lastResult={null} />)
      expect(screen.getByText('Running command')).toBeInTheDocument()
    })
  })

  describe('tool history', () => {
    const createHistoryEntry = (overrides: Partial<ToolHistoryEntry> = {}): ToolHistoryEntry => ({
      id: `entry-${Date.now()}-${Math.random()}`,
      toolName: 'Read',
      input: '/some/file.ts',
      status: 'completed',
      startedAt: Date.now(),
      ...overrides
    })

    it('should display tool history section', () => {
      const history = [createHistoryEntry()]
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      expect(screen.getByText('Tool Activity')).toBeInTheDocument()
    })

    it('should display history count', () => {
      const history = [createHistoryEntry(), createHistoryEntry(), createHistoryEntry()]
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      expect(screen.getByText('(3 calls)')).toBeInTheDocument()
    })

    it('should display tool name in history entries', () => {
      const history = [createHistoryEntry({ toolName: 'Grep', input: 'pattern' })]
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      expect(screen.getByText('Grep')).toBeInTheDocument()
    })

    it('should display input in history entries', () => {
      const history = [createHistoryEntry({ input: 'git status' })]
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      expect(screen.getByText('git status')).toBeInTheDocument()
    })

    it('should display duration for completed entries', () => {
      const history = [createHistoryEntry({ duration: 150 })]
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      expect(screen.getByText('150ms')).toBeInTheDocument()
    })

    it('should show running status for in-progress entries', () => {
      const history = [createHistoryEntry({ status: 'running' })]
      const { container } = render(
        <ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />
      )
      // Running entries have spinner
      expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should show error status for failed entries', () => {
      const history = [createHistoryEntry({ status: 'error' })]
      const { container } = render(
        <ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />
      )
      // Error entries have red styling - check for the XCircle icon or red border class
      const errorIndicator = container.querySelector('.text-destructive')
      expect(errorIndicator).toBeInTheDocument()
    })

    it('should limit history to 10 most recent entries', () => {
      const history = Array.from({ length: 15 }, (_, i) =>
        createHistoryEntry({ id: `entry-${i}`, input: `command-${i}` })
      )
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      // Should show count of all entries
      expect(screen.getByText('(15 calls)')).toBeInTheDocument()
      // But only render 10
      expect(screen.queryByText('command-0')).not.toBeInTheDocument() // oldest
      expect(screen.getByText('command-14')).toBeInTheDocument() // newest
    })

    it('should show entries in reverse chronological order (newest first)', () => {
      const history = [
        createHistoryEntry({ id: 'old', input: 'old-command' }),
        createHistoryEntry({ id: 'new', input: 'new-command' })
      ]
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      const items = screen.getAllByText(/command/)
      expect(items[0]).toHaveTextContent('new-command')
      expect(items[1]).toHaveTextContent('old-command')
    })
  })

  describe('expand/collapse', () => {
    const history: ToolHistoryEntry[] = [
      {
        id: 'test-entry',
        toolName: 'Read',
        input: '/file.ts',
        status: 'completed' as const,
        startedAt: Date.now()
      }
    ]

    it('should be expanded by default', () => {
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)
      expect(screen.getByText('/file.ts')).toBeInTheDocument()
    })

    it('should collapse when header clicked', async () => {
      const user = userEvent.setup()
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)

      await user.click(screen.getByText('Tool Activity'))
      expect(screen.queryByText('/file.ts')).not.toBeInTheDocument()
    })

    it('should expand when collapsed and header clicked', async () => {
      const user = userEvent.setup()
      render(<ToolActivityIndicator activity={null} lastResult={null} toolHistory={history} />)

      // Collapse
      await user.click(screen.getByText('Tool Activity'))
      expect(screen.queryByText('/file.ts')).not.toBeInTheDocument()

      // Expand
      await user.click(screen.getByText('Tool Activity'))
      expect(screen.getByText('/file.ts')).toBeInTheDocument()
    })
  })

  describe('className prop', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <ToolActivityIndicator
          activity={{ toolName: 'Read', input: '/file.ts', startedAt: Date.now() }}
          lastResult={null}
          className="custom-class"
        />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })
})
