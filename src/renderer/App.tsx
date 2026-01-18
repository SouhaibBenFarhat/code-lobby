import { useQuery } from '@tanstack/react-query'
import { MousePointerClick, PanelRight, PanelRightClose } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AIChatPanel } from './components/AIChat'
import { Header, ViewMode } from './components/Header'
import { IDEView } from './components/IDEView'
import { PRDetail } from './components/PRDetail'
import { PRGrid } from './components/PRGrid'
import { TokenInput } from './components/TokenInput'
import type { PullRequest } from './components/types'
import { Button } from './components/ui/button'
import { Toaster } from './components/ui/toaster'
import { TooltipProvider } from './components/ui/tooltip'

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 800
const DEFAULT_PANEL_WIDTH = 400
const DEFAULT_AI_PANEL_WIDTH = 380

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

// Context for "My PRs" filter (shared across all views)
interface MyPRsFilterContextType {
  myPRsRepos: Set<string>
  toggleMyPRsFilter: (repoFullName: string) => void
  isMyPRsFilterEnabled: (repoFullName: string) => boolean
}

const MyPRsFilterContext = createContext<MyPRsFilterContextType>({
  myPRsRepos: new Set(),
  toggleMyPRsFilter: () => {},
  isMyPRsFilterEnabled: () => false
})

