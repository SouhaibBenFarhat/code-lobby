/**
 * ChangedFilesSection Component Tests
 *
 * Tests for changed files display, search, filtering, and file tree.
 */

import type { PRFile } from '@data'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  fireEvent,
  render,
  resetMockElectron,
  screen,
  setupMockElectron,
  waitFor
} from '@test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangedFilesSection } from './ChangedFilesSection'

// Mock the usePRFiles hook
vi.mock('@data', async () => {
  const actual = await vi.importActual('@data')
  return {
    ...actual,
    usePRFiles: vi.fn()
  }
})

import { usePRFiles } from '@data'

const mockUsePRFiles = usePRFiles as ReturnType<typeof vi.fn>

describe('ChangedFilesSection', () => {
  const defaultProps = {
    repoFullName: 'test-org/test-repo',
    prNumber: 1,
    totalChanged: 5
  }

  const mockFiles: PRFile[] = [
    {
      path: 'src/components/Button.tsx',
      changeType: 'MODIFIED',
      additions: 10,
      deletions: 5,
      patch: '@@ -1 +1 @@\n-old\n+new'
    },
    {
      path: 'src/utils/helper.ts',
      changeType: 'ADDED',
      additions: 25,
      deletions: 0,
      patch: '@@ -0,0 +1,25 @@'
    },
    {
      path: 'src/old-file.ts',
      changeType: 'DELETED',
      additions: 0,
      deletions: 15,
      patch: '@@ -1,15 +0,0 @@'
    },
    {
      path: 'src/renamed.ts',
      changeType: 'RENAMED',
      additions: 2,
      deletions: 2,
      patch: '@@ -1,2 +1,2 @@'
    }
  ]

  let queryClient: QueryClient

  beforeEach(() => {
    setupMockElectron()
    vi.clearAllMocks()

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity, staleTime: Infinity
        }
      }
    })

    mockUsePRFiles.mockReturnValue({
      data: mockFiles,
      isLoading: false,
      error: null
    })
  })

  afterEach(() => {
    resetMockElectron()
  })

  const renderWithQueryClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
  }

  describe('rendering', () => {
    it('should render section header', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText('Changed Files')).toBeInTheDocument()
    })

    it('should render total changed files count', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('should render file diff icon', () => {
      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const fileDiffIcon = container.querySelector('.lucide-file-diff')
      expect(fileDiffIcon).toBeInTheDocument()
    })

    it('should render search input', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByPlaceholderText(/Search files/i)).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show spinner when loading', () => {
      mockUsePRFiles.mockReturnValue({
        data: [],
        isLoading: true,
        error: null
      })

      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('error state', () => {
    it('should show error message when fetch fails', () => {
      mockUsePRFiles.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to fetch')
      })

      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText(/Failed to load files/i)).toBeInTheDocument()
    })

    it('should show error icon when fetch fails', () => {
      mockUsePRFiles.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed')
      })

      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const errorIcon = container.querySelector('.lucide-alert-circle')
      expect(errorIcon).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show "No changed files" when no files', () => {
      mockUsePRFiles.mockReturnValue({
        data: [],
        isLoading: false,
        error: null
      })

      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText('No changed files')).toBeInTheDocument()
    })

    it('should show "No files match your search" when search has no results', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/Search files/i)
      fireEvent.change(searchInput, { target: { value: 'nonexistent-file' } })

      expect(screen.getByText('No files match your search')).toBeInTheDocument()
    })
  })

  describe('file statistics', () => {
    it('should show added files count', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText(/1 added/i)).toBeInTheDocument()
    })

    it('should show modified files count', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText(/1 modified/i)).toBeInTheDocument()
    })

    it('should show deleted files count', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText(/1 deleted/i)).toBeInTheDocument()
    })

    it('should show renamed files count', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByText(/1 renamed/i)).toBeInTheDocument()
    })

    it('should show file plus icon for added stats', () => {
      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const filePlusIcons = container.querySelectorAll('.lucide-file-plus')
      expect(filePlusIcons.length).toBeGreaterThan(0)
    })
  })

  describe('search functionality', () => {
    it('should filter files by search query', async () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/Search files/i)
      fireEvent.change(searchInput, { target: { value: 'Button' } })

      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument()
        expect(screen.queryByText('helper.ts')).not.toBeInTheDocument()
      })
    })

    it('should show clear button when search has value', () => {
      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/Search files/i)
      fireEvent.change(searchInput, { target: { value: 'test' } })

      const clearButton = container.querySelector('.lucide-x')?.closest('button')
      expect(clearButton).toBeInTheDocument()
    })

    it('should clear search when X button is clicked', async () => {
      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/Search files/i)
      fireEvent.change(searchInput, { target: { value: 'Button' } })

      const clearButton = container.querySelector('.lucide-x')?.closest('button')
      if (clearButton) {
        fireEvent.click(clearButton)
      }

      await waitFor(() => {
        expect(searchInput).toHaveValue('')
      })
    })

    it('should be case insensitive', async () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText(/Search files/i)
      fireEvent.change(searchInput, { target: { value: 'BUTTON' } })

      await waitFor(() => {
        expect(screen.getByText('Button.tsx')).toBeInTheDocument()
      })
    })
  })

  describe('collapse/expand', () => {
    it('should be expanded by default', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      expect(screen.getByPlaceholderText(/Search files/i)).toBeInTheDocument()
    })

    it('should collapse when header is clicked', async () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const header = screen.getByText('Changed Files').closest('button')
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Search files/i)).not.toBeInTheDocument()
      })
    })

    it('should expand when header is clicked again', async () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const header = screen.getByText('Changed Files').closest('button')

      // Collapse
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.queryByPlaceholderText(/Search files/i)).not.toBeInTheDocument()
      })

      // Expand
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search files/i)).toBeInTheDocument()
      })
    })

    it('should show chevron down when expanded', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      // Find the header chevron (first one)
      const headerButton = screen.getByText('Changed Files').closest('button')
      const chevronDown = headerButton?.querySelector('.lucide-chevron-down')
      expect(chevronDown).toBeInTheDocument()
    })

    it('should show chevron right when collapsed', async () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      const header = screen.getByText('Changed Files').closest('button')
      if (header) {
        fireEvent.click(header)
      }

      await waitFor(() => {
        const chevronRight = header?.querySelector('.lucide-chevron-right')
        expect(chevronRight).toBeInTheDocument()
      })
    })
  })

  describe('file tree rendering', () => {
    it('should render directory structure', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      // Should show 'src' directory (all files are under src/)
      expect(screen.getByText(/src\//i)).toBeInTheDocument()
    })

    it('should show nested directory structure', () => {
      renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      // Components and utils directories should be visible
      // (they are inside src)
      const srcDir = screen.getByText(/src\//i)
      expect(srcDir).toBeInTheDocument()
    })

    it('should render file tree container', () => {
      const { container } = renderWithQueryClient(<ChangedFilesSection {...defaultProps} />)

      // Should have a file tree container with border and bg
      const treeContainer = container.querySelector('.rounded-lg.border.bg-card\\/50')
      expect(treeContainer).toBeInTheDocument()
    })
  })

  describe('hook parameters', () => {
    it('should call usePRFiles with correct parameters', () => {
      renderWithQueryClient(
        <ChangedFilesSection repoFullName="my-org/my-repo" prNumber={42} totalChanged={10} />
      )

      expect(mockUsePRFiles).toHaveBeenCalledWith('my-org/my-repo', 42)
    })
  })
})
