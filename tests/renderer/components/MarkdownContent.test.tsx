/**
 * MarkdownContent Component Tests
 */

import { describe, expect, it } from 'vitest'
import { MarkdownContent } from '@/components/MarkdownContent'
import { render, screen } from '../../utils/render'

describe('MarkdownContent', () => {
  it('should render plain text content', () => {
    render(<MarkdownContent content="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('should render markdown with bold text', () => {
    render(<MarkdownContent content="**bold text**" />)
    expect(screen.getByText('bold text')).toBeInTheDocument()
  })

  it('should render inline code', () => {
    render(<MarkdownContent content="`code`" />)
    expect(screen.getByText('code')).toBeInTheDocument()
  })
})
