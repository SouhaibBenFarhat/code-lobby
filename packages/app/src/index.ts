/**
 * @codelobby/app - Entry Point
 *
 * Usage:
 * 1. Import bootstrap to register all modules
 * 2. Render the App component
 *
 * @example
 * ```tsx
 * import './bootstrap'  // Must be first!
 * import { App } from '@codelobby/app'
 *
 * createRoot(document.getElementById('root')!).render(<App />)
 * ```
 */

// Export the App shell
export { App } from './App'

// Re-export bootstrap for convenience (importing it runs the registrations)
export { } from './bootstrap'
