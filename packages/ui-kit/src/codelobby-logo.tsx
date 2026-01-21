import type { JSX } from 'react'
import { cn } from './utils'

interface CodeLobbyLogoProps {
  className?: string
  size?: number
}

export function CodeLobbyLogo({ className, size = 32 }: CodeLobbyLogoProps): JSX.Element {
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
      <rect width="64" height="64" rx="8" fill="#141B4D" />

      {/* White hexagon */}
      <path d="M32 7 L55 19 L55 45 L32 57 L9 45 L9 19 Z" fill="white" />

      {/* Left bracket < cutout */}
      <path d="M27.5 19 L15 32 L27.5 45 L27.5 37.5 L21 32 L27.5 26.5 Z" fill="#141B4D" />

      {/* Right bracket > cutout */}
      <path d="M36.5 19 L49 32 L36.5 45 L36.5 37.5 L43 32 L36.5 26.5 Z" fill="#141B4D" />
    </svg>
  )
}

// Simplified icon for smaller sizes
export function CodeLobbyIcon({ className, size = 20 }: CodeLobbyLogoProps): JSX.Element {
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
      <rect width="24" height="24" rx="4" fill="#141B4D" />

      {/* Hexagon */}
      <path d="M12 3 L21 7.5 L21 16.5 L12 21 L3 16.5 L3 7.5 Z" fill="white" />

      {/* < bracket */}
      <path d="M10 7 L5 12 L10 17 L10 14 L7.5 12 L10 10 Z" fill="#141B4D" />

      {/* > bracket */}
      <path d="M14 7 L19 12 L14 17 L14 14 L16.5 12 L14 10 Z" fill="#141B4D" />
    </svg>
  )
}

// Animated version for loading
export function CodeLobbyLogoAnimated({ className, size = 32 }: CodeLobbyLogoProps): JSX.Element {
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

      <path d="M32 7 L55 19 L55 45 L32 57 L9 45 L9 19 Z" className="fill-primary/30" />

      <path d="M27.5 19 L15 32 L27.5 45 L27.5 37.5 L21 32 L27.5 26.5 Z" className="fill-muted" />
      <path d="M36.5 19 L49 32 L36.5 45 L36.5 37.5 L43 32 L36.5 26.5 Z" className="fill-muted" />
    </svg>
  )
}
