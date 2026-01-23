/**
 * Timeline Component Tests
 */

import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineDot,
  TimelineHeader,
  TimelineItem,
  TimelineTime,
  TimelineTitle
} from './timeline'

describe('Timeline', () => {
  describe('Timeline (root)', () => {
    it('should render timeline container', () => {
      render(<Timeline data-testid="timeline">Content</Timeline>)
      expect(screen.getByTestId('timeline')).toBeInTheDocument()
    })

    it('should apply relative position class', () => {
      render(<Timeline data-testid="timeline">Content</Timeline>)
      const timeline = screen.getByTestId('timeline')
      expect(timeline).toHaveClass('relative')
    })

    it('should accept custom className', () => {
      render(
        <Timeline className="custom-timeline" data-testid="timeline">
          Content
        </Timeline>
      )
      const timeline = screen.getByTestId('timeline')
      expect(timeline).toHaveClass('custom-timeline')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<Timeline ref={ref}>Content</Timeline>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('TimelineItem', () => {
    it('should render timeline item', () => {
      render(<TimelineItem data-testid="item">Item content</TimelineItem>)
      expect(screen.getByTestId('item')).toBeInTheDocument()
    })

    it('should apply default padding and position', () => {
      render(<TimelineItem data-testid="item">Content</TimelineItem>)
      const item = screen.getByTestId('item')
      expect(item).toHaveClass('relative', 'pb-1.5', 'pl-5')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<TimelineItem ref={ref}>Content</TimelineItem>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('TimelineConnector', () => {
    it('should render connector line', () => {
      render(<TimelineConnector data-testid="connector" />)
      expect(screen.getByTestId('connector')).toBeInTheDocument()
    })

    it('should not render when isLast is true', () => {
      render(<TimelineConnector isLast data-testid="connector" />)
      expect(screen.queryByTestId('connector')).not.toBeInTheDocument()
    })

    it('should apply vertical line styles', () => {
      render(<TimelineConnector data-testid="connector" />)
      const connector = screen.getByTestId('connector')
      expect(connector).toHaveClass('absolute', 'w-px', 'bg-border/50')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<TimelineConnector ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('TimelineDot', () => {
    it('should render dot', () => {
      render(<TimelineDot data-testid="dot" />)
      expect(screen.getByTestId('dot')).toBeInTheDocument()
    })

    it('should apply default variant styles', () => {
      render(<TimelineDot data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('bg-muted-foreground')
    })

    it('should apply error variant styles', () => {
      render(<TimelineDot variant="error" data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('bg-red-500')
    })

    it('should apply warning variant styles', () => {
      render(<TimelineDot variant="warning" data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('bg-yellow-500')
    })

    it('should apply success variant styles', () => {
      render(<TimelineDot variant="success" data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('bg-green-500')
    })

    it('should apply info variant styles', () => {
      render(<TimelineDot variant="info" data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('bg-blue-500')
    })

    it('should apply debug variant styles', () => {
      render(<TimelineDot variant="debug" data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('bg-gray-500')
    })

    it('should render icon when provided', () => {
      render(<TimelineDot icon={<span data-testid="icon">✓</span>} />)
      expect(screen.getByTestId('icon')).toBeInTheDocument()
    })

    it('should apply pulse animation when pulse is true', () => {
      render(<TimelineDot pulse data-testid="dot" />)
      const dot = screen.getByTestId('dot')
      expect(dot).toHaveClass('animate-pulse')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<TimelineDot ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('TimelineHeader', () => {
    it('should render header', () => {
      render(<TimelineHeader data-testid="header">Header content</TimelineHeader>)
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    it('should apply flex styles', () => {
      render(<TimelineHeader data-testid="header">Content</TimelineHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('flex', 'items-center', 'gap-2')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<TimelineHeader ref={ref}>Content</TimelineHeader>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('TimelineTime', () => {
    it('should render time text', () => {
      render(<TimelineTime>10:30 AM</TimelineTime>)
      expect(screen.getByText('10:30 AM')).toBeInTheDocument()
    })

    it('should apply time styles', () => {
      render(<TimelineTime data-testid="time">Time</TimelineTime>)
      const time = screen.getByTestId('time')
      expect(time).toHaveClass('text-xs', 'text-muted-foreground', 'tabular-nums')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLSpanElement>()
      render(<TimelineTime ref={ref}>Time</TimelineTime>)
      expect(ref.current).toBeInstanceOf(HTMLSpanElement)
    })
  })

  describe('TimelineTitle', () => {
    it('should render as h4 heading', () => {
      render(<TimelineTitle>Event Title</TimelineTitle>)
      const heading = screen.getByRole('heading', { level: 4 })
      expect(heading).toHaveTextContent('Event Title')
    })

    it('should apply title styles', () => {
      render(<TimelineTitle data-testid="title">Title</TimelineTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('font-medium', 'leading-none')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLHeadingElement>()
      render(<TimelineTitle ref={ref}>Title</TimelineTitle>)
      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('TimelineDescription', () => {
    it('should render description paragraph', () => {
      render(<TimelineDescription>Description text</TimelineDescription>)
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('should apply description styles', () => {
      render(<TimelineDescription data-testid="desc">Description</TimelineDescription>)
      const desc = screen.getByTestId('desc')
      expect(desc).toHaveClass('text-sm', 'text-muted-foreground', 'mt-1')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLParagraphElement>()
      render(<TimelineDescription ref={ref}>Description</TimelineDescription>)
      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })

  describe('TimelineContent', () => {
    it('should render content', () => {
      render(<TimelineContent data-testid="content">Content area</TimelineContent>)
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('should apply content styles', () => {
      render(<TimelineContent data-testid="content">Content</TimelineContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('pt-0.5')
    })

    it('should forward ref', () => {
      const ref = createRef<HTMLDivElement>()
      render(<TimelineContent ref={ref}>Content</TimelineContent>)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('composition', () => {
    it('should compose all timeline components correctly', () => {
      render(
        <Timeline data-testid="timeline">
          <TimelineItem>
            <TimelineConnector />
            <TimelineDot variant="success" />
            <TimelineContent>
              <TimelineHeader>
                <TimelineTime>10:30 AM</TimelineTime>
                <TimelineTitle>First Event</TimelineTitle>
              </TimelineHeader>
              <TimelineDescription>Event description</TimelineDescription>
            </TimelineContent>
          </TimelineItem>
          <TimelineItem>
            <TimelineConnector isLast />
            <TimelineDot variant="info" />
            <TimelineContent>
              <TimelineHeader>
                <TimelineTime>11:00 AM</TimelineTime>
                <TimelineTitle>Second Event</TimelineTitle>
              </TimelineHeader>
            </TimelineContent>
          </TimelineItem>
        </Timeline>
      )

      expect(screen.getByTestId('timeline')).toBeInTheDocument()
      expect(screen.getByText('10:30 AM')).toBeInTheDocument()
      expect(screen.getByText('First Event')).toBeInTheDocument()
      expect(screen.getByText('Event description')).toBeInTheDocument()
      expect(screen.getByText('11:00 AM')).toBeInTheDocument()
      expect(screen.getByText('Second Event')).toBeInTheDocument()
    })
  })
})
