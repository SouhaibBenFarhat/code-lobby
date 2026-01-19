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

      {/* CL Monogram - C wraps around, L completes it */}
      {/* C shape */}
      <path
        d="M35 12 C17.5 12 10 22.5 10 32 C10 41.5 17.5 52 35 52"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* L shape - shares vertical with C */}
      <path
        d="M35 12 L35 52 L54 52"
        stroke="white"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
      {/* C */}
      <path
        d="M13 5 C6.5 5 4 8.5 4 12 C4 15.5 6.5 19 13 19"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* L */}
      <path
        d="M13 5 L13 19 L20 19"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
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
        d="M35 12 C17.5 12 10 22.5 10 32 C10 41.5 17.5 52 35 52"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        className="text-primary/50"
      />
      <path
        d="M35 12 L35 52 L54 52"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="text-primary/50"
      />
    </svg>
  )
}
