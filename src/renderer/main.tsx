/**
 * Main Entry Point - Simplified TanStack Query Only
 */

import { QueryClientProvider, queryClient } from '@data'
import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/globals.css'

// Bootstrap the app (imports modules)
import { App, bootstrap } from '@app'

bootstrap()

// Render with TanStack Query
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
