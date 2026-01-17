import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TokenInput } from './components/TokenInput'
import { PRGrid } from './components/PRGrid'
import { PRDetail } from './components/PRDetail'
import { Header } from './components/Header'
import { Toaster } from './components/ui/toaster'
import { MousePointerClick, PanelRightClose, PanelRight } from 'lucide-react'
import { Button } from './components/ui/button'
import type { PullRequest } from './components/types'

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 800
const DEFAULT_PANEL_WIDTH = 400

interface User {
  login: string
  avatar_url: string
  name: string | null
}

// Context for selected PR
interface PRContextType {
  selectedPR: PullRequest | null
  setSelectedPR: (pr: PullRequest | null) => void
}

const PRContext = createContext<PRContextType>({
  selectedPR: null,
  setSelectedPR: () => {}
})

export const usePRContext = () => useContext(PRContext)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [panelSettingsLoaded, setPanelSettingsLoaded] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Load panel settings on mount
  useEffect(() => {
    const loadPanelSettings = async () => {
      try {
        const settings = await window.electron.getPRDetailPanel()
        setIsPanelOpen(settings.isOpen)
        setPanelWidth(settings.width || DEFAULT_PANEL_WIDTH)
      } catch (e) {
        // Use defaults if loading fails
      }
      setPanelSettingsLoaded(true)
    }
    loadPanelSettings()
  }, [])

  // Save panel settings when they change
  useEffect(() => {
    if (!panelSettingsLoaded) return
    window.electron.setPRDetailPanel({ isOpen: isPanelOpen, width: panelWidth })
  }, [isPanelOpen, panelWidth, panelSettingsLoaded])

  // Open panel when a PR is selected
  useEffect(() => {
    if (selectedPR) {
      setIsPanelOpen(true)
    }
  }, [selectedPR])

  // Handle resize
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeRef.current = {
      startX: e.clientX,
      startWidth: panelWidth
    }
  }, [panelWidth])

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return
      
      const delta = resizeRef.current.startX - e.clientX
      const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, resizeRef.current.startWidth + delta))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      resizeRef.current = null
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Check for existing token on mount
  const { data: tokenCheck, isLoading: checkingToken } = useQuery({
    queryKey: ['validate-token'],
    queryFn: async () => {
      const result = await window.electron.validateToken()
      return result
    },
    retry: false,
    refetchOnWindowFocus: false
  })

  useEffect(() => {
    if (tokenCheck !== undefined) {
      setIsAuthenticated(tokenCheck.valid)
      if (tokenCheck.valid && tokenCheck.user) {
        setUser(tokenCheck.user as User)
      }
    }
  }, [tokenCheck])

  const handleAuthenticated = (authenticatedUser: User) => {
    setIsAuthenticated(true)
    setUser(authenticatedUser)
  }

  const handleLogout = async () => {
    await window.electron.clearToken()
    setIsAuthenticated(false)
    setUser(null)
  }

  // Loading state
  if (checkingToken || isAuthenticated === null) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - show token input
  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background">
        <TokenInput onAuthenticated={handleAuthenticated} />
        <Toaster />
      </div>
    )
  }

  // Authenticated - show dashboard
  return (
    <PRContext.Provider value={{ selectedPR, setSelectedPR }}>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <Header user={user} onLogout={handleLogout} />
        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 overflow-auto p-2">
            <PRGrid currentUser={user?.login || null} />
          </main>
          
          {/* Panel toggle button when collapsed */}
          {!isPanelOpen && (
            <button
              onClick={togglePanel}
              className="absolute right-2 bottom-4 z-20 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
              title="Open PR details panel"
            >
              <PanelRight className="w-5 h-5" />
            </button>
          )}
          
          {isPanelOpen && (
            <aside 
              className="border-l border-border overflow-hidden flex bg-card/30 relative flex-shrink-0"
              style={{ width: panelWidth, minWidth: panelWidth, maxWidth: panelWidth }}
            >
              {/* Resize handle */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
                  isResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/30'
                }`}
                onMouseDown={handleResizeStart}
              />
              <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                {selectedPR ? (
                  <PRDetail pr={selectedPR} onClose={() => setSelectedPR(null)} />
                ) : (
                  /* Placeholder when no PR selected */
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
                      <h3 className="font-semibold text-sm">PR Details</h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={togglePanel}
                      >
                        <PanelRightClose className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                          <MousePointerClick className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">No PR selected</p>
                          <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                            Click on a pull request card to view its details, CI status, and comments
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
        <Toaster />
      </div>
    </PRContext.Provider>
  )
}

export default App
