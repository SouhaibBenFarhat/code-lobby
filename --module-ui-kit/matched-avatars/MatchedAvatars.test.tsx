import { render, screen } from '@test-utils'
import { describe, expect, it } from 'vitest'
import { MatchedAvatars } from './MatchedAvatars'

const mockAuthor = {
  login: 'author-user',
  avatar_url: 'https://example.com/author.png'
}

const mockAssignees = [
  { login: 'assignee1', avatar_url: 'https://example.com/assignee1.png' },
  { login: 'assignee2', avatar_url: 'https://example.com/assignee2.png' }
]

describe('MatchedAvatars', () => {
  describe('without assignees', () => {
    it('should show only author avatar', () => {
      const { container } = render(<MatchedAvatars author={mockAuthor} />)

      // Should NOT have the heart icon
      const heartIcon = container.querySelector('.lucide-heart')
      expect(heartIcon).not.toBeInTheDocument()
    })

    it('should show author name when showNames is true', () => {
      render(<MatchedAvatars author={mockAuthor} size="md" showNames />)

      expect(screen.getByText('author-user')).toBeInTheDocument()
    })

    it('should have tooltip trigger element', () => {
      const { container } = render(<MatchedAvatars author={mockAuthor} />)

      // Should have a tooltip trigger (button or element with data-state)
      const tooltipTrigger = container.querySelector('[data-state]')
      expect(tooltipTrigger).toBeInTheDocument()
    })
  })

  describe('with assignees (match mode)', () => {
    it('should show heart icon when there are assignees', () => {
      const { container } = render(
        <MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} />
      )

      const heartIcon = container.querySelector('.lucide-heart')
      expect(heartIcon).toBeInTheDocument()
      expect(heartIcon).toHaveClass('text-pink-500')
      expect(heartIcon).toHaveClass('fill-pink-500')
    })

    it('should have pink ring styling on avatars', () => {
      const { container } = render(
        <MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} />
      )

      const avatarsWithRing = container.querySelectorAll('[class*="ring-pink"]')
      expect(avatarsWithRing.length).toBe(2) // Author + Assignee
    })

    it('should show overflow indicator for multiple assignees', () => {
      render(<MatchedAvatars author={mockAuthor} assignees={mockAssignees} />)

      // Should show +1 for the second assignee
      expect(screen.getByText('+1')).toBeInTheDocument()
    })

    it('should not show overflow for single assignee', () => {
      render(<MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} />)

      expect(screen.queryByText('+1')).not.toBeInTheDocument()
    })

    it('should show both names when showNames is true', () => {
      render(
        <MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} size="md" showNames />
      )

      expect(screen.getByText('author-user')).toBeInTheDocument()
      expect(screen.getByText('assignee1')).toBeInTheDocument()
    })

    it('should have group/match class for hover animations', () => {
      const { container } = render(
        <MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} />
      )

      const matchContainer = container.querySelector('[class*="group/match"]')
      expect(matchContainer).toBeInTheDocument()
    })
  })

  describe('size variants', () => {
    it('should use smaller avatars for sm size', () => {
      const { container } = render(
        <MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} size="sm" />
      )

      const avatars = container.querySelectorAll('[class*="w-4"]')
      expect(avatars.length).toBeGreaterThan(0)
    })

    it('should use larger avatars for md size', () => {
      const { container } = render(
        <MatchedAvatars author={mockAuthor} assignees={[mockAssignees[0]]} size="md" />
      )

      const avatars = container.querySelectorAll('[class*="w-5"]')
      expect(avatars.length).toBeGreaterThan(0)
    })
  })
})
