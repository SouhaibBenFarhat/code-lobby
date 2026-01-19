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
      <rect width="64" height="64" rx="14" className="fill-[#0d1117] dark:fill-[#0d1117]" />

      {/* Subtle glow */}
      <rect width="64" height="64" rx="14" fill="url(#logoGlow)" />

      {/* Left bracket < */}
      <path
        d="M21 19L10 32L21 45"
        stroke="#58a6ff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right bracket > */}
      <path
        d="M43 19L54 32L43 45"
        stroke="#58a6ff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Door frame */}
      <rect
        x="27"
        y="20"
        width="10"
        height="24"
        rx="2"
        fill="none"
        stroke="#3fb950"
        strokeWidth="1.5"
      />

      {/* Door panel */}
      <rect x="28.5" y="21.5" width="7" height="21" rx="1" fill="#3fb950" />

      {/* Git merge dots on door */}
      <circle cx="32" cy="27" r="1.5" fill="#0d1117" />
      <circle cx="32" cy="35" r="1.5" fill="#0d1117" />
      <path d="M32 29V33" stroke="#0d1117" strokeWidth="1" strokeLinecap="round" />

      {/* Welcome mat */}
      <rect x="25" y="46" width="14" height="2" rx="1" fill="#3fb950" opacity="0.5" />

      <defs>
        <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3fb950" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#0d1117" stopOpacity="0" />
        </radialGradient>
      </defs>
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
      {/* Left bracket */}
      <path
        d="M8 6L3 12L8 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-400"
      />

      {/* Right bracket */}
      <path
        d="M16 6L21 12L16 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-blue-400"
      />

      {/* Door with merge symbol */}
      <rect x="10" y="8" width="4" height="8" rx="0.5" className="fill-green-500" />
      <circle cx="12" cy="10" r="0.8" className="fill-background" />
      <circle cx="12" cy="14" r="0.8" className="fill-background" />
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
      <rect width="64" height="64" rx="14" className="fill-muted" />

      {/* Left bracket < */}
      <path
        d="M21 19L10 32L21 45"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/50"
      />

      {/* Right bracket > */}
      <path
        d="M43 19L54 32L43 45"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary/50"
      />

      {/* Door */}
      <rect x="28" y="21" width="8" height="22" rx="1.5" className="fill-primary/50" />
    </svg>
  )
}
