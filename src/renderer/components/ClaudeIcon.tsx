import { SVGProps } from 'react'

interface ClaudeIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

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
      {/* Claude's signature asterisk/sparkle mark */}
      <path
        d="M12 2L12 22M2 12L22 12M4.93 4.93L19.07 19.07M19.07 4.93L4.93 19.07"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Center dot */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

// Alternative: Claude's "C" wordmark style
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
      {/* Stylized C for Claude */}
      <path
        d="M18 6C16.5 4 14.5 3 12 3C7 3 3 7.5 3 12C3 16.5 7 21 12 21C14.5 21 16.5 20 18 18"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Inner sparkle accent */}
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  )
}
