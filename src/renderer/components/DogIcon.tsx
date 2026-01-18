import { SVGProps } from 'react'

interface DogIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

export function DogIcon({ className, ...props }: DogIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="AI Assistant"
      {...props}
    >
      {/* Head outline */}
      <path d="M12 2C9 2 6.5 4 6 7C5.5 4 3 3 2 4C1 5 2 8 4 9C3 10 3 12 4 13L6 15" />
      <path d="M12 2C15 2 17.5 4 18 7C18.5 4 21 3 22 4C23 5 22 8 20 9C21 10 21 12 20 13L18 15" />

      {/* Face */}
      <ellipse cx="12" cy="13" rx="6" ry="5" />

      {/* Eyes */}
      <circle cx="9.5" cy="11.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11.5" r="1" fill="currentColor" stroke="none" />

      {/* Nose */}
      <ellipse cx="12" cy="14" rx="1.5" ry="1" fill="currentColor" stroke="none" />

      {/* Mouth */}
      <path d="M12 15V16" />
      <path d="M10 16.5C10.5 17 11.5 17.5 12 17.5C12.5 17.5 13.5 17 14 16.5" />

      {/* Body hint */}
      <path d="M8 18C8 20 9 22 12 22C15 22 16 20 16 18" />
    </svg>
  )
}
