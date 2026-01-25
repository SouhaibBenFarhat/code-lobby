/**
 * Main Entry Point - Simplified TanStack Query Only
 */

import { QueryClientProvider, queryClient } from '@codelobby/data'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'

// Bootstrap the app (imports modules)
import { App, bootstrap } from '@codelobby/app'

bootstrap()

// Render with TanStack Query
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
