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
    >
      {/* Background */}
      <rect width="64" height="64" rx="14" className="fill-primary/10" />

      {/* Left bracket < */}
      <path
        d="M24 20L12 32L24 44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* Right bracket > */}
      <path
        d="M40 20L52 32L40 44"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* Door/Lobby - center rectangle with opening */}
      <rect x="28" y="24" width="8" height="16" rx="1" className="fill-primary" />

      {/* Door handle */}
      <circle cx="34" cy="32" r="1.5" className="fill-primary-foreground" />

      {/* Welcome mat / base line */}
      <path
        d="M26 44H38"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-primary/60"
      />
    </svg>
  )
}

// Simplified icon version for smaller sizes
export function CodeLobbyIcon({ className, size = 20 }: CodeLobbyLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      {/* Left bracket */}
      <path
        d="M8 6L3 12L8 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* Right bracket */}
      <path
        d="M16 6L21 12L16 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      />

      {/* Door */}
      <rect x="10" y="8" width="4" height="8" rx="0.5" className="fill-primary" />
    </svg>
  )
}
