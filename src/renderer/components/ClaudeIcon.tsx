import { SVGProps } from 'react'

interface ClaudeIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

// Claude's mascot - the blocky head in coral color
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
      {/* Claude's blocky head shape - coral/salmon color */}
      <path
        d="M4 8 L4 20 L8 20 L8 24 L16 24 L16 20 L20 20 L20 8 L16 8 L16 4 L14 4 L14 0 L10 0 L10 4 L8 4 L8 8 Z"
        fill="#CC7B5C"
        transform="scale(0.9) translate(1.3, 0)"
      />
      {/* Left eye */}
      <rect x="7" y="10" width="3" height="4" fill="#1a1a1a" rx="0.5" />
      {/* Right eye */}
      <rect x="14" y="10" width="3" height="4" fill="#1a1a1a" rx="0.5" />
      {/* Mouth - wide smile */}
      <rect x="6" y="16" width="12" height="2" fill="#1a1a1a" rx="0.5" />
    </svg>
  )
}

// Alternative simpler version
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
      {/* Simplified Claude head */}
      <rect x="3" y="4" width="18" height="16" rx="2" fill="#CC7B5C" />
      {/* Ears/horns */}
      <rect x="5" y="1" width="4" height="5" fill="#CC7B5C" />
      <rect x="15" y="1" width="4" height="5" fill="#CC7B5C" />
      {/* Left eye */}
      <rect x="6" y="9" width="3" height="4" fill="#1a1a1a" />
      {/* Right eye */}
      <rect x="15" y="9" width="3" height="4" fill="#1a1a1a" />
      {/* Mouth */}
      <rect x="7" y="15" width="10" height="2" fill="#1a1a1a" />
    </svg>
  )
}
