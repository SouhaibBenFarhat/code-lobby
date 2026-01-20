/**
 * Main Entry Point
 *
 * This entry point:
 * 1. Initializes the data module (for action handling)
 * 2. Renders the existing App (full functionality)
 * 3. The App syncs state to the shared store (for future modular components)
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Initialize the data module (connects actions to IPC)
import { initDataModule } from '@codelobby/data-module'

initDataModule()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // Data is fresh for 1 minute
      refetchOnWindowFocus: true, // Refresh when window gains focus
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
