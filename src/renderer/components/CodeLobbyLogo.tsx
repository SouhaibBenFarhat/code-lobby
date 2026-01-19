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
      {/* Background - Parcellab-inspired dark blue */}
      <rect width="64" height="64" rx="8" fill="#1a1f6c" />

      {/* Hexagon outer frame */}
      <path
        d="M32 8 L52 20 L52 44 L32 56 L12 44 L12 20 Z"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Left bracket < */}
      <path
        d="M25 24 L16 32 L25 40"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right bracket > */}
      <path
        d="M39 24 L48 32 L39 40"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central "L" for Lobby */}
      <path
        d="M32 22 L32 40 L40 40"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Simplified icon version for smaller sizes (header, favicon)
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
      {/* Background */}
      <rect width="24" height="24" rx="4" fill="#1a1f6c" />

      {/* Left bracket */}
      <path
        d="M8 8 L4 12 L8 16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right bracket */}
      <path
        d="M16 8 L20 12 L16 16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central L */}
      <path
        d="M12 8 L12 16 L15 16"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Animated version for loading states
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
      {/* Background */}
      <rect width="64" height="64" rx="8" className="fill-muted" />

      {/* Hexagon */}
      <path
        d="M32 8 L52 20 L52 44 L32 56 L12 44 L12 20 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        className="text-primary/50"
      />

      {/* Brackets and L */}
      <path
        d="M25 24 L16 32 L25 40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/50"
      />
      <path
        d="M39 24 L48 32 L39 40"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/50"
      />
      <path
        d="M32 22 L32 40 L40 40"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/50"
      />
    </svg>
  )
}
