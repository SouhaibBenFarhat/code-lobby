import { JSX, SVGProps } from 'react'

interface ClaudeIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

// Official Claude/Anthropic brand color (terracotta/coral)
const CLAUDE_OFFICIAL_COLOR = '#D97757'

// Claude character icon – blocky pixel-style (body, eyes, arms, legs).
// Uses official Claude brand color; dark eyes for contrast.
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
      {/* Body */}
      <rect x="6" y="8" width="12" height="8" rx="1" fill={CLAUDE_OFFICIAL_COLOR} />
      {/* Eyes */}
      <rect x="8" y="9.5" width="2" height="2" fill="#171717" />
      <rect x="14" y="9.5" width="2" height="2" fill="#171717" />
      {/* Left arm */}
      <rect x="2" y="10" width="4" height="4" rx="0.5" fill={CLAUDE_OFFICIAL_COLOR} />
      {/* Right arm */}
      <rect x="18" y="10" width="4" height="4" rx="0.5" fill={CLAUDE_OFFICIAL_COLOR} />
      {/* Left leg */}
      <rect x="7" y="16" width="4" height="6" rx="0.5" fill={CLAUDE_OFFICIAL_COLOR} />
      {/* Right leg */}
      <rect x="13" y="16" width="4" height="6" rx="0.5" fill={CLAUDE_OFFICIAL_COLOR} />
    </svg>
  )
}

// Alternative: Anthropic 'A' inspired mark (kept for backwards compatibility)
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
      <path
        d="M12 3L4 21H8L9.5 17H14.5L16 21H20L12 3ZM10.5 14L12 9L13.5 14H10.5Z"
        fill={CLAUDE_OFFICIAL_COLOR}
      />
    </svg>
  )
}
