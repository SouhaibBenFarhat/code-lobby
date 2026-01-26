import { JSX, SVGProps } from 'react'

interface ClaudeIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

// Claude-inspired AI sparkle icon in signature coral color
export function ClaudeIcon({ className, ...props }: ClaudeIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Claude AI"
      {...props}
    >
      {/* Main sparkle/star - Claude's AI aesthetic */}
      <path
        d="M12 2L13.5 8.5L20 7L15 12L20 17L13.5 15.5L12 22L10.5 15.5L4 17L9 12L4 7L10.5 8.5L12 2Z"
        fill="#D97757"
      />
    </svg>
  )
}

// Alternative: Anthropic 'A' inspired mark
export function ClaudeLogoIcon({ className, ...props }: ClaudeIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Claude AI"
      {...props}
    >
      {/* Stylized A mark like Anthropic */}
      <path d="M12 3L4 21H8L9.5 17H14.5L16 21H20L12 3ZM10.5 14L12 9L13.5 14H10.5Z" fill="#D97757" />
    </svg>
  )
}
