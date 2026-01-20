/**
 * Modular App Entry Point
 *
 * This is the new entry point using the modular architecture.
 * It imports bootstrap to register all modules, then renders the App shell.
 *
 * To use this:
 * 1. Rename main.tsx to main-legacy.tsx
 * 2. Rename this file to main.tsx
 * OR
 * Update index.html to point to this file
 */

import { TooltipProvider } from '@radix-ui/react-tooltip'
import React from 'react'
import ReactDOM from 'react-dom/client'

// Import styles
import './styles/globals.css'

// Bootstrap - imports all modules and initializes data module
// This MUST be imported before the App
import '@codelobby/app/bootstrap'

// Import the App shell (contains only slots, no direct module imports)
import { App } from '@codelobby/app'

// Render the modular app
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>
)
