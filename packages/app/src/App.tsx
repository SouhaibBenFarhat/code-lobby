/**
 * App Shell
 *
 * The App Shell defines WHERE things render (slots), not WHAT renders.
 * Modules register themselves to slots, and this component just renders
 * whatever is in each slot.
 *
 * NO UI MODULE IMPORTS HERE! Modules are loaded in bootstrap.ts
 */

import { Slot, ConditionalSlot } from '@codelobby/slot-system'
import { Store, useSignal } from '@codelobby/shared-store'

export function App() {
  // Read layout state from store
  const viewMode = useSignal(Store.viewMode)
  const isAuthenticated = useSignal(Store.isAuthenticated)
  const isLoading = useSignal(Store.loading.auth)

  // ─────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg animate-pulse">
            CL
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Auth Required (placeholder - would show login)
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            CL
          </div>
          <p className="text-sm text-muted-foreground">Please sign in to continue</p>
          {/* TokenInput would go here */}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main App Layout with Slots
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* ═══════════════════════════════════════════════════════════════════
          HEADER SLOT - Always visible
          Modules: header-module
      ═══════════════════════════════════════════════════════════════════ */}
      <Slot
        name="header"
        className="flex-shrink-0"
        fallback={<div className="h-14 border-b border-border" />}
      />

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden">
        {/* ─────────────────────────────────────────────────────────────────
            LEFT PANEL SLOT - Explorer in IDE mode
            Modules: explorer-module (visible when viewMode === 'ide')
        ───────────────────────────────────────────────────────────────── */}
        {viewMode === 'ide' && (
          <ConditionalSlot
            name="left-panel"
            className="flex-shrink-0 border-r border-border overflow-hidden"
            fallback={
              <div className="w-64 bg-muted/30 p-4 text-center text-muted-foreground text-sm">
                Explorer module not loaded
              </div>
            }
          />
        )}

        {/* ─────────────────────────────────────────────────────────────────
            MAIN SLOT - Canvas or IDE View
            Modules: canvas-module, ide-view-module (one visible based on viewMode)
        ───────────────────────────────────────────────────────────────── */}
        <Slot
          name="main"
          className="flex-1 overflow-auto"
          fallback={
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <p>Main view module not loaded</p>
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────────
            RIGHT PANEL SLOT - PR Detail and AI Chat
            Modules: pr-detail-module, ai-chat-module (conditionally visible)
        ───────────────────────────────────────────────────────────────── */}
        <ConditionalSlot
          name="right-panel"
          className="flex-shrink-0 flex flex-col border-l border-border overflow-hidden"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          FOOTER SLOT - Status bar, etc.
          Currently empty
      ═══════════════════════════════════════════════════════════════════ */}
      <ConditionalSlot name="footer" className="flex-shrink-0 border-t border-border" />

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL SLOT - Dialogs, etc.
          Rendered outside normal flow
      ═══════════════════════════════════════════════════════════════════ */}
      <Slot name="modal" wrapInContainer={false} />

      {/* ═══════════════════════════════════════════════════════════════════
          TOAST SLOT - Notifications
          Fixed position
      ═══════════════════════════════════════════════════════════════════ */}
      <Slot name="toast" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" />
    </div>
  )
}
