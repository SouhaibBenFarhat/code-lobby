import type { JSX } from 'react'
import { cn } from '../utils'

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

      {/* White hexagon (compact — scaled to ~66% so the navy frame reads prominently) */}
      <path d="M32 15.5 L47.2 23.4 L47.2 40.6 L32 48.5 L16.8 40.6 L16.8 23.4 Z" fill="white" />

      {/* Left bracket < cutout */}
      <path d="M29 23.4 L20.8 32 L29 40.6 L29 35.6 L24.7 32 L29 28.4 Z" fill="#141B4D" />

      {/* Right bracket > cutout */}
      <path d="M35 23.4 L43.2 32 L35 40.6 L35 35.6 L39.3 32 L35 28.4 Z" fill="#141B4D" />
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

      {/* Hexagon (compact — scaled to ~66%) */}
      <path d="M12 6.1 L17.9 9 L17.9 15 L12 17.9 L6.1 15 L6.1 9 Z" fill="white" />

      {/* < bracket */}
      <path d="M10.7 8.7 L7.4 12 L10.7 15.3 L10.7 13.3 L9 12 L10.7 10.7 Z" fill="#141B4D" />

      {/* > bracket */}
      <path d="M13.3 8.7 L16.6 12 L13.3 15.3 L13.3 13.3 L15 12 L13.3 10.7 Z" fill="#141B4D" />
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

      <path
        d="M32 15.5 L47.2 23.4 L47.2 40.6 L32 48.5 L16.8 40.6 L16.8 23.4 Z"
        className="fill-primary/30"
      />

      <path d="M29 23.4 L20.8 32 L29 40.6 L29 35.6 L24.7 32 L29 28.4 Z" className="fill-muted" />
      <path d="M35 23.4 L43.2 32 L35 40.6 L35 35.6 L39.3 32 L35 28.4 Z" className="fill-muted" />
    </svg>
  )
}