export const useMyPRsFilter = () => useContext(MyPRsFilterContext)

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [panelSettingsLoaded, setPanelSettingsLoaded] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('canvas')
  const [viewModeLoaded, setViewModeLoaded] = useState(false)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // AI Panel state
  const [isAIPanelOpen, setIsAIPanelOpen] = useState(false)
  const [aiPanelWidth, setAIPanelWidth] = useState(DEFAULT_AI_PANEL_WIDTH)
  const [isAIResizing, setIsAIResizing] = useState(false)
  const [aiPanelSettingsLoaded, setAIPanelSettingsLoaded] = useState(false)
  const aiResizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // My PRs filter state (shared across all views)
  const [myPRsRepos, setMyPRsRepos] = useState<Set<string>>(new Set())
  const [myPRsFilterLoaded, setMyPRsFilterLoaded] = useState(false)

  // Load view mode on mount
  useEffect(() => {
    const loadViewMode = async () => {
      try {
        const mode = await window.electron.getViewMode()
        setViewMode(mode)
      } catch (_e) {
        // Use default
      }
      setViewModeLoaded(true)
    }
    loadViewMode()
  }, [])

  // Save view mode when it changes
  useEffect(() => {
    if (!viewModeLoaded) return
    window.electron.setViewMode(viewMode)
  }, [viewMode, viewModeLoaded])

  // Load panel settings on mount
  useEffect(() => {
    const loadPanelSettings = async () => {
      try {
        const settings = await window.electron.getPRDetailPanel()
        setIsPanelOpen(settings.isOpen)
        setPanelWidth(settings.width || DEFAULT_PANEL_WIDTH)
      } catch (_e) {
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

  // Load AI panel settings on mount
  useEffect(() => {
    const loadAIPanelSettings = async () => {
      try {
        const settings = await window.electron.getAIPanel()
        setIsAIPanelOpen(settings.isOpen)
        setAIPanelWidth(settings.width || DEFAULT_AI_PANEL_WIDTH)
      } catch (_e) {
        // Use defaults if loading fails
      }
      setAIPanelSettingsLoaded(true)
    }
    loadAIPanelSettings()
  }, [])

  // Save AI panel settings when they change
  useEffect(() => {
    if (!aiPanelSettingsLoaded) return
    window.electron.setAIPanel({ isOpen: isAIPanelOpen, width: aiPanelWidth })
  }, [isAIPanelOpen, aiPanelWidth, aiPanelSettingsLoaded])

  // Load My PRs filter settings on mount
  useEffect(() => {
    const loadMyPRsFilter = async () => {
      try {
        const repos = await window.electron.getMyPRsRepos()
        setMyPRsRepos(new Set(repos || []))
      } catch (_e) {
        // Use default
      }
      setMyPRsFilterLoaded(true)
    }
    loadMyPRsFilter()
  }, [])

  // Save My PRs filter settings when they change
  useEffect(() => {
    if (!myPRsFilterLoaded) return
    window.electron.setMyPRsRepos(Array.from(myPRsRepos))
  }, [myPRsRepos, myPRsFilterLoaded])

  // My PRs filter context functions
  const toggleMyPRsFilter = useCallback((repoFullName: string) => {
    setMyPRsRepos((prev) => {
      const next = new Set(prev)
      if (next.has(repoFullName)) {
        next.delete(repoFullName)
      } else {
        next.add(repoFullName)
      }
      return next
    })
  }, [])

  const isMyPRsFilterEnabled = useCallback(
    (repoFullName: string) => myPRsRepos.has(repoFullName),
    [myPRsRepos]
  )

  // Open panel when a PR is selected
  useEffect(() => {
    if (selectedPR) {
      setIsPanelOpen(true)
    }
  }, [selectedPR])

  // Handle PR panel resize
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsResizing(true)
      resizeRef.current = {
        startX: e.clientX,
        startWidth: panelWidth
      }
    },
    [panelWidth]
  )

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev)
  }, [])

  // Handle AI panel resize
  const handleAIResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setIsAIResizing(true)
      aiResizeRef.current = {
        startX: e.clientX,
        startWidth: aiPanelWidth
      }
    },
    [aiPanelWidth]
  )

  const toggleAIPanel = useCallback(() => {
    setIsAIPanelOpen((prev) => !prev)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && resizeRef.current) {
        const delta = resizeRef.current.startX - e.clientX
        const newWidth = Math.min(
          MAX_PANEL_WIDTH,
          Math.max(MIN_PANEL_WIDTH, resizeRef.current.startWidth + delta)
        )
        setPanelWidth(newWidth)
      }
      if (isAIResizing && aiResizeRef.current) {
        const delta = aiResizeRef.current.startX - e.clientX
        const newWidth = Math.min(
          MAX_PANEL_WIDTH,
          Math.max(MIN_PANEL_WIDTH, aiResizeRef.current.startWidth + delta)
        )
        setAIPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      setIsAIResizing(false)
      resizeRef.current = null
      aiResizeRef.current = null
    }

    if (isResizing || isAIResizing) {
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
  }, [isResizing, isAIResizing])

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

  // Loading state - wait for token check and panel settings
  if (
    checkingToken ||
    isAuthenticated === null ||
    !panelSettingsLoaded ||
    !aiPanelSettingsLoaded ||
    !viewModeLoaded ||
    !myPRsFilterLoaded
  ) {
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
    <TooltipProvider>
      <PRContext.Provider value={{ selectedPR, setSelectedPR }}>
        <MyPRsFilterContext.Provider
          value={{ myPRsRepos, toggleMyPRsFilter, isMyPRsFilterEnabled }}
        >
          <div className="h-screen bg-background flex flex-col overflow-hidden">
            <Header
              user={user}
              onLogout={handleLogout}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isAIPanelOpen={isAIPanelOpen}
              onToggleAIPanel={toggleAIPanel}
            />

            {/* Main content area with views */}
            <div className="flex-1 flex overflow-hidden">
              {/* Canvas View */}
              {viewMode === 'canvas' && (
                <div className="flex-1 flex overflow-hidden">
                  <main className="flex-1 overflow-auto bg-muted/20">
                    <PRGrid currentUser={user?.login || null} />
                  </main>

                  {/* Panel toggle button when collapsed */}
                  {!isPanelOpen && (
                    <button
                      type="button"
                      onClick={togglePanel}
                      className="absolute right-2 bottom-4 z-20 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                      title="Open PR details panel"
                    >
                      <PanelRight className="w-5 h-5" />
                    </button>
                  )}

                  {isPanelOpen && (
                    <aside
                      className="border-l border-border overflow-hidden flex bg-background relative flex-shrink-0"
                      style={{ width: panelWidth, minWidth: panelWidth, maxWidth: panelWidth }}
                    >
                      {/* Resize handle */}
                      <div
                        role="slider"
                        aria-orientation="horizontal"
                        aria-label="Resize panel"
                        aria-valuemin={MIN_PANEL_WIDTH}
                        aria-valuemax={MAX_PANEL_WIDTH}
                        aria-valuenow={panelWidth}
                        tabIndex={0}
                        className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
                          isResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/30'
                        }`}
                        onMouseDown={handleResizeStart}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft') {
                            setPanelWidth((w) => Math.max(MIN_PANEL_WIDTH, w - 20))
                          }
                          if (e.key === 'ArrowRight') {
                            setPanelWidth((w) => Math.min(MAX_PANEL_WIDTH, w + 20))
                          }
                        }}
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
                                  <p className="text-sm font-medium text-muted-foreground">
                                    No PR selected
                                  </p>
                                  <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                                    Click on a pull request card to view its details, CI status, and
                                    comments
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
              )}

              {/* IDE View */}
              {viewMode === 'ide' && (
                <div className="flex-1 overflow-hidden">
                  <IDEView currentUser={user?.login || null} />
                </div>
              )}

              {/* AI Panel - rendered OUTSIDE view conditionals to persist across view switches */}
              {isAIPanelOpen && (
                <aside
                  className="apple-panel overflow-hidden flex relative flex-shrink-0"
                  style={{ width: aiPanelWidth, minWidth: aiPanelWidth, maxWidth: aiPanelWidth }}
                >
                  {/* Resize handle */}
                  <div
                    role="slider"
                    aria-orientation="horizontal"
                    aria-label="Resize AI panel"
                    aria-valuemin={MIN_PANEL_WIDTH}
                    aria-valuemax={MAX_PANEL_WIDTH}
                    aria-valuenow={aiPanelWidth}
                    tabIndex={0}
                    className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
                      isAIResizing ? 'bg-primary' : 'bg-transparent hover:bg-primary/30'
                    }`}
                    onMouseDown={handleAIResizeStart}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        setAIPanelWidth((w) => Math.max(MIN_PANEL_WIDTH, w - 20))
                      }
                      if (e.key === 'ArrowRight') {
                        setAIPanelWidth((w) => Math.min(MAX_PANEL_WIDTH, w + 20))
                      }
                    }}
                  />
                  <div className="flex-1 overflow-hidden flex flex-col min-w-0">
                    <AIChatPanel onClose={toggleAIPanel} />
                  </div>
                </aside>
              )}
            </div>

            <Toaster />
          </div>
        </MyPRsFilterContext.Provider>
      </PRContext.Provider>
    </TooltipProvider>
  )
}

export default App
