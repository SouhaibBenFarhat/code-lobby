import { cn } from '@/lib/utils'

interface CodeLobbyLogoProps {
  className?: string
  size?: number
}

export function CodeLobbyLogo({ className, size = 32 }: CodeLobbyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      role="img"
      aria-label="CodeLobby Logo"
    >
      {/* Background */}
      <rect width="64" height="64" rx="8" fill="#1a1f6c" />

      {/* Left bracket < */}
      <path
        d="M22 16 L10 32 L22 48"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Right bracket > */}
      <path
        d="M42 16 L54 32 L42 48"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Door/lobby */}
      <rect x="28" y="22" width="8" height="20" rx="1" fill="white" />
      <rect x="30" y="30" width="4" height="12" rx="0.5" fill="#1a1f6c" />
    </svg>
  )
}

// Simplified icon for smaller sizes
export function CodeLobbyIcon({ className, size = 20 }: CodeLobbyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
      role="img"
      aria-label="CodeLobby Icon"
    >
      <rect width="24" height="24" rx="4" fill="#1a1f6c" />
      <path
        d="M8 6 L3 12 L8 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 6 L21 12 L16 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="10.5" y="8" width="3" height="8" rx="0.5" fill="white" />
    </svg>
  )
}

// Animated version for loading
export function CodeLobbyLogoAnimated({ className, size = 32 }: CodeLobbyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('animate-pulse', className)}
      role="img"
      aria-label="CodeLobby Logo Loading"
    >
      <rect width="64" height="64" rx="8" className="fill-muted" />
      <path
        d="M22 16 L10 32 L22 48"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-primary/50"
      />
      <path
        d="M42 16 L54 32 L42 48"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-primary/50"
      />
      <rect x="28" y="22" width="8" height="20" rx="1" className="fill-primary/50" />
    </svg>
  )
}
