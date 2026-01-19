import { SVGProps } from 'react'

interface ClaudeIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

// Claude's mascot - clean blocky head
export function ClaudeIcon({ className, ...props }: ClaudeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Claude AI"
      {...props}
    >
      {/* Main head/body */}
      <rect x="4" y="6" width="16" height="14" rx="2" fill="#D4896A" />

      {/* Left ear */}
      <rect x="6" y="2" width="4" height="6" rx="1" fill="#D4896A" />

      {/* Right ear */}
      <rect x="14" y="2" width="4" height="6" rx="1" fill="#D4896A" />

      {/* Left eye */}
      <rect x="7" y="10" width="3" height="4" rx="0.5" fill="#2D2D2D" />

      {/* Right eye */}
      <rect x="14" y="10" width="3" height="4" rx="0.5" fill="#2D2D2D" />

      {/* Smile */}
      <rect x="8" y="16" width="8" height="2" rx="1" fill="#2D2D2D" />
    </svg>
  )
}

// Simpler variant for very small sizes
export function ClaudeLogoIcon({ className, ...props }: ClaudeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label="Claude AI"
      {...props}
    >
      {/* Compact version */}
      <rect x="4" y="6" width="16" height="14" rx="3" fill="#D4896A" />
      <rect x="6" y="2" width="4" height="5" rx="1" fill="#D4896A" />
      <rect x="14" y="2" width="4" height="5" rx="1" fill="#D4896A" />
      <circle cx="9" cy="12" r="2" fill="#2D2D2D" />
      <circle cx="15" cy="12" r="2" fill="#2D2D2D" />
      <path
        d="M9 17 Q12 19 15 17"
        stroke="#2D2D2D"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
